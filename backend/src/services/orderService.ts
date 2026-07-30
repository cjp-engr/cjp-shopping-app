import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import { AppError } from '../middleware/errorHandler.js';

interface OrderItem {
  productId: string;
  quantity: number;
}

interface CreateOrderParams {
  userId: string;
  items: OrderItem[];
  shippingAddress: object;
  paymentMethod: object;
  sellerMessages?: Record<string, string>;
  couponCodes?: Record<string, string>;
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

async function restoreStock(items: Array<{ product: unknown; quantity: number }>) {
  const updates = items.map(item =>
    Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } }),
  );
  await Promise.all(updates);
}

export async function createOrders(params: CreateOrderParams) {
  const { userId, items, shippingAddress, paymentMethod, sellerMessages = {}, couponCodes = {} } = params;

  // Validate all products and group by seller in one pass
  const sellerGroups = new Map<string, Array<{ productDoc: InstanceType<typeof Product>; quantity: number }>>();

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) throw new AppError(404, `Product not found: ${item.productId}`);
    if (product.stock < item.quantity) throw new AppError(400, `Insufficient stock for: ${product.name}`);

    const sellerKey = product.sellerId?.toString() ?? '__unknown__';
    if (!sellerGroups.has(sellerKey)) sellerGroups.set(sellerKey, []);
    sellerGroups.get(sellerKey)!.push({ productDoc: product, quantity: item.quantity });
  }

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

  const createdOrders = [];

  for (const [sellerKey, groupItems] of sellerGroups) {
    let subtotal = 0;

    const orderItems = groupItems.map(({ productDoc, quantity }) => {
      subtotal += productDoc.price * quantity;
      return {
        product: productDoc._id,
        productName: productDoc.name,
        productPrice: productDoc.price,
        productImage: productDoc.image,
        quantity,
      };
    });

    // Deduct stock in parallel
    await Promise.all(
      groupItems.map(({ productDoc, quantity }) =>
        Product.findByIdAndUpdate(productDoc._id, {
          $inc: { stock: -quantity, soldCount: quantity },
        }),
      ),
    );

    const { discount, couponCode } = couponCodes[sellerKey]
      ? await applyCoupon(couponCodes[sellerKey], sellerKey, subtotal)
      : { discount: 0, couponCode: undefined };

    const discountedSubtotal = subtotal - discount;
    const tax = discountedSubtotal * 0.08;
    const shipping = discountedSubtotal >= 50 ? 0 : 9.99;
    const total = discountedSubtotal + tax + shipping;

    const order = await Order.create({
      userId,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      subtotal,
      discount,
      couponCode,
      tax,
      shipping,
      total,
      estimatedDelivery,
      sellerMessages: sellerMessages[sellerKey] ? { [sellerKey]: sellerMessages[sellerKey] } : {},
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
