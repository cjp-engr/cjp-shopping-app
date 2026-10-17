import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../../services/sellerService.js', () => ({ updateSellerOrderStatus: vi.fn() }));

import * as sellerService from '../../services/sellerService.js';
import { AppError, errorHandler } from '../../middleware/errorHandler.js';
import { updateSellerOrderStatus } from '../sellerController.js';

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
  (res.status as any).mockReturnValue(res);
  return res;
}

function makeReq(): any {
  return { user: { id: 'seller-1' }, params: { id: 'order-1' }, body: { status: 'preparing' } };
}

describe('updateSellerOrderStatus controller', () => {
  beforeEach(() => vi.resetAllMocks());

  it('responds 200 with the order when the transition completed', async () => {
    const order = { _id: 'order-1', status: 'preparing' };
    vi.mocked(sellerService.updateSellerOrderStatus).mockResolvedValue({ order, outcome: 'completed' } as any);
    const res = makeRes();

    await updateSellerOrderStatus(makeReq(), res, vi.fn());

    expect(sellerService.updateSellerOrderStatus).toHaveBeenCalledWith('order-1', 'seller-1', 'preparing', undefined);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, order });
  });

  it('responds 202 with a resolving operation while the capture is in flight', async () => {
    const order = { _id: 'order-1', status: 'pending', paymentStatus: 'capture_pending' };
    vi.mocked(sellerService.updateSellerOrderStatus).mockResolvedValue({ order, outcome: 'resolving' } as any);
    const res = makeRes();

    await updateSellerOrderStatus(makeReq(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ success: true, order, operation: { status: 'resolving' } });
  });

  it('forwards an AppError with its code and the handler keeps the seller error envelope', async () => {
    const error = new AppError(409, 'The payment could not be captured.', 'capture_failed');
    vi.mocked(sellerService.updateSellerOrderStatus).mockRejectedValue(error);
    const next = vi.fn();

    await updateSellerOrderStatus(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalledWith(error);

    const errorRes = makeRes();
    errorHandler(next.mock.calls[0][0], { method: 'PUT', originalUrl: '/api/seller/orders/order-1/status' } as Request, errorRes, vi.fn());
    expect(errorRes.status).toHaveBeenCalledWith(409);
    expect(errorRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'The payment could not be captured.',
      code: 'capture_failed',
    });
  });
});
