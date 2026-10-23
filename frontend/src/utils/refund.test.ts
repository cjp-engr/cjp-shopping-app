import { describe, expect, it } from 'vitest';
import { refundQuote, refundShippingQuote, refundReasonLabels, refundMark, sellerRefundBadge, orderRefundLabel, refundCardStatusLabel, refundCardChip } from './refund';
const lines = [{ lineId: 'a', productName: 'Mug', quantityOrdered: 2, quantityAvailable: 2, availableUnitAmountsMinor: [1080, 1079] }];
describe('delivered refund shipping quote', () => {
  it('shows shipping only for all remaining units with an eligible seller-fault reason', () => {
    expect(refundShippingQuote(lines, { a: 1 }, 'damaged', 500)).toBe(0);
    expect(refundShippingQuote(lines, { a: 2 }, 'damaged', 500)).toBe(500);
    expect(refundQuote(lines, { a: 2 })! + refundShippingQuote(lines, { a: 2 }, 'wrong_item', 500)).toBe(2659);
    expect(refundShippingQuote(lines, { a: 2 }, 'other', 500)).toBe(0);
    expect(refundShippingQuote(lines, { a: 2 }, 'damaged')).toBe(0);
    expect(refundShippingQuote(lines, { a: 3 }, 'damaged', 500)).toBe(0);
    expect(refundReasonLabels).not.toHaveProperty('change_of_mind');
  });
});

describe('refund mark on an order item', () => {
  const marks = [{ lineId: 'a', refunded: 1, processing: 1 }, { lineId: 'b', refunded: 2, processing: 0 }, { lineId: 'c', refunded: 0, processing: 1 }];

  it('says Refunded when every unit of the item was paid back', () => {
    expect(refundMark(marks, 'b', 2)).toEqual({ label: 'Refunded', kind: 'full' });
  });

  it('says how many units were refunded when only some were', () => {
    expect(refundMark([{ lineId: 'a', refunded: 1, processing: 0 }], 'a', 3)).toEqual({ label: '1 of 3 refunded', kind: 'partial' });
  });

  it('says Refund processing while approved units are still being paid back', () => {
    expect(refundMark(marks, 'c', 1)).toEqual({ label: 'Refund processing', kind: 'processing' });
    expect(refundMark(marks, 'a', 2)).toEqual({ label: '1 refunded, 1 processing', kind: 'processing' });
  });

  it('marks nothing for an item without refunds, an unknown item or an order without marks', () => {
    expect(refundMark(marks, 'z', 1)).toBeNull();
    expect(refundMark(undefined, 'a', 1)).toBeNull();
    expect(refundMark(marks, undefined, 1)).toBeNull();
    expect(refundMark([{ lineId: 'a', refunded: 0, processing: 0 }], 'a', 1)).toBeNull();
  });
});

describe('seller Return/Refund tab badge', () => {
  it('counts only the requests still waiting for the seller, whatever else the seller has', () => {
    expect(sellerRefundBadge({ total: 2, counts: { in_progress: 2, approved: 4, rejected: 2 } })).toBe(2);
  });

  it('is 0 (no badge) when nothing is waiting, even if there are approved and rejected requests', () => {
    expect(sellerRefundBadge({ total: 0, counts: { in_progress: 0, approved: 4, rejected: 2 } })).toBe(0);
  });

  it('falls back to the page total from a server without group counts', () => {
    expect(sellerRefundBadge({ total: 3 })).toBe(3);
  });
});

describe('refund label for a whole order', () => {
  it('says Fully refunded once everything paid was paid back', () => {
    expect(orderRefundLabel({ paymentStatus: 'refunded', refundedAmountMinor: 3200 })).toEqual({ label: 'Fully refunded', kind: 'full' });
  });

  it('says Partially refunded when some money was paid back but not all', () => {
    expect(orderRefundLabel({ paymentStatus: 'partially_refunded', refundedAmountMinor: 1080 })).toEqual({ label: 'Partially refunded', kind: 'partial' });
  });

  it('says Refund processing while an approved refund is still being paid back', () => {
    expect(orderRefundLabel({ paymentStatus: 'captured', refundedAmountMinor: 0, refundReservedAmountMinor: 1080 })).toEqual({ label: 'Refund processing', kind: 'processing' });
  });

  it('says Refund requested while a request still waits for the seller (nothing paid or reserved yet)', () => {
    expect(orderRefundLabel({ paymentStatus: 'captured', activeRefundRequestId: 'r1' })).toEqual({ label: 'Refund requested', kind: 'processing' });
    expect(orderRefundLabel({ paymentStatus: 'captured', activeRefundRequestId: 'r1', refundReservedAmountMinor: 0 })).toEqual({ label: 'Refund requested', kind: 'processing' });
  });

  it('says Refund processing, not requested, once the seller approved and money is reserved', () => {
    expect(orderRefundLabel({ paymentStatus: 'captured', activeRefundRequestId: 'r1', refundReservedAmountMinor: 1080 })).toEqual({ label: 'Refund processing', kind: 'processing' });
  });

  it('shows a refund in flight even when an earlier refund already made the order partially refunded', () => {
    const earlier = { paymentStatus: 'partially_refunded', refundedAmountMinor: 1080 };
    expect(orderRefundLabel({ ...earlier, refundReservedAmountMinor: 500 })).toEqual({ label: 'Refund processing', kind: 'processing' });
    expect(orderRefundLabel({ ...earlier, activeRefundRequestId: 'r2' })).toEqual({ label: 'Refund requested', kind: 'processing' });
  });

  it('ignores an empty active request id', () => {
    expect(orderRefundLabel({ paymentStatus: 'captured', activeRefundRequestId: null })).toBeNull();
    expect(orderRefundLabel({ paymentStatus: 'captured', activeRefundRequestId: '' })).toBeNull();
  });

  it('shows nothing for an order with no refund', () => {
    expect(orderRefundLabel({ paymentStatus: 'captured' })).toBeNull();
    expect(orderRefundLabel({ paymentStatus: 'captured', refundedAmountMinor: 0, refundReservedAmountMinor: 0 })).toBeNull();
    expect(orderRefundLabel({})).toBeNull();
  });
});

describe('status label on a Return/Refund card', () => {
  it('says Fully or Partially refunded for a settled refund, by what happened to the whole order', () => {
    expect(refundCardStatusLabel({ state: 'refunded', orderPaymentStatus: 'refunded' })).toBe('Fully refunded');
    expect(refundCardStatusLabel({ state: 'refunded', orderPaymentStatus: 'partially_refunded' })).toBe('Partially refunded');
  });

  it('keeps the plain label when the order status is unknown, and for refunds that are not settled', () => {
    expect(refundCardStatusLabel({ state: 'refunded' })).toBe('Refunded');
    expect(refundCardStatusLabel({ state: 'refunded', orderPaymentStatus: null })).toBe('Refunded');
    expect(refundCardStatusLabel({ state: 'processing', orderPaymentStatus: 'partially_refunded' })).toBe('Refund processing');
    expect(refundCardStatusLabel({ state: 'requested', orderPaymentStatus: 'captured' })).toBe('Awaiting seller review');
  });
});

describe('chip on a Return/Refund card', () => {
  it('is violet for a settled refund: full when the whole order was refunded or nothing is known, partial when only part was', () => {
    expect(refundCardChip({ state: 'refunded', orderPaymentStatus: 'refunded' })).toEqual({ label: 'Fully refunded', kind: 'full' });
    expect(refundCardChip({ state: 'refunded', orderPaymentStatus: 'partially_refunded' })).toEqual({ label: 'Partially refunded', kind: 'partial' });
    expect(refundCardChip({ state: 'refunded' })).toEqual({ label: 'Refunded', kind: 'full' });
  });

  it('is amber while the refund is requested or being paid back', () => {
    expect(refundCardChip({ state: 'processing' })).toEqual({ label: 'Refund processing', kind: 'processing' });
    expect(refundCardChip({ state: 'requested' })).toEqual({ label: 'Awaiting seller review', kind: 'processing' });
  });

  it('on the order page the card is one request of several, so it keeps the plain Refunded', () => {
    expect(refundCardChip({ state: 'refunded', orderPaymentStatus: 'partially_refunded' }, true)).toEqual({ label: 'Refunded', kind: 'full' });
  });

  it('has no chip for the states that keep their own warning look', () => {
    expect(refundCardChip({ state: 'rejected' })).toBeNull();
    expect(refundCardChip({ state: 'needs_review' })).toBeNull();
  });
});
