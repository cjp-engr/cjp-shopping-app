import type { ICheckoutSession } from '../models/CheckoutSession.js';
import { SELLER_ACCEPT_WINDOW_MS } from './paymentOperationPolicy.js';

export interface PlacedOrderInput {
  _id: { toString(): string };
  sellerId?: { toString(): string } | null;
  status: string;
  paymentStatus?: string;
  total: number;
  placedAt?: Date;
  acceptBy?: Date;
  authorizationExpiresAt?: Date;
}

export function buildPlacedOrderView(order: PlacedOrderInput) {
  const shortAuthorization = Boolean(
    order.placedAt && order.acceptBy &&
    order.acceptBy.getTime() < order.placedAt.getTime() + SELLER_ACCEPT_WINDOW_MS,
  );
  return {
    id: order._id.toString(),
    sellerId: order.sellerId ? order.sellerId.toString() : null,
    status: order.status,
    paymentStatus: order.paymentStatus ?? null,
    total: order.total,
    placedAt: order.placedAt ?? null,
    acceptBy: order.acceptBy ?? null,
    authorizationExpiresAt: order.authorizationExpiresAt ?? null,
    shortAuthorization,
  };
}

export interface CheckoutSessionViewOptions {
  now: Date;
  /** Owner-only client secrets keyed by seller ID. */
  clientSecrets: Map<string, string>;
  /** Display names keyed by seller ID. */
  sellerNames: Map<string, string>;
}

export interface CheckoutSellerView {
  sellerId: string;
  sellerName: string | null;
  draftOrderId: string;
  amountMinor: number;
  currency: string;
  status: string;
  clientSecret?: string;
}

export interface CheckoutSessionView {
  id: string;
  status: string;
  expiresAt: Date;
  placedAt?: Date;
  sellers: CheckoutSellerView[];
}

/**
 * Builds the buyer-facing session shape. Sessions past their expiry read as `expired`
 * and never expose client secrets. Card, intent and payment-method fields are never included.
 */
export function buildCheckoutSessionView(
  session: ICheckoutSession,
  options: CheckoutSessionViewOptions,
): CheckoutSessionView {
  const expired = session.status === 'open' && session.expiresAt.getTime() <= options.now.getTime();

  return {
    id: session._id.toString(),
    status: expired ? 'expired' : session.status,
    expiresAt: session.expiresAt,
    ...(session.placedAt ? { placedAt: session.placedAt } : {}),
    sellers: session.sellers.map(seller => {
      const sellerId = seller.sellerId.toString();
      const clientSecret = expired ? undefined : options.clientSecrets.get(sellerId);
      return {
        sellerId,
        sellerName: options.sellerNames.get(sellerId) ?? null,
        draftOrderId: seller.draftOrderId.toString(),
        amountMinor: seller.amountMinor,
        currency: seller.currency,
        status: seller.status,
        ...(clientSecret ? { clientSecret } : {}),
      };
    }),
  };
}
