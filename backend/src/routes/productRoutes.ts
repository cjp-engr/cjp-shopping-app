import express from 'express';
import {
  getProducts, getProduct, createProduct, updateProduct,
  deleteProduct, getCategories, uploadProductImage, getSellerPublicProfile,
} from '../controllers/productController.js';
import { protect } from '../middleware/auth.js';
import { requireSeller } from '../middleware/seller.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public reads
router.get('/categories/all', getCategories);
router.get('/seller/:sellerId', getSellerPublicProfile);
router.get('/', getProducts);
router.get('/:id', getProduct);

// Write routes require authentication + seller role
router.post('/', protect, requireSeller, createProduct);
router.put('/:id', protect, requireSeller, updateProduct);
router.delete('/:id', protect, requireSeller, deleteProduct);
router.post('/:id/image', protect, requireSeller, upload.single('image'), uploadProductImage);

export default router;
