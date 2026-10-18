import { describe, it, expect } from 'vitest';
import {
  computeAcceptBy,
  isLeaseExpired,
  retryDelayMs,
  statusAfterFailedAttempt,
  SELLER_ACCEPT_WINDOW_MS,
  CAPTURE_SAFETY_MARGIN_MS,
  MAX_ATTEMPTS,
  IDEMPOTENCY_SAFE_RETRY_MS,
  orderOperationKey,
} from '../paymentOperationPolicy.js';

describe('paymentOperationPolicy', () => {
  describe('computeAcceptBy', () => {
    const placedAt = new Date('2026-10-13T00:00:00Z');

    it('uses placedAt + 24h when the authorization deadline is later', () => {
      const deadline = new Date(placedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      expect(computeAcceptBy(placedAt, deadline).getTime())
        .toBe(placedAt.getTime() + SELLER_ACCEPT_WINDOW_MS);
    });

    it('uses the authorization deadline minus the safety margin when it is earlier', () => {
      const deadline = new Date(placedAt.getTime() + 2 * 60 * 60 * 1000);
      expect(computeAcceptBy(placedAt, deadline).getTime())
        .toBe(deadline.getTime() - CAPTURE_SAFETY_MARGIN_MS);
    });

    it('treats an exact 24-hour boundary as acceptable only up to that instant', () => {
      const deadline = new Date(placedAt.getTime() + SELLER_ACCEPT_WINDOW_MS + CAPTURE_SAFETY_MARGIN_MS);
      expect(computeAcceptBy(placedAt, deadline).getTime())
        .toBe(placedAt.getTime() + SELLER_ACCEPT_WINDOW_MS);
    });

    it('requires an authorization deadline', () => {
      expect(() => computeAcceptBy(placedAt, undefined)).toThrow();
    });
  });

  describe('isLeaseExpired', () => {
    const now = new Date('2026-10-13T00:00:00Z');

    it('treats a missing lease as expired', () => {
      expect(isLeaseExpired(undefined, now)).toBe(true);
    });

    it('treats a lease ending exactly now as expired', () => {
      expect(isLeaseExpired(now, now)).toBe(true);
    });

    it('keeps a lease that ends in the future', () => {
      expect(isLeaseExpired(new Date(now.getTime() + 1), now)).toBe(false);
    });
  });

  describe('retryDelayMs', () => {
    it('doubles per attempt and is capped', () => {
      expect(retryDelayMs(1)).toBe(5_000);
      expect(retryDelayMs(2)).toBe(10_000);
      expect(retryDelayMs(3)).toBe(20_000);
      expect(retryDelayMs(50)).toBe(10 * 60 * 1000);
    });
  });

  describe('statusAfterFailedAttempt', () => {
    it('keeps retrying while attempts remain and the result is conclusive', () => {
      expect(statusAfterFailedAttempt(1, false)).toBe('pending');
    });

    it('escalates to support after the attempt limit', () => {
      expect(statusAfterFailedAttempt(MAX_ATTEMPTS, false)).toBe('needs_support');
    });

    it('escalates immediately for ambiguous results', () => {
      expect(statusAfterFailedAttempt(1, true)).toBe('needs_support');
    });
  });

  describe('orderOperationKey', () => {
    it('builds a stable key per order, action and generation', () => {
      expect(orderOperationKey('abc', 'capture', 2)).toBe('order:abc:capture:2');
      expect(orderOperationKey('abc', 'release', 1)).toBe('order:abc:release:1');
    });
  });

  describe('IDEMPOTENCY_SAFE_RETRY_MS', () => {
    it('stays inside the 24-hour window Stripe keeps idempotency keys', () => {
      expect(IDEMPOTENCY_SAFE_RETRY_MS).toBe(23 * 60 * 60 * 1000);
    });
  });
});
