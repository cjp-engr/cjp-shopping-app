import type { ClientSession } from 'mongoose';
import PaymentOperation, { IPaymentOperation, type PaymentOperationAction } from '../models/PaymentOperation.js';
import {
  HEARTBEAT_MS,
  LEASE_MS,
  retryDelayMs,
  statusAfterFailedAttempt,
} from './paymentOperationPolicy.js';

const LOG_PREFIX = '[PaymentOperation]';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function claimNextOperation(
  owner: string,
  now: Date = new Date(),
  options: { keyPrefix?: string; actions?: PaymentOperationAction[] } = {},
): Promise<IPaymentOperation | null> {
  return PaymentOperation.findOneAndUpdate(
    {
      $and: [
        { status: { $in: ['pending', 'in_progress'] } },
        ...(options.actions ? [{ action: { $in: options.actions } }] : []),
        { $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }] },
        { $or: [{ leaseExpiresAt: { $exists: false } }, { leaseExpiresAt: null }, { leaseExpiresAt: { $lte: now } }] },
        ...(options.keyPrefix
          ? [{ idempotencyKey: { $regex: `^${escapeRegex(options.keyPrefix)}` } }]
          : []),
      ],
    },
    {
      $set: {
        status: 'in_progress',
        leaseOwner: owner,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      },
      $inc: { attempts: 1 },
    },
    { sort: { nextAttemptAt: 1, createdAt: 1 }, new: true },
  );
}

export async function renewLease(
  operationId: string,
  owner: string,
  now: Date = new Date(),
): Promise<boolean> {
  const result = await PaymentOperation.updateOne(
    { _id: operationId, leaseOwner: owner, status: 'in_progress' },
    { $set: { leaseExpiresAt: new Date(now.getTime() + LEASE_MS) } },
  );
  return result.matchedCount === 1;
}

export async function completeOperation(
  operationId: string,
  owner: string,
  result: { paymentIntentId?: string; stripeObjectId?: string },
  now: Date = new Date(),
): Promise<boolean> {
  const update = await PaymentOperation.updateOne(
    { _id: operationId, leaseOwner: owner, status: 'in_progress' },
    {
      $set: { status: 'succeeded', completedAt: now, ...result },
      $unset: { leaseOwner: '', leaseExpiresAt: '', nextAttemptAt: '' },
    },
  );
  return update.matchedCount === 1;
}

export async function claimOperationById(
  operationId: string,
  owner: string,
  now: Date = new Date(),
): Promise<IPaymentOperation | null> {
  return PaymentOperation.findOneAndUpdate(
    {
      _id: operationId,
      $and: [
        { status: { $in: ['pending', 'in_progress'] } },
        { $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }] },
        { $or: [{ leaseExpiresAt: { $exists: false } }, { leaseExpiresAt: null }, { leaseExpiresAt: { $lte: now } }] },
      ],
    },
    {
      $set: { status: 'in_progress', leaseOwner: owner, leaseExpiresAt: new Date(now.getTime() + LEASE_MS) },
      $inc: { attempts: 1 },
    },
    { new: true },
  );
}

/** Records an intent found by reconciliation. Does not require the lease: the intent already exists at Stripe. */
export async function recordReconciledIntent(
  operationId: string,
  paymentIntentId: string,
  now: Date = new Date(),
): Promise<void> {
  await PaymentOperation.updateOne(
    { _id: operationId, status: { $ne: 'succeeded' } },
    {
      $set: { status: 'succeeded', paymentIntentId, stripeObjectId: paymentIntentId, completedAt: now },
      $unset: { leaseOwner: '', leaseExpiresAt: '', nextAttemptAt: '' },
    },
  );
}

export async function failOperation(
  operationId: string,
  owner: string,
  error: { code: string; message: string },
  options: { ambiguous: boolean },
  now: Date = new Date(),
): Promise<'pending' | 'needs_support' | null> {
  const operation = await PaymentOperation.findOne({
    _id: operationId,
    leaseOwner: owner,
    status: 'in_progress',
  });
  if (!operation) return null;

  const next = statusAfterFailedAttempt(operation.attempts, options.ambiguous);
  const lastError = { code: error.code, message: error.message.slice(0, 500), at: now };

  if (next === 'pending') {
    await PaymentOperation.updateOne(
      { _id: operationId, leaseOwner: owner },
      {
        $set: {
          status: 'pending',
          lastError,
          nextAttemptAt: new Date(now.getTime() + retryDelayMs(operation.attempts)),
        },
        $unset: { leaseOwner: '', leaseExpiresAt: '' },
      },
    );
  } else {
    await PaymentOperation.updateOne(
      { _id: operationId, leaseOwner: owner },
      {
        $set: { status: 'needs_support', lastError },
        $unset: { leaseOwner: '', leaseExpiresAt: '', nextAttemptAt: '' },
      },
    );
  }
  return next;
}

/**
 * Terminal failure: the operation is conclusively impossible and must not be retried.
 * Pass `session` to commit it together with the business write it justifies.
 */
export async function markOperationFailed(
  operationId: string,
  owner: string,
  error: { code: string; message: string },
  now: Date = new Date(),
  options: { session?: ClientSession } = {},
): Promise<boolean> {
  const update = await PaymentOperation.updateOne(
    { _id: operationId, leaseOwner: owner, status: 'in_progress' },
    {
      $set: {
        status: 'failed',
        lastError: { code: error.code, message: error.message.slice(0, 500), at: now },
      },
      $unset: { leaseOwner: '', leaseExpiresAt: '', nextAttemptAt: '' },
    },
    { session: options.session },
  );
  return update.matchedCount === 1;
}

/** Keeps the lease alive while long-running work (a Stripe call) is in flight. */
export async function withLeaseHeartbeat<T>(
  operationId: string,
  owner: string,
  work: () => Promise<T>,
): Promise<T> {
  const timer = setInterval(() => {
    renewLease(operationId, owner).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${LOG_PREFIX} Failed to renew lease for ${operationId}: ${message}`);
    });
  }, HEARTBEAT_MS);
  try {
    return await work();
  } finally {
    clearInterval(timer);
  }
}
