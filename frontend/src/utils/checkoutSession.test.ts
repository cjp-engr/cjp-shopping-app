import { describe, expect, it } from 'vitest';
import { buildCheckoutSessionPayload } from './checkoutSession';
import type { Cart } from '../types/cart';
import type { Product } from '../types/product';

const address = { street: '1 Main St', city: 'Taipei', state: 'Taipei', zipCode: '100', country: 'TW' };
const cart = {
  items: [
    { product: { id: 'p1' } as Product, quantity: 1, isSelected: true },
    {
      product: { id: 'p2' } as Product,
      quantity: 3,
      isSelected: true,
      selectedVariant: { _id: 'v2', attributes: { Color: 'Red' }, price: 5, stock: 9, key: 'Color:Red' },
    },
  ],
} as unknown as Cart;

describe('buildCheckoutSessionPayload', () => {
  it('maps each cart line to product, variant, attributes and quantity', () => {
    const payload = buildCheckoutSessionPayload({ cart, shippingAddress: address, paymentMethod: { type: 'credit-card' } });

    expect(payload.items).toEqual([
      { productId: 'p1', variantId: undefined, selectedAttributes: undefined, quantity: 1 },
      { productId: 'p2', variantId: 'v2', selectedAttributes: { Color: 'Red' }, quantity: 3 },
    ]);
  });

  it('omits empty optional maps and includes a saved card when one is chosen', () => {
    const payload = buildCheckoutSessionPayload({
      cart,
      shippingAddress: address,
      paymentMethod: { type: 'credit-card' },
      couponCodes: {},
      deliverySelections: {},
      savedPaymentMethodId: 'pm_1Example',
    });

    expect(payload).not.toHaveProperty('couponCodes');
    expect(payload).not.toHaveProperty('deliverySelections');
    expect(payload).not.toHaveProperty('sellerMessages');
    expect(payload.savedPaymentMethodId).toBe('pm_1Example');
  });

  it('includes non-empty seller choices', () => {
    const payload = buildCheckoutSessionPayload({
      cart,
      shippingAddress: address,
      paymentMethod: { type: 'debit-card' },
      sellerMessages: { s1: 'Gift wrap please' },
      deliverySelections: { s1: 'standard' },
    });

    expect(payload).toMatchObject({
      sellerMessages: { s1: 'Gift wrap please' },
      deliverySelections: { s1: 'standard' },
      paymentMethod: { type: 'debit-card' },
    });
  });
});
