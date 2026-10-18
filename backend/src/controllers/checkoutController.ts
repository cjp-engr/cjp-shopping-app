import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { checkoutFlow } from '../config/checkout.js';
import {
  createCheckoutSession,
  getCheckoutSessionForBuyer,
  sellerDisplayNames,
  CheckoutError,
  validateCheckoutRequest,
} from '../services/checkoutService.js';
import {
  assertSavedCardOwned,
  authorizeCheckoutSession,
  ownerClientSecrets,
} from '../services/checkoutAuthorization.js';
import { buildCheckoutSessionView, buildPlacedOrderView, type PlacedOrderInput } from '../services/checkoutSessionView.js';
import { finalizeCheckoutSession } from '../services/checkoutFinalization.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

function sendCheckoutError(res: Response, err: CheckoutError) {
  return sendError(res, err.statusCode, err.code, err.message, err.retryable, { details: err.details });
}

export const createSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (checkoutFlow() !== 'manual_capture') {
      return sendError(res, 409, 'checkout_flow_disabled', 'Card checkout with authorization is not enabled', false);
    }
    const idempotencyKey = req.header('Idempotency-Key');
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      return sendError(res, 400, 'idempotency_key_required', 'Idempotency-Key header (8-128 characters) is required', false);
    }

    const buyerId = req.user!.id;
    const savedPaymentMethodId = validateCheckoutRequest(req.body).savedPaymentMethodId;
    if (savedPaymentMethodId) {
      await assertSavedCardOwned(buyerId, savedPaymentMethodId);
    }

    const { session, replayed } = await createCheckoutSession(buyerId, idempotencyKey, req.body);
    // A replay of a placed checkout must not re-open payment or return client secrets.
    const authorizations = session.status === 'placed'
      ? []
      : await authorizeCheckoutSession(session, buyerId, savedPaymentMethodId);
    const now = new Date();
    const view = buildCheckoutSessionView(session, {
      now,
      clientSecrets: new Map(authorizations.map(a => [a.sellerId, a.clientSecret])),
      sellerNames: await sellerDisplayNames(session.sellers.map(s => s.sellerId.toString())),
    });
    return sendSuccess(res, replayed ? 200 : 201, view);
  } catch (err) {
    if (err instanceof CheckoutError) return sendCheckoutError(res, err);
    next(err);
  }
};

export const confirmSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (checkoutFlow() !== 'manual_capture') {
      return sendError(res, 409, 'checkout_flow_disabled', 'Card checkout with authorization is not enabled', false);
    }
    const buyerId = req.user!.id;
    const { session, orders } = await finalizeCheckoutSession(req.params.id, buyerId);
    const now = new Date();
    const view = buildCheckoutSessionView(session, {
      now,
      clientSecrets: new Map(),
      sellerNames: await sellerDisplayNames(session.sellers.map(s => s.sellerId.toString())),
    });
    return sendSuccess(res, 200, {
      ...view,
      orders: orders.map(order => buildPlacedOrderView(order as unknown as PlacedOrderInput)),
    });
  } catch (err) {
    if (err instanceof CheckoutError) return sendCheckoutError(res, err);
    next(err);
  }
};

export const getSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const buyerId = req.user!.id;
    const session = await getCheckoutSessionForBuyer(req.params.id, buyerId);
    const now = new Date();
    const view = buildCheckoutSessionView(session, {
      now,
      clientSecrets: await ownerClientSecrets(session, now),
      sellerNames: await sellerDisplayNames(session.sellers.map(s => s.sellerId.toString())),
    });
    return sendSuccess(res, 200, view);
  } catch (err) {
    if (err instanceof CheckoutError) return sendCheckoutError(res, err);
    next(err);
  }
};
