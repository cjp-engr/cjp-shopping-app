import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Order, { type IOrder } from '../models/Order.js';
import { orderOperationKey } from './paymentOperationPolicy.js';
import { releaseIntentOperation } from './paymentRelease.js';

export type OrderCancelReason = 'seller_acceptance_timeout' | 'authorization_expired' | 'buyer_cancelled';

export interface OrderCancellationResult {
  releaseStatus: 'not_required' | 'released' | 'pending';
}

/**
 * Gives back what an order reserved at checkout: product or variant stock, the matching
 * sold count, and one use of its coupon. Callers guard it with the `stockRestoredAt` claim
 * so it runs once per order.
 */
export async function restoreOrderReservations(order: IOrder, session: mongoose.ClientSession): Promise<void> {
  for (const item of order.items) {
    if (item.variantId) {
      await Product.updateOne(
        { _id: item.product, 'variants._id': item.variantId },
        { $inc: { 'variants.$.stock': item.quantity, soldCount: -item.quantity } },
        { session },
      );
    } else {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity, soldCount: -item.quantity } },
        { session },
      );
    }
  }

  if (order.couponCode && order.sellerId) {
    await Coupon.updateOne(
      { code: order.couponCode, sellerId: order.sellerId, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } },
      { session },
    );
  }
}

/**
 * Cancels a pending, not yet accepted order and restores its reservations exactly once,
 * then releases the card hold. Returns null when the order is not cancellable or another
 * operation (acceptance, a concurrent cancel) owns it.
 */
export async function cancelPendingOrder(
  orderId: string | mongoose.Types.ObjectId,
  reason: OrderCancelReason,
  now: Date = new Date(),
  options: { buyerId?: string; cancelReason?: string } = {},
): Promise<OrderCancellationResult | null> {
  const current = await Order.findOne({
    _id: orderId,
    status: 'pending',
    paymentStatus: { $in: ['authorized', 'not_required'] },
    stockRestoredAt: { $exists: false },
    ...(options.buyerId ? { userId: options.buyerId } : {}),
  }).lean();
  if (!current) return null;

  const isCard = current.paymentStatus === 'authorized';
  let cancelled: IOrder | null = null;

  const transaction = await mongoose.startSession();
  try {
    await transaction.withTransaction(async () => {
      cancelled = await Order.findOneAndUpdate(
        {
          _id: current._id,
          status: 'pending',
          paymentStatus: current.paymentStatus,
          stockRestoredAt: { $exists: false },
          ...(options.buyerId ? { userId: options.buyerId } : {}),
        },
        {
          $set: {
            status: 'cancelled',
            cancelReason: options.cancelReason || reason,
            stockRestoredAt: now,
            ...(isCard ? { paymentStatus: 'release_pending' } : {}),
          },
        },
        { new: true, session: transaction },
      );
      if (!cancelled) return;
      await restoreOrderReservations(cancelled, transaction);
    });
  } finally {
    await transaction.endSession();
  }

  const order = cancelled as IOrder | null;
  if (!order) return null;
  if (!isCard) return { releaseStatus: 'not_required' };

  const id = order._id.toString();
  if (!order.paymentIntentId) {
    console.error(`[Orders] Cancelled card order ${id} has no payment intent; its hold needs support review`);
    return { releaseStatus: 'pending' };
  }

  const outcome = await releaseIntentOperation({
    idempotencyKey: orderOperationKey(id, 'release', 1),
    paymentIntentId: order.paymentIntentId,
    orderId: order._id,
  });
  if (outcome !== 'released') return { releaseStatus: 'pending' };

  await Order.updateOne({ _id: order._id, paymentStatus: 'release_pending' }, { $set: { paymentStatus: 'released' } });
  return { releaseStatus: 'released' };
}
