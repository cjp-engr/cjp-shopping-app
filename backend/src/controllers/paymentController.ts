import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { constructWebhookEvent, StripeError } from '../services/stripeService.js';
import paymentService, { PaymentError } from '../services/paymentService.js';
import { sendSuccess, sendError, ErrorCodes, isRetryable } from '../utils/apiResponse.js';

const LOG_PREFIX = '[PaymentController]';

export const createIntent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void | Response> => {
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
    return sendSuccess(res, 200, { clientSecret, paymentIntentId });
  } catch (err) {
    if (err instanceof PaymentError) {
      const retryable = isRetryable(err.statusCode);
      return sendError(
        res,
        err.statusCode,
        ErrorCodes.PAYMENT_FAILED,
        err.message,
        retryable,
      );
    }

    if (err instanceof StripeError) {
      return sendError(
        res,
        400,
        ErrorCodes.STRIPE_ERROR,
        'Payment processing failed. Please try again.',
        true,
      );
    }

    next(err);
  }
};

export const saveCard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void | Response> => {
  try {
    const { stripePaymentMethodId } = req.body;
    const userId = req.user!.id;

    console.log(`${LOG_PREFIX} Saving card for user: ${userId}`);

    await paymentService.attachPaymentMethod(userId, stripePaymentMethodId);

    console.log(`${LOG_PREFIX} Card saved successfully`);
    return sendSuccess(res, 200, { success: true, message: 'Card saved successfully' });
  } catch (err) {
    if (err instanceof PaymentError) {
      const retryable = isRetryable(err.statusCode);
      return sendError(
        res,
        err.statusCode,
        ErrorCodes.PAYMENT_FAILED,
        err.message,
        retryable,
      );
    }

    if (err instanceof StripeError) {
      return sendError(
        res,
        400,
        ErrorCodes.STRIPE_ERROR,
        'Failed to save card. Please try again.',
        true,
      );
    }

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
