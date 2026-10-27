import { describe, expect, it } from 'vitest';
import { sellerShippingFee } from './shipping';
import { DEFAULT_SHIPPING_FEE } from './constants';

describe('sellerShippingFee', () => {
  it('is free only when the seller sets free shipping', () => {
    expect(sellerShippingFee({ shippingFee: 'free' })).toBe(0);
  });

  it('charges the flat default fee when the seller set nothing', () => {
    expect(sellerShippingFee({})).toBe(DEFAULT_SHIPPING_FEE);
    expect(sellerShippingFee({ shippingFee: undefined, shippingFeeAmounts: {} })).toBe(9.99);
  });

  it('uses the fee of the selected delivery option for buyer-pays', () => {
    const shippingFeeAmounts = { standard: 5, express: 12 };
    expect(sellerShippingFee({ shippingFee: 'buyer_pays', shippingFeeAmounts, selectedOption: 'express' })).toBe(12);
    expect(sellerShippingFee({ shippingFee: 'buyer_pays', shippingFeeAmounts, selectedOption: 'standard' })).toBe(5);
  });

  it('falls back to the first configured fee when no option is selected or the option has no fee', () => {
    const shippingFeeAmounts = { standard: 5 };
    expect(sellerShippingFee({ shippingFee: 'buyer_pays', shippingFeeAmounts })).toBe(5);
    expect(sellerShippingFee({ shippingFee: 'buyer_pays', shippingFeeAmounts, selectedOption: 'pickup' })).toBe(5);
  });

  it('charges the default fee when buyer-pays has no fee configured at all', () => {
    expect(sellerShippingFee({ shippingFee: 'buyer_pays', shippingFeeAmounts: {}, selectedOption: 'standard' })).toBe(DEFAULT_SHIPPING_FEE);
    expect(sellerShippingFee({ shippingFee: 'buyer_pays' })).toBe(DEFAULT_SHIPPING_FEE);
  });

  it('keeps an explicit zero fee set by the seller', () => {
    expect(sellerShippingFee({ shippingFee: 'buyer_pays', shippingFeeAmounts: { standard: 0 }, selectedOption: 'standard' })).toBe(0);
  });

  it('does not depend on the order size', () => {
    // The amount of the order is not an input: there is no free-shipping threshold any more
    expect(sellerShippingFee({})).toBe(sellerShippingFee({ shippingFee: undefined }));
  });
});
