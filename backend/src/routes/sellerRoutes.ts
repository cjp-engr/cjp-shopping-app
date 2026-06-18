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
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(protect, requireSeller);

router.route('/products')
  .get(getSellerProducts)
  .post(upload.array('images', 10), createProduct);
router.route('/products/:id')
  .put(upload.array('images', 10), updateProduct)
  .delete(deleteProduct);
router.route('/orders').get(getSellerOrders);
router.route('/orders/:id/status').put(updateSellerOrderStatus);

export default router;
