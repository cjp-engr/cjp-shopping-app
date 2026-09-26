import express from 'express';
import { protect } from '../middleware/auth.js';
import { createIntent, handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

// Webhook: no auth, raw body (registered in server.ts before express.json())
router.post('/webhook', handleWebhook);

// Create PaymentIntent: requires auth
router.post('/create-intent', protect, createIntent);

export default router;
