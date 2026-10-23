import { describe, expect, it } from 'vitest';
import { shippingForRefundSelection, validRefundAccounting } from '../refundShipping.js';
const allocation = { version: 1 as const, currency: 'usd', capturedAmountMinor: 2660, shippingMinor: 500,
  units: [{ lineId: 'a', ordinal: 1, merchandiseMinor: 1000, taxMinor: 80 }, { lineId: 'a', ordinal: 2, merchandiseMinor: 1000, taxMinor: 80 }] };
describe('shipping on the final item refund', () => {
  it('excludes shipping from partial selections and includes it when every remaining unit is selected', () => {
    expect(shippingForRefundSelection(allocation, {}, [allocation.units[0]])).toBe(0);
    expect(shippingForRefundSelection(allocation, {}, allocation.units)).toBe(500);
    expect(shippingForRefundSelection(allocation, { refundUnitsTaken: [allocation.units[0]], refundedAmountMinor: 1080 }, [allocation.units[1]])).toBe(500);
  });
  it('never includes shipping already refunded or reserved', () => {
    expect(shippingForRefundSelection(allocation, { refundedShippingMinor: 500 }, allocation.units)).toBe(0);
    expect(shippingForRefundSelection(allocation, { refundReservedShippingMinor: 500 }, allocation.units)).toBe(0);
  });
  it('reconciles unit amounts plus shipping with the financial aggregates', () => {
    expect(validRefundAccounting(allocation, { refundUnitsTaken: allocation.units, refundedAmountMinor: 2660, refundedShippingMinor: 500 })).toBe(true);
    expect(validRefundAccounting(allocation, { refundUnitsTaken: allocation.units, refundedAmountMinor: 2660 })).toBe(false);
    expect(validRefundAccounting(allocation, { refundUnitsTaken: allocation.units, refundReservedAmountMinor: 2660, refundReservedShippingMinor: 500 })).toBe(true);
    expect(validRefundAccounting(allocation, { refundedShippingMinor: 501, refundedAmountMinor: 501 })).toBe(false);
  });
});
