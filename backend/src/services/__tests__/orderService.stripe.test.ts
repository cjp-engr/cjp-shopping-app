import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../stripeService.js', () => ({
  retrievePaymentIntent: vi.fn(),
}));

vi.mock('../../models/Order.js', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

import { retrievePaymentIntent } from '../stripeService.js';
import Order from '../../models/Order.js';

describe('createOrders — Stripe verification', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 402 when paymentIntentId is missing for card payment', async () => {
    const { createOrders } = await import('../orderService.js');
    await expect(
      createOrders({
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 1 }],
        shippingAddress: {},
        paymentMethod: { type: 'credit-card' },
      }),
    ).rejects.toMatchObject({ statusCode: 402 });
  });

  it('throws 409 when paymentIntentId already used', async () => {
    (Order.findOne as any).mockResolvedValue({ _id: 'existing-order' });
    const { createOrders } = await import('../orderService.js');
    await expect(
      createOrders({
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 1 }],
        shippingAddress: {},
        paymentMethod: { type: 'credit-card' },
        paymentIntentId: 'pi_already_used',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws 402 when PaymentIntent status is not succeeded', async () => {
    (Order.findOne as any).mockResolvedValue(null);
    (retrievePaymentIntent as any).mockResolvedValue({ status: 'requires_payment_method' });
    const { createOrders } = await import('../orderService.js');
    await expect(
      createOrders({
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 1 }],
        shippingAddress: {},
        paymentMethod: { type: 'credit-card' },
        paymentIntentId: 'pi_pending',
      }),
    ).rejects.toMatchObject({ statusCode: 402 });
  });
});
