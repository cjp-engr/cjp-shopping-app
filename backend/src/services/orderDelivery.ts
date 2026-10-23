import mongoose from 'mongoose';
import Order, { type IOrder } from '../models/Order.js';

const HOUR_MS = 60 * 60 * 1000;

/** Buyers can ask for a refund for seven days after recorded delivery. */
export const REFUND_WINDOW_MS = 168 * HOUR_MS;
/** A shipped order the buyer never confirms counts as delivered 48 hours after it shipped. */
export const AUTO_DELIVERY_AFTER_MS = 48 * HOUR_MS;

export type DeliveryActor = { role: 'buyer' | 'seller'; id: string } | { role: 'system' };

/**
 * Who may deliver the order. A seller is matched on the persisted `sellerId`; an older order that
 * never stored one is matched too, because the seller route has already proven product ownership.
 */
function ownerFilter(actor: DeliveryActor): Record<string, unknown> {
  if (actor.role === 'buyer') return { userId: actor.id };
  if (actor.role === 'seller') return { $or: [{ sellerId: actor.id }, { sellerId: { $exists: false } }] };
  return {};
}

/**
 * Moves a shipped order to delivered and records when, in one conditional update. The refund
 * window is written together with the delivery time and only if no delivery time exists, so a
 * duplicate or stale request can neither move the deadline nor replace another status change.
 * Returns null when nothing matched (unknown order, foreign actor, or not in `expectedStatus`).
 */
export async function markOrderDelivered(
  orderId: string,
  expectedStatus: 'shipped',
  deliveredAt: Date,
  actor: DeliveryActor,
): Promise<IOrder | null> {
  if (!mongoose.isValidObjectId(orderId)) return null;
  return Order.findOneAndUpdate(
    { _id: orderId, status: expectedStatus, deliveredAt: { $exists: false }, ...ownerFilter(actor) },
    {
      $set: {
        status: 'delivered',
        deliveredAt,
        refundRequestDeadlineAt: new Date(deliveredAt.getTime() + REFUND_WINDOW_MS),
      },
    },
    { new: true },
  );
}

/**
 * Delivers shipped orders whose 48 hours have passed. Each order's delivery time is its own
 * `shippedAt + 48h`, never the time this job happens to run, so downtime cannot extend a buyer's
 * refund window. Orders with a refund already requested are left alone.
 */
export async function autoDeliverShippedOrders(now: Date = new Date()): Promise<number> {
  const result = await Order.updateMany(
    {
      status: 'shipped',
      shippedAt: { $lte: new Date(now.getTime() - AUTO_DELIVERY_AFTER_MS) },
      refundRequestedAt: { $exists: false },
      deliveredAt: { $exists: false },
    },
    [
      {
        $set: {
          status: 'delivered',
          deliveredAt: { $add: ['$shippedAt', AUTO_DELIVERY_AFTER_MS] },
          refundRequestDeadlineAt: { $add: ['$shippedAt', AUTO_DELIVERY_AFTER_MS + REFUND_WINDOW_MS] },
        },
      },
    ],
  );
  return result.modifiedCount;
}
