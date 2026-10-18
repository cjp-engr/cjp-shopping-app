import { describe, expect, it } from 'vitest';
import { acceptanceDeadline, canBuyerCancel, canSellerCancel, hasShortAcceptanceWindow, paymentStatusNotice } from './orderPayment';
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

const DAY = 24 * 60 * 60 * 1000;
it('hides seller card cancellation until the refund flow exists, retaining legacy COD', () => {
  expect(canSellerCancel(order({ paymentFlowVersion: 'legacy' }))).toBe(false);
  expect(canSellerCancel(order({ paymentFlowVersion: 'legacy', paymentMethod: { type: 'cash-on-delivery' } }))).toBe(true);
  expect(canSellerCancel(order({ paymentFlowVersion: 'manual_capture', paymentMethod: { type: 'cash-on-delivery' } }))).toBe(false);
  expect(canBuyerCancel(order({ paymentFlowVersion: 'legacy', paymentStatus: 'refunded' }))).toBe(false);
});
const placedAt = '2026-10-14T00:05:00.000Z';

describe('paymentStatusNotice', () => {
  it('shows legacy refunds and review without claiming preparation charged the buyer', () => {
    expect(paymentStatusNotice(order({ paymentFlowVersion: 'legacy', paymentStatus: 'refund_pending' }))?.title).toBe('Refund in progress');
    expect(paymentStatusNotice(order({ paymentFlowVersion: 'legacy', paymentStatus: 'refunded' }))?.title).toBe('Refunded');
    expect(paymentStatusNotice(order({ paymentFlowVersion: 'legacy', paymentStatus: 'refund_pending', paymentErrorCode: 'refund_review' }))?.title).toBe('Payment needs review');
  });
  it('shows nothing for legacy orders', () => {
    expect(paymentStatusNotice(order({ paymentFlowVersion: 'legacy', paymentStatus: 'captured' }))).toBeNull();
    expect(paymentStatusNotice(order({ paymentFlowVersion: undefined, paymentStatus: undefined }))).toBeNull();
  });

  it('explains that a reserved payment is charged when the seller starts preparing', () => {
    expect(paymentStatusNotice(order({ paymentStatus: 'authorized' }))).toMatchObject({
      tone: 'info',
      title: 'Payment reserved',
      body: 'Your payment is reserved. It is charged when the seller starts preparing your order.',
    });
  });

  it.each([
    ['capture_pending', 'info', 'Charging payment'],
    ['captured', 'success', 'Payment charged'],
    ['release_pending', 'neutral', 'Releasing reservation'],
    ['released', 'neutral', 'Reservation released'],
    ['refund_pending', 'neutral', 'Refund in progress'],
    ['refunded', 'success', 'Refunded'],
    ['failed', 'warning', 'Payment problem'],
  ])('maps payment status %s', (paymentStatus, tone, title) => {
    expect(paymentStatusNotice(order({ paymentStatus }))).toMatchObject({ tone, title });
  });

  it('shows nothing while authorization has not finished', () => {
    expect(paymentStatusNotice(order({ paymentStatus: 'awaiting_authorization' }))).toBeNull();
    expect(paymentStatusNotice(order({ paymentStatus: null }))).toBeNull();
  });
});

describe('acceptanceDeadline', () => {
  it('returns the deadline only while the seller has not accepted the order', () => {
    const acceptBy = new Date(Date.parse(placedAt) + DAY).toISOString();
    expect(acceptanceDeadline(order({ acceptBy }))).toBe(acceptBy);
    expect(acceptanceDeadline(order({ acceptBy, status: 'preparing' }))).toBeNull();
    expect(acceptanceDeadline(order({ acceptBy, status: 'cancelled' }))).toBeNull();
  });

  it('returns nothing for legacy orders', () => {
    expect(acceptanceDeadline(order({ paymentFlowVersion: 'legacy', acceptBy: placedAt }))).toBeNull();
  });
});

describe('hasShortAcceptanceWindow', () => {
  it('flags an acceptance window shorter than 24 hours', () => {
    const acceptBy = new Date(Date.parse(placedAt) + 6 * 60 * 60 * 1000).toISOString();
    expect(hasShortAcceptanceWindow(order({ placedAt, acceptBy }))).toBe(true);
  });

  it('does not flag a full 24-hour window', () => {
    const acceptBy = new Date(Date.parse(placedAt) + DAY).toISOString();
    expect(hasShortAcceptanceWindow(order({ placedAt, acceptBy }))).toBe(false);
  });

  it('needs both timestamps', () => {
    expect(hasShortAcceptanceWindow(order({ placedAt }))).toBe(false);
    expect(hasShortAcceptanceWindow(order({ acceptBy: placedAt }))).toBe(false);
  });
});

describe('canBuyerCancel', () => {
  it('allows pending authorized and COD orders but blocks an in-flight capture', () => {
    expect(canBuyerCancel(order({ status: 'pending' }))).toBe(true);
    expect(canBuyerCancel(order({ paymentStatus: 'not_required' }))).toBe(true);
    expect(canBuyerCancel(order({ paymentStatus: 'capture_pending' }))).toBe(false);
    expect(canBuyerCancel(order({ status: 'preparing' }))).toBe(false);
  });

  it('keeps cancellation for pending legacy orders', () => {
    expect(canBuyerCancel(order({ status: 'pending', paymentFlowVersion: 'legacy' }))).toBe(true);
    expect(canBuyerCancel(order({ status: 'preparing', paymentFlowVersion: 'legacy' }))).toBe(false);
  });
});
