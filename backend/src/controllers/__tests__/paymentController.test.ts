import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

vi.mock('../../services/stripeService.js', () => ({
  constructWebhookEvent: vi.fn(),
  createPaymentIntent: vi.fn(),
  retrievePaymentIntent: vi.fn(),
}));

vi.mock('../../models/Order.js', () => ({
  default: {
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../../models/Cart.js', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

import { constructWebhookEvent } from '../../services/stripeService.js';
import Order from '../../models/Order.js';
import { handleWebhook } from '../paymentController.js';

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
  (res.status as any).mockReturnValue(res);
  return res;
}

describe('handleWebhook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 on invalid signature', async () => {
    (constructWebhookEvent as any).mockImplementation(() => {
      throw new Error('bad sig');
    });
    const req = { headers: { 'stripe-signature': 'bad' }, body: Buffer.from('{}') } as unknown as Request;
    const res = makeRes();
    await handleWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('updates order to processing on payment_intent.succeeded', async () => {
    (constructWebhookEvent as any).mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } },
    });
    const req = { headers: { 'stripe-signature': 'sig' }, body: Buffer.from('{}') } as unknown as Request;
    const res = makeRes();
    await handleWebhook(req, res);
    expect(Order.findOneAndUpdate).toHaveBeenCalledWith(
      { paymentIntentId: 'pi_123' },
      { status: 'processing' },
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('updates order to cancelled on payment_intent.payment_failed', async () => {
    (constructWebhookEvent as any).mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_456' } },
    });
    const req = { headers: { 'stripe-signature': 'sig' }, body: Buffer.from('{}') } as unknown as Request;
    const res = makeRes();
    await handleWebhook(req, res);
    expect(Order.findOneAndUpdate).toHaveBeenCalledWith(
      { paymentIntentId: 'pi_456' },
      { status: 'cancelled' },
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
