import { describe, it, expect } from 'vitest';
import {
  computeSellerTotals,
  currencyExponent,
  priceLine,
  toMinorUnits,
  STANDARD_SHIPPING_FEE,
  TAX_RATE,
  type ProductLike,
} from '../checkoutPricing.js';

const product = (overrides: Partial<ProductLike> = {}): ProductLike => ({
  _id: 'p1',
  name: 'Book',
  price: 20,
  stock: 10,
  discount: 0,
  image: 'img.png',
  ...overrides,
});

describe('priceLine', () => {
  it('prices a plain product from its base price and discount', () => {
    const line = priceLine(product({ discount: 10 }), undefined, 2);
    expect(line.gross).toBe(40);
    expect(line.itemDiscount).toBeCloseTo(4);
    expect(line.discountPercent).toBe(10);
  });

  it('prices a variant from its own price, discount and image', () => {
    const variantId = 'v1';
    const withVariant = product({
      variants: [{ _id: variantId, price: 30, discount: 5, images: ['a.png'], stock: 3 }],
    });
    const line = priceLine(withVariant, variantId, 1);
    expect(line.productPrice).toBe(30);
    expect(line.productImage).toBe('a.png');
    expect(line.discountPercent).toBe(5);
    expect(line.itemDiscount).toBeCloseTo(1.5);
  });
});

describe('computeSellerTotals', () => {
  const base = {
    sellerKey: 'seller-1',
    subtotal: 100,
    productDiscount: 0,
    couponDiscount: 0,
    deliverySelections: {},
  };

  it('applies tax to the discounted amount', () => {
    const totals = computeSellerTotals({
      ...base,
      productDiscount: 10,
      couponDiscount: 5,
      firstProduct: { shippingFee: 'free' },
    });
    expect(totals.effectiveSubtotal).toBe(90);
    expect(totals.afterAllDiscounts).toBe(85);
    expect(totals.tax).toBeCloseTo(85 * TAX_RATE);
    expect(totals.shipping).toBe(0);
    expect(totals.total).toBeCloseTo(85 + 85 * TAX_RATE);
  });

  it.each([0.01, 40, 49.99, 50, 99, 1000])(
    'charges the flat standard shipping fee for a product with no shipping setting (subtotal %s)',
    (subtotal) => {
      const totals = computeSellerTotals({ ...base, subtotal, firstProduct: {} });
      expect(totals.shipping).toBe(STANDARD_SHIPPING_FEE);
      expect(totals.shipping).toBe(9.99);
    },
  );

  it('never waives the standard fee for a large order, only a seller-set free fee does', () => {
    const noSetting = computeSellerTotals({ ...base, subtotal: 500, firstProduct: {} });
    const free = computeSellerTotals({ ...base, subtotal: 500, firstProduct: { shippingFee: 'free' } });
    expect(noSetting.shipping).toBe(9.99);
    expect(free.shipping).toBe(0);
  });

  it('does not change the standard fee when discounts shrink the order', () => {
    const totals = computeSellerTotals({ ...base, subtotal: 100, productDiscount: 60, couponDiscount: 5, firstProduct: {} });
    expect(totals.afterAllDiscounts).toBe(35);
    expect(totals.shipping).toBe(9.99);
    expect(totals.total).toBeCloseTo(35 + 35 * TAX_RATE + 9.99);
  });

  it('charges the standard fee when buyer-pays has no fee configured at all', () => {
    const totals = computeSellerTotals({
      ...base,
      firstProduct: { shippingFee: 'buyer_pays', shippingFeeAmounts: {}, shippingOptions: ['standard'] },
    });
    expect(totals.shipping).toBe(9.99);
  });

  it('keeps an explicit zero fee set by the seller for buyer-pays', () => {
    const totals = computeSellerTotals({
      ...base,
      firstProduct: { shippingFee: 'buyer_pays', shippingFeeAmounts: { standard: 0 }, shippingOptions: ['standard'] },
    });
    expect(totals.shipping).toBe(0);
  });

  it('uses the buyer-selected delivery option fee for buyer-pays products', () => {
    const totals = computeSellerTotals({
      ...base,
      deliverySelections: { 'seller-1': 'express' },
      firstProduct: {
        shippingFee: 'buyer_pays',
        shippingFeeAmounts: { standard: 5, express: 12 },
        shippingOptions: ['standard', 'express'],
      },
    });
    expect(totals.selectedDeliveryOption).toBe('express');
    expect(totals.shipping).toBe(12);
  });

  it('falls back to the first configured option when none is selected', () => {
    const totals = computeSellerTotals({
      ...base,
      firstProduct: {
        shippingFee: 'buyer_pays',
        shippingFeeAmounts: { standard: 5 },
        shippingOptions: ['standard'],
      },
    });
    expect(totals.selectedDeliveryOption).toBe('standard');
    expect(totals.shipping).toBe(5);
  });
});

describe('toMinorUnits and currencies', () => {
  it('rounds USD to cents using a single rounding point', () => {
    expect(toMinorUnits(93.38, 'usd')).toBe(9338);
    expect(toMinorUnits(0.1 + 0.2, 'usd')).toBe(30);
  });

  it('uses zero exponent for JPY', () => {
    expect(currencyExponent('jpy')).toBe(0);
    expect(toMinorUnits(1234.4, 'jpy')).toBe(1234);
  });

  it('rejects currencies outside the supported table', () => {
    expect(() => currencyExponent('xyz')).toThrow('Unsupported currency');
    expect(() => toMinorUnits(1, 'xyz')).toThrow('Unsupported currency');
  });
});
