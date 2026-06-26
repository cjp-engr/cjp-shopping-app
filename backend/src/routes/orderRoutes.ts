import express from 'express';
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  confirmOrderReceived,
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All order routes require authentication

router.route('/').post(createOrder).get(getOrders);
router.route('/:id').get(getOrder);
router.route('/:id/status').put(updateOrderStatus);
router.route('/:id/confirm-received').put(confirmOrderReceived);

export default router;
