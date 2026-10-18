import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import Order from '../../models/Order.js';
import { inspectLegacyPayment } from '../../services/legacyPayments.js';

/** Classification only. Never creates a capture, cancellation, refund, or operation. */
export async function reconcileLegacyPayments(apply = false): Promise<{ checked: number; review: number; updated: number }> {
  const counts = { checked: 0, review: 0, updated: 0 };
  const cursor = Order.find({ paymentFlowVersion: { $ne: 'manual_capture' }, 'paymentMethod.type': { $in: ['credit-card', 'debit-card'] }, paymentStatus: { $nin: ['refund_pending', 'refunded'] } }).cursor();
  for await (const order of cursor) {
    counts.checked++;
    try {
      const result = await inspectLegacyPayment(order);
      const cancelledPaid = result.kind === 'captured' && order.status === 'cancelled';
      const review = result.kind === 'review' || cancelledPaid;
      if (review) counts.review++;
      console.log(JSON.stringify({ orderId: order.id, status: order.status, classification: result.kind, review, reason: result.kind !== 'captured' ? result.reason : cancelledPaid ? 'Historical cancelled order still has captured money; review manually' : undefined }));
      if (!apply) continue;
      const paymentError = review ? { code: 'legacy_payment_review', message: result.kind === 'review' ? result.reason : 'Historical cancellation requires payment review', at: new Date() } : undefined;
      const set = result.kind === 'captured'
        ? { paymentStatus: 'captured', amountMinor: result.amountMinor, currency: result.currency, capturedAt: result.capturedAt, ...(paymentError ? { paymentError } : {}) }
        : result.kind === 'refunded' ? { paymentStatus: 'refunded' } : { paymentError };
      const update = await Order.updateOne({ _id: order._id, status: order.status, paymentStatus: order.paymentStatus ?? { $exists: false }, paymentIntentId: order.paymentIntentId ?? { $exists: false }, total: order.total }, { $set: set, ...(!paymentError ? { $unset: { paymentError: '' } } : {}) });
      counts.updated += update.modifiedCount;
    } catch {
      counts.review++;
      console.log(JSON.stringify({ orderId: order.id, classification: 'unavailable', review: true, reason: 'Stripe could not be verified; no changes applied' }));
    }
  }
  return counts;
}

async function main() {
  dotenv.config();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Only --apply is supported; omit it for dry-run');
  // Auditing old duplicates must work before the unique index can be installed.
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  try {
    const apply = process.argv.includes('--apply');
    console.log(apply ? 'APPLY: classification fields only; no money will move.' : 'DRY RUN: no database writes or money movements.');
    const counts = await reconcileLegacyPayments(apply);
    console.log(JSON.stringify(counts));
    if (counts.review) process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('Legacy reconciliation failed; check database and Stripe configuration.'); process.exitCode = 2; });
}
