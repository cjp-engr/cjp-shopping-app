import mongoose from 'mongoose';
import type Stripe from 'stripe';
import Order from '../models/Order.js';
import CheckoutSession from '../models/CheckoutSession.js';
import paymentService from './paymentService.js';
import { cancelPaymentIntent, retrieveIntentWithCharge, retrievePaymentIntent } from './stripeService.js';
import { finalizeCapture } from './orderCapture.js';
import { cancelPendingOrder } from './orderCancellation.js';
import { releaseCheckoutSession, releaseIntentForSeller } from './checkoutCompensation.js';

/** Manual-capture intents carry checkout metadata; legacy intents do not. */
export function isManualCaptureIntent(object: { metadata?: Record<string, string> | null }): boolean {
  return Boolean(object.metadata?.checkoutSessionId);
}

/**
 * Routes a verified Stripe event. Manual-capture events never independently advance fulfillment:
 * they finish an acceptance the seller already started, cancel an expired hold, record errors,
 * release holds for abandoned checkouts, or raise an alert. Legacy events keep their existing,
 * now guarded, handlers.
 */
export async function dispatchWebhookEvent(event: Stripe.Event): Promise<void> {
  const object = event.data.object as Stripe.PaymentIntent;

  if (!isManualCaptureIntent(object)) {
    if (event.type === 'payment_intent.succeeded') {
      await paymentService.handlePaymentIntentSucceeded(object.id);
    } else if (event.type === 'payment_intent.payment_failed') {
      await paymentService.handlePaymentIntentFailed(object.id);
    }
    return;
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      return onManualSucceeded(object);
    case 'payment_intent.payment_failed':
      return onManualPaymentFailed(object);
    case 'payment_intent.amount_capturable_updated':
      return onManualAuthorized(object);
    case 'payment_intent.canceled':
      return onManualCanceled(object);
    default:
      return;
  }
}

/**
 * A capture succeeded. Decided from current Stripe state, never the payload. It only completes an
 * acceptance the seller already started (`capture_pending`); an already captured order is a
 * duplicate; any other state means the funds were taken unexpectedly and needs support review.
 */
async function onManualSucceeded(event: Stripe.PaymentIntent): Promise<void> {
  const order = await Order.findOne({ paymentIntentId: event.id });
  if (!order) {
    // Early event: the order may not have its intent id saved yet. Not an error for the inbox.
    console.error(`[Webhook] Capture success for intent ${event.id} matches no order yet; no change made`);
    return;
  }
  if (order.paymentStatus === 'captured') return;

  const current = await retrieveIntentWithCharge(event.id);
  if (current.status !== 'succeeded') return;

  if (order.paymentStatus === 'capture_pending') {
    if (await finalizeCapture(order._id.toString(), current)) return;
    // Lost a race with the capture operation, or Stripe's amount differs from the order's.
    const latest = await Order.findById(order._id);
    if (latest?.paymentStatus === 'captured') return;
    console.error(`[Webhook] ALERT: intent ${event.id} succeeded but order ${order._id.toString()} could not be finalized; needs support review`);
    return;
  }

  console.error(`[Webhook] ALERT: manual-capture intent ${event.id} succeeded for order ${order._id.toString()} in ${order.status}/${order.paymentStatus}; needs support review`);
  await Order.updateOne(
    { _id: order._id },
    {
      $set: {
        paymentError: {
          code: 'unexpected_capture',
          message: 'Payment succeeded without an accepted capture; needs support review',
          at: new Date(),
        },
      },
    },
  );
}

/**
 * Stripe canceled a hold. Only a pending order still awaiting acceptance (`authorized`) is cancelled;
 * `capture_pending` belongs to its capture operation and placed or cancelled orders are untouched.
 */
async function onManualCanceled(event: Stripe.PaymentIntent): Promise<void> {
  const order = await Order.findOne({ paymentIntentId: event.id, status: 'pending', paymentStatus: 'authorized' });
  if (!order) return;

  const current = await retrieveIntentWithCharge(event.id);
  if (current.status !== 'canceled') return;

  await cancelPendingOrder(order._id, 'authorization_expired');
}

async function onManualPaymentFailed(intent: Stripe.PaymentIntent): Promise<void> {
  const lastError = intent.last_payment_error;
  await Order.updateMany(
    { paymentIntentId: intent.id, status: 'awaiting_payment' },
    {
      $set: {
        paymentError: {
          code: lastError?.code ?? 'payment_failed',
          message: (lastError?.message ?? 'Payment failed').slice(0, 300),
          at: new Date(),
        },
      },
    },
  );
}

/**
 * A hold arrived. Decisions use the current Stripe state, not the event payload, so
 * duplicate and out-of-order deliveries converge. Only abandoned, expired, or failed
 * checkouts release holds; placed and in-flight checkouts are left to their own paths.
 */
async function onManualAuthorized(event: Stripe.PaymentIntent): Promise<void> {
  const current = await retrievePaymentIntent(event.id);
  if (current.status !== 'requires_capture') return;

  const sessionId = event.metadata?.checkoutSessionId;
  const session = sessionId && mongoose.isValidObjectId(sessionId)
    ? await CheckoutSession.findById(sessionId)
    : null;

  if (!session) {
    console.error(`[Webhook] ALERT: held intent ${event.id} references an unknown checkout; canceling it`);
    await cancelPaymentIntent(event.id, `orphan-hold:${event.id}`);
    return;
  }

  if (session.status === 'placed' || session.status === 'finalizing') return;

  const now = new Date();
  const expiredByTime = session.status === 'open' && session.expiresAt.getTime() <= now.getTime();
  if (session.status === 'open' && !expiredByTime) return;

  const reason = session.status === 'failed' ? 'failed' : 'expired';
  const recorded = session.sellers.some(seller => seller.paymentIntentId === event.id);
  if (!recorded) {
    const sellerId = event.metadata?.sellerId;
    const draftOrderId = event.metadata?.draftOrderId;
    if (sellerId && draftOrderId && mongoose.isValidObjectId(sellerId) && mongoose.isValidObjectId(draftOrderId)) {
      await releaseIntentForSeller(session, {
        sellerId: new mongoose.Types.ObjectId(sellerId),
        draftOrderId: new mongoose.Types.ObjectId(draftOrderId),
        paymentIntentId: event.id,
        status: 'awaiting_authorization',
      });
    } else {
      console.error(`[Webhook] ALERT: held intent ${event.id} has incomplete metadata; canceling it`);
      await cancelPaymentIntent(event.id, `orphan-hold:${event.id}`);
    }
  }

  await releaseCheckoutSession(session._id, reason, now);
}
