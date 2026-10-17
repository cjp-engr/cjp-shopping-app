import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import { AppError } from '../../middleware/errorHandler.js';
import { acceptOrder, isOrderSeller } from '../orderAcceptance.js';
import { runCapture } from '../orderCapture.js';
import { capturePaymentIntent, retrieveIntentWithCharge } from '../stripeService.js';
import { connectIntegrationDb } from './integrationDb.js';

vi.mock('../stripeService.js', async () => {
  const actual = await vi.importActual<typeof import('../stripeService.js')>('../stripeService.js');
  return {
    ...actual,
    capturePaymentIntent: vi.fn(),
    retrieveIntentWithCharge: vi.fn(),
    retrievePaymentIntent: vi.fn(),
    cancelPaymentIntent: vi.fn(),
  };
});
vi.mock('../orderCapture.js', () => ({ runCapture: vi.fn() }));

const buyer = new mongoose.Types.ObjectId();
const seller = new mongoose.Types.ObjectId();
const otherSeller = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };
const now = new Date('2026-10-17T10:00:00Z');
const inOneSecond = new Date(now.getTime() + 1000);

async function makeProduct(ownerId: mongoose.Types.ObjectId = seller) {
  return Product.create({ name: 'Item', description: 'd', category: 'Books', price: 20, stock: 8, image: 'i.png', sellerId: ownerId });
}

async function makeOrder(overrides: Record<string, unknown> = {}) {
  const product = await makeProduct();
  return Order.create({
    userId: buyer,
    sellerId: seller,
    items: [{ product: product._id, productName: 'Item', productPrice: 20, productImage: 'i.png', quantity: 2 }],
    shippingAddress: address,
    paymentMethod: { type: 'credit-card' },
    subtotal: 40, discount: 0, tax: 0, shipping: 0, total: 40,
    status: 'pending',
    paymentFlowVersion: 'manual_capture',
    paymentStatus: 'authorized',
    paymentIntentId: `pi_${new mongoose.Types.ObjectId().toString()}`,
    amountMinor: 4000,
    currency: 'USD',
    acceptBy: inOneSecond,
    ...overrides,
  });
}

const legacyOverrides = { paymentFlowVersion: 'legacy', paymentStatus: undefined, acceptBy: undefined, amountMinor: undefined };

async function rejection(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    return error as AppError;
  }
  throw new Error('expected the call to reject');
}

describe('acceptOrder (replica set, Stripe and capture mocked)', () => {
  const originalVisibility = process.env.SELLER_SEES_MANUAL_CAPTURE;

  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), PaymentOperation.init()]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
    vi.mocked(runCapture).mockImplementation(async (order) => ({ kind: 'completed', order }));
  });

  afterEach(async () => {
    await Promise.all([Product.deleteMany({}), Order.deleteMany({}), PaymentOperation.deleteMany({})]);
  });

  afterAll(async () => {
    if (originalVisibility === undefined) delete process.env.SELLER_SEES_MANUAL_CAPTURE;
    else process.env.SELLER_SEES_MANUAL_CAPTURE = originalVisibility;
    await mongoose.disconnect();
  });

  describe('seller and visibility checks', () => {
    it('rejects another seller with 403 not_order_seller', async () => {
      const order = await makeOrder();
      const error = await rejection(acceptOrder({ orderId: order.id, sellerId: otherSeller.toString(), now }));
      expect([error.statusCode, error.code]).toEqual([403, 'not_order_seller']);
      expect((await Order.findById(order._id))!.paymentStatus).toBe('authorized');
    });

    it('rejects an unknown order id with 404 order_not_found', async () => {
      const error = await rejection(acceptOrder({ orderId: new mongoose.Types.ObjectId().toString(), sellerId: seller.toString(), now }));
      expect([error.statusCode, error.code]).toEqual([404, 'order_not_found']);
    });

    it('rejects a malformed order id with 404 order_not_found', async () => {
      const error = await rejection(acceptOrder({ orderId: 'not-an-id', sellerId: seller.toString(), now }));
      expect([error.statusCode, error.code]).toEqual([404, 'order_not_found']);
    });

    it('treats a draft order as not found', async () => {
      const order = await makeOrder({ status: 'awaiting_payment', paymentStatus: 'awaiting_authorization' });
      const error = await rejection(acceptOrder({ orderId: order.id, sellerId: seller.toString(), now }));
      expect([error.statusCode, error.code]).toEqual([404, 'order_not_found']);
    });

    it('treats a manual-capture order as not found while sellers cannot see them', async () => {
      process.env.SELLER_SEES_MANUAL_CAPTURE = 'false';
      const order = await makeOrder();
      const error = await rejection(acceptOrder({ orderId: order.id, sellerId: seller.toString(), now }));
      expect([error.statusCode, error.code]).toEqual([404, 'order_not_found']);
      expect(runCapture).not.toHaveBeenCalled();
    });
  });

  describe('isOrderSeller', () => {
    it('uses the persisted sellerId first', async () => {
      const order = await makeOrder();
      expect(await isOrderSeller(order, seller.toString())).toBe(true);
      expect(await isOrderSeller(order, otherSeller.toString())).toBe(false);
    });

    it('does not fall back to product ownership when the order has a sellerId', async () => {
      const product = await makeProduct(otherSeller);
      const order = await makeOrder({
        items: [{ product: product._id, productName: 'Item', productPrice: 20, productImage: 'i.png', quantity: 1 }],
      });
      expect(await isOrderSeller(order, otherSeller.toString())).toBe(false);
    });

    it('falls back to product ownership for legacy orders without a sellerId', async () => {
      const order = await makeOrder({ ...legacyOverrides, sellerId: undefined });
      expect(await isOrderSeller(order, seller.toString())).toBe(true);
      expect(await isOrderSeller(order, otherSeller.toString())).toBe(false);
    });
  });

  describe('deadline', () => {
    it('rejects acceptBy equal to now and leaves the order unchanged', async () => {
      const order = await makeOrder({ acceptBy: now });
      const error = await rejection(acceptOrder({ orderId: order.id, sellerId: seller.toString(), now }));
      expect([error.statusCode, error.code]).toEqual([409, 'acceptance_deadline_passed']);
      const stored = await Order.findById(order._id);
      expect(stored!.status).toBe('pending');
      expect(stored!.paymentStatus).toBe('authorized');
      expect(runCapture).not.toHaveBeenCalled();
    });

    it('accepts acceptBy one second after now', async () => {
      const order = await makeOrder({ acceptBy: inOneSecond });
      const outcome = await acceptOrder({ orderId: order.id, sellerId: seller.toString(), now });
      expect(outcome.kind).toBe('completed');
      expect(runCapture).toHaveBeenCalledTimes(1);
    });
  });

  describe('card orders', () => {
    it('claims the order as capture_pending and hands the claimed order to runCapture', async () => {
      const order = await makeOrder();
      const outcome = await acceptOrder({ orderId: order.id, sellerId: seller.toString(), now });

      expect(outcome.kind).toBe('completed');
      expect(runCapture).toHaveBeenCalledTimes(1);
      const [claimed, claimedAt] = vi.mocked(runCapture).mock.calls[0];
      expect(claimed._id.toString()).toBe(order.id);
      expect(claimed.paymentStatus).toBe('capture_pending');
      expect(claimed.status).toBe('pending');
      expect(claimedAt).toEqual(now);
      expect((await Order.findById(order._id))!.paymentStatus).toBe('capture_pending');
    });

    it('returns the runCapture outcome', async () => {
      const order = await makeOrder();
      vi.mocked(runCapture).mockImplementationOnce(async (claimed) => ({ kind: 'resolving', order: claimed }));
      const outcome = await acceptOrder({ orderId: order.id, sellerId: seller.toString(), now });
      expect(outcome.kind).toBe('resolving');
    });

    it('rejects an authorized card order with no payment intent and leaves it authorized', async () => {
      const order = await makeOrder({ paymentIntentId: undefined });
      const error = await rejection(acceptOrder({ orderId: order.id, sellerId: seller.toString(), now }));
      expect([error.statusCode, error.code]).toEqual([409, 'payment_reference_missing']);
      expect((await Order.findById(order._id))!.paymentStatus).toBe('authorized');
      expect(runCapture).not.toHaveBeenCalled();
    });

    it('returns resolving for an order already capture_pending without starting a second operation', async () => {
      const order = await makeOrder({ paymentStatus: 'capture_pending' });
      await PaymentOperation.create({
        action: 'capture',
        idempotencyKey: `order:${order.id}:capture:1`,
        orderId: order._id,
        paymentIntentId: order.paymentIntentId,
        status: 'in_progress',
      });

      const outcome = await acceptOrder({ orderId: order.id, sellerId: seller.toString(), now });

      expect(outcome.kind).toBe('resolving');
      expect(outcome.order._id.toString()).toBe(order.id);
      expect(runCapture).not.toHaveBeenCalled();
      expect(await PaymentOperation.countDocuments({ orderId: order._id })).toBe(1);
    });

    it('lets only one of two concurrent accepts claim the order', async () => {
      const order = await makeOrder();
      const results = await Promise.all([
        acceptOrder({ orderId: order.id, sellerId: seller.toString(), now }),
        acceptOrder({ orderId: order.id, sellerId: seller.toString(), now }),
      ]);
      expect(runCapture).toHaveBeenCalledTimes(1);
      expect(results.map(result => result.kind).sort()).toEqual(['completed', 'resolving']);
    });
  });

  describe('not pending', () => {
    it.each(['cancelled', 'preparing'] as const)('rejects a %s order with 409 order_not_pending', async (status) => {
      const order = await makeOrder({ status, paymentStatus: status === 'cancelled' ? 'released' : 'captured' });
      const error = await rejection(acceptOrder({ orderId: order.id, sellerId: seller.toString(), now }));
      expect([error.statusCode, error.code]).toEqual([409, 'order_not_pending']);
      expect(error.message).toContain(status);
      expect(runCapture).not.toHaveBeenCalled();
    });
  });

  describe('COD', () => {
    function codOverrides(overrides: Record<string, unknown> = {}) {
      return { paymentMethod: { type: 'cash-on-delivery' }, paymentStatus: 'not_required', paymentIntentId: undefined, amountMinor: undefined, ...overrides };
    }

    it('moves to preparing in one call, with no Stripe call and no capture', async () => {
      const order = await makeOrder(codOverrides());
      const outcome = await acceptOrder({ orderId: order.id, sellerId: seller.toString(), now });

      expect(outcome.kind).toBe('completed');
      expect(outcome.order.status).toBe('preparing');
      expect((await Order.findById(order._id))!.status).toBe('preparing');
      expect(capturePaymentIntent).not.toHaveBeenCalled();
      expect(retrieveIntentWithCharge).not.toHaveBeenCalled();
      expect(runCapture).not.toHaveBeenCalled();
    });

    it('rejects a second accept with 409 order_not_pending', async () => {
      const order = await makeOrder(codOverrides());
      await acceptOrder({ orderId: order.id, sellerId: seller.toString(), now });
      const error = await rejection(acceptOrder({ orderId: order.id, sellerId: seller.toString(), now }));
      expect([error.statusCode, error.code]).toEqual([409, 'order_not_pending']);
    });

    it('enforces the deadline', async () => {
      const order = await makeOrder(codOverrides({ acceptBy: now }));
      const error = await rejection(acceptOrder({ orderId: order.id, sellerId: seller.toString(), now }));
      expect([error.statusCode, error.code]).toEqual([409, 'acceptance_deadline_passed']);
      expect((await Order.findById(order._id))!.status).toBe('pending');
    });
  });

  describe('legacy orders', () => {
    it('moves a legacy card order to preparing with zero Stripe calls', async () => {
      const order = await makeOrder({ ...legacyOverrides, paymentIntentId: 'pi_legacy' });
      const outcome = await acceptOrder({ orderId: order.id, sellerId: seller.toString(), now });

      expect(outcome.kind).toBe('completed');
      expect(outcome.order.status).toBe('preparing');
      expect((await Order.findById(order._id))!.status).toBe('preparing');
      expect(capturePaymentIntent).not.toHaveBeenCalled();
      expect(retrieveIntentWithCharge).not.toHaveBeenCalled();
      expect(runCapture).not.toHaveBeenCalled();
    });

    it('accepts an old COD order with no acceptBy at any time', async () => {
      const order = await makeOrder({ ...legacyOverrides, paymentMethod: { type: 'cash-on-delivery' }, paymentIntentId: undefined });
      const outcome = await acceptOrder({ orderId: order.id, sellerId: seller.toString(), now: new Date('2030-01-01T00:00:00Z') });
      expect(outcome.order.status).toBe('preparing');
    });

    it('checks ownership through products when the order has no sellerId', async () => {
      const order = await makeOrder({ ...legacyOverrides, sellerId: undefined });
      const error = await rejection(acceptOrder({ orderId: order.id, sellerId: otherSeller.toString(), now }));
      expect([error.statusCode, error.code]).toEqual([403, 'not_order_seller']);
      const outcome = await acceptOrder({ orderId: order.id, sellerId: seller.toString(), now });
      expect(outcome.order.status).toBe('preparing');
    });

    it('rejects a second accept with 409 order_not_pending', async () => {
      const order = await makeOrder(legacyOverrides);
      await acceptOrder({ orderId: order.id, sellerId: seller.toString(), now });
      const error = await rejection(acceptOrder({ orderId: order.id, sellerId: seller.toString(), now }));
      expect([error.statusCode, error.code]).toEqual([409, 'order_not_pending']);
    });
  });
});
