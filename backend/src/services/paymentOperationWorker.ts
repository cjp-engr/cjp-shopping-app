import { randomUUID } from 'node:crypto';
import Order from '../models/Order.js';
import CheckoutSession from '../models/CheckoutSession.js';
import mongoose from 'mongoose';
import PaymentOperation, { type IPaymentOperation } from '../models/PaymentOperation.js';
import { operationWorkerIntervalMs } from '../config/checkout.js';
import { resumeCapture } from './orderCapture.js';
import { claimNextOperation, failOperation } from './paymentOperationService.js';
import { LEASE_MS, orderOperationKey } from './paymentOperationPolicy.js';
import { releaseIntentOperation } from './paymentRelease.js';

const LOG_PREFIX = '[PaymentWorker]';
const MAX_OPERATIONS_PER_RUN = 50;
const REPAIR_BATCH_SIZE = 100;
/** How long an order must sit unchanged before a missing payment operation is treated as lost. */
const ORPHAN_AGE_MS = 2 * LEASE_MS;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Retries a release the cancel path left unconfirmed, then records it on the order. */
async function resumeRelease(operation: IPaymentOperation, owner: string): Promise<void> {
  const operationId = operation._id.toString();
  if (!operation.paymentIntentId) {
    const message = 'Release operation has no payment intent';
    await failOperation(operationId, owner, { code: 'release_reference_missing', message }, { ambiguous: true });
    console.error(`${LOG_PREFIX} Release operation ${operationId} needs support review: ${message}`);
    return;
  }

  const outcome = await releaseIntentOperation(
    {
      idempotencyKey: operation.idempotencyKey,
      paymentIntentId: operation.paymentIntentId,
      ...(operation.orderId ? { orderId: operation.orderId } : {}),
      ...(operation.checkoutSessionId ? { checkoutSessionId: operation.checkoutSessionId } : {}),
    },
    { owner },
  );
  if (outcome === 'released' && operation.orderId) {
    await Order.updateOne({ _id: operation.orderId, $or: [
      { paymentStatus: 'release_pending' },
      ...(operation.checkoutSessionId ? [{ status: 'awaiting_payment', checkoutSessionId: operation.checkoutSessionId }] : []),
    ] }, { $set: { paymentStatus: 'released' } });
  }
  if (outcome === 'released' && operation.checkoutSessionId && mongoose.isValidObjectId(operation.checkoutSessionId)) {
    await CheckoutSession.updateOne(
      { _id: operation.checkoutSessionId, status: { $in: ['failed', 'expired', 'finalizing'] } },
      { $set: { 'sellers.$[s].status': 'released' } },
      { arrayFilters: [{ 's.paymentIntentId': operation.paymentIntentId }] },
    );
  }
}

async function runOperation(operation: IPaymentOperation, owner: string, now: Date): Promise<void> {
  if (operation.action === 'capture') {
    await resumeCapture(operation, owner, now);
  } else if (operation.action === 'release') {
    await resumeRelease(operation, owner);
  }
}

/**
 * Marks cancelled orders `released` when their release operation already succeeded. The cancel
 * path can crash between completing the operation and updating the order, and the claim path
 * never revisits a succeeded operation.
 */
async function repairSucceededReleases(): Promise<number> {
  const pending = await Order.find({ status: 'cancelled', paymentStatus: 'release_pending' }).select('_id').lean();
  let repaired = 0;
  for (let i = 0; i < pending.length; i += REPAIR_BATCH_SIZE) {
    const ids = pending.slice(i, i + REPAIR_BATCH_SIZE).map(order => order._id);
    const succeeded = await PaymentOperation.find({
      idempotencyKey: { $in: ids.map(id => orderOperationKey(id.toString(), 'release', 1)) },
      status: 'succeeded',
    })
      .select('orderId')
      .lean();
    const orderIds = succeeded.flatMap(operation => (operation.orderId ? [operation.orderId] : []));
    if (orderIds.length === 0) continue;
    const result = await Order.updateMany(
      { _id: { $in: orderIds }, paymentStatus: 'release_pending' },
      { $set: { paymentStatus: 'released' } },
    );
    repaired += result.modifiedCount;
  }
  return repaired;
}

/**
 * Runs the release of a cancelled order that has no release operation at all: the cancel committed
 * but the process died before the operation was created, so nothing else would ever release the
 * hold. releaseIntentOperation creates the operation and runs it under its own lease. The order
 * becomes `released` only when Stripe confirms; otherwise the operation row stays for retries.
 */
async function repairOrphanedReleases(now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - ORPHAN_AGE_MS);
  const stale = await Order.find({
    status: 'cancelled',
    paymentStatus: 'release_pending',
    paymentIntentId: { $exists: true, $nin: [null, ''] },
    updatedAt: { $lt: cutoff },
  })
    .select('_id paymentIntentId')
    .lean();
  let repaired = 0;
  for (let i = 0; i < stale.length; i += REPAIR_BATCH_SIZE) {
    const batch = stale.slice(i, i + REPAIR_BATCH_SIZE);
    const existing = new Set(
      (await PaymentOperation.find({
        idempotencyKey: { $in: batch.map(order => orderOperationKey(order._id.toString(), 'release', 1)) },
      })
        .select('idempotencyKey')
        .lean()).map(operation => operation.idempotencyKey),
    );
    for (const order of batch) {
      const key = orderOperationKey(order._id.toString(), 'release', 1);
      if (existing.has(key) || !order.paymentIntentId) continue;
      try {
        const outcome = await releaseIntentOperation({ idempotencyKey: key, paymentIntentId: order.paymentIntentId, orderId: order._id });
        if (outcome !== 'released') continue;
        const result = await Order.updateOne({ _id: order._id, paymentStatus: 'release_pending' }, { $set: { paymentStatus: 'released' } });
        if (result.modifiedCount > 0) repaired += 1;
      } catch (err) {
        console.error(`${LOG_PREFIX} Could not release the hold of cancelled order ${order._id}: ${errorMessage(err)}`);
      }
    }
  }
  return repaired;
}

/**
 * Reverts `capture_pending` orders that never got a live capture operation back to `authorized`, so
 * the seller can accept again. The acceptance request died between claiming the order and creating
 * the operation. This is safe because runCapture creates the operation before any Stripe call: an
 * order with no capture operation cannot have had a capture issued. A `failed` operation does not
 * count: it is a conclusively rejected generation, and the next one was never created.
 */
async function repairOrphanedCaptures(now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - ORPHAN_AGE_MS);
  const stale = await Order.find({ status: 'pending', paymentStatus: 'capture_pending', updatedAt: { $lt: cutoff } })
    .select('_id')
    .lean();
  let repaired = 0;
  for (let i = 0; i < stale.length; i += REPAIR_BATCH_SIZE) {
    const ids = stale.slice(i, i + REPAIR_BATCH_SIZE).map(order => order._id);
    const withOperation = new Set(
      (await PaymentOperation.distinct('orderId', { orderId: { $in: ids }, action: 'capture', status: { $ne: 'failed' } })).map(String),
    );
    for (const id of ids) {
      if (withOperation.has(id.toString())) continue;
      // Filtered again so a concurrent accept, cancel or capture is never overwritten.
      const result = await Order.updateOne(
        { _id: id, status: 'pending', paymentStatus: 'capture_pending', updatedAt: { $lt: cutoff } },
        { $set: { paymentStatus: 'authorized' } },
      );
      if (result.modifiedCount > 0) {
        repaired += 1;
        console.warn(`${LOG_PREFIX} Order ${id} was capture_pending with no live capture operation; reverted to authorized`);
      }
    }
  }
  return repaired;
}

/** A fixed instant (tests) or a clock read afresh each time (production). */
export type Clock = Date | (() => Date);

/**
 * Finishes capture and release operations whose request died or deferred: `pending` with a retry
 * time that has passed, or `in_progress` with an expired lease. Includes checkout hold releases;
 * intent creation and refunds are never claimed by this worker.
 *
 * Unless a fixed instant is injected, the time is read again for every claim and handler, so a
 * long run never sets a lease that is already expired or judges the 23-hour retry window by a
 * clock that is minutes old.
 */
export async function processDueOperations(owner: string, clock: Clock = () => new Date()): Promise<number> {
  const now = typeof clock === 'function' ? clock : () => clock;
  let handled = 0;
  while (handled < MAX_OPERATIONS_PER_RUN) {
    const operation = await claimNextOperation(owner, now(), { actions: ['capture', 'release'] });
    if (!operation) break;
    handled += 1;
    try {
      await runOperation(operation, owner, now());
    } catch (err) {
      // Back off and count the attempt, so a handler that keeps throwing reaches needs_support.
      const message = errorMessage(err);
      console.error(`${LOG_PREFIX} Operation ${operation.idempotencyKey} failed: ${message}`);
      await failOperation(operation._id.toString(), owner, { code: 'handler_error', message }, { ambiguous: false }, now())
        .catch(failure => console.error(`${LOG_PREFIX} Could not record the failure of ${operation.idempotencyKey}: ${errorMessage(failure)}`));
    }
  }
  const repairedReleases = await repairSucceededReleases();
  const releasedOrphans = await repairOrphanedReleases(now());
  const revertedCaptures = await repairOrphanedCaptures(now());
  return handled + repairedReleases + releasedOrphans + revertedCaptures;
}

export function startPaymentOperationWorker(): () => void {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const processed = await processDueOperations(randomUUID());
      if (processed > 0) {
        console.log(`${LOG_PREFIX} Processed ${processed} payment operation(s)`);
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Run failed:`, err);
    } finally {
      running = false;
    }
  };

  void run();
  const timer = setInterval(() => void run(), operationWorkerIntervalMs());
  timer.unref?.();
  return () => clearInterval(timer);
}
