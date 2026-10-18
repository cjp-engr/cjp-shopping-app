import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import Order, { type IOrder } from '../models/Order.js';
import Product from '../models/Product.js';
import PaymentOperation, { type IPaymentOperation } from '../models/PaymentOperation.js';
import { AppError } from '../middleware/errorHandler.js';
import { restoreOrderReservations } from './orderCancellation.js';
import { verifyLegacyCapturedPayment, inspectLegacyPayment } from './legacyPayments.js';
import { claimOperationById, completeOperation, failOperation, withLeaseHeartbeat } from './paymentOperationService.js';
import { IDEMPOTENCY_SAFE_RETRY_MS, orderOperationKey } from './paymentOperationPolicy.js';
import { createOrderRefund, retrieveRefund } from './stripeService.js';

/** Claim the cancellation, reservations and refund job in one transaction, before moving money. */
export async function cancelLegacyPaidOrder(order: IOrder, buyerId: string, cancelReason?: string): Promise<IOrder> {
  if (order.status === 'cancelled') return order;
  if (order.status !== 'pending') throw new AppError(409, 'Only pending orders can be cancelled', 'cancellation_conflict');
  await verifyLegacyCapturedPayment(order);
  const key = orderOperationKey(order.id, 'refund', 1);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const cancelled = await Order.findOneAndUpdate({ _id: order._id, userId: buyerId, status: 'pending', paymentStatus: 'captured', paymentIntentId: order.paymentIntentId, total: order.total, stockRestoredAt: { $exists: false } }, {
        $set: { status: 'cancelled', paymentStatus: 'refund_pending', stockRestoredAt: new Date(), refundRequestedAt: new Date(), cancelReason: cancelReason || 'buyer_cancelled' },
      }, { new: true, session });
      if (!cancelled) return;
      // Older orders did not persist sellerId. Resolve it only when all products agree.
      if (!cancelled.sellerId) {
        const sellers = await Product.distinct('sellerId', { _id: { $in: cancelled.items.map(i => i.product) } }).session(session);
        if (sellers.length === 1) cancelled.sellerId = sellers[0];
      }
      await restoreOrderReservations(cancelled, session);
      await PaymentOperation.create([{ action: 'refund', orderId: cancelled._id, paymentIntentId: cancelled.paymentIntentId, idempotencyKey: key }], { session });
    });
  } finally { await session.endSession(); }
  const current = (await Order.findById(order.id))!;
  if (current.status !== 'cancelled') throw new AppError(409, 'The seller has already accepted this order', 'cancellation_conflict');
  const job = await PaymentOperation.findOne({ idempotencyKey: key });
  if (job) {
    const owner = randomUUID();
    const claimed = await claimOperationById(job.id, owner);
    if (claimed) await resumeLegacyRefund(claimed, owner);
  }
  return (await Order.findById(order.id))!;
}

export async function resumeLegacyRefund(operation: IPaymentOperation, owner: string, now = new Date()): Promise<void> {
  await withLeaseHeartbeat(operation.id, owner, async () => {
    try {
      const order = await Order.findById(operation.orderId);
      if (!order || order.paymentFlowVersion === 'manual_capture' || order.status !== 'cancelled'
          || !['refund_pending', 'refunded'].includes(order.paymentStatus ?? '') || order.paymentIntentId !== operation.paymentIntentId
          || operation.idempotencyKey !== orderOperationKey(order.id, 'refund', 1)) {
        throw new AppError(409, 'Refund job does not match an eligible cancelled legacy order', 'refund_review');
      }
      // Reconcile the Stripe list before any retry, including after key retention expires.
      const verified = await inspectLegacyPayment(order, operation.idempotencyKey);
      if (verified.kind !== 'captured') throw new AppError(409, verified.reason, 'refund_review');
      const own = verified.refunds.filter(r => r.metadata?.operationKey === operation.idempotencyKey && r.metadata?.orderId === order.id);
      if (own.length > 1) throw new AppError(409, 'Multiple refunds match this operation', 'refund_review');
      const knownId = operation.stripeObjectId || order.refundId || own[0]?.id;
      let refund;
      if (knownId) refund = own.find(r => r.id === knownId) ?? await retrieveRefund(knownId);
      else {
        if (order.paymentStatus === 'refunded') throw new AppError(409, 'Refunded order has no refund reference', 'refund_review');
        if (now.getTime() - operation.createdAt.getTime() >= IDEMPOTENCY_SAFE_RETRY_MS) throw new AppError(409, 'Refund retry window expired; reconcile in Stripe before proceeding', 'refund_review');
        refund = await createOrderRefund(order.paymentIntentId!, verified.amountMinor, operation.idempotencyKey, order.id);
      }
      const pi = typeof refund.payment_intent === 'string' ? refund.payment_intent : refund.payment_intent?.id;
      if (pi !== order.paymentIntentId || refund.amount !== verified.amountMinor || refund.currency !== verified.currency) throw new AppError(409, 'Refund does not match the original payment', 'refund_review');
      // Save the refund reference before completing the ledger: a crash can only cause a read.
      await PaymentOperation.updateOne({ _id: operation._id, leaseOwner: owner, status: 'in_progress' }, { $set: { stripeObjectId: refund.id } });
      await Order.updateOne({ _id: order._id, paymentStatus: 'refund_pending' }, { $set: { refundId: refund.id } });
      if (refund.status === 'failed' || refund.status === 'canceled' || refund.status === 'requires_action') throw new AppError(409, 'Stripe refund needs support review; no replacement refund will be submitted', 'refund_review');
      if (refund.status === 'succeeded') {
        // Order first: succeeded ledger entries never need a second money-changing request.
        await Order.updateOne({ _id: order._id, paymentStatus: 'refund_pending' }, { $set: { paymentStatus: 'refunded' }, $unset: { paymentError: '' } });
        await completeOperation(operation.id, owner, { stripeObjectId: refund.id }, now);
      } else {
        // Stripe has accepted the refund. Pending bank processing is not a failed attempt.
        await PaymentOperation.updateOne({ _id: operation._id, leaseOwner: owner, status: 'in_progress' }, { $set: { status: 'pending', nextAttemptAt: new Date(now.getTime() + 60000), attempts: 0 }, $unset: { leaseOwner: '', leaseExpiresAt: '' } });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const needsReview = error instanceof AppError;
      const status = await failOperation(operation.id, owner, { code: needsReview ? 'refund_review' : 'refund_retry', message }, { ambiguous: needsReview }, now);
      if (status === 'needs_support') await Order.updateOne({ _id: operation.orderId, paymentStatus: 'refund_pending' }, { $set: { paymentError: { code: 'refund_review', message, at: now } } });
    }
  });
}
