import express from 'express';
import {
  createOrder, getOrders, getOrder, updateOrderStatus, confirmOrderReceived,
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';
import { rejectLegacyCardOrder } from '../middleware/checkoutFlowGuard.js';
import { createOrderRules } from '../validators/orderValidators.js';
import { validate } from '../validators/validate.js';
import * as refunds from '../controllers/refundRequestController.js';
import { createRefundRules, validateRefund } from '../validators/refundValidators.js';

const router = express.Router();

router.use(protect);
router.get('/refund-requests/completed', refunds.listCompletedBuyerRefundRequests);

router.route('/').get(getOrders).post(rejectLegacyCardOrder, createOrderRules, validate, createOrder);
router.route('/:id').get(getOrder);
router.route('/:id/status').put(updateOrderStatus);
router.route('/:id/confirm-received').put(confirmOrderReceived);
router.route('/:id/refund-eligibility').get(refunds.refundEligibility);
router.route('/:id/refund-requests').get(refunds.listBuyerRefundRequests).post(createRefundRules, validateRefund, refunds.createRefundRequest);

export default router;
