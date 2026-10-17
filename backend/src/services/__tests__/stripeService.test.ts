import { describe, it, expect, vi } from 'vitest';

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';

vi.mock('stripe', () => {
  const mockCreate = vi.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret_test' });
  const mockRetrieve = vi.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded' });
  const mockCapture = vi.fn();
  const mockConstructEvent = vi.fn().mockReturnValue({ type: 'payment_intent.succeeded' });

  const MockStripe = class {
    paymentIntents = { create: mockCreate, retrieve: mockRetrieve, capture: mockCapture };
    webhooks = { constructEvent: mockConstructEvent };
  };

  return {
    default: MockStripe,
    __mockCapture: mockCapture,
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

  describe('capturePaymentIntent', () => {
    it('captures the exact amount with the idempotency key and returns the verified fields', async () => {
      const stripeMock = (await import('stripe')) as unknown as { __mockCapture: ReturnType<typeof vi.fn> };
      stripeMock.__mockCapture.mockResolvedValueOnce({ id: 'pi_1', status: 'succeeded', amount_received: 2500 });
      const { capturePaymentIntent } = await import('../stripeService.js');

      const result = await capturePaymentIntent('pi_1', 2500, 'k');

      expect(stripeMock.__mockCapture).toHaveBeenCalledWith('pi_1', { amount_to_capture: 2500 }, { idempotencyKey: 'k' });
      expect(result).toEqual({ id: 'pi_1', status: 'succeeded', amountReceived: 2500 });
    });

    it('wraps a Stripe failure in StripeError', async () => {
      const stripeMock = (await import('stripe')) as unknown as { __mockCapture: ReturnType<typeof vi.fn> };
      const original = new Error('card_declined');
      stripeMock.__mockCapture.mockRejectedValueOnce(original);
      const { capturePaymentIntent, StripeError } = await import('../stripeService.js');

      const failure = await capturePaymentIntent('pi_1', 2500, 'k').catch((e) => e);

      expect(failure).toBeInstanceOf(StripeError);
      expect(failure.originalError).toBe(original);
    });
  });
});
