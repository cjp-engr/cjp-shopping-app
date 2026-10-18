import { describe, expect, it } from 'vitest';
import { refundQuote, refundShippingQuote, refundReasonLabels } from './refund';
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
