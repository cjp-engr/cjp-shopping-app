import express from 'express';
import {
  getSellerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerOrders,
  updateSellerOrderStatus
} from '../controllers/sellerController.js';
import { protect } from '../middleware/auth.js';
import { requireSeller } from '../middleware/seller.js';

const router = express.Router();

router.use(protect, requireSeller);

router.route('/products').get(getSellerProducts).post(createProduct);
router.route('/products/:id').put(updateProduct).delete(deleteProduct);
router.route('/orders').get(getSellerOrders);
router.route('/orders/:id/status').put(updateSellerOrderStatus);

export default router;
