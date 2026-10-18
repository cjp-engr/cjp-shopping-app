import { describe, expect, it } from 'vitest';
import {
  AUTHENTICATION_CANCELLED_MESSAGE,
  DECLINED_MESSAGE,
  PAYMENT_NOT_COMPLETED_MESSAGE,
  classifyAuthorization,
} from './stripeAuthorization';

describe('classifyAuthorization', () => {
  it('treats a held payment (requires_capture) as authorized', () => {
    expect(classifyAuthorization({ paymentIntent: { status: 'requires_capture' } })).toEqual({ kind: 'authorized' });
  });

  it('treats a payment that stopped without an error as not completed', () => {
    expect(classifyAuthorization({ paymentIntent: { status: 'requires_action' } })).toEqual({
      kind: 'not_completed',
      message: PAYMENT_NOT_COMPLETED_MESSAGE,
    });
  });

  it('treats a cancelled card verification as not completed, so the buyer can retry', () => {
    const result = classifyAuthorization({
      error: { type: 'card_error', code: 'payment_intent_authentication_failure' },
    });
    expect(result).toEqual({ kind: 'not_completed', message: AUTHENTICATION_CANCELLED_MESSAGE });
  });

  it('treats a card decline as declined even though the intent returns to requires_payment_method', () => {
    const result = classifyAuthorization({
      error: {
        type: 'card_error',
        code: 'card_declined',
        decline_code: 'insufficient_funds',
        message: 'Your card has insufficient funds.',
        payment_intent: { status: 'requires_payment_method' },
      },
    });
    expect(result).toEqual({ kind: 'declined', message: 'Your card has insufficient funds.' });
  });

  it('uses a generic decline message when the card error has none', () => {
    expect(classifyAuthorization({ error: { type: 'card_error' } })).toEqual({ kind: 'declined', message: DECLINED_MESSAGE });
  });

  it('treats a non-card error that left the intent unpaid as not completed', () => {
    expect(classifyAuthorization({
      error: { type: 'invalid_request_error', payment_intent: { status: 'requires_payment_method' } },
    })).toEqual({ kind: 'not_completed', message: PAYMENT_NOT_COMPLETED_MESSAGE });
  });

  it('treats connection and API errors as unknown, because the charge may have gone through', () => {
    expect(classifyAuthorization({ error: { type: 'api_connection_error', message: 'Network error' } })).toEqual({ kind: 'unknown' });
    expect(classifyAuthorization({ error: { type: 'api_error' } })).toEqual({ kind: 'unknown' });
  });
});
