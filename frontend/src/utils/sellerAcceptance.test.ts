import { describe, expect, it } from 'vitest';
import { acceptanceDeadlineText, acceptanceErrorMessage, canAcceptOrder, hasCapturePending, isCapturePending } from './sellerAcceptance';
import type { Order } from '../types/order';

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    userId: 'u1',
    items: [],
    shippingAddress: { street: '1 Main St', city: 'Taipei', state: 'Taipei', zipCode: '100', country: 'TW' },
    paymentMethod: { type: 'credit-card', last4: '4242' },
    subtotal: 10, productDiscount: 0, discount: 0, tax: 0.8, shipping: 0, total: 10.8,
    status: 'pending',
    createdAt: '2026-10-14T00:00:00.000Z',
    paymentFlowVersion: 'manual_capture',
    paymentStatus: 'authorized',
    ...overrides,
  } as Order;
}

const now = new Date('2026-10-17T10:00:00.000Z');
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const at = (ms: number) => new Date(now.getTime() + ms).toISOString();

describe('canAcceptOrder', () => {
  it('accepts a pending order before its deadline', () => {
    expect(canAcceptOrder(order({ acceptBy: at(HOUR) }), now)).toBe(true);
  });

  it('rejects an order exactly at its deadline', () => {
    expect(canAcceptOrder(order({ acceptBy: now.toISOString() }), now)).toBe(false);
  });

  it('rejects an order past its deadline', () => {
    expect(canAcceptOrder(order({ acceptBy: at(-MIN) }), now)).toBe(false);
  });

  it('keeps legacy orders without acceptBy acceptable', () => {
    expect(canAcceptOrder(order({ paymentFlowVersion: 'legacy', paymentStatus: undefined, acceptBy: undefined }), now)).toBe(true);
  });

  it('rejects orders that are not pending', () => {
    expect(canAcceptOrder(order({ status: 'preparing', acceptBy: at(HOUR) }), now)).toBe(false);
    expect(canAcceptOrder(order({ status: 'cancelled' }), now)).toBe(false);
  });

  it('rejects an order while its payment is being charged', () => {
    expect(canAcceptOrder(order({ paymentStatus: 'capture_pending', acceptBy: at(HOUR) }), now)).toBe(false);
  });
});

describe('isCapturePending', () => {
  it('is true only for capture_pending payments', () => {
    expect(isCapturePending(order({ paymentStatus: 'capture_pending' }))).toBe(true);
    expect(isCapturePending(order({ paymentStatus: 'authorized' }))).toBe(false);
    expect(isCapturePending(order({ paymentStatus: null }))).toBe(false);
    expect(isCapturePending(order({ paymentStatus: undefined }))).toBe(false);
  });
});

describe('acceptanceErrorMessage', () => {
  it.each([
    ['acceptance_deadline_passed', 'The acceptance window for this order has ended.'],
    ['order_not_pending', 'This order is no longer waiting for acceptance. Refresh to see its latest status.'],
    ['capture_failed', 'The payment could not be charged. Try accepting again.'],
    ['authorization_expired', "The buyer's payment reservation expired, so this order was cancelled."],
    ['payment_reference_missing', 'This order has no payment on file. Contact support.'],
    ['not_order_seller', 'This order is not available to you.'],
    ['order_not_found', 'This order is not available to you.'],
  ])('explains %s', (code, message) => {
    expect(acceptanceErrorMessage(code)).toBe(message);
  });

  it('falls back for unknown or missing codes', () => {
    expect(acceptanceErrorMessage('something_else')).toBe('Could not accept the order. Please try again.');
    expect(acceptanceErrorMessage(undefined)).toBe('Could not accept the order. Please try again.');
  });
});

describe('acceptanceDeadlineText', () => {
  it('shows hours and minutes remaining', () => {
    expect(acceptanceDeadlineText(order({ acceptBy: at(3 * HOUR + 20 * MIN) }), now)).toBe('Accept within 3h 20m');
  });

  it('drops zero parts', () => {
    expect(acceptanceDeadlineText(order({ acceptBy: at(45 * MIN) }), now)).toBe('Accept within 45m');
    expect(acceptanceDeadlineText(order({ acceptBy: at(2 * HOUR) }), now)).toBe('Accept within 2h');
  });

  it('rounds partial minutes up so the seller never sees 0m while time remains', () => {
    expect(acceptanceDeadlineText(order({ acceptBy: at(30 * 1000) }), now)).toBe('Accept within 1m');
  });

  it('shows the date when more than 24 hours remain', () => {
    const acceptBy = at(25 * HOUR);
    expect(acceptanceDeadlineText(order({ acceptBy }), now)).toBe(`Accept by ${new Date(acceptBy).toLocaleString()}`);
  });

  it('still counts down at exactly 24 hours', () => {
    expect(acceptanceDeadlineText(order({ acceptBy: at(24 * HOUR) }), now)).toBe('Accept within 24h');
  });

  it('says the window ended at or after the deadline', () => {
    expect(acceptanceDeadlineText(order({ acceptBy: now.toISOString() }), now)).toBe('Acceptance window ended');
    expect(acceptanceDeadlineText(order({ acceptBy: at(-HOUR) }), now)).toBe('Acceptance window ended');
  });

  it('is null without acceptBy or once the order is no longer pending', () => {
    expect(acceptanceDeadlineText(order({ acceptBy: undefined }), now)).toBeNull();
    expect(acceptanceDeadlineText(order({ status: 'preparing', acceptBy: at(HOUR) }), now)).toBeNull();
  });
});

describe('hasCapturePending', () => {
  it('is true while any order is capture_pending', () => {
    expect(hasCapturePending([order(), order({ paymentStatus: 'capture_pending' })])).toBe(true);
  });

  it('is false when no order is capture_pending, so polling stops', () => {
    expect(hasCapturePending([order(), order({ status: 'preparing', paymentStatus: 'captured' })])).toBe(false);
    expect(hasCapturePending([])).toBe(false);
  });
});
