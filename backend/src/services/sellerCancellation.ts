import mongoose from 'mongoose';
import Order, { type IOrder } from '../models/Order.js';
import PaymentOperation from '../models/PaymentOperation.js';
import { AppError } from '../middleware/errorHandler.js';
import { isSellerVisibleOrder } from './orderVisibility.js';
import { cancelPendingOrder } from './orderCancellation.js';
import { orderOperationKey } from './paymentOperationPolicy.js';

export const MAX_CANCEL_REASON_LENGTH = 1000;

/** How the money side of a cancelled card order stands. Omitted for cash on delivery. */
export interface SellerPaymentOperation {
  status: 'pending' | 'completed' | 'needs_review';
}

export interface SellerCancellationResult {
  order: IOrder;
  paymentOperation?: SellerPaymentOperation;
}

/**
 * True for a pending order this seller owns whose payment state can be cancelled: an authorized
 * hold or cash on delivery. A capture in progress, or any other payment shape, is not cancellable.
 */
export function canSellerCancelPending(
  order: { status: string; sellerId?: unknown; paymentStatus?: string | null },
  sellerId: string,
): boolean {
  return order.status === 'pending'
    && order.sellerId != null
    && String(order.sellerId) === sellerId
    && (order.paymentStatus === 'authorized' || order.paymentStatus === 'not_required');
}

function normalizeReason(reason: unknown): string {
  const trimmed = typeof reason === 'string' ? reason.trim() : '';
  if (trimmed.length < 1 || trimmed.length > MAX_CANCEL_REASON_LENGTH) {
    throw new AppError(400, `A cancellation reason of 1 to ${MAX_CANCEL_REASON_LENGTH} characters is required`, 'invalid_cancel_reason');
  }
  return trimmed;
}

async function paymentOperationFor(order: IOrder): Promise<SellerPaymentOperation | undefined> {
  if (order.paymentStatus === 'released') return { status: 'completed' };
  if (order.paymentStatus !== 'release_pending') return undefined;
  const release = await PaymentOperation.findOne({ idempotencyKey: orderOperationKey(order.id, 'release', 1) }).lean();
  return { status: release?.status === 'needs_support' ? 'needs_review' : 'pending' };
}

async function outcome(order: IOrder): Promise<SellerCancellationResult> {
  const paymentOperation = await paymentOperationFor(order);
  return { order, ...(paymentOperation ? { paymentOperation } : {}) };
}

/**
 * A seller cancels their own pending order. Ownership is the persisted `sellerId`; orders without one,
 * and any payment shape other than an authorized hold or cash on delivery, are unavailable. The claim is
 * shared with acceptance, buyer cancellation and expiry, so exactly one of them wins. Cancelling can
 * succeed while the hold release is still settling: `paymentOperation` says where the money stands.
 * A repeat request for an order that is already cancelled returns it unchanged, first actor included.
 */
export async function cancelOrderAsSeller(
  orderId: string,
  sellerId: string,
  reason: unknown,
  now: Date = new Date(),
): Promise<SellerCancellationResult> {
  const trimmedReason = normalizeReason(reason);

  const order = mongoose.isValidObjectId(orderId) ? await Order.findById(orderId) : null;
  if (!order || !isSellerVisibleOrder(order)) throw new AppError(404, 'Order not found', 'order_not_found');
  if (!order.sellerId) {
    throw new AppError(409, 'This order cannot be cancelled by the seller', 'cancellation_unavailable');
  }
  if (order.sellerId.toString() !== sellerId) {
    throw new AppError(403, 'Not authorized to cancel this order', 'not_order_seller');
  }

  if (order.status === 'cancelled') return outcome(order);
  if (order.status !== 'pending' || order.paymentStatus === 'capture_pending') {
    throw new AppError(409, 'This order is no longer waiting for acceptance. Refresh to see its latest status.', 'cancellation_conflict');
  }
  if (order.paymentStatus !== 'authorized' && order.paymentStatus !== 'not_required') {
    throw new AppError(409, 'This order cannot be cancelled by the seller', 'cancellation_unavailable');
  }

  await cancelPendingOrder(order._id, 'seller_cancelled', now, {
    actor: { role: 'seller', id: sellerId },
    cancelReason: trimmedReason,
  });

  // Whoever won the shared claim, re-read: a cancelled order is the answer, anything else is a lost race.
  const current = await Order.findById(order._id);
  if (current?.status === 'cancelled') return outcome(current);
  throw new AppError(409, 'The order was accepted or its payment is being captured. Refresh to see its latest status.', 'cancellation_conflict');
}
