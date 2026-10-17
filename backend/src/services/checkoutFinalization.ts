import mongoose from 'mongoose';
import type Stripe from 'stripe';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import CheckoutSession, { type ICheckoutSession } from '../models/CheckoutSession.js';
import paymentService from './paymentService.js';
import { retrieveIntentWithCharge } from './stripeService.js';
import { computeAcceptBy } from './paymentOperationPolicy.js';
import { CheckoutError, getCheckoutSessionForBuyer } from './checkoutService.js';
import { releaseCheckoutSession } from './checkoutCompensation.js';

const ESTIMATED_DELIVERY_DAYS = 7;
const NOT_READY_STATUSES = ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing'];

export class FinalizationError extends CheckoutError {
  constructor(
    code: string,
    message: string,
    details: unknown,
    retryable: boolean,
    public readonly failSession: boolean,
  ) {
    super(409, code, message, details, retryable);
    this.name = 'FinalizationError';
    Object.setPrototypeOf(this, FinalizationError.prototype);
  }
}

export interface IntentExpectation {
  sessionId: string;
  sellerId: string;
  draftOrderId: string;
  amountMinor: number;
  currency: string;
  customerId: string;
  placedAt: Date;
  now: Date;
}

export type IntentEvaluation =
  | { ok: true; authorizationExpiresAt: Date }
  | { ok: false; reason: 'not_ready' | 'canceled' | 'deadline' | 'mismatch'; detail: string };

function customerIdOf(customer: Stripe.PaymentIntent['customer']): string | undefined {
  if (!customer) return undefined;
  return typeof customer === 'string' ? customer : customer.id;
}

/**
 * Checks one seller's intent against the persisted expectations. Pure: no I/O.
 * Anything other than a manual-capture hold with a known, unexpired deadline is rejected.
 */
export function evaluateIntent(intent: Stripe.PaymentIntent, expectation: IntentExpectation): IntentEvaluation {
  if (NOT_READY_STATUSES.includes(intent.status)) {
    return { ok: false, reason: 'not_ready', detail: intent.status };
  }
  if (intent.status === 'canceled') {
    return { ok: false, reason: 'canceled', detail: 'payment was canceled' };
  }
  if (intent.status !== 'requires_capture') {
    return { ok: false, reason: 'mismatch', detail: `unexpected status ${intent.status}` };
  }
  if (intent.capture_method !== 'manual') {
    return { ok: false, reason: 'mismatch', detail: 'capture method is not manual' };
  }
  if (customerIdOf(intent.customer) !== expectation.customerId) {
    return { ok: false, reason: 'mismatch', detail: 'customer does not match the buyer' };
  }
  if (intent.currency.toLowerCase() !== expectation.currency.toLowerCase()) {
    return { ok: false, reason: 'mismatch', detail: 'currency does not match' };
  }
  if (intent.amount !== expectation.amountMinor || intent.amount_capturable !== expectation.amountMinor) {
    return { ok: false, reason: 'mismatch', detail: 'amount does not match the order' };
  }
  const metadata = intent.metadata ?? {};
  if (
    metadata.checkoutSessionId !== expectation.sessionId ||
    metadata.sellerId !== expectation.sellerId ||
    metadata.draftOrderId !== expectation.draftOrderId
  ) {
    return { ok: false, reason: 'mismatch', detail: 'metadata does not match the order' };
  }

  const latestCharge = typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
  const captureBefore = latestCharge?.payment_method_details?.card?.capture_before;
  if (!captureBefore) {
    return { ok: false, reason: 'deadline', detail: 'authorization deadline is unknown' };
  }
  const authorizationExpiresAt = new Date(captureBefore * 1000);
  if (authorizationExpiresAt.getTime() <= expectation.now.getTime()) {
    return { ok: false, reason: 'deadline', detail: 'authorization has expired' };
  }
  const acceptBy = computeAcceptBy(expectation.placedAt, authorizationExpiresAt);
  if (acceptBy.getTime() <= expectation.now.getTime()) {
    return { ok: false, reason: 'deadline', detail: 'authorization is too short to accept an order' };
  }
  return { ok: true, authorizationExpiresAt };
}

async function verifyDrafts(
  session: ICheckoutSession,
  customerId: string,
  now: Date,
): Promise<Array<{ draftId: mongoose.Types.ObjectId; items: Array<{ product: unknown; variantId?: string }>; authorizationExpiresAt: Date }>> {
  const verified: Array<{ draftId: mongoose.Types.ObjectId; items: Array<{ product: unknown; variantId?: string }>; authorizationExpiresAt: Date }> = [];

  for (const seller of session.sellers) {
    const sellerId = seller.sellerId.toString();
    if (!seller.paymentIntentId) {
      throw new FinalizationError('authorization_not_ready', 'Payment has not been submitted for every seller', { sellerId }, true, false);
    }

    const draft = await Order.findOne({ _id: seller.draftOrderId, status: 'awaiting_payment' }).lean();
    if (!draft) {
      throw new FinalizationError('finalization_conflict', 'This checkout changed while it was being placed', { sellerId }, false, false);
    }

    const intent = await retrieveIntentWithCharge(seller.paymentIntentId);
    const evaluation = evaluateIntent(intent, {
      sessionId: session._id.toString(),
      sellerId,
      draftOrderId: seller.draftOrderId.toString(),
      amountMinor: seller.amountMinor,
      currency: seller.currency,
      customerId,
      placedAt: now,
      now,
    });

    if (!evaluation.ok) {
      const details = { sellerId, detail: evaluation.detail };
      switch (evaluation.reason) {
        case 'not_ready':
          throw new FinalizationError('authorization_not_ready', 'Payment is not ready for this seller yet', { ...details, status: evaluation.detail }, true, false);
        case 'canceled':
          throw new FinalizationError('authorization_canceled', 'Payment was canceled for this seller', details, false, true);
        case 'deadline':
          throw new FinalizationError('authorization_deadline_invalid', 'The payment authorization cannot be used for an order', details, false, true);
        case 'mismatch':
          throw new FinalizationError('authorization_mismatch', 'Payment does not match this checkout', details, false, true);
      }
    }

    verified.push({
      draftId: seller.draftOrderId,
      items: (draft.items ?? []).map(item => ({ product: item.product, variantId: item.variantId })),
      authorizationExpiresAt: evaluation.authorizationExpiresAt,
    });
  }
  return verified;
}

async function placeOrders(
  sessionId: mongoose.Types.ObjectId,
  buyerId: string,
  now: Date,
  verified: Awaited<ReturnType<typeof verifyDrafts>>,
): Promise<void> {
  const transaction = await mongoose.startSession();
  try {
    await transaction.withTransaction(async () => {
      for (const { draftId, items, authorizationExpiresAt } of verified) {
        const updated = await Order.updateOne(
          { _id: draftId, status: 'awaiting_payment' },
          {
            $set: {
              status: 'pending',
              paymentStatus: 'authorized',
              authorizedAt: now,
              placedAt: now,
              authorizationExpiresAt,
              acceptBy: computeAcceptBy(now, authorizationExpiresAt),
              estimatedDelivery: new Date(now.getTime() + ESTIMATED_DELIVERY_DAYS * 24 * 60 * 60 * 1000),
            },
          },
          { session: transaction },
        );
        if (updated.modifiedCount !== 1) {
          throw new FinalizationError('finalization_conflict', 'This checkout changed while it was being placed', { draftId: draftId.toString() }, false, false);
        }
        for (const item of items) {
          await Cart.updateOne(
            { userId: buyerId },
            { $pull: { 'sellers.$[].items': { product: item.product, variantId: item.variantId ?? null } } },
            { session: transaction },
          );
        }
      }

      await Cart.updateOne({ userId: buyerId }, { $pull: { sellers: { items: { $size: 0 } } } }, { session: transaction });

      const updatedSession = await CheckoutSession.updateOne(
        { _id: sessionId, status: 'finalizing' },
        {
          $set: { status: 'placed', placedAt: now, 'sellers.$[s].status': 'authorized' },
        },
        {
          session: transaction,
          arrayFilters: [{ 's.draftOrderId': { $in: verified.map(v => v.draftId) } }],
        },
      );
      if (updatedSession.modifiedCount !== 1) {
        throw new FinalizationError('finalization_conflict', 'This checkout changed while it was being placed', {}, false, false);
      }
    });
  } finally {
    await transaction.endSession();
  }
}

export async function listPlacedOrders(sessionId: mongoose.Types.ObjectId) {
  return Order.find({ checkoutSessionId: sessionId.toString() }).sort({ createdAt: 1 }).lean();
}

export async function finalizeCheckoutSession(
  sessionId: string,
  buyerId: string,
  now: Date = new Date(),
): Promise<{ session: ICheckoutSession; orders: Awaited<ReturnType<typeof listPlacedOrders>> }> {
  const current = await getCheckoutSessionForBuyer(sessionId, buyerId);
  if (current.status === 'placed') {
    return { session: current, orders: await listPlacedOrders(current._id) };
  }
  if (current.status === 'finalizing') {
    throw new CheckoutError(409, 'finalization_in_progress', 'This checkout is already being placed', undefined, true);
  }
  if (current.status === 'expired' || (current.status === 'open' && current.expiresAt.getTime() <= now.getTime())) {
    // A confirm after expiry never places orders; any hold still found is released.
    await releaseCheckoutSession(current._id, 'expired', now).catch(releaseErr => {
      console.error(`[Checkout] Releasing expired checkout ${current._id} did not complete:`, releaseErr);
    });
    throw new CheckoutError(409, 'session_expired', 'This checkout has expired');
  }
  if (current.status !== 'open') {
    throw new CheckoutError(409, 'session_closed', 'This checkout can no longer be placed');
  }

  const claimed = await CheckoutSession.findOneAndUpdate(
    { _id: current._id, status: 'open' },
    { $set: { status: 'finalizing' } },
    { new: true },
  );
  if (!claimed) {
    const latest = await getCheckoutSessionForBuyer(sessionId, buyerId);
    if (latest.status === 'placed') {
      return { session: latest, orders: await listPlacedOrders(latest._id) };
    }
    if (latest.status === 'expired') {
      throw new CheckoutError(409, 'session_expired', 'This checkout has expired');
    }
    throw new CheckoutError(409, 'finalization_in_progress', 'This checkout is already being placed', undefined, true);
  }

  try {
    const customerId = await paymentService.getOrCreateCustomerForUser(buyerId);
    const verified = await verifyDrafts(claimed, customerId, now);
    await placeOrders(claimed._id, buyerId, now, verified);
  } catch (err) {
    if (err instanceof FinalizationError && err.failSession) {
      await CheckoutSession.updateOne({ _id: claimed._id, status: 'finalizing' }, { $set: { status: 'failed' } });
      await releaseCheckoutSession(claimed._id, 'failed').catch(releaseErr => {
        console.error(`[Checkout] Releasing holds after a failed checkout ${claimed._id} did not complete:`, releaseErr);
      });
    } else {
      await CheckoutSession.updateOne({ _id: claimed._id, status: 'finalizing' }, { $set: { status: 'open' } });
    }
    throw err;
  }

  const placed = await getCheckoutSessionForBuyer(sessionId, buyerId);
  return { session: placed, orders: await listPlacedOrders(placed._id) };
}
