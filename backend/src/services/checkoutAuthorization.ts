import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import PaymentOperation from '../models/PaymentOperation.js';
import Order from '../models/Order.js';
import CheckoutSession, { type ICheckoutSession } from '../models/CheckoutSession.js';
import User from '../models/User.js';
import paymentService from './paymentService.js';
import {
  createManualCapturePaymentIntent,
  isAmbiguousStripeError,
  listCustomerIntentsSince,
  retrievePaymentIntent,
} from './stripeService.js';
import { releaseCheckoutSession } from './checkoutCompensation.js';
import {
  claimOperationById,
  completeOperation,
  failOperation,
  recordReconciledIntent,
} from './paymentOperationService.js';
import { CheckoutError } from './checkoutService.js';

export interface SellerAuthorization {
  sellerId: string;
  paymentIntentId: string;
  clientSecret: string;
}

export function intentOperationKey(sessionId: string, sellerId: string): string {
  return `checkout:${sessionId}:${sellerId}:create_intent:1`;
}

export async function assertSavedCardOwned(buyerId: string, paymentMethodId: string): Promise<void> {
  const user = await User.findById(buyerId).select('savedCards').lean();
  const owned = user?.savedCards?.some(card => card.stripePaymentMethodId === paymentMethodId);
  if (!owned) {
    throw new CheckoutError(403, 'saved_card_not_owned', 'The selected card does not belong to this buyer');
  }
}

async function persistIntent(session: ICheckoutSession, draftOrderId: mongoose.Types.ObjectId, intentId: string): Promise<void> {
  await Order.updateOne(
    { _id: draftOrderId },
    { $set: { paymentIntentId: intentId, paymentStatus: 'awaiting_authorization' } },
  );
  await CheckoutSession.updateOne(
    { _id: session._id, 'sellers.draftOrderId': draftOrderId },
    { $set: { 'sellers.$.paymentIntentId': intentId } },
  );
}

async function findIntentForDraft(customerId: string, draftOrderId: string, since: Date) {
  const intents = await listCustomerIntentsSince(customerId, Math.floor(since.getTime() / 1000) - 300);
  return intents.find(intent => intent.metadata?.draftOrderId === draftOrderId) ?? null;
}

async function authorizeSeller(
  session: ICheckoutSession,
  seller: ICheckoutSession['sellers'][number],
  customerId: string,
  savedPaymentMethodId?: string,
): Promise<SellerAuthorization> {
  const sessionId = session._id.toString();
  const sellerId = seller.sellerId.toString();
  const draftOrderId = seller.draftOrderId.toString();
  const key = intentOperationKey(sessionId, sellerId);

  const operation = await PaymentOperation.findOneAndUpdate(
    { idempotencyKey: key },
    {
      $setOnInsert: {
        action: 'create_intent',
        generation: 1,
        status: 'pending',
        checkoutSessionId: sessionId,
        orderId: seller.draftOrderId,
        attempts: 0,
      },
    },
    { upsert: true, new: true },
  );
  const operationId = operation._id.toString();

  if (operation.paymentIntentId) {
    const existing = await retrievePaymentIntent(operation.paymentIntentId);
    await persistIntent(session, seller.draftOrderId, existing.id);
    return { sellerId, paymentIntentId: existing.id, clientSecret: existing.client_secret! };
  }

  // A previous attempt may have created the intent before its ID was saved.
  const reconciled = await findIntentForDraft(customerId, draftOrderId, operation.createdAt);
  if (reconciled) {
    await persistIntent(session, seller.draftOrderId, reconciled.id);
    await recordReconciledIntent(operationId, reconciled.id);
    return { sellerId, paymentIntentId: reconciled.id, clientSecret: reconciled.client_secret! };
  }

  if (operation.status === 'needs_support') {
    throw new CheckoutError(409, 'authorization_unresolved', 'Payment authorization needs support review', { sellerId });
  }

  const owner = randomUUID();
  const claimed = await claimOperationById(operationId, owner);
  if (!claimed) {
    throw new CheckoutError(409, 'authorization_in_progress', 'Payment authorization is already in progress', { sellerId }, true);
  }

  try {
    const intent = await createManualCapturePaymentIntent({
      amountMinor: seller.amountMinor,
      currency: seller.currency,
      customerId,
      paymentMethodId: savedPaymentMethodId,
      metadata: { checkoutSessionId: sessionId, sellerId, draftOrderId },
      idempotencyKey: key,
    });
    await persistIntent(session, seller.draftOrderId, intent.id);
    await completeOperation(operationId, owner, { paymentIntentId: intent.id, stripeObjectId: intent.id });
    return { sellerId, paymentIntentId: intent.id, clientSecret: intent.clientSecret };
  } catch (err) {
    const ambiguous = isAmbiguousStripeError(err);
    const message = err instanceof Error ? err.message : String(err);
    await failOperation(operationId, owner, {
      code: ambiguous ? 'stripe_unknown_result' : 'stripe_rejected',
      message,
    }, { ambiguous });
    if (ambiguous) {
      throw new CheckoutError(409, 'authorization_unresolved', 'Payment authorization needs support review', { sellerId });
    }
    throw new CheckoutError(402, 'authorization_rejected', 'Payment could not be authorized for a seller', { sellerId });
  }
}

const UNCONFIRMED_INTENT_STATUSES = ['requires_payment_method', 'requires_confirmation', 'requires_action'];

/**
 * Client secrets for sellers whose intent still awaits buyer confirmation. Read from Stripe
 * on each request; secrets are never stored in the database.
 */
export async function ownerClientSecrets(session: ICheckoutSession, now: Date): Promise<Map<string, string>> {
  const secrets = new Map<string, string>();
  if (session.status !== 'open' || session.expiresAt.getTime() <= now.getTime()) return secrets;

  for (const seller of session.sellers) {
    if (!seller.paymentIntentId || seller.status !== 'awaiting_authorization') continue;
    const intent = await retrievePaymentIntent(seller.paymentIntentId);
    if (intent.metadata?.checkoutSessionId !== session._id.toString()) continue;
    if (!UNCONFIRMED_INTENT_STATUSES.includes(intent.status) || !intent.client_secret) continue;
    secrets.set(seller.sellerId.toString(), intent.client_secret);
  }
  return secrets;
}

export async function authorizeCheckoutSession(
  session: ICheckoutSession,
  buyerId: string,
  savedPaymentMethodId?: string,
): Promise<SellerAuthorization[]> {
  if (session.status === 'failed') {
    throw new CheckoutError(409, 'session_closed', 'This checkout can no longer be paid');
  }
  if (session.status === 'expired' || (session.status === 'open' && session.expiresAt.getTime() <= Date.now())) {
    // An expired checkout never gets new intents; any existing hold is released.
    await releaseCheckoutSession(session._id, 'expired').catch(releaseErr => {
      console.error(`[Checkout] Releasing expired checkout ${session._id} did not complete:`, releaseErr);
    });
    throw new CheckoutError(409, 'session_expired', 'This checkout has expired');
  }
  const customerId = await paymentService.getOrCreateCustomerForUser(buyerId);
  const results: SellerAuthorization[] = [];
  for (const seller of session.sellers) {
    try {
      results.push(await authorizeSeller(session, seller, customerId, savedPaymentMethodId));
    } catch (err) {
      if (err instanceof CheckoutError && err.code === 'authorization_rejected') {
        // All-or-nothing: one definitive rejection cancels every hold obtained for this checkout.
        await releaseCheckoutSession(session._id, 'failed');
      }
      throw err;
    }
  }
  return results;
}
