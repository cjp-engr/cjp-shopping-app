import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { constructWebhookEvent, StripeError } from '../services/stripeService.js';
import paymentService, { PaymentError } from '../services/paymentService.js';

const LOG_PREFIX = '[PaymentController]';

function handlePaymentError(err: unknown, res: Response): void {
  if (err instanceof PaymentError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof StripeError) {
    res.status(400).json({ error: err.message });
    return;
  }

  throw err;
}

export const createIntent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { amountInCents, stripePaymentMethodId } = req.body;

    console.log(
      `${LOG_PREFIX} Creating payment intent: amount=${amountInCents}¢, methodId=${stripePaymentMethodId ? 'provided' : 'none'}`,
    );

    const { clientSecret, paymentIntentId } = await paymentService.createPaymentIntent(
      userId,
      amountInCents,
      stripePaymentMethodId,
    );

    console.log(`${LOG_PREFIX} Payment intent created: ${paymentIntentId}`);
    res.status(200).json({ clientSecret, paymentIntentId });
  } catch (err) {
    handlePaymentError(err, res) ?? next(err);
  }
};

export const saveCard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { stripePaymentMethodId } = req.body;

    if (!stripePaymentMethodId) {
      res.status(400).json({ error: 'Payment method ID required' });
      return;
    }

    const userId = req.user!.id;
    console.log(`${LOG_PREFIX} Saving card for user: ${userId}`);

    await paymentService.attachPaymentMethod(userId, stripePaymentMethodId);

    console.log(`${LOG_PREFIX} Card saved successfully`);
    res.status(200).json({ success: true, message: 'Card saved successfully' });
  } catch (err) {
    handlePaymentError(err, res) ?? next(err);
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

  const intentId: string = (event.data.object as { id: string }).id;

  try {
    if (event.type === 'payment_intent.succeeded') {
      await paymentService.handlePaymentIntentSucceeded(intentId);
    } else if (event.type === 'payment_intent.payment_failed') {
      await paymentService.handlePaymentIntentFailed(intentId);
    }
  } catch (err) {
    // Log but always return 200 — Stripe retries on non-200
    console.error('Webhook handler error:', err);
  }

  res.status(200).json({ received: true });
};
