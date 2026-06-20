import express from 'express';
import { signup, login, getMe, updateProfile, uploadAvatar } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { avatarUpload } from '../middleware/upload.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/avatar', protect, avatarUpload.single('avatar'), uploadAvatar);

export default router;
