import express from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  uploadProductImage,
  getSellerPublicProfile,
} from '../controllers/productController.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/categories/all', getCategories);
router.get('/seller/:sellerId', getSellerPublicProfile);
router.route('/').get(getProducts).post(createProduct);
router.route('/:id').get(getProduct).put(updateProduct).delete(deleteProduct);

// Image upload — POST /api/products/:id/image  (multipart/form-data, field: "image")
router.post('/:id/image', upload.single('image'), uploadProductImage);

export default router;
