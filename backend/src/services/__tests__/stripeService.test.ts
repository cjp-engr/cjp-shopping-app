import { describe, it, expect, vi } from 'vitest';

vi.mock('stripe', () => {
  const mockCreate = vi.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret_test' });
  const mockRetrieve = vi.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded' });
  const mockConstructEvent = vi.fn().mockReturnValue({ type: 'payment_intent.succeeded' });

  const MockStripe = class {
    paymentIntents = { create: mockCreate, retrieve: mockRetrieve };
    webhooks = { constructEvent: mockConstructEvent };
  };

  return {
    default: MockStripe,
  };
});

describe('stripeService', () => {
  it('createPaymentIntent returns id and clientSecret', async () => {
    const { createPaymentIntent } = await import('../stripeService.js');
    const result = await createPaymentIntent(1000, 'usd', { userId: 'u1' });
    expect(result).toEqual({ id: 'pi_test', clientSecret: 'secret_test' });
  });

  it('retrievePaymentIntent returns the payment intent', async () => {
    const { retrievePaymentIntent } = await import('../stripeService.js');
    const intent = await retrievePaymentIntent('pi_test');
    expect(intent.id).toBe('pi_test');
    expect(intent.status).toBe('succeeded');
  });

  it('constructWebhookEvent returns parsed event', async () => {
    const { constructWebhookEvent } = await import('../stripeService.js');
    const event = constructWebhookEvent(Buffer.from('{}'), 'sig', 'whsec_test');
    expect(event.type).toBe('payment_intent.succeeded');
  });
});
