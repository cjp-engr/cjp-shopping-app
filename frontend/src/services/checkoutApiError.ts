/**
 * A failed checkout request. `code` is the backend's machine-readable reason
 * (for example `authorization_rejected`); `retryable` says whether the same
 * request may be sent again with the same Idempotency-Key.
 */
export class CheckoutApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, retryable: boolean, details?: unknown) {
    super(message);
    this.name = 'CheckoutApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}
