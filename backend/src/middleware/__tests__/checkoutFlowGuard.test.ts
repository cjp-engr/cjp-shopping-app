import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { rejectLegacyCardIntent, rejectLegacyCardOrder } from '../checkoutFlowGuard.js';

const flow = vi.hoisted(() => ({ value: 'legacy' as 'legacy' | 'manual_capture' }));

vi.mock('../../config/checkout.js', () => ({
  checkoutFlow: () => flow.value,
}));

function mockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function mockRequest(body?: unknown) {
  return { body } as Request;
}

describe('rejectLegacyCardIntent', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('passes through when the checkout flow is legacy', () => {
    flow.value = 'legacy';
    const res = mockResponse();

    rejectLegacyCardIntent(mockRequest(), res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 426 update_required when the checkout flow is manual_capture', () => {
    flow.value = 'manual_capture';
    const res = mockResponse();

    rejectLegacyCardIntent(mockRequest(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(426);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'update_required',
          retryable: false,
          details: {
            reason: 'card_intent_replaced_by_sessions',
            requiredEndpoint: '/api/checkout/sessions',
          },
        }),
      }),
    );
  });
});

describe('rejectLegacyCardOrder', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('passes through card orders when the checkout flow is legacy', () => {
    flow.value = 'legacy';
    const res = mockResponse();

    rejectLegacyCardOrder(mockRequest({ paymentMethod: { type: 'credit-card' } }), res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each(['credit-card', 'debit-card'])(
    'returns 426 for a %s order when the checkout flow is manual_capture',
    (type) => {
      flow.value = 'manual_capture';
      const res = mockResponse();

      rejectLegacyCardOrder(mockRequest({ paymentMethod: { type } }), res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(426);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'update_required',
            details: {
              reason: 'card_order_requires_session',
              requiredEndpoint: '/api/checkout/sessions',
            },
          }),
        }),
      );
    },
  );

  it('lets cash-on-delivery orders through when the checkout flow is manual_capture', () => {
    flow.value = 'manual_capture';
    const res = mockResponse();

    rejectLegacyCardOrder(mockRequest({ paymentMethod: { type: 'cash-on-delivery' } }), res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('lets orders without a payment method through so validation can reject them', () => {
    flow.value = 'manual_capture';
    const res = mockResponse();

    rejectLegacyCardOrder(mockRequest({}), res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('lets requests without a body through', () => {
    flow.value = 'manual_capture';
    const res = mockResponse();

    rejectLegacyCardOrder(mockRequest(undefined), res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
