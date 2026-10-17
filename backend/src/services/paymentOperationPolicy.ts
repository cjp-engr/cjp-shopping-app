export const SELLER_ACCEPT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const CAPTURE_SAFETY_MARGIN_MS = 5 * 60 * 1000;
export const LEASE_MS = 60 * 1000;
export const HEARTBEAT_MS = 20 * 1000;
export const MAX_ATTEMPTS = 5;
/** Stripe may prune idempotency keys after 24 hours; never re-issue a money-changing call past this age. */
export const IDEMPOTENCY_SAFE_RETRY_MS = 23 * 60 * 60 * 1000;
const RETRY_BASE_MS = 5 * 1000;
const RETRY_CAP_MS = 10 * 60 * 1000;

export function isLeaseExpired(leaseExpiresAt: Date | undefined, now: Date): boolean {
  return !leaseExpiresAt || leaseExpiresAt.getTime() <= now.getTime();
}

export function retryDelayMs(attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(RETRY_BASE_MS * 2 ** exponent, RETRY_CAP_MS);
}

export function statusAfterFailedAttempt(
  attempts: number,
  ambiguous: boolean,
): 'pending' | 'needs_support' {
  return ambiguous || attempts >= MAX_ATTEMPTS ? 'needs_support' : 'pending';
}

export function orderOperationKey(
  orderId: string,
  action: 'capture' | 'release',
  generation: number,
): string {
  return `order:${orderId}:${action}:${generation}`;
}

export function computeAcceptBy(
  placedAt: Date,
  authorizationExpiresAt?: Date,
): Date {
  const windowEnd = placedAt.getTime() + SELLER_ACCEPT_WINDOW_MS;
  if (!authorizationExpiresAt) {
    throw new Error('Authorization deadline is required to compute acceptBy');
  }
  const captureEnd = authorizationExpiresAt.getTime() - CAPTURE_SAFETY_MARGIN_MS;
  return new Date(Math.min(windowEnd, captureEnd));
}
