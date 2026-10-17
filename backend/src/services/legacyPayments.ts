import type Stripe from 'stripe';
import Order, { type IOrder } from '../models/Order.js';
import { AppError } from '../middleware/errorHandler.js';
import { listIntentRefunds, retrieveIntentWithCharge } from './stripeService.js';

export type LegacyPaymentInspection =
  | { kind: 'captured'; amountMinor: number; currency: string; capturedAt: Date; refunds: Stripe.Refund[] }
  | { kind: 'refunded' | 'review'; reason: string };

/** Read-only, authoritative verification. Never interpret an absent reference as a paid order. */
export async function inspectLegacyPayment(order: IOrder, ownRefundKey?: string): Promise<LegacyPaymentInspection> {
  if (order.paymentFlowVersion === 'manual_capture' || !['credit-card', 'debit-card'].includes(order.paymentMethod.type)) {
    return { kind: 'review', reason: 'Not a legacy card payment' };
  }
  const id = order.paymentIntentId;
  if (!id || !id.startsWith('pi_')) return { kind: 'review', reason: 'Missing Stripe payment reference' };
  if (await Order.exists({ _id: { $ne: order._id }, paymentIntentId: id })) return { kind: 'review', reason: 'Payment reference is shared by multiple orders' };
  const intent = await retrieveIntentWithCharge(id);
  const amountMinor = Math.round(order.total * 100);
  const charge = intent.latest_charge;
  if (intent.id !== id || intent.status !== 'succeeded' || !Number.isSafeInteger(amountMinor) || amountMinor <= 0
      || intent.amount !== amountMinor || intent.amount_received !== amountMinor || intent.currency !== 'usd'
      || intent.metadata?.userId !== order.userId.toString()
      || !charge || typeof charge === 'string' || !charge.paid || charge.amount !== amountMinor) {
    return { kind: 'review', reason: 'Stripe payment does not match the buyer, amount, currency, or captured state' };
  }
  const refunds = await listIntentRefunds(id);
  if (!ownRefundKey && charge.amount_refunded === amountMinor) return { kind: 'refunded', reason: 'Payment has already been fully refunded' };
  const own = ownRefundKey ? refunds.filter(r => r.metadata?.operationKey === ownRefundKey && r.metadata?.orderId === order.id) : [];
  const active = refunds.filter(r => r.status !== 'failed' && r.status !== 'canceled');
  if (active.some(r => !own.includes(r))) return { kind: 'review', reason: 'Payment already has a refund requiring reconciliation' };
  // Some payment methods account for the refund before bank processing finishes.
  if (charge.amount_refunded > 0 && !own.some(r => r.status !== 'failed' && r.status !== 'canceled' && r.amount === charge.amount_refunded)) {
    return { kind: charge.amount_refunded === amountMinor ? 'refunded' : 'review', reason: 'Payment has already been refunded in whole or in part' };
  }
  return { kind: 'captured', amountMinor, currency: 'usd', capturedAt: new Date(charge.created * 1000), refunds };
}

/** Does not change fulfillment or a refund already claimed by a concurrent cancellation. */
export async function verifyLegacyCapturedPayment(order: IOrder): Promise<void> {
  const result = await inspectLegacyPayment(order);
  if (result.kind !== 'captured') {
    await Order.updateOne({ _id: order._id, status: 'pending' }, { $set: { paymentError: { code: 'legacy_payment_review', message: result.reason, at: new Date() } } });
    throw new AppError(409, 'This older payment needs review before this order can be changed', 'legacy_payment_review');
  }
  const update = await Order.updateOne({ _id: order._id, status: 'pending', paymentIntentId: order.paymentIntentId, total: order.total, paymentStatus: { $nin: ['refund_pending', 'refunded'] } }, {
    $set: { paymentStatus: 'captured', amountMinor: result.amountMinor, currency: result.currency, capturedAt: result.capturedAt },
    $unset: { paymentError: '' },
  });
  if (!update.matchedCount) throw new AppError(409, 'Order changed during payment verification', 'cancellation_conflict');
}
