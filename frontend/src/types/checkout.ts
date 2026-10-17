import type { Address } from './user';

// Mirrors the backend checkout contract (docs: POST /api/checkout/sessions).
// Amounts come from the server; the client never sends totals.

export type CheckoutSessionStatus = 'open' | 'finalizing' | 'placed' | 'expired' | 'failed';
export type CheckoutSellerDraftStatus = 'awaiting_authorization' | 'authorized' | 'released' | 'failed';

export interface CheckoutSellerDraft {
  sellerId: string;
  sellerName: string | null;
  draftOrderId: string;
  amountMinor: number;
  currency: string;
  status: CheckoutSellerDraftStatus;
  /** Owner-only; present only while this seller's payment still needs buyer confirmation. */
  clientSecret?: string;
}

export interface CheckoutOrderSummary {
  id: string;
  sellerId: string | null;
  status: 'pending' | 'awaiting_payment';
  paymentStatus: string | null;
  total: number;
  placedAt: string | null;
  acceptBy: string | null;
  authorizationExpiresAt: string | null;
  /** True when the seller's acceptance window is shorter than 24 hours; show this to the buyer. */
  shortAuthorization: boolean;
}

export interface CheckoutSession {
  id: string;
  status: CheckoutSessionStatus;
  expiresAt: string;
  placedAt?: string;
  sellers: CheckoutSellerDraft[];
  /** Present on the confirm response only. */
  orders?: CheckoutOrderSummary[];
}

export interface CheckoutSessionItemInput {
  productId: string;
  quantity: number;
  variantId?: string;
  selectedAttributes?: Record<string, string>;
}

export interface CardPaymentMethod {
  type: 'credit-card' | 'debit-card';
  last4?: string;
  cardHolder?: string;
}

export interface CheckoutSessionCreateInput {
  items: CheckoutSessionItemInput[];
  shippingAddress: Address;
  paymentMethod: CardPaymentMethod;
  sellerMessages?: Record<string, string>;
  couponCodes?: Record<string, string>;
  deliverySelections?: Record<string, string>;
  /** Stripe PaymentMethod ID of a card saved to this buyer (pm_...). */
  savedPaymentMethodId?: string;
}
