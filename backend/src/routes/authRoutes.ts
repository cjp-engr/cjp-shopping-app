import express from 'express';
import { signup, login, getMe, updateProfile, uploadAvatar, getPaymentMethods, addPaymentMethod, deletePaymentMethod, getSavedAddresses, addSavedAddress, deleteSavedAddress, setDefaultAddress } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { avatarUpload } from '../middleware/upload.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/avatar', protect, avatarUpload.single('avatar'), uploadAvatar);
router.get('/payment-methods', protect, getPaymentMethods);
router.post('/payment-methods', protect, addPaymentMethod);
router.delete('/payment-methods/:id', protect, deletePaymentMethod);
router.get('/saved-addresses', protect, getSavedAddresses);
router.post('/saved-addresses', protect, addSavedAddress);
router.delete('/saved-addresses/:id', protect, deleteSavedAddress);
router.put('/saved-addresses/:id/default', protect, setDefaultAddress);

export default router;
