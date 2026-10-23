import { describe, expect, it } from 'vitest';
import { summarizeRefundedItems } from '../orderRefundMarks.js';

const unit = (lineId: string, ordinal = 1) => ({ lineId, ordinal });
const request = (orderId: string, state: string, units: Array<{ lineId: string; ordinal: number }>) => ({ orderId, state, units });

describe('refunded item marks for the buyer order list', () => {
  it('counts the units of settled refunds per item as refunded', () => {
    const marks = summarizeRefundedItems([request('o1', 'refunded', [unit('a', 1), unit('a', 2), unit('b', 1)])]);
    expect(marks.get('o1')).toEqual([{ lineId: 'a', refunded: 2, processing: 0 }, { lineId: 'b', refunded: 1, processing: 0 }]);
  });

  it('counts approved refunds that are still being paid back as processing, not refunded', () => {
    const marks = summarizeRefundedItems([
      request('o1', 'refunded', [unit('a', 1)]),
      request('o1', 'processing', [unit('a', 2)]),
      request('o1', 'needs_review', [unit('b', 1)]),
    ]);
    expect(marks.get('o1')).toEqual([{ lineId: 'a', refunded: 1, processing: 1 }, { lineId: 'b', refunded: 0, processing: 1 }]);
  });

  it('ignores requests that are waiting for the seller or were rejected', () => {
    const marks = summarizeRefundedItems([request('o1', 'requested', [unit('a')]), request('o1', 'rejected', [unit('a')])]);
    expect(marks.has('o1')).toBe(false);
  });

  it('keeps orders apart and gives nothing for an order without refunds', () => {
    const marks = summarizeRefundedItems([request('o1', 'refunded', [unit('a')]), request('o2', 'refunded', [unit('c')])]);
    expect(marks.get('o1')).toEqual([{ lineId: 'a', refunded: 1, processing: 0 }]);
    expect(marks.get('o2')).toEqual([{ lineId: 'c', refunded: 1, processing: 0 }]);
    expect(marks.get('o3')).toBeUndefined();
  });
});
