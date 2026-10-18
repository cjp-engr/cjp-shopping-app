import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../../services/checkoutService.js', () => {
  class CheckoutError extends Error {
    constructor(public statusCode: number, public code: string, message: string, public details?: unknown, public retryable = false) {
      super(message);
    }
  }
  return {
    CheckoutError,
    createCheckoutSession: vi.fn(),
    getCheckoutSessionForBuyer: vi.fn(),
    sellerDisplayNames: vi.fn().mockResolvedValue(new Map([['seller-1', 'Seller One']])),
    validateCheckoutRequest: vi.fn(() => ({ savedPaymentMethodId: undefined })),
  };
});

vi.mock('../../services/checkoutAuthorization.js', () => ({
  assertSavedCardOwned: vi.fn(),
  authorizeCheckoutSession: vi.fn().mockResolvedValue([]),
  ownerClientSecrets: vi.fn().mockResolvedValue(new Map()),
}));

import { createCheckoutSession, CheckoutError } from '../../services/checkoutService.js';
import { authorizeCheckoutSession } from '../../services/checkoutAuthorization.js';
import { createSession } from '../checkoutController.js';

const session = {
  _id: { toString: () => 'session-1' },
  status: 'open',
  expiresAt: new Date('2026-10-14T00:15:00Z'),
  sellers: [{
    sellerId: { toString: () => 'seller-1' },
    draftOrderId: { toString: () => 'order-1' },
    amountMinor: 3159,
    currency: 'usd',
    status: 'awaiting_authorization',
  }],
};

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
  (res.status as any).mockReturnValue(res);
  return res;
}

function makeReq(headers: Record<string, string> = {}): Request {
  return {
    user: { id: 'buyer-1' },
    header: (name: string) => headers[name],
    body: { items: [] },
  } as unknown as Request;
}

describe('createSession controller', () => {
  const originalFlow = process.env.CHECKOUT_FLOW;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CHECKOUT_FLOW = 'manual_capture';
  });

  afterEach(() => {
    if (originalFlow === undefined) delete process.env.CHECKOUT_FLOW;
    else process.env.CHECKOUT_FLOW = originalFlow;
  });

  it('is disabled unless the manual-capture flow is enabled', async () => {
    process.env.CHECKOUT_FLOW = 'legacy';
    const res = makeRes();
    await createSession(makeReq({ 'Idempotency-Key': 'key-12345678' }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it('requires an Idempotency-Key header', async () => {
    const res = makeRes();
    await createSession(makeReq(), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it('returns 201 for a new session', async () => {
    vi.mocked(createCheckoutSession).mockResolvedValue({ session: session as any, replayed: false });
    const res = makeRes();
    await createSession(makeReq({ 'Idempotency-Key': 'key-12345678' }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(201);
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.data.id).toBe('session-1');
    expect(payload.data.sellers[0]).toMatchObject({ sellerId: 'seller-1', amountMinor: 3159, currency: 'usd' });
  });

  it('returns 200 when an existing session is replayed', async () => {
    vi.mocked(createCheckoutSession).mockResolvedValue({ session: session as any, replayed: true });
    const res = makeRes();
    await createSession(makeReq({ 'Idempotency-Key': 'key-12345678' }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('maps checkout errors to the error envelope', async () => {
    vi.mocked(createCheckoutSession).mockRejectedValue(new CheckoutError(409, 'insufficient_stock', 'Insufficient stock', { productId: 'p1' }));
    const res = makeRes();
    await createSession(makeReq({ 'Idempotency-Key': 'key-12345678' }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.error.code).toBe('insufficient_stock');
  });
});
