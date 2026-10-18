import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Cart from '../models/Cart.js';
import mongoose from 'mongoose';
import { cancelLegacyPaidOrder } from './legacyRefund.js';
import { AppError } from '../middleware/errorHandler.js';
import { computeSellerTotals, priceLine, type ProductLike } from './checkoutPricing.js';
import { buyerVisibleOrderFilter, isBuyerVisibleOrder } from './orderVisibility.js';
import { cancelPendingOrder } from './orderCancellation.js';
import { markOrderDelivered } from './orderDelivery.js';
import { SELLER_ACCEPT_WINDOW_MS } from './paymentOperationPolicy.js';

interface OrderItem {
  productId: string;
  variantId?: string;
  selectedAttributes?: Record<string, string>;
  quantity: number;
}

interface CreateOrderParams {
  userId: string;
  items: OrderItem[];
  shippingAddress: object;
  paymentMethod: object;
  sellerMessages?: Record<string, string>;
  couponCodes?: Record<string, string>;
  deliverySelections?: Record<string, string>;
  paymentIntentId?: string;
}

async function applyCoupon(
  code: string,
  sellerId: string,
  subtotal: number,
): Promise<{ discount: number; couponCode: string | undefined }> {
  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    sellerId,
    isActive: true,
  });

  if (!coupon) return { discount: 0, couponCode: undefined };

  const now = new Date();
  const valid =
    (!coupon.expiresAt || coupon.expiresAt > now) &&
    (coupon.usageLimit == null || coupon.usedCount < coupon.usageLimit) &&
    subtotal >= coupon.minOrderAmount;

  if (!valid) return { discount: 0, couponCode: undefined };

  let discount =
    coupon.discountType === 'percentage'
      ? subtotal * (coupon.discountValue / 100)
      : Math.min(coupon.discountValue, subtotal);

  if (coupon.discountType === 'percentage' && coupon.maxDiscount) {
    discount = Math.min(discount, coupon.maxDiscount);
  }

  coupon.usedCount += 1;
  await coupon.save();

  return { discount, couponCode: coupon.code };
}

async function restoreStock(items: Array<{ product: unknown; variantId?: string; quantity: number }>) {
  const updates = items.map(item => {
    if (item.variantId) {
      return Product.findOneAndUpdate(
        { _id: item.product as string, 'variants._id': item.variantId },
        { $inc: { 'variants.$.stock': item.quantity } },
      );
    }
    return Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
  });
  await Promise.all(updates);
}

export async function createOrders(params: CreateOrderParams) {
  const { userId, items, shippingAddress, paymentMethod, sellerMessages = {}, couponCodes = {}, deliverySelections = {}, paymentIntentId } = params;

  const isCardPayment =
    (paymentMethod as any).type === 'credit-card' ||
    (paymentMethod as any).type === 'debit-card';

  if (isCardPayment && paymentIntentId) {
    // Reject duplicate — one intent per order
    const existing = await Order.findOne({ paymentIntentId });
    if (existing) {
      throw new AppError(409, 'This payment has already been used for an order');
    }

    // Verify with Stripe that the payment actually succeeded
    const { retrievePaymentIntent } = await import('./stripeService.js');
    const intent = await retrievePaymentIntent(paymentIntentId);
    if (intent.status !== 'succeeded') {
      throw new AppError(402, 'Payment not confirmed. Please complete payment before placing your order.');
    }
  }
  // If isCardPayment && !paymentIntentId: saved/mock card path — skip Stripe verification

  // Validate all products and group by seller in one pass
  const sellerGroups = new Map<string, Array<{
    productDoc: InstanceType<typeof Product>;
    variantId?: string;
    selectedAttributes?: Record<string, string>;
    quantity: number;
  }>>();

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) throw new AppError(404, `Product not found: ${item.productId}`);

    if (item.variantId) {
      const variant = (product as any).variants?.id
        ? (product as any).variants.id(item.variantId)
        : (product as any).variants?.find((v: any) => v._id?.toString() === item.variantId);
      if (!variant) throw new AppError(404, `Variant not found for: ${product.name}`);
      const variantStock = typeof variant.stock === 'number' ? variant.stock : 0;
      if (variantStock < item.quantity) throw new AppError(400, `Insufficient stock for variant of: ${product.name}`);
    } else {
      const productStock = typeof product.stock === 'number' ? product.stock : 0;
      if (productStock < item.quantity) throw new AppError(400, `Insufficient stock for: ${product.name}`);
    }

    const sellerKey = product.sellerId?.toString() ?? '__unknown__';
    if (!sellerGroups.has(sellerKey)) sellerGroups.set(sellerKey, []);
    sellerGroups.get(sellerKey)!.push({
      productDoc: product,
      variantId: item.variantId,
      selectedAttributes: item.selectedAttributes,
      quantity: item.quantity,
    });
  }

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

  // A cash-on-delivery order must be accepted by the seller before a deadline, like a card order, but
  // there is nothing to authorize or capture. It keeps the legacy flow version so sellers still see it
  // while manual-capture orders are hidden from them.
  const placedAt = new Date();
  const acceptance =
    (paymentMethod as any).type === 'cash-on-delivery'
      ? { placedAt, acceptBy: new Date(placedAt.getTime() + SELLER_ACCEPT_WINDOW_MS) }
      : undefined;

  const createdOrders = [];

  for (const [sellerKey, groupItems] of sellerGroups) {
    let subtotal = 0;
    let productDiscount = 0;

    const orderItems = groupItems.map(({ productDoc, variantId, selectedAttributes, quantity }) => {
      const line = priceLine(productDoc as unknown as ProductLike, variantId, quantity);
      subtotal += line.gross;
      productDiscount += line.itemDiscount;
      return {
        product: line.product,
        variantId,
        selectedAttributes,
        productName: line.productName,
        productPrice: line.productPrice,
        productImage: line.productImage,
        variantImages: line.variantImages,
        variantSku: line.variantSku,
        discountPercent: line.discountPercent,
        variantDiscount: line.variantDiscount,
        quantity,
      };
    });

    // Deduct stock in parallel — variant stock or product stock
    await Promise.all(
      groupItems.map(({ productDoc, variantId, quantity }) => {
        if (variantId) {
          return Product.findOneAndUpdate(
            { _id: productDoc._id, 'variants._id': variantId },
            { $inc: { 'variants.$.stock': -quantity, soldCount: quantity } },
          );
        }
        return Product.findByIdAndUpdate(productDoc._id, {
          $inc: { stock: -quantity, soldCount: quantity },
        });
      }),
    );

    const effectiveSubtotal = subtotal - productDiscount;

    const { discount, couponCode } = couponCodes[sellerKey]
      ? await applyCoupon(couponCodes[sellerKey], sellerKey, effectiveSubtotal)
      : { discount: 0, couponCode: undefined };

    const { tax, shipping, total, selectedDeliveryOption } = computeSellerTotals({
      sellerKey,
      subtotal,
      productDiscount,
      couponDiscount: discount,
      firstProduct: groupItems[0].productDoc as unknown as ProductLike,
      deliverySelections,
    });

    const order = await Order.create({
      userId,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      subtotal,
      productDiscount,
      discount,
      couponCode,
      tax,
      shipping,
      total,
      estimatedDelivery,
      sellerMessages: sellerMessages[sellerKey] ? { [sellerKey]: sellerMessages[sellerKey] } : {},
      deliverySelections: selectedDeliveryOption ? { [sellerKey]: selectedDeliveryOption } : {},
      selectedDeliveryOption,
      paymentIntentId: isCardPayment ? paymentIntentId : undefined,
      ...(acceptance && {
        paymentStatus: 'not_required' as const,
        placedAt: acceptance.placedAt,
        acceptBy: acceptance.acceptBy,
        ...(mongoose.isValidObjectId(sellerKey) && { sellerId: sellerKey }),
      }),
    });

    createdOrders.push(order);
  }

  // Remove ordered items from the user's server-side cart
  const orderedProductIds = items.map(i => i.productId);
  await Cart.findOneAndUpdate(
    { userId },
    {
      $pull: {
        'sellers.$[].items': { product: { $in: orderedProductIds } },
      },
    },
  );
  // Drop any seller groups that are now empty
  await Cart.findOneAndUpdate(
    { userId },
    { $pull: { sellers: { items: { $size: 0 } } } },
  );

  return createdOrders;
}

export async function getUserOrders(userId: string) {
  return Order.find({ userId, ...buyerVisibleOrderFilter() })
    .sort({ createdAt: -1 })
    .populate({ path: 'items.product', populate: { path: 'sellerId', select: 'firstName lastName avatar' } });
}

export async function getOrderById(orderId: string, userId: string) {
  const order = await Order.findById(orderId).populate({
    path: 'items.product',
    populate: { path: 'sellerId', select: 'firstName lastName avatar' },
  });

  if (!order) throw new AppError(404, 'Order not found');
  if (order.userId.toString() !== userId) throw new AppError(403, 'Not authorized to access this order');
  // Drafts are resumed through checkout sessions, not order detail.
  if (!isBuyerVisibleOrder(order)) throw new AppError(404, 'Order not found');

  return order;
}

export async function cancelOrderAsBuyer(orderId: string, userId: string, cancelReason?: string) {
  if (cancelReason !== undefined && (typeof cancelReason !== 'string' || cancelReason.length > 500)) {
    throw new AppError(400, 'Cancellation reason must be text of at most 500 characters', 'invalid_cancel_reason');
  }
  const order = await Order.findById(orderId);
  if (!order || !isBuyerVisibleOrder(order)) throw new AppError(404, 'Order not found');
  if (order.userId.toString() !== userId) throw new AppError(403, 'Not authorized');
  if (order.paymentFlowVersion !== 'manual_capture' && ['credit-card', 'debit-card'].includes(order.paymentMethod.type)) {
    return cancelLegacyPaidOrder(order, userId, cancelReason);
  }
  // Manual-capture card orders and COD orders of the current shape (`not_required`) share one atomic
  // claim with seller acceptance, seller cancellation and the deadline scanner: exactly one wins.
  if (order.paymentFlowVersion === 'manual_capture' || order.paymentStatus === 'not_required') {
    if (order.status === 'cancelled') return order;
    const cancelled = await cancelPendingOrder(orderId, 'buyer_cancelled', new Date(), {
      actor: { role: 'buyer', id: userId },
      cancelReason,
    });
    const current = await Order.findById(orderId);
    if (current?.status === 'cancelled') return current;
    if (!cancelled) throw new AppError(409, 'The seller has already accepted this order or its payment is being captured', 'cancellation_conflict');
    throw new AppError(409, 'Order changed while cancellation was being processed', 'cancellation_conflict');
  }
  if (order.status !== 'pending') {
    throw new AppError(400, 'You can only cancel pending orders');
  }
  await restoreStock(order.items);

  order.status = 'cancelled';
  if (cancelReason) order.cancelReason = cancelReason;
  await order.save();
  return order;
}

export async function confirmOrderReceived(orderId: string, userId: string) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError(404, 'Order not found');
  if (order.userId.toString() !== userId) throw new AppError(403, 'Not authorized');
  if (order.status !== 'shipped') throw new AppError(400, 'Order must be shipped before confirming receipt');

  // Conditional on still being shipped: a stale read cannot overwrite a newer status or move the refund deadline.
  const delivered = await markOrderDelivered(orderId, 'shipped', new Date(), { role: 'buyer', id: userId });
  if (!delivered) throw new AppError(409, 'Order changed while confirming receipt');
  return delivered;
}
