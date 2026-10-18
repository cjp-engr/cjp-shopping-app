// Turns a Stripe confirmCardPayment result into what the checkout should do next.
// The backend captures nothing here: a successful confirmation leaves the intent in
// `requires_capture`, meaning the funds are held until the seller starts preparing the order.

export interface StripeErrorLike {
  type?: string;
  code?: string;
  decline_code?: string;
  message?: string;
  payment_intent?: { status?: string } | null;
}

export interface StripeResultLike {
  paymentIntent?: { status?: string } | null;
  error?: StripeErrorLike | null;
}

export type SellerAuthorizationOutcome =
  | { kind: 'authorized' }
  | { kind: 'not_completed'; message: string }
  | { kind: 'declined'; message: string }
  | { kind: 'unknown' };

export const AUTHENTICATION_CANCELLED_MESSAGE = 'Card verification was not completed. Your checkout is saved; try again to continue.';
export const PAYMENT_NOT_COMPLETED_MESSAGE = 'Payment was not completed. Your checkout is saved; try again to continue.';
export const DECLINED_MESSAGE = 'Your card was declined for this seller. Try another card to continue.';

const AUTHENTICATION_FAILURE_CODE = 'payment_intent_authentication_failure';

export function classifyAuthorization(result: StripeResultLike): SellerAuthorizationOutcome {
  const error = result.error;
  if (!error) {
    if (result.paymentIntent?.status === 'requires_capture') return { kind: 'authorized' };
    return { kind: 'not_completed', message: PAYMENT_NOT_COMPLETED_MESSAGE };
  }
  if (error.code === AUTHENTICATION_FAILURE_CODE) {
    return { kind: 'not_completed', message: AUTHENTICATION_CANCELLED_MESSAGE };
  }
  // A decline also leaves the intent in requires_payment_method, so card errors are checked first.
  if (error.type === 'card_error') {
    return { kind: 'declined', message: error.message ?? DECLINED_MESSAGE };
  }
  if (error.payment_intent?.status === 'requires_payment_method') {
    return { kind: 'not_completed', message: PAYMENT_NOT_COMPLETED_MESSAGE };
  }
  return { kind: 'unknown' };
}
