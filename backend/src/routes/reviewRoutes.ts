import express from 'express';
import { createReview, updateReview, getProductReviews, checkUserReview } from '../controllers/reviewController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/product/:productId', getProductReviews);
router.use(protect);
router.post('/', createReview);
router.put('/:id', updateReview);
router.get('/check/:productId', checkUserReview);

export default router;
