import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import type Stripe from 'stripe';
import Order, { type IOrder } from '../models/Order.js';
import PaymentOperation, { type IPaymentOperation } from '../models/PaymentOperation.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AcceptanceOutcome } from './orderAcceptance.js';
import { cancellationAudit, restoreOrderReservations } from './orderCancellation.js';
import { IDEMPOTENCY_SAFE_RETRY_MS, orderOperationKey } from './paymentOperationPolicy.js';
import {
  claimOperationById,
  completeOperation,
  failOperation,
  markOperationFailed,
  withLeaseHeartbeat,
} from './paymentOperationService.js';
import {
  capturePaymentIntent,
  isAmbiguousStripeError,
  retrieveIntentWithCharge,
  StripeError,
} from './stripeService.js';

const LOG_PREFIX = '[Capture]';

/** The fields of a PaymentIntent that prove a full capture. */
type CaptureEvidence = Pick<Stripe.PaymentIntent, 'id' | 'status' | 'amount_received'>;

/** How one pass over the decision table ended. Business failures are mapped to errors by the caller. */
type Settlement =
  | { kind: 'completed'; order: IOrder }
  | { kind: 'resolving' }
  | { kind: 'expired' }
  | { kind: 'rejected' };

interface CaptureContext {
  order: IOrder & { paymentIntentId: string; amountMinor: number };
  operationId: string;
  key: string;
  owner: string;
  now: Date;
  /** False once the operation is older than Stripe's idempotency-key retention: never re-issue the capture. */
  mayCapture: boolean;
  /** Set when an earlier attempt saw Stripe definitively reject this capture but could not commit the revert. */
  recordedRejection?: string;
}

const RESOLVING: Settlement = { kind: 'resolving' };
const REJECTED_CODE = 'stripe_rejected';

function recordedRejection(operation: Pick<IPaymentOperation, 'lastError'>): string | undefined {
  return operation.lastError?.code === REJECTED_CODE ? operation.lastError.message : undefined;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isVerifiedCapture(order: Pick<IOrder, 'paymentIntentId' | 'amountMinor'>, intent: CaptureEvidence): boolean {
  return intent.status === 'succeeded'
    && intent.id === order.paymentIntentId
    && intent.amount_received === order.amountMinor;
}

/** The hold can no longer be captured: Stripe canceled it, or its deadline passed and it is not capturable. */
function isHoldGone(order: Pick<IOrder, 'authorizationExpiresAt'>, intent: Stripe.PaymentIntent, now: Date): boolean {
  if (intent.status === 'canceled') return true;
  return intent.status !== 'requires_capture'
    && !!order.authorizationExpiresAt
    && order.authorizationExpiresAt.getTime() <= now.getTime();
}

function hasCaptureReference(order: IOrder): order is CaptureContext['order'] {
  return !!order.paymentIntentId && typeof order.amountMinor === 'number';
}

/**
 * Persists a verified full capture: the order becomes `preparing` and `captured` together.
 * Only an order still `capture_pending` for this exact intent and amount matches. Returns null
 * when verification fails or nothing matched. Makes no Stripe call.
 */
export async function finalizeCapture(
  orderId: string,
  intent: CaptureEvidence,
  now: Date = new Date(),
): Promise<IOrder | null> {
  if (intent.status !== 'succeeded') return null;

  let finalized: IOrder | null = null;
  const transaction = await mongoose.startSession();
  try {
    await transaction.withTransaction(async () => {
      finalized = await Order.findOneAndUpdate(
        {
          _id: orderId,
          paymentStatus: 'capture_pending',
          paymentIntentId: intent.id,
          amountMinor: intent.amount_received,
        },
        {
          $set: { status: 'preparing', paymentStatus: 'captured', capturedAt: now },
          $unset: { paymentError: '' },
        },
        { new: true, session: transaction },
      );
    });
  } finally {
    await transaction.endSession();
  }
  return finalized;
}

async function needsSupport(ctx: CaptureContext, code: string, message: string): Promise<Settlement> {
  await failOperation(ctx.operationId, ctx.owner, { code, message }, { ambiguous: true }, ctx.now);
  console.error(`${LOG_PREFIX} Capture of order ${ctx.order._id.toString()} needs support review: ${message}`);
  return RESOLVING;
}

/** Leaves the operation pending with backoff so the worker reconciles it; the order stays capture_pending. */
async function deferToWorker(ctx: CaptureContext, err: unknown): Promise<Settlement> {
  const message = errorMessage(err);
  const next = await failOperation(ctx.operationId, ctx.owner, { code: 'stripe_unknown_result', message }, { ambiguous: false }, ctx.now);
  if (next === 'needs_support') {
    console.error(`${LOG_PREFIX} Capture of order ${ctx.order._id.toString()} needs support review after repeated failures: ${message}`);
  }
  return RESOLVING;
}

async function finishCaptured(ctx: CaptureContext, intent: CaptureEvidence): Promise<Settlement> {
  if (!isVerifiedCapture(ctx.order, intent)) {
    return needsSupport(
      ctx,
      'capture_unverified',
      `Expected ${ctx.order.amountMinor} captured on ${ctx.order.paymentIntentId}, Stripe reports ${intent.amount_received} on ${intent.id} (${intent.status})`,
    );
  }

  const orderId = ctx.order._id.toString();
  const order = (await finalizeCapture(orderId, intent, ctx.now)) ?? (await Order.findById(orderId));
  if (order?.paymentStatus !== 'captured') {
    return needsSupport(ctx, 'capture_order_mismatch', `Captured, but order is ${order?.status ?? 'missing'}/${order?.paymentStatus ?? 'missing'}`);
  }
  await completeOperation(ctx.operationId, ctx.owner, { paymentIntentId: intent.id, stripeObjectId: intent.id }, ctx.now);
  return { kind: 'completed', order };
}

/** The hold is gone: cancel the order and give back its reservations once. Never re-authorizes. */
async function expireOrder(ctx: CaptureContext): Promise<Settlement> {
  const transaction = await mongoose.startSession();
  try {
    await transaction.withTransaction(async () => {
      const cancelled = await Order.findOneAndUpdate(
        { _id: ctx.order._id, paymentStatus: 'capture_pending', stockRestoredAt: { $exists: false } },
        {
          $set: {
            status: 'cancelled',
            cancelReason: 'authorization_expired',
            ...cancellationAudit({ role: 'system' }, ctx.now),
            paymentStatus: 'released',
            stockRestoredAt: ctx.now,
          },
        },
        { new: true, session: transaction },
      );
      if (cancelled) await restoreOrderReservations(cancelled, transaction);
    });
  } finally {
    await transaction.endSession();
  }

  const current = await Order.findById(ctx.order._id);
  if (current?.status !== 'cancelled' || current.paymentStatus !== 'released') {
    return needsSupport(ctx, 'capture_order_mismatch', `Hold is gone, but order is ${current?.status ?? 'missing'}/${current?.paymentStatus ?? 'missing'}`);
  }
  await completeOperation(ctx.operationId, ctx.owner, { paymentIntentId: ctx.order.paymentIntentId }, ctx.now);
  return { kind: 'expired' };
}

/**
 * Stripe definitively refused the capture and the hold is still valid: the seller may try again.
 * The operation becomes `failed` and the order `authorized` in one transaction, so a failed write
 * never strands a `capture_pending` order next to a `failed` operation. `err` is absent when an
 * earlier attempt recorded the rejection and its transaction did not commit.
 */
async function rejectCapture(ctx: CaptureContext, err?: unknown): Promise<Settlement> {
  const stripeCode = (err instanceof StripeError ? (err.originalError as { code?: unknown } | undefined)?.code : undefined);
  const rejection = { code: REJECTED_CODE, message: err === undefined ? ctx.recordedRejection ?? 'Stripe rejected the capture' : errorMessage(err) };

  if (err !== undefined) {
    // Recorded outside the transaction so a retry after a failed commit does not re-issue the capture.
    await PaymentOperation.updateOne(
      { _id: ctx.operationId, leaseOwner: ctx.owner, status: 'in_progress' },
      { $set: { lastError: { ...rejection, message: rejection.message.slice(0, 500), at: ctx.now } } },
    );
  }

  let failed = false;
  const transaction = await mongoose.startSession();
  try {
    await transaction.withTransaction(async () => {
      failed = await markOperationFailed(ctx.operationId, ctx.owner, rejection, ctx.now, { session: transaction });
      // Without the lease another owner is resolving this capture; do not touch the order.
      if (!failed) return;
      await Order.updateOne(
        { _id: ctx.order._id, paymentStatus: 'capture_pending' },
        {
          $set: {
            paymentStatus: 'authorized',
            paymentError: {
              code: 'capture_failed',
              message: `Stripe declined the capture${typeof stripeCode === 'string' ? ` (${stripeCode})` : ''}`,
              at: ctx.now,
            },
          },
        },
        { session: transaction },
      );
    });
  } finally {
    await transaction.endSession();
  }
  return failed ? { kind: 'rejected' } : RESOLVING;
}

/** Applies a retrieved PaymentIntent state; `captureError` is the capture failure that prompted the retrieval, if any. */
async function applyIntentState(
  ctx: CaptureContext,
  intent: Stripe.PaymentIntent,
  captureError?: unknown,
): Promise<Settlement> {
  if (intent.status === 'succeeded') return finishCaptured(ctx, intent);
  if (isHoldGone(ctx.order, intent, ctx.now)) return expireOrder(ctx);
  if (intent.status === 'requires_capture') {
    if (captureError === undefined) {
      return needsSupport(ctx, 'capture_retry_window_passed', 'Operation is older than the idempotency retention window; capture not re-issued');
    }
    // A timeout may still land at Stripe; the worker reconciles before any new capture.
    return isAmbiguousStripeError(captureError) ? deferToWorker(ctx, captureError) : rejectCapture(ctx, captureError);
  }
  return needsSupport(ctx, 'stripe_unexpected_status', `PaymentIntent ${intent.id} is ${intent.status}`);
}

/** The decision table: retrieve first, capture only a capturable hold, then verify and persist. */
async function settleCapture(ctx: CaptureContext): Promise<Settlement> {
  const intentId = ctx.order.paymentIntentId;
  let intent: Stripe.PaymentIntent;
  try {
    intent = await retrieveIntentWithCharge(intentId);
  } catch (err) {
    return deferToWorker(ctx, err);
  }
  // Stripe already refused this key and the hold is still valid: finish the rejection, do not capture again.
  if (intent.status === 'requires_capture' && ctx.recordedRejection !== undefined) return rejectCapture(ctx);
  if (intent.status !== 'requires_capture' || !ctx.mayCapture) return applyIntentState(ctx, intent);

  let captured: Awaited<ReturnType<typeof capturePaymentIntent>>;
  try {
    captured = await capturePaymentIntent(intentId, ctx.order.amountMinor, ctx.key);
  } catch (captureError) {
    let after: Stripe.PaymentIntent;
    try {
      after = await retrieveIntentWithCharge(intentId);
    } catch {
      return deferToWorker(ctx, captureError);
    }
    return applyIntentState(ctx, after, captureError);
  }
  return finishCaptured(ctx, { id: captured.id, status: captured.status as Stripe.PaymentIntent.Status, amount_received: captured.amountReceived });
}

function isWithinRetryWindow(operation: Pick<IPaymentOperation, 'createdAt'>, now: Date): boolean {
  return now.getTime() - operation.createdAt.getTime() < IDEMPOTENCY_SAFE_RETRY_MS;
}

/** Creates (or reuses) the capture operation of the current generation for an order. */
async function upsertCaptureOperation(order: CaptureContext['order']): Promise<IPaymentOperation> {
  const failedGenerations = await PaymentOperation.countDocuments({ orderId: order._id, action: 'capture', status: 'failed' });
  const generation = failedGenerations + 1;
  const key = orderOperationKey(order._id.toString(), 'capture', generation);
  const upsert = () => PaymentOperation.findOneAndUpdate(
    { idempotencyKey: key },
    {
      $setOnInsert: {
        action: 'capture',
        generation,
        status: 'pending',
        orderId: order._id,
        paymentIntentId: order.paymentIntentId,
        attempts: 0,
      },
    },
    { upsert: true, new: true },
  );
  try {
    return await upsert();
  } catch (err) {
    // Two concurrent upserts on a new key: one inserts, the other sees the duplicate and reads it.
    if ((err as { code?: number }).code === 11000) return upsert();
    throw err;
  }
}

/**
 * Captures the card hold of an order the seller just claimed (`capture_pending`). Returns
 * `resolving` when the outcome is not yet known or another owner holds the operation; throws
 * 409 `capture_failed` (order back to `authorized`) or 409 `authorization_expired` (order cancelled).
 */
export async function runCapture(order: IOrder, now: Date = new Date()): Promise<AcceptanceOutcome> {
  if (!hasCaptureReference(order)) {
    await Order.updateOne({ _id: order._id, paymentStatus: 'capture_pending' }, { $set: { paymentStatus: 'authorized' } });
    throw new AppError(409, 'This order has no payment reference to capture', 'payment_reference_missing');
  }

  const operation = await upsertCaptureOperation(order);
  const operationId = operation._id.toString();
  const owner = randomUUID();
  const claimed = await claimOperationById(operationId, owner, now);
  if (!claimed) return { kind: 'resolving', order };

  const ctx: CaptureContext = {
    order,
    operationId,
    owner,
    now,
    key: claimed.idempotencyKey,
    mayCapture: isWithinRetryWindow(claimed, now),
    recordedRejection: recordedRejection(claimed),
  };
  const settlement = await withLeaseHeartbeat(operationId, owner, () => settleCapture(ctx));

  switch (settlement.kind) {
    case 'completed':
      return { kind: 'completed', order: settlement.order };
    case 'resolving':
      return { kind: 'resolving', order };
    case 'expired':
      throw new AppError(409, 'The payment authorization expired; the order was cancelled', 'authorization_expired');
    case 'rejected':
      throw new AppError(409, 'The payment could not be captured. The hold is still valid; try accepting again.', 'capture_failed');
  }
}

/**
 * Resolves a capture operation whose request died, for the worker that already holds its lease.
 * Retrieves Stripe state first and never re-issues the capture once the operation is older
 * than the idempotency retention window.
 */
export async function resumeCapture(
  operation: IPaymentOperation,
  owner: string,
  now: Date = new Date(),
): Promise<void> {
  const operationId = operation._id.toString();
  const order = operation.orderId ? await Order.findById(operation.orderId) : null;

  // Already resolved elsewhere: a webhook finalized it, or the request died after the order write.
  if (order && (order.paymentStatus === 'captured' || (order.status === 'cancelled' && order.paymentStatus === 'released'))) {
    await completeOperation(operationId, owner, { paymentIntentId: order.paymentIntentId }, now);
    return;
  }
  if (!order || order.paymentStatus !== 'capture_pending' || !hasCaptureReference(order)) {
    const message = `Order is ${order ? `${order.status}/${order.paymentStatus}` : 'missing'}, not awaiting capture`;
    await failOperation(operationId, owner, { code: 'capture_order_mismatch', message }, { ambiguous: true }, now);
    console.error(`${LOG_PREFIX} Capture operation ${operationId} needs support review: ${message}`);
    return;
  }

  const ctx: CaptureContext = {
    order,
    operationId,
    owner,
    now,
    key: operation.idempotencyKey,
    mayCapture: isWithinRetryWindow(operation, now),
    recordedRejection: recordedRejection(operation),
  };
  const settlement = await withLeaseHeartbeat(operationId, owner, () => settleCapture(ctx));
  if (settlement.kind === 'expired' || settlement.kind === 'rejected') {
    console.warn(`${LOG_PREFIX} Resumed capture of order ${order._id.toString()} ended ${settlement.kind}`);
  }
}
