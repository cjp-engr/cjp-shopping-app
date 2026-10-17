import { describe, expect, it, vi } from 'vitest';
import {
  CHECKOUT_CLOSED_MESSAGE,
  MISSING_PAYMENT_METHOD_MESSAGE,
  UNKNOWN_AUTHORIZATION_MESSAGE,
  authorizeSellers,
  confirmPlacedOrders,
  sellersNeedingPayment,
  type CheckoutSessionApi,
  type SellerPaymentClient,
} from './cardCheckoutFlow';
import { CheckoutApiError } from './checkoutApiError';
import { AUTHENTICATION_CANCELLED_MESSAGE, DECLINED_MESSAGE } from '../utils/stripeAuthorization';
import type { CheckoutSession, CheckoutSellerDraft } from '../types/checkout';

function seller(id: string, pending: boolean): CheckoutSellerDraft {
  return {
    sellerId: id,
    sellerName: `Seller ${id}`,
    draftOrderId: `order-${id}`,
    amountMinor: 1000,
    currency: 'usd',
    status: 'awaiting_authorization',
    ...(pending ? { clientSecret: `pi_${id}_secret` } : {}),
  };
}

function session(sellers: CheckoutSellerDraft[], status: CheckoutSession['status'] = 'open'): CheckoutSession {
  return { id: 'sess-1', status, expiresAt: '2026-10-14T00:15:00.000Z', sellers };
}

function apiWith(overrides: Partial<CheckoutSessionApi> = {}): CheckoutSessionApi {
  return {
    getCheckoutSession: vi.fn(async () => session([])),
    confirmCheckoutSession: vi.fn(async () => session([])),
    ...overrides,
  };
}

const held = { paymentIntent: { status: 'requires_capture' } };

describe('sellersNeedingPayment', () => {
  it('returns only sellers the server still expects the buyer to pay', () => {
    const current = session([seller('a', true), seller('b', false), seller('c', true)]);
    expect(sellersNeedingPayment(current).map(s => s.sellerId)).toEqual(['a', 'c']);
  });
});

describe('authorizeSellers', () => {
  it('authorizes each pending seller in order and reports each one', async () => {
    const confirmPayment = vi.fn(async () => held);
    const onAuthorized = vi.fn();
    const client: SellerPaymentClient = { confirmPayment, retrievePayment: vi.fn() };

    const result = await authorizeSellers({
      api: apiWith(), client, session: session([seller('a', true), seller('b', true)]), paymentMethodIdFor: () => 'pm_1', onAuthorized,
    });

    expect(result).toEqual({ status: 'authorized' });
    expect(confirmPayment.mock.calls).toEqual([['pi_a_secret', 'pm_1'], ['pi_b_secret', 'pm_1']]);
    expect(onAuthorized.mock.calls).toEqual([['a'], ['b']]);
  });

  it('skips sellers whose payment is already held', async () => {
    const confirmPayment = vi.fn(async () => held);
    const client: SellerPaymentClient = { confirmPayment, retrievePayment: vi.fn() };

    await authorizeSellers({
      api: apiWith(), client, session: session([seller('a', false), seller('b', true)]), paymentMethodIdFor: () => 'pm_1',
    });

    expect(confirmPayment).toHaveBeenCalledTimes(1);
    expect(confirmPayment).toHaveBeenCalledWith('pi_b_secret', 'pm_1');
  });

  it('confirms each seller with that seller\'s own card, so a new card is never reused across intents', async () => {
    const confirmPayment = vi.fn(async () => held);
    const client: SellerPaymentClient = { confirmPayment, retrievePayment: vi.fn() };
    const cards: Record<string, string> = { a: 'pm_card_for_a', b: 'pm_card_for_b' };

    const result = await authorizeSellers({
      api: apiWith(),
      client,
      session: session([seller('a', true), seller('b', true)]),
      paymentMethodIdFor: sellerId => cards[sellerId],
    });

    expect(result).toEqual({ status: 'authorized' });
    expect(confirmPayment.mock.calls).toEqual([
      ['pi_a_secret', 'pm_card_for_a'],
      ['pi_b_secret', 'pm_card_for_b'],
    ]);
  });

  it('stops before charging a seller that has no card ready', async () => {
    const confirmPayment = vi.fn(async () => held);
    const client: SellerPaymentClient = { confirmPayment, retrievePayment: vi.fn() };

    const result = await authorizeSellers({
      api: apiWith(),
      client,
      session: session([seller('a', true)]),
      paymentMethodIdFor: () => undefined,
    });

    expect(result).toEqual({ status: 'stopped', sellerId: 'a', message: MISSING_PAYMENT_METHOD_MESSAGE });
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  it('stops at a declined seller and does not charge the sellers after it', async () => {
    const confirmPayment = vi.fn()
      .mockResolvedValueOnce(held)
      .mockResolvedValueOnce({ error: { type: 'card_error', code: 'card_declined', message: 'Declined by bank' } });
    const client: SellerPaymentClient = { confirmPayment, retrievePayment: vi.fn() };

    const result = await authorizeSellers({
      api: apiWith(), client, session: session([seller('a', true), seller('b', true), seller('c', true)]), paymentMethodIdFor: () => 'pm_1',
    });

    expect(result).toEqual({ status: 'stopped', sellerId: 'b', message: 'Declined by bank' });
    expect(confirmPayment).toHaveBeenCalledTimes(2);
  });

  it('uses the generic decline message when the bank gives none', async () => {
    const client: SellerPaymentClient = {
      confirmPayment: async () => ({ error: { type: 'card_error' } }),
      retrievePayment: vi.fn(),
    };

    const result = await authorizeSellers({ api: apiWith(), client, session: session([seller('a', true)]), paymentMethodIdFor: () => 'pm_1' });

    expect(result).toEqual({ status: 'stopped', sellerId: 'a', message: DECLINED_MESSAGE });
  });

  it('stops with the retry message when the buyer cancels card verification', async () => {
    const client: SellerPaymentClient = {
      confirmPayment: async () => ({ error: { type: 'card_error', code: 'payment_intent_authentication_failure' } }),
      retrievePayment: vi.fn(),
    };

    const result = await authorizeSellers({ api: apiWith(), client, session: session([seller('a', true)]), paymentMethodIdFor: () => 'pm_1' });

    expect(result).toEqual({ status: 'stopped', sellerId: 'a', message: AUTHENTICATION_CANCELLED_MESSAGE });
  });

  it('does not confirm a seller whose hold Stripe already shows', async () => {
    const confirmPayment = vi.fn(async () => held);
    const onAuthorized = vi.fn();
    const client: SellerPaymentClient = {
      confirmPayment,
      retrievePayment: vi.fn(async () => held),
    };

    const result = await authorizeSellers({
      api: apiWith(), client, session: session([seller('a', true)]), paymentMethodIdFor: () => 'pm_1', onAuthorized,
    });

    expect(result).toEqual({ status: 'authorized' });
    expect(confirmPayment).not.toHaveBeenCalled();
    expect(onAuthorized).toHaveBeenCalledWith('a');
  });

  it('settles an unknown outcome as authorized when Stripe shows the hold', async () => {
    const onAuthorized = vi.fn();
    const getCheckoutSession = vi.fn(async () => session([seller('a', true)]));
    const client: SellerPaymentClient = {
      confirmPayment: async () => { throw new Error('network down'); },
      // First read: the seller is not held yet. Second read (settling the unknown outcome): held.
      retrievePayment: vi.fn()
        .mockResolvedValueOnce({ paymentIntent: { status: 'requires_payment_method' } })
        .mockResolvedValueOnce(held),
    };

    const result = await authorizeSellers({
      api: apiWith({ getCheckoutSession }), client, session: session([seller('a', true)]), paymentMethodIdFor: () => 'pm_1', onAuthorized,
    });

    expect(result).toEqual({ status: 'authorized' });
    expect(getCheckoutSession).toHaveBeenCalledWith('sess-1');
    expect(onAuthorized).toHaveBeenCalledWith('a');
  });

  it('offers a retry when an unknown outcome is still not held', async () => {
    const client: SellerPaymentClient = {
      confirmPayment: async () => ({ error: { type: 'api_connection_error' } }),
      retrievePayment: vi.fn(async () => ({ paymentIntent: { status: 'requires_payment_method' } })),
    };

    const result = await authorizeSellers({ api: apiWith(), client, session: session([seller('a', true)]), paymentMethodIdFor: () => 'pm_1' });

    expect(result).toEqual({ status: 'stopped', sellerId: 'a', message: UNKNOWN_AUTHORIZATION_MESSAGE });
  });

  it('ends the attempt when the session closed while the outcome was unknown', async () => {
    const client: SellerPaymentClient = {
      confirmPayment: async () => ({ error: { type: 'api_error' } }),
      retrievePayment: vi.fn(),
    };

    const result = await authorizeSellers({
      api: apiWith({ getCheckoutSession: async () => session([], 'expired') }),
      client,
      session: session([seller('a', true)]),
      paymentMethodIdFor: () => 'pm_1',
    });

    expect(result).toEqual({ status: 'closed', message: CHECKOUT_CLOSED_MESSAGE });
  });
});

describe('confirmPlacedOrders', () => {
  it('returns the placed orders', async () => {
    const placed = session([]);
    placed.status = 'placed';
    placed.orders = [{
      id: 'o1', sellerId: 's1', status: 'pending', paymentStatus: 'authorized', total: 10,
      placedAt: null, acceptBy: null, authorizationExpiresAt: null, shortAuthorization: false,
    }];

    const result = await confirmPlacedOrders(apiWith({ confirmCheckoutSession: async () => placed }), 'sess-1');

    expect(result).toEqual({ status: 'placed', orders: placed.orders });
  });

  it.each([
    ['authorization_not_ready', 'not_ready'],
    ['finalization_in_progress', 'retry'],
    ['authorization_canceled', 'failed'],
    ['authorization_mismatch', 'failed'],
    ['authorization_deadline_invalid', 'failed'],
    ['session_expired', 'closed'],
    ['session_closed', 'closed'],
  ])('maps %s to %s', async (code, status) => {
    const error = new CheckoutApiError(409, code, 'server message', false);
    const result = await confirmPlacedOrders(apiWith({ confirmCheckoutSession: async () => { throw error; } }), 'sess-1');

    expect(result.status).toBe(status);
  });

  it('rethrows errors it does not map', async () => {
    const error = new CheckoutApiError(500, 'unknown_error', 'Server Error', false);

    await expect(
      confirmPlacedOrders(apiWith({ confirmCheckoutSession: async () => { throw error; } }), 'sess-1'),
    ).rejects.toBe(error);
  });
});
