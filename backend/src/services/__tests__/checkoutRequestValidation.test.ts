import { describe, expect, it } from 'vitest';
import { validateCheckoutRequest } from '../checkoutService.js';

const base = {
  items: [{ productId: '507f1f77bcf86cd799439011', quantity: 1 }],
  shippingAddress: { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' },
  paymentMethod: { type: 'credit-card' },
};

describe('validateCheckoutRequest: saved PaymentMethod IDs', () => {
  it.each(['pm_1Example', 'pm_card_visa', 'pm_card_mastercard', 'pm_OWNED'])('accepts %s', id => {
    expect(validateCheckoutRequest({ ...base, savedPaymentMethodId: id }).savedPaymentMethodId).toBe(id);
  });

  it('treats an omitted saved card as a new card', () => {
    expect(validateCheckoutRequest(base).savedPaymentMethodId).toBeUndefined();
  });

  it.each(['card_visa', 'pm_', 'pm-abc', 'pm_abc def', 'sk_test_123', 42])('rejects %s', id => {
    expect(() => validateCheckoutRequest({ ...base, savedPaymentMethodId: id })).toThrow(
      'savedPaymentMethodId must be a Stripe PaymentMethod ID',
    );
  });
});
