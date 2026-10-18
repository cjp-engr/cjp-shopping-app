import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import type Stripe from 'stripe';
import Order from '../models/Order.js';
import RefundRequest from '../models/RefundRequest.js';
import PaymentOperation, { type IPaymentOperation } from '../models/PaymentOperation.js';
import CheckoutSession from '../models/CheckoutSession.js';
import { AppError } from '../middleware/errorHandler.js';
import { claimOperationById, failOperation, withLeaseHeartbeat } from './paymentOperationService.js';
import { IDEMPOTENCY_SAFE_RETRY_MS } from './paymentOperationPolicy.js';
import { createOrderRefund, listIntentRefunds, retrieveIntentWithCharge, retrieveRefund } from './stripeService.js';
import { ensureRefundAllocation } from './refundEligibility.js';
import { shippingForRefundSelection, shippingHistoryEligible, validRefundAccounting } from './refundShipping.js';

const review = () => new AppError(409, 'Delivered refund needs payment reconciliation', 'delivered_refund_review');
const matchesIntent = (refund: Stripe.Refund, id: string) => (typeof refund.payment_intent === 'string' ? refund.payment_intent : refund.payment_intent?.id) === id;

/** Keeps the original financial reservation; uncertain money must never become available again. */
async function needsReview(operation: IPaymentOperation, owner: string, now: Date) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const owned = await PaymentOperation.updateOne({ _id: operation._id, leaseOwner: owner, status: 'in_progress' }, {
        $set: { status: 'needs_support', lastError: { code: 'delivered_refund_review', message: 'Delivered refund needs payment reconciliation', at: now } },
        $unset: { leaseOwner: '', leaseExpiresAt: '', nextAttemptAt: '' },
      }, { session });
      if (!owned.matchedCount) return;
      await RefundRequest.updateOne({ _id: operation.refundRequestId, state: { $in: ['processing', 'needs_review'] } }, { $set: { state: 'needs_review', errorCode: 'delivered_refund_review' } }, { session });
    });
  } finally { await session.endSession(); }
}

export async function resumeDeliveredRefund(operation: IPaymentOperation, owner: string, now = new Date()): Promise<void> {
  await withLeaseHeartbeat(operation.id, owner, async () => {
    let creationAttempted = false;
    try {
      const r = await RefundRequest.findById(operation.refundRequestId);
      const o = await Order.findById(operation.orderId);
      if (!r || !o || operation.refundPurpose !== 'delivered_items' || r.orderId.toString() !== o.id
          || r.paymentOperationKey !== operation.idempotencyKey || operation.idempotencyKey !== `refund-request:${r.id}:refund:1`
          || operation.paymentIntentId !== o.paymentIntentId || operation.amountMinor !== r.amountMinor || operation.currency !== r.currency
          || !['processing', 'needs_review'].includes(r.state) || o.status !== 'delivered'
          || o.activeRefundRequestId?.toString() !== r.id || o.userId.toString() !== r.buyerId.toString()
          || o.sellerId?.toString() !== r.sellerId.toString() || !['captured', 'partially_refunded'].includes(o.paymentStatus ?? '')
          || !['credit-card', 'debit-card'].includes(o.paymentMethod.type)) throw review();
      const allocation = await ensureRefundAllocation(o);
      if (!allocation || r.allocationVersion !== allocation.version || r.currency !== allocation.currency || !Number.isSafeInteger(r.amountMinor) || r.amountMinor <= 0) throw review();
      let quoted = 0; const seen = new Set<string>();
      for (const u of r.units) {
        const key = `${u.lineId}#${u.ordinal}`;
        const expected = allocation.units.find(a => a.lineId === u.lineId && a.ordinal === u.ordinal);
        if (!expected || seen.has(key) || expected.merchandiseMinor !== u.merchandiseMinor || expected.taxMinor !== u.taxMinor
            || !o.refundUnitsTaken?.some(t => t.lineId === u.lineId && t.ordinal === u.ordinal)) throw review();
        seen.add(key); quoted += u.merchandiseMinor + u.taxMinor;
      }
      const shipping = r.shippingMinor ?? 0;
      const beforeRequest = { refundUnitsTaken: (o.refundUnitsTaken ?? []).filter(u => !seen.has(`${u.lineId}#${u.ordinal}`)), refundedShippingMinor: o.refundedShippingMinor ?? 0 };
      const expectedShipping = await shippingHistoryEligible(o) ? shippingForRefundSelection(allocation, beforeRequest, r.units, r.reasonCode) : 0;
      if (r.shippingMinor !== undefined && shipping !== expectedShipping) throw review();
      quoted += shipping;
      const priorAmount = o.refundedAmountMinor ?? 0; const reserved = o.refundReservedAmountMinor ?? 0;
      if (quoted !== r.amountMinor || reserved !== r.amountMinor || (o.refundReservedShippingMinor ?? 0) !== shipping
          || !validRefundAccounting(allocation, o)) throw review();
      const intent = await retrieveIntentWithCharge(o.paymentIntentId!); const charge = intent.latest_charge;
      if (intent.livemode !== false || intent.id !== o.paymentIntentId || intent.status !== 'succeeded'
          || intent.amount !== allocation.capturedAmountMinor || intent.amount_received !== allocation.capturedAmountMinor
          || intent.currency !== allocation.currency
          || (o.paymentFlowVersion !== 'manual_capture' && intent.metadata?.userId !== o.userId.toString())
          || (intent.metadata?.userId && intent.metadata.userId !== o.userId.toString())
          || (o.paymentFlowVersion === 'manual_capture' && (intent.metadata?.draftOrderId !== o.id || intent.metadata?.sellerId !== o.sellerId?.toString()))
          || !charge || typeof charge === 'string' || !charge.paid || charge.disputed || charge.amount !== allocation.capturedAmountMinor) throw review();
      if (o.paymentFlowVersion === 'manual_capture') {
        if (!o.checkoutSessionId || intent.metadata?.checkoutSessionId !== o.checkoutSessionId || !mongoose.isValidObjectId(o.checkoutSessionId)) throw review();
        const checkout = await CheckoutSession.findOne({ _id: o.checkoutSessionId, buyerId: o.userId, status: 'placed', sellers: { $elemMatch: {
          draftOrderId: o._id, sellerId: o.sellerId, paymentIntentId: intent.id, amountMinor: allocation.capturedAmountMinor, currency: allocation.currency,
        } } });
        if (!checkout) throw review();
      }
      const all = await listIntentRefunds(intent.id);
      const own = all.filter(f => f.metadata?.operationKey === operation.idempotencyKey && f.metadata?.orderId === o.id && f.metadata?.refundRequestId === r.id);
      if (own.length > 1) throw review();
      const previous = await RefundRequest.find({ orderId: o._id, state: 'refunded', _id: { $ne: r._id } });
      let previousAmount = 0;
      for (const earlier of previous) {
        const provider = all.filter(f => f.id === earlier.providerRefundId && f.metadata?.operationKey === earlier.paymentOperationKey
          && f.metadata?.orderId === o.id && f.metadata?.refundRequestId === earlier.id);
        if (provider.length !== 1 || provider[0].status !== 'succeeded' || provider[0].amount !== earlier.amountMinor
            || provider[0].currency !== r.currency || !matchesIntent(provider[0], intent.id)) throw review();
        previousAmount += earlier.amountMinor;
      }
      if (previousAmount !== priorAmount || all.some(f => !own.includes(f) && !previous.some(p => p.providerRefundId === f.id))) throw review();
      const activeOwn = own.filter(f => !['failed', 'canceled'].includes(f.status ?? ''));
      if (!Number.isSafeInteger(charge.amount_refunded) || charge.amount_refunded < priorAmount
          || charge.amount_refunded > priorAmount + activeOwn.reduce((s, f) => s + f.amount, 0)) throw review();
      const knownId = operation.stripeObjectId || r.providerRefundId || own[0]?.id;
      let refund: Stripe.Refund;
      if (knownId) {
        refund = own.find(f => f.id === knownId) ?? await retrieveRefund(knownId);
      } else {
        if (now.getTime() - operation.createdAt.getTime() >= IDEMPOTENCY_SAFE_RETRY_MS) throw review();
        // Do not issue money after losing the operation's lease during provider reconciliation.
        if (!await PaymentOperation.exists({ _id: operation._id, status: 'in_progress', leaseOwner: owner })) return;
        creationAttempted = true;
        refund = await createOrderRefund(intent.id, r.amountMinor, operation.idempotencyKey, o.id, r.id);
      }
      if (!refund || !matchesIntent(refund, intent.id) || refund.amount !== r.amountMinor || refund.currency !== r.currency
          || refund.metadata?.operationKey !== operation.idempotencyKey || refund.metadata?.orderId !== o.id || refund.metadata?.refundRequestId !== r.id
          || (operation.stripeObjectId && refund.id !== operation.stripeObjectId) || (r.providerRefundId && refund.id !== r.providerRefundId)) throw review();
      const stored = await PaymentOperation.updateOne({ _id: operation._id, status: 'in_progress', leaseOwner: owner }, { $set: { stripeObjectId: refund.id } });
      if (!stored.matchedCount) return;
      await RefundRequest.updateOne({ _id: r._id, state: { $in: ['processing', 'needs_review'] } }, { $set: { providerRefundId: refund.id } });
      if (refund.status === 'succeeded') {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            const owned = await PaymentOperation.updateOne({ _id: operation._id, status: 'in_progress', leaseOwner: owner }, {
              $set: { status: 'succeeded', completedAt: now, stripeObjectId: refund.id }, $unset: { leaseOwner: '', leaseExpiresAt: '', nextAttemptAt: '', lastError: '' },
            }, { session });
            if (!owned.matchedCount) return;
            const request = await RefundRequest.updateOne({ _id: r._id, state: { $in: ['processing', 'needs_review'] } }, { $set: { state: 'refunded', providerRefundId: refund.id }, $unset: { errorCode: '' } }, { session });
            if (!request.matchedCount) throw review();
            const order = await Order.updateOne({ _id: o._id, status: 'delivered', activeRefundRequestId: r._id,
              refundReservedAmountMinor: r.amountMinor, refundedAmountMinor: o.refundedAmountMinor ?? { $in: [0, null] },
              refundReservedShippingMinor: o.refundReservedShippingMinor ?? { $in: [0, null] }, refundedShippingMinor: o.refundedShippingMinor ?? { $in: [0, null] } }, {
              $inc: { refundReservedAmountMinor: -r.amountMinor, refundedAmountMinor: r.amountMinor, refundReservedShippingMinor: -shipping, refundedShippingMinor: shipping },
              $set: { paymentStatus: priorAmount + r.amountMinor === allocation.capturedAmountMinor ? 'refunded' : 'partially_refunded' },
              $unset: { activeRefundRequestId: '' },
            }, { session });
            if (!order.matchedCount) throw review();
          });
        } finally { await session.endSession(); }
      } else if (refund.status === 'pending') {
        await RefundRequest.updateOne({ _id: r._id, state: { $in: ['processing', 'needs_review'] } }, { $set: { state: 'processing' }, $unset: { errorCode: '' } });
        await PaymentOperation.updateOne({ _id: operation._id, status: 'in_progress', leaseOwner: owner }, {
          $set: { status: 'pending', nextAttemptAt: new Date(now.getTime() + 60000), attempts: 0 }, $unset: { leaseOwner: '', leaseExpiresAt: '', lastError: '' },
        });
      } else { throw review(); }
    } catch (error) {
      if (!creationAttempted && !(error instanceof AppError)) {
        // Provider reads and database reads cannot create a refund. Keep them retryable.
        const outcome = await failOperation(operation.id, owner, { code: 'delivered_refund_retry', message: 'Refund verification temporarily unavailable' }, { ambiguous: false }, now);
        if (outcome === 'needs_support') await RefundRequest.updateOne({ _id: operation.refundRequestId, state: 'processing' }, { $set: { state: 'needs_review', errorCode: 'delivered_refund_review' } });
      } else { await needsReview(operation, owner, now); }
    }
  });
}

/** Reconciliation can recover ambiguous creates by listing matching metadata, never by creating again. */
export async function reconcileDeliveredRefund(requestId: string, now = new Date()): Promise<void> {
  if (!mongoose.isValidObjectId(requestId)) return;
  const r = await RefundRequest.findOne({ _id: requestId, state: { $in: ['processing', 'needs_review'] } });
  if (!r) return;
  const job = await PaymentOperation.findOne({ refundRequestId: r._id, refundPurpose: 'delivered_items', idempotencyKey: r.paymentOperationKey });
  if (!job) return;
  if (job.status === 'needs_support') {
    const matches = await listIntentRefunds(job.paymentIntentId!);
    const own = matches.filter(f => f.metadata?.operationKey === job.idempotencyKey && f.metadata?.orderId === r.orderId.toString() && f.metadata?.refundRequestId === r.id);
    if (own.length !== 1 || !['succeeded', 'pending'].includes(own[0].status ?? '')) return;
    await PaymentOperation.updateOne({ _id: job._id, status: 'needs_support' }, {
      $set: { status: 'pending', stripeObjectId: own[0].id, nextAttemptAt: now }, $unset: { leaseOwner: '', leaseExpiresAt: '' },
    });
  }
  await PaymentOperation.updateOne({ _id: job._id, status: 'pending' }, { $set: { nextAttemptAt: now } });
  const owner = randomUUID(); const claimed = await claimOperationById(job.id, owner, now);
  if (claimed) await resumeDeliveredRefund(claimed, owner, now);
}

/** Signed events are hints only: settlement still retrieves the current provider objects. */
export async function handleDeliveredRefundEvent(event: Stripe.Event): Promise<void> {
  const object = event.data.object as Stripe.Refund & { payment_intent?: string | Stripe.PaymentIntent | null };
  const requestId = object.metadata?.refundRequestId;
  const intentId = typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id;
  const candidates = await RefundRequest.find({ state: { $in: ['processing', 'needs_review'] }, $or: [
    ...(requestId && mongoose.isValidObjectId(requestId) ? [{ _id: requestId }] : []),
    { providerRefundId: object.id },
    ...(intentId ? [{ orderId: { $in: await Order.find({ paymentIntentId: intentId }).distinct('_id') } }] : []),
  ] }).select('_id');
  for (const r of candidates) await reconcileDeliveredRefund(r.id);
}

export async function attemptDeliveredRefund(requestId: string): Promise<void> {
  try { await reconcileDeliveredRefund(requestId); }
  catch { console.error('[DeliveredRefund] Deferred reconciliation; payment worker will retry'); }
}

export async function reconcileReviewDeliveredRefunds(now = new Date()): Promise<void> {
  const due = { $or: [{ nextReconcileAt: { $exists: false } }, { nextReconcileAt: null }, { nextReconcileAt: { $lte: now } }] };
  const requests = await RefundRequest.find({ state: 'needs_review', ...due }).sort({ nextReconcileAt: 1, _id: 1 }).limit(50).select('_id');
  for (const r of requests) {
    const claimed = await RefundRequest.updateOne({ _id: r._id, state: 'needs_review', ...due }, { $set: { nextReconcileAt: new Date(now.getTime() + 60000) } });
    if (!claimed.modifiedCount) continue;
    try { await reconcileDeliveredRefund(r.id, now); }
    catch { console.error('[DeliveredRefund] Could not reconcile a review request'); }
  }
}
