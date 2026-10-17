import { randomUUID } from 'node:crypto';
import type mongoose from 'mongoose';
import PaymentOperation from '../models/PaymentOperation.js';
import { cancelPaymentIntent, isAmbiguousStripeError, retrievePaymentIntent } from './stripeService.js';
import {
  claimOperationById,
  completeOperation,
  failOperation,
  withLeaseHeartbeat,
} from './paymentOperationService.js';
import { MAX_ATTEMPTS } from './paymentOperationPolicy.js';

export interface ReleaseIntentParams {
  idempotencyKey: string;
  paymentIntentId: string;
  orderId?: mongoose.Types.ObjectId;
  checkoutSessionId?: string;
}

/**
 * Cancels one authorization hold through a durable release operation keyed by `idempotencyKey`.
 * Returns `released` only after Stripe confirms the intent is canceled; any uncertain outcome
 * is `unresolved` and is retried on the next call. A caller that already holds the operation's
 * lease (the worker, via claimNextOperation) passes its `owner` so the lease is used, not claimed again.
 */
export async function releaseIntentOperation(
  params: ReleaseIntentParams,
  options: { owner?: string } = {},
): Promise<'released' | 'unresolved'> {
  const { idempotencyKey: key, paymentIntentId: intentId } = params;

  const operation = await PaymentOperation.findOneAndUpdate(
    { idempotencyKey: key },
    {
      $setOnInsert: {
        action: 'release',
        generation: 1,
        status: 'pending',
        ...(params.checkoutSessionId ? { checkoutSessionId: params.checkoutSessionId } : {}),
        ...(params.orderId ? { orderId: params.orderId } : {}),
        paymentIntentId: intentId,
        attempts: 0,
      },
    },
    { upsert: true, new: true },
  );
  if (operation.status === 'succeeded') return 'released';
  if (operation.status === 'needs_support') {
    // Older deployments escalated the very first network timeout. A release is safe
    // to retry for that same intent; retain the attempt cap and all other escalations.
    if (operation.lastError?.code !== 'stripe_unknown_result' || operation.attempts >= MAX_ATTEMPTS) return 'unresolved';
    await PaymentOperation.updateOne(
      { _id: operation._id, status: 'needs_support', attempts: { $lt: MAX_ATTEMPTS }, 'lastError.code': 'stripe_unknown_result' },
      { $set: { status: 'pending' }, $unset: { leaseOwner: '', leaseExpiresAt: '', nextAttemptAt: '' } },
    );
  }

  const operationId = operation._id.toString();
  const owner = options.owner ?? randomUUID();
  if (options.owner) {
    if (operation.status !== 'in_progress' || operation.leaseOwner !== owner) return 'unresolved';
  } else if (!(await claimOperationById(operationId, owner))) {
    return 'unresolved';
  }

  return withLeaseHeartbeat(operationId, owner, async () => {
    try {
      const result = await cancelPaymentIntent(intentId, key);
      if (result.status !== 'canceled') {
        await failOperation(operationId, owner, { code: 'stripe_unexpected_status', message: result.status }, { ambiguous: true });
        return 'unresolved';
      }
      await completeOperation(operationId, owner, { paymentIntentId: intentId, stripeObjectId: intentId });
      return 'released';
    } catch (err) {
      // The cancel may have succeeded even though the call failed; check before deciding.
      let verifiedCanceled = false;
      let verificationFailed = false;
      try {
        verifiedCanceled = (await retrievePaymentIntent(intentId)).status === 'canceled';
      } catch {
        verificationFailed = true;
      }
      if (verifiedCanceled) {
        await completeOperation(operationId, owner, { paymentIntentId: intentId, stripeObjectId: intentId });
        return 'released';
      }
      const message = err instanceof Error ? err.message : String(err);
      const ambiguous = verificationFailed || isAmbiguousStripeError(err);
      const next = await failOperation(
        operationId,
        owner,
        { code: ambiguous ? 'stripe_unknown_result' : 'stripe_rejected', message },
        // Canceling the same intent cannot create a new charge or duplicate a refund.
        // Retry transient/unknown results with the existing key, bounded by MAX_ATTEMPTS.
        { ambiguous: false },
      );
      if (next === 'needs_support') {
        console.error(`[Checkout] Hold release for intent ${intentId} needs support review: ${message}`);
      }
      return 'unresolved';
    }
  });
}
