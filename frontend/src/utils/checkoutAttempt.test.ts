import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCheckoutAttempt,
  getOrCreateCheckoutAttempt,
  loadCheckoutAttempt,
  newIdempotencyKey,
  saveCheckoutAttempt,
} from './checkoutAttempt';

function fakeSessionStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}

describe('checkout attempt storage', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', fakeSessionStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates an idempotency key within the server limits and reuses it for the same buyer', () => {
    const first = getOrCreateCheckoutAttempt('buyer-1');
    const second = getOrCreateCheckoutAttempt('buyer-1');

    expect(first.idempotencyKey.length).toBeGreaterThanOrEqual(8);
    expect(first.idempotencyKey.length).toBeLessThanOrEqual(128);
    expect(second).toEqual(first);
  });

  it('keeps attempts separate per buyer and clears them', () => {
    getOrCreateCheckoutAttempt('buyer-1');
    const other = getOrCreateCheckoutAttempt('buyer-2');

    expect(loadCheckoutAttempt('buyer-1')?.idempotencyKey).not.toBe(other.idempotencyKey);
    clearCheckoutAttempt('buyer-1');
    expect(loadCheckoutAttempt('buyer-1')).toBeNull();
    expect(loadCheckoutAttempt('buyer-2')).toEqual(other);
  });

  it('keeps the session id so a reload can resume it', () => {
    saveCheckoutAttempt('buyer-1', { idempotencyKey: 'key-12345678', sessionId: 'sess-1' });

    expect(loadCheckoutAttempt('buyer-1')).toEqual({ idempotencyKey: 'key-12345678', sessionId: 'sess-1' });
  });

  it('ignores stored values that are not an attempt', () => {
    sessionStorage.setItem('checkout-attempt:buyer-1', '{not json');
    expect(loadCheckoutAttempt('buyer-1')).toBeNull();

    sessionStorage.setItem('checkout-attempt:buyer-1', JSON.stringify({ sessionId: 'sess-1' }));
    expect(loadCheckoutAttempt('buyer-1')).toBeNull();
  });

  it('still produces a usable attempt when storage throws', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('blocked'); },
    });

    expect(loadCheckoutAttempt('buyer-1')).toBeNull();
    expect(getOrCreateCheckoutAttempt('buyer-1').idempotencyKey).toMatch(/^checkout-[0-9a-f]+$/);
    expect(() => clearCheckoutAttempt('buyer-1')).not.toThrow();
  });

  it('generates distinct keys', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
});
