import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as service from '../services/refundRequestService.js';
import { getRefundEligibility } from '../services/refundEligibility.js';
import { attemptDeliveredRefund } from '../services/deliveredRefund.js';

export async function refundEligibility(req: AuthRequest, res: Response, next: NextFunction) {
  try { res.json({ success: true, eligibility: await getRefundEligibility(req.params.id, req.user!.id) }); } catch (err) { next(err); }
}
export async function createRefundRequest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await service.submitRefundRequest(req.params.id, req.user!.id, req.body);
    res.status(result.replayed ? 200 : 201).json({ success: true, request: result.request });
  } catch (err) { next(err); }
}
export async function listBuyerRefundRequests(req: AuthRequest, res: Response, next: NextFunction) {
  try { res.json({ success: true, requests: await service.listBuyerRefundRequests(req.params.id, req.user!.id) }); } catch (err) { next(err); }
}
export async function listCompletedBuyerRefundRequests(req: AuthRequest, res: Response, next: NextFunction) {
  try { res.json({ success: true, ...await service.listCompletedBuyerRefundRequests(req.user!.id, Number(req.query.page ?? 1), Number(req.query.limit ?? 20)) }); } catch (err) { next(err); }
}
export async function listSellerRefundRequests(req: AuthRequest, res: Response, next: NextFunction) {
  try { res.json({ success: true, ...await service.listSellerRefundRequests(req.user!.id, Number(req.query.page ?? 1), Number(req.query.limit ?? 20)) }); } catch (err) { next(err); }
}
export async function decideRefundRequest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const request = await service.decideRefundRequest(req.params.id, req.user!.id, req.body);
    if (req.body.decision === 'approve') await attemptDeliveredRefund(request.id);
    res.status(req.body.decision === 'approve' ? 202 : 200).json({ success: true, request });
  } catch (err) { next(err); }
}
