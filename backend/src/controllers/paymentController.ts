import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import {
  createPaymentIntent,
  constructWebhookEvent,
  getOrCreateStripeCustomer,
} from '../services/stripeService.js';

export const createIntent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { amountInCents } = req.body;

    if (!amountInCents || amountInCents <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    // Validate cart exists (basic sanity check)
    const cart = await Cart.findOne({ userId }).populate('sellers.items.product');
    if (!cart) {
      res.status(400).json({ error: 'Cart not found' });
      return;
    }

    const totalCents = amountInCents;

    const User = (await import('../models/User.js')).default;
    const user = await User.findById(userId).select('stripeCustomerId email');
    let stripeCustomerId = user?.stripeCustomerId;
    if (!stripeCustomerId && user) {
      stripeCustomerId = await getOrCreateStripeCustomer(userId, user.email);
      await User.updateOne({ _id: userId }, { stripeCustomerId });
    }

    const { id, clientSecret } = await createPaymentIntent(totalCents, 'usd', { userId }, stripeCustomerId);

    res.status(200).json({ clientSecret, paymentIntentId: id });
  } catch (err) {
    next(err);
  }
};

export const handleWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const signature = req.headers['stripe-signature'] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  let event;
  try {
    event = constructWebhookEvent(req.body as Buffer, signature, secret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  const intentId: string =
    (event.data.object as { id: string }).id;

  try {
    if (event.type === 'payment_intent.succeeded') {
      await Order.findOneAndUpdate(
        { paymentIntentId: intentId },
        { status: 'processing' },
      );
    } else if (event.type === 'payment_intent.payment_failed') {
      await Order.findOneAndUpdate(
        { paymentIntentId: intentId },
        { status: 'cancelled' },
      );
    }
  } catch (err) {
    // Log but always return 200 — Stripe retries on non-200
    console.error('Webhook handler error:', err);
  }

  res.status(200).json({ received: true });
};
