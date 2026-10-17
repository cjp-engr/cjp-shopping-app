import mongoose from 'mongoose';
import Order, { type IOrder } from '../models/Order.js';
import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';
import { isSellerVisibleOrder } from './orderVisibility.js';
import { runCapture } from './orderCapture.js';

export type AcceptanceOutcome =
  | { kind: 'completed'; order: IOrder }
  | { kind: 'resolving'; order: IOrder };

type OrderKind = 'card' | 'cod' | 'legacy';

/** Cards and COD placed under the manual-capture flow carry a deadline; everything else is legacy. */
function orderKind(order: Pick<IOrder, 'paymentFlowVersion' | 'paymentStatus'>): OrderKind {
  if (order.paymentFlowVersion !== 'manual_capture') return 'legacy';
  return order.paymentStatus === 'not_required' ? 'cod' : 'card';
}

/**
 * Whether the seller owns the order. The persisted `sellerId` decides; orders placed before
 * it existed fall back to owning at least one of the ordered products.
 */
export async function isOrderSeller(order: Pick<IOrder, 'sellerId' | 'items'>, sellerId: string): Promise<boolean> {
  if (order.sellerId) return order.sellerId.toString() === sellerId;
  if (!mongoose.isValidObjectId(sellerId)) return false;

  const productIds = order.items.map(item =>
    item.product != null && typeof item.product === 'object' && '_id' in (item.product as object)
      ? (item.product as any)._id
      : item.product,
  );
  return (await Product.exists({ _id: { $in: productIds }, sellerId })) !== null;
}

/**
 * Explains why an acceptance claim matched nothing. Returns 'resolving' when a capture the
 * seller already started is still in flight, otherwise the error to throw.
 */
export function diagnoseUnclaimedOrder(
  order: Pick<IOrder, 'status' | 'paymentFlowVersion' | 'paymentStatus' | 'paymentIntentId' | 'acceptBy'>,
  now: Date,
): 'resolving' | AppError {
  if (order.status !== 'pending') {
    return new AppError(409, `Order is ${order.status}, not pending`, 'order_not_pending');
  }
  if (orderKind(order) === 'card' && order.paymentStatus === 'capture_pending') return 'resolving';
  if (order.acceptBy && order.acceptBy.getTime() <= now.getTime()) {
    return new AppError(409, 'The acceptance deadline for this order has passed', 'acceptance_deadline_passed');
  }
  if (orderKind(order) === 'card' && order.paymentStatus === 'authorized' && !order.paymentIntentId) {
    return new AppError(409, 'This order has no payment reference to capture', 'payment_reference_missing');
  }
  return new AppError(409, `Order is pending but not acceptable (payment ${order.paymentStatus ?? 'unknown'})`, 'order_not_pending');
}

/**
 * Seller acceptance. COD and legacy orders move to `preparing` in one atomic update; a card
 * order is first claimed as `capture_pending` (persisting intent before any Stripe call) and
 * then handed to the capture. Repeat accepts of a card order being captured report 'resolving'.
 */
export async function acceptOrder(params: {
  orderId: string;
  sellerId: string;
  now?: Date;
}): Promise<AcceptanceOutcome> {
  const { orderId, sellerId } = params;
  const now = params.now ?? new Date();

  const order = mongoose.isValidObjectId(orderId) ? await Order.findById(orderId) : null;
  if (!order || !isSellerVisibleOrder(order)) {
    throw new AppError(404, 'Order not found', 'order_not_found');
  }
  if (!(await isOrderSeller(order, sellerId))) {
    throw new AppError(403, 'Not authorized to accept this order', 'not_order_seller');
  }

  const kind = orderKind(order);
  if (kind === 'card') {
    const claimed = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: 'pending',
        paymentStatus: 'authorized',
        paymentIntentId: { $exists: true, $ne: '' },
        acceptBy: { $gt: now },
      },
      { $set: { paymentStatus: 'capture_pending' } },
      { new: true },
    );
    if (claimed) return runCapture(claimed, now);
  } else {
    const filter = kind === 'cod'
      ? { _id: order._id, status: 'pending', paymentStatus: 'not_required', acceptBy: { $gt: now } }
      : { _id: order._id, status: 'pending' };
    const accepted = await Order.findOneAndUpdate(filter, { $set: { status: 'preparing' } }, { new: true });
    if (accepted) return { kind: 'completed', order: accepted };
  }

  const current = await Order.findById(order._id);
  if (!current) throw new AppError(404, 'Order not found', 'order_not_found');
  const diagnosis = diagnoseUnclaimedOrder(current, now);
  if (diagnosis === 'resolving') return { kind: 'resolving', order: current };
  throw diagnosis;
}
