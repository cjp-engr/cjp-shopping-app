import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
vi.mock('../../services/refundRequestService.js', () => ({ submitRefundRequest: vi.fn(), decideRefundRequest: vi.fn(), listBuyerRefundRequests: vi.fn(), listSellerRefundRequests: vi.fn(), listCompletedBuyerRefundRequests: vi.fn() }));
vi.mock('../../services/refundEligibility.js', () => ({ getRefundEligibility: vi.fn() }));
vi.mock('../../services/deliveredRefund.js', () => ({ attemptDeliveredRefund: vi.fn() }));
import * as service from '../../services/refundRequestService.js';
import * as controller from '../refundRequestController.js';
import { getRefundEligibility } from '../../services/refundEligibility.js';

function context(body = {}, query = {}) {
  const req = { params: { id: 'order' }, user: { id: 'actor' }, body, query } as unknown as AuthRequest;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}
describe('refund request HTTP boundary', () => {
  beforeEach(() => vi.resetAllMocks());
  it.each([false, true])('uses correct status for replay=%s', async replayed => {
    const c = context(); vi.mocked(service.submitRefundRequest).mockResolvedValue({ request: { id: 'r' } as never, replayed });
    await controller.createRefundRequest(c.req, c.res, c.next);
    expect(c.res.status).toHaveBeenCalledWith(replayed ? 200 : 201);
    expect(c.res.json).toHaveBeenCalledWith({ success: true, request: { id: 'r' } });
  });
  it.each(['approve', 'reject'] as const)('returns decision status for %s', async decision => {
    const c = context({ decision }); vi.mocked(service.decideRefundRequest).mockResolvedValue({ id: 'r' } as never);
    await controller.decideRefundRequest(c.req, c.res, c.next);
    expect(c.res.status).toHaveBeenCalledWith(decision === 'approve' ? 202 : 200);
  });
  it('uses documented default pagination and delegates eligibility/history', async () => {
    const c = context(); await controller.listSellerRefundRequests(c.req, c.res, c.next);
    expect(service.listSellerRefundRequests).toHaveBeenCalledWith('actor', 1, 20);
    await controller.refundEligibility(c.req, c.res, c.next);
    expect(getRefundEligibility).toHaveBeenCalledWith('order', 'actor');
    await controller.listBuyerRefundRequests(c.req, c.res, c.next);
    expect(service.listBuyerRefundRequests).toHaveBeenCalledWith('order', 'actor');
    await controller.listCompletedBuyerRefundRequests(c.req, c.res, c.next);
    expect(service.listCompletedBuyerRefundRequests).toHaveBeenCalledWith('actor', 1, 20);
  });
  it('forwards service errors to the existing error handler', async () => {
    const c = context(); const error = new Error('conflict'); vi.mocked(service.submitRefundRequest).mockRejectedValue(error);
    await controller.createRefundRequest(c.req, c.res, c.next);
    expect(c.next).toHaveBeenCalledWith(error); expect(c.res.json).not.toHaveBeenCalled();
  });
});
