import type { CheckoutOrderSummary, CheckoutSellerDraft, CheckoutSession } from '../types/checkout';
import { CheckoutApiError } from './checkoutApiError';
import { classifyAuthorization, type SellerAuthorizationOutcome, type StripeResultLike } from '../utils/stripeAuthorization';

export interface CheckoutSessionApi {
  getCheckoutSession(sessionId: string): Promise<CheckoutSession>;
  confirmCheckoutSession(sessionId: string): Promise<CheckoutSession>;
}

export interface SellerPaymentClient {
  /** Confirms one seller's PaymentIntent with the buyer's payment method (manual capture: holds funds). */
  confirmPayment(clientSecret: string, paymentMethodId: string): Promise<StripeResultLike>;
  /** Reads the intent's current state; used only to settle an unknown outcome. */
  retrievePayment(clientSecret: string): Promise<StripeResultLike>;
}

export type AuthorizationResult =
  | { status: 'authorized' }
  | { status: 'stopped'; sellerId: string; message: string }
  | { status: 'closed'; message: string };

export const UNKNOWN_AUTHORIZATION_MESSAGE = 'We could not confirm the payment for this seller. Your checkout is saved; try again to continue.';
export const MISSING_PAYMENT_METHOD_MESSAGE = 'The card for this seller is not ready. Enter your card again to continue.';
export const CHECKOUT_CLOSED_MESSAGE = 'This checkout has ended. Review your cart and start again.';

/**
 * Sellers whose payment still needs the buyer. The server returns a client secret only while an
 * intent is unconfirmed, so a freshly read session tells us what is left after a reload.
 */
export function sellersNeedingPayment(session: CheckoutSession): CheckoutSellerDraft[] {
  return session.sellers.filter(seller => !!seller.clientSecret);
}

/** A replayed session can list sellers whose hold already exists; Stripe is the source of truth. */
async function alreadyHeld(client: SellerPaymentClient, clientSecret: string): Promise<boolean> {
  try {
    const intent = await client.retrievePayment(clientSecret);
    return !intent.error && intent.paymentIntent?.status === 'requires_capture';
  } catch {
    return false;
  }
}

async function settleUnknownOutcome(
  api: CheckoutSessionApi,
  client: SellerPaymentClient,
  sessionId: string,
  clientSecret: string,
): Promise<'authorized' | 'retry' | 'closed'> {
  let latest: CheckoutSession;
  try {
    latest = await api.getCheckoutSession(sessionId);
  } catch {
    return 'retry';
  }
  if (latest.status !== 'open') return 'closed';
  try {
    const intent = await client.retrievePayment(clientSecret);
    if (!intent.error && intent.paymentIntent?.status === 'requires_capture') return 'authorized';
  } catch {
    // Still unknown: the buyer may retry.
  }
  return 'retry';
}

/**
 * Authorizes each remaining seller in turn. Stops at the first seller that did not authorize, so
 * the buyer can fix that payment and continue; sellers already authorized keep their holds.
 */
/**
 * `paymentMethodIdFor` gives the card for each seller. A card that is not saved to the customer can back
 * only one intent, so a new card needs a separate PaymentMethod per seller. A saved card can be reused.
 */
export async function authorizeSellers(params: {
  api: CheckoutSessionApi;
  client: SellerPaymentClient;
  session: CheckoutSession;
  paymentMethodIdFor: (sellerId: string) => string | undefined;
  onAuthorized?: (sellerId: string) => void;
}): Promise<AuthorizationResult> {
  const { api, client, session, paymentMethodIdFor, onAuthorized } = params;
  for (const seller of sellersNeedingPayment(session)) {
    const clientSecret = seller.clientSecret!;
    const paymentMethodId = paymentMethodIdFor(seller.sellerId);
    if (!paymentMethodId) {
      return { status: 'stopped', sellerId: seller.sellerId, message: MISSING_PAYMENT_METHOD_MESSAGE };
    }
    if (await alreadyHeld(client, clientSecret)) {
      onAuthorized?.(seller.sellerId);
      continue;
    }
    let outcome: SellerAuthorizationOutcome;
    try {
      outcome = classifyAuthorization(await client.confirmPayment(clientSecret, paymentMethodId));
    } catch {
      outcome = { kind: 'unknown' };
    }

    if (outcome.kind === 'authorized') {
      onAuthorized?.(seller.sellerId);
      continue;
    }
    if (outcome.kind === 'unknown') {
      const settled = await settleUnknownOutcome(api, client, session.id, clientSecret);
      if (settled === 'authorized') {
        onAuthorized?.(seller.sellerId);
        continue;
      }
      if (settled === 'closed') return { status: 'closed', message: CHECKOUT_CLOSED_MESSAGE };
      return { status: 'stopped', sellerId: seller.sellerId, message: UNKNOWN_AUTHORIZATION_MESSAGE };
    }
    return { status: 'stopped', sellerId: seller.sellerId, message: outcome.message };
  }
  return { status: 'authorized' };
}

export type ConfirmResult =
  | { status: 'placed'; orders: CheckoutOrderSummary[] }
  | { status: 'not_ready'; message: string }
  | { status: 'retry'; message: string }
  | { status: 'failed'; message: string }
  | { status: 'closed'; message: string };

/** Verifies every seller's hold and places the orders. Failure codes map to the next step for the buyer. */
export async function confirmPlacedOrders(api: CheckoutSessionApi, sessionId: string): Promise<ConfirmResult> {
  try {
    const session = await api.confirmCheckoutSession(sessionId);
    return { status: 'placed', orders: session.orders ?? [] };
  } catch (err) {
    if (!(err instanceof CheckoutApiError)) throw err;
    switch (err.code) {
      case 'authorization_not_ready':
        return { status: 'not_ready', message: 'Payment is not finished for every seller yet. Complete the remaining payments to place your order.' };
      case 'finalization_in_progress':
        return { status: 'retry', message: 'Your order is being placed. Please wait a moment.' };
      case 'authorization_canceled':
      case 'authorization_mismatch':
      case 'authorization_deadline_invalid':
        return { status: 'failed', message: 'This checkout can no longer be completed. Its reserved items were released; review your cart and try again.' };
      case 'session_expired':
      case 'session_closed':
        return { status: 'closed', message: CHECKOUT_CLOSED_MESSAGE };
      default:
        throw err;
    }
  }
}
