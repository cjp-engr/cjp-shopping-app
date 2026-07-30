import express from 'express';
import {
  createOrder, getOrders, getOrder, updateOrderStatus, confirmOrderReceived,
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';
import { createOrderRules } from '../validators/orderValidators.js';
import { validate } from '../validators/validate.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getOrders).post(createOrderRules, validate, createOrder);
router.route('/:id').get(getOrder);
router.route('/:id/status').put(updateOrderStatus);
router.route('/:id/confirm-received').put(confirmOrderReceived);

export default router;
