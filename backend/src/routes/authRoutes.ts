import express from 'express';
import {
  signup, login, getMe, updateProfile, uploadAvatar,
  getPaymentMethods, addPaymentMethod, deletePaymentMethod,
  getSavedAddresses, addSavedAddress, deleteSavedAddress, setDefaultAddress,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { avatarUpload } from '../middleware/upload.js';
import { signupRules, loginRules, updateProfileRules } from '../validators/authValidators.js';
import { validate } from '../validators/validate.js';

const router = express.Router();

router.post('/signup', signupRules, validate, signup);
router.post('/login', loginRules, validate, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfileRules, validate, updateProfile);
router.post('/avatar', protect, avatarUpload.single('avatar'), uploadAvatar);
router.get('/payment-methods', protect, getPaymentMethods);
router.post('/payment-methods', protect, addPaymentMethod);
router.delete('/payment-methods/:id', protect, deletePaymentMethod);
router.get('/saved-addresses', protect, getSavedAddresses);
router.post('/saved-addresses', protect, addSavedAddress);
router.delete('/saved-addresses/:id', protect, deleteSavedAddress);
router.put('/saved-addresses/:id/default', protect, setDefaultAddress);

export default router;
