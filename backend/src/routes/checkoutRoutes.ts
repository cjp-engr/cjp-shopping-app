import express from 'express';
import { confirmSession, createSession, getSession } from '../controllers/checkoutController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/sessions', createSession);
router.get('/sessions/:id', getSession);
router.post('/sessions/:id/confirm', confirmSession);

export default router;
