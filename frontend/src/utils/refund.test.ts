import { describe, expect, it } from 'vitest';
import { refundQuote, refundShippingQuote, refundReasonLabels, refundMark, sellerRefundBadge } from './refund';
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
    expect(refundMark(marks, 'b', 2)).toEqual({ label: 'Refunded', done: true });
  });

  it('says how many units were refunded when only some were', () => {
    expect(refundMark([{ lineId: 'a', refunded: 1, processing: 0 }], 'a', 3)).toEqual({ label: '1 of 3 refunded', done: true });
  });

  it('says Refund processing while approved units are still being paid back', () => {
    expect(refundMark(marks, 'c', 1)).toEqual({ label: 'Refund processing', done: false });
    expect(refundMark(marks, 'a', 2)).toEqual({ label: '1 refunded, 1 processing', done: false });
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
