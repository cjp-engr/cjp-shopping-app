import { body, query, validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';
import { REFUND_REASON_CODES } from '../models/RefundRequest.js';
import { AppError } from '../middleware/errorHandler.js';

export const createRefundRules = [
  body('items').isArray({ min: 1, max: 1000 }),
  body('items.*.lineId').isString().isLength({ min: 1, max: 128 }),
  body('items.*.quantity').custom(v => Number.isSafeInteger(v) && v > 0),
  body('reasonCode').isIn(REFUND_REASON_CODES),
  body('description').isString().bail().trim().isLength({ min: 1, max: 1000 }),
  body('idempotencyKey').isString().bail().trim().isLength({ min: 1, max: 128 }),
];
export const decideRefundRules = [
  body('decision').isIn(['approve', 'reject']),
  body('rejectionReason').if(body('decision').equals('reject')).isString().bail().trim().isLength({ min: 1, max: 1000 }),
];
export const sellerRefundListRules = [
  query('page').optional().isString().bail().matches(/^[1-9]\d*$/).custom(v => Number.isSafeInteger(Number(v))),
  query('limit').optional().isString().bail().matches(/^[1-9]\d*$/).isInt({ min: 1, max: 100 }),
  query('status').optional().isString().bail().isIn(['in_progress', 'approved', 'rejected']),
];
export function validateRefund(req: Request, _res: Response, next: NextFunction) {
  if (!validationResult(req).isEmpty()) return next(new AppError(400, 'Invalid refund request', 'refund_validation'));
  next();
}
