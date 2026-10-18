import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import StripeEventInbox from '../models/StripeEventInbox.js';
import { dispatchWebhookEvent } from './checkoutWebhook.js';
import { retrieveStripeEvent } from './stripeService.js';
import { HEARTBEAT_MS, LEASE_MS, retryDelayMs } from './paymentOperationPolicy.js';

/** Persist only what our handlers consume, excluding card details and client secrets. */
export function stripeEventSnapshot(event: Stripe.Event): Record<string, unknown> {
  const object = event.data.object as Stripe.PaymentIntent;
  return {
    id: object.id,
    metadata: object.metadata ? {
      checkoutSessionId: object.metadata.checkoutSessionId,
      sellerId: object.metadata.sellerId,
      draftOrderId: object.metadata.draftOrderId,
      refundRequestId: object.metadata.refundRequestId,
    } : undefined,
    ...('payment_intent' in object ? { payment_intent: typeof object.payment_intent === 'string' ? object.payment_intent : (object.payment_intent as { id?: string } | null)?.id } : {}),
    last_payment_error: object.last_payment_error ? {
      code: object.last_payment_error.code,
      message: object.last_payment_error.message,
    } : undefined,
  };
}

export async function processStripeInboxEvent(
  eventId: string,
  supplied?: Stripe.Event,
  now = new Date(),
): Promise<'processed' | 'busy' | 'failed'> {
  const owner = randomUUID();
  const entry = await StripeEventInbox.findOneAndUpdate({
    eventId,
    status: { $in: ['received', 'failed', 'processing'] },
    $and: [
      { $or: [{ leaseExpiresAt: { $exists: false } }, { leaseExpiresAt: { $lte: now } }] },
      { $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lte: now } }] },
    ],
  }, {
    $set: { status: 'processing', leaseOwner: owner, leaseExpiresAt: new Date(now.getTime() + LEASE_MS) },
    $inc: { attempts: 1 },
  }, { new: true });
  if (!entry) return 'busy';

  const owned = { _id: entry._id, status: 'processing', leaseOwner: owner };
  const heartbeat = setInterval(() => {
    void StripeEventInbox.updateOne(owned, { $set: { leaseExpiresAt: new Date(Date.now() + LEASE_MS) } })
      .catch(err => console.error(`[StripeInbox] Lease renewal failed for ${eventId}:`, err));
  }, HEARTBEAT_MS);
  heartbeat.unref?.();
  try {
    // Entries written by older deployments have no snapshot. Retrieve their signed
    // event by ID instead of trying to reconstruct missing payment data.
    const event = supplied ?? (entry.eventObject
      ? { id: entry.eventId, type: entry.type, data: { object: entry.eventObject } } as unknown as Stripe.Event
      : await retrieveStripeEvent(entry.eventId));
    await dispatchWebhookEvent(event);
    await StripeEventInbox.updateOne(owned, {
      $set: { status: 'processed', processedAt: new Date() },
      $unset: { leaseOwner: '', leaseExpiresAt: '', nextAttemptAt: '', lastError: '' },
    });
    return 'processed';
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 500) : 'Webhook processing failed';
    await StripeEventInbox.updateOne(owned, {
      $set: { status: 'failed', nextAttemptAt: new Date(now.getTime() + retryDelayMs(entry.attempts)),
        lastError: { code: 'handler_error', message, at: now } },
      $unset: { leaseOwner: '', leaseExpiresAt: '' },
    });
    console.error(`[StripeInbox] Event ${eventId} will be retried: ${message}`);
    return 'failed';
  } finally { clearInterval(heartbeat); }
}

export async function replayStripeInbox(now = new Date()): Promise<number> {
  const candidates = await StripeEventInbox.find({
    status: { $in: ['received', 'failed', 'processing'] },
    $and: [
      { $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lte: now } }] },
      { $or: [{ leaseExpiresAt: { $exists: false } }, { leaseExpiresAt: { $lte: now } }] },
    ],
  }).sort({ receivedAt: 1 }).limit(50).select('eventId').lean();
  for (const candidate of candidates) await processStripeInboxEvent(candidate.eventId, undefined, now);
  return candidates.length;
}

export function startStripeInboxWorker(): () => void {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try { await replayStripeInbox(); }
    catch (err) { console.error('[StripeInbox] Replay failed:', err); }
    finally { running = false; }
  };
  void run();
  const timer = setInterval(() => void run(), 15000);
  timer.unref?.();
  return () => clearInterval(timer);
}
