import { describe, it, expect } from 'vitest';
import { evaluateIntent, type IntentExpectation } from '../checkoutFinalization.js';

const now = new Date('2026-10-14T00:00:00Z');
const threeDaysSeconds = Math.floor((now.getTime() + 3 * 24 * 60 * 60 * 1000) / 1000);

const expectation: IntentExpectation = {
  sessionId: 'session-1',
  sellerId: 'seller-1',
  draftOrderId: 'draft-1',
  amountMinor: 3159,
  currency: 'usd',
  customerId: 'cus_1',
  placedAt: now,
  now,
};

function intent(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'pi_1',
    status: 'requires_capture',
    capture_method: 'manual',
    amount: 3159,
    amount_capturable: 3159,
    currency: 'usd',
    customer: 'cus_1',
    metadata: { checkoutSessionId: 'session-1', sellerId: 'seller-1', draftOrderId: 'draft-1' },
    latest_charge: { object: 'charge', payment_method_details: { card: { capture_before: threeDaysSeconds } } },
    ...overrides,
  };
}

describe('evaluateIntent', () => {
  it('accepts a verified manual-capture hold with a long deadline', () => {
    const result = evaluateIntent(intent(), expectation);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.authorizationExpiresAt.getTime()).toBe(threeDaysSeconds * 1000);
  });

  it('reports not-ready while the buyer has not finished payment', () => {
    expect(evaluateIntent(intent({ status: 'requires_payment_method' }), expectation))
      .toMatchObject({ ok: false, reason: 'not_ready' });
    expect(evaluateIntent(intent({ status: 'requires_action' }), expectation))
      .toMatchObject({ ok: false, reason: 'not_ready' });
  });

  it('reports a canceled payment separately', () => {
    expect(evaluateIntent(intent({ status: 'canceled' }), expectation))
      .toMatchObject({ ok: false, reason: 'canceled' });
  });

  it('rejects a captured or unexpected status as a mismatch', () => {
    expect(evaluateIntent(intent({ status: 'succeeded' }), expectation))
      .toMatchObject({ ok: false, reason: 'mismatch' });
  });

  it('rejects automatic capture, another customer, currency, amount and metadata differences', () => {
    const cases = [
      intent({ capture_method: 'automatic' }),
      intent({ customer: 'cus_other' }),
      intent({ currency: 'eur' }),
      intent({ amount: 9999 }),
      intent({ amount_capturable: 100 }),
      intent({ metadata: { checkoutSessionId: 'session-1', sellerId: 'seller-2', draftOrderId: 'draft-1' } }),
    ];
    for (const candidate of cases) {
      expect(evaluateIntent(candidate, expectation)).toMatchObject({ ok: false, reason: 'mismatch' });
    }
  });

  it('treats a missing authorization deadline as unknown', () => {
    const withoutDeadline = intent({ latest_charge: { object: 'charge', payment_method_details: { card: {} } } });
    expect(evaluateIntent(withoutDeadline, expectation)).toMatchObject({ ok: false, reason: 'deadline' });
  });

  it('rejects an authorization that has already expired', () => {
    const past = Math.floor((now.getTime() - 60_000) / 1000);
    const expired = intent({ latest_charge: { object: 'charge', payment_method_details: { card: { capture_before: past } } } });
    expect(evaluateIntent(expired, expectation)).toMatchObject({ ok: false, reason: 'deadline' });
  });

  it('rejects an authorization too short to leave the capture margin before acceptance', () => {
    const shortly = Math.floor((now.getTime() + 4 * 60 * 1000) / 1000);
    const short = intent({ latest_charge: { object: 'charge', payment_method_details: { card: { capture_before: shortly } } } });
    expect(evaluateIntent(short, expectation)).toMatchObject({ ok: false, reason: 'deadline' });
  });

  it('accepts a shorter-than-24-hour window that still leaves time to accept', () => {
    const twoHours = Math.floor((now.getTime() + 2 * 60 * 60 * 1000) / 1000);
    const shortWindow = intent({ latest_charge: { object: 'charge', payment_method_details: { card: { capture_before: twoHours } } } });
    const result = evaluateIntent(shortWindow, expectation);
    expect(result.ok).toBe(true);
  });
});
