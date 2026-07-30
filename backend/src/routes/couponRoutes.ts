import express from 'express';
import {
  getSellerCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getAvailableCoupons,
} from '../controllers/couponController.js';
import { protect } from '../middleware/auth.js';
import { requireSeller } from '../middleware/seller.js';

const router = express.Router();

router.use(protect);

// Buyer routes
router.get('/', getAvailableCoupons);
router.post('/validate', validateCoupon);

// Seller-only routes
router.get('/seller', requireSeller, getSellerCoupons);
router.post('/seller', requireSeller, createCoupon);
router.put('/seller/:id', requireSeller, updateCoupon);
router.delete('/seller/:id', requireSeller, deleteCoupon);

export default router;
