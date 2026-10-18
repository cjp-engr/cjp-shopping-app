import { NextFunction, Request, Response } from 'express';
import { checkoutFlow } from '../config/checkout.js';
import { sendError } from '../utils/apiResponse.js';

const CARD_PAYMENT_TYPES = ['credit-card', 'debit-card'];

function updateRequired(res: Response, reason: string) {
  return sendError(
    res,
    426,
    'update_required',
    'Update the app to pay by card; card checkout now uses checkout sessions',
    false,
    { details: { reason, requiredEndpoint: '/api/checkout/sessions' } },
  );
}

/** Old clients must not create a cart-wide PaymentIntent that bypasses session authorization. */
export function rejectLegacyCardIntent(_req: Request, res: Response, next: NextFunction): void {
  if (checkoutFlow() !== 'manual_capture') {
    next();
    return;
  }
  updateRequired(res, 'card_intent_replaced_by_sessions');
}

/** Card orders without a checkout session would skip manual-capture authorization. Cash-on-delivery is unaffected. */
export function rejectLegacyCardOrder(req: Request, res: Response, next: NextFunction): void {
  if (checkoutFlow() !== 'manual_capture') {
    next();
    return;
  }
  const type = (req.body as { paymentMethod?: { type?: unknown } } | undefined)?.paymentMethod?.type;
  if (typeof type === 'string' && CARD_PAYMENT_TYPES.includes(type)) {
    updateRequired(res, 'card_order_requires_session');
    return;
  }
  next();
}
