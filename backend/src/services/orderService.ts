import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import { AppError } from '../middleware/errorHandler.js';

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
  const { userId, items, shippingAddress, paymentMethod, sellerMessages = {}, couponCodes = {}, deliverySelections = {} } = params;

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
      if (variant.stock < item.quantity) throw new AppError(400, `Insufficient stock for variant of: ${product.name}`);
    } else {
      if (product.stock < item.quantity) throw new AppError(400, `Insufficient stock for: ${product.name}`);
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

  const createdOrders = [];

  for (const [sellerKey, groupItems] of sellerGroups) {
    let subtotal = 0;
    let productDiscount = 0;

    const orderItems = groupItems.map(({ productDoc, variantId, selectedAttributes, quantity }) => {
      const variant = variantId
        ? ((productDoc as any).variants?.id
          ? (productDoc as any).variants.id(variantId)
          : (productDoc as any).variants?.find((v: any) => v._id?.toString() === variantId))
        : undefined;
      const unitPrice = variant?.price ?? productDoc.price;
      const gross = unitPrice * quantity;
      const discPct = variant ? (variant.discount ?? 0) : (productDoc.discount ?? 0);
      const itemDiscount = gross * (discPct / 100);
      subtotal += gross;
      productDiscount += itemDiscount;
      return {
        product: productDoc._id,
        variantId,
        selectedAttributes,
        productName: productDoc.name,
        productPrice: unitPrice,
        productImage: variant?.image || productDoc.image,
        variantSku: variant?.sku,
        variantDiscount: variant ? variant.discount : undefined,
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

    const afterAllDiscounts = effectiveSubtotal - discount;
    const tax = afterAllDiscounts * 0.08;

    // Use seller's configured fee per selected delivery option
    const firstProduct = groupItems[0].productDoc as any;
    const shippingFee: string | undefined = firstProduct.shippingFee;
    const shippingFeeAmounts: Record<string, number> = firstProduct.shippingFeeAmounts?.toJSON?.() ?? firstProduct.shippingFeeAmounts ?? {};
    const selectedDeliveryOption = deliverySelections[sellerKey];
    let shipping: number;
    if (shippingFee === 'free') {
      shipping = 0;
    } else if (shippingFee === 'buyer_pays') {
      shipping = (selectedDeliveryOption && shippingFeeAmounts[selectedDeliveryOption]) ?? Object.values(shippingFeeAmounts)[0] ?? 0;
    } else {
      shipping = afterAllDiscounts >= 50 ? 0 : 9.99;
    }

    const total = afterAllDiscounts + tax + shipping;

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
    });

    createdOrders.push(order);
  }

  return createdOrders;
}

export async function getUserOrders(userId: string) {
  return Order.find({ userId })
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

  return order;
}

export async function cancelOrderAsBuyer(orderId: string, userId: string, cancelReason?: string) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError(404, 'Order not found');
  if (order.userId.toString() !== userId) throw new AppError(403, 'Not authorized');
  if (!['pending', 'preparing'].includes(order.status)) {
    throw new AppError(400, 'You can only cancel pending or preparing orders');
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

  order.status = 'delivered';
  await order.save();
  return order;
}
