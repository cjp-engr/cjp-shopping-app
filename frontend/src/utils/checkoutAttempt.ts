// One checkout attempt = one Idempotency-Key. Kept in sessionStorage so a reload resumes the
// same session instead of reserving stock again. Storage can be unavailable (private mode,
// blocked site data), so every access is guarded and the checkout still works without it.

export interface CheckoutAttempt {
  idempotencyKey: string;
  sessionId?: string;
}

const KEY_PREFIX = 'checkout-attempt:';

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

export function newIdempotencyKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `checkout-${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function loadCheckoutAttempt(userId: string): CheckoutAttempt | null {
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutAttempt>;
    return typeof parsed.idempotencyKey === 'string' ? { idempotencyKey: parsed.idempotencyKey, sessionId: parsed.sessionId } : null;
  } catch {
    return null;
  }
}

export function getOrCreateCheckoutAttempt(userId: string): CheckoutAttempt {
  const existing = loadCheckoutAttempt(userId);
  if (existing) return existing;
  const attempt = { idempotencyKey: newIdempotencyKey() };
  saveCheckoutAttempt(userId, attempt);
  return attempt;
}

export function saveCheckoutAttempt(userId: string, attempt: CheckoutAttempt): void {
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(attempt));
  } catch {
    // Storage unavailable: the checkout proceeds, but a reload starts a new attempt.
  }
}

export function clearCheckoutAttempt(userId: string): void {
  try {
    sessionStorage.removeItem(storageKey(userId));
  } catch {
    // Nothing stored to clear.
  }
}
