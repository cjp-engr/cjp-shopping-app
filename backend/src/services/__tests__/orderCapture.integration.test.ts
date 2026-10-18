import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Coupon from '../../models/Coupon.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import { AppError } from '../../middleware/errorHandler.js';
import { acceptOrder } from '../orderAcceptance.js';
import { finalizeCapture, resumeCapture, runCapture } from '../orderCapture.js';
import { claimNextOperation } from '../paymentOperationService.js';
import { LEASE_MS } from '../paymentOperationPolicy.js';
import {
  capturePaymentIntent,
  createManualCapturePaymentIntent,
  retrieveIntentWithCharge,
  StripeError,
} from '../stripeService.js';
import { connectIntegrationDb } from './integrationDb.js';

vi.mock('../stripeService.js', async () => {
  const actual = await vi.importActual<typeof import('../stripeService.js')>('../stripeService.js');
  return {
    ...actual,
    createManualCapturePaymentIntent: vi.fn(),
    capturePaymentIntent: vi.fn(),
    retrieveIntentWithCharge: vi.fn(),
    retrievePaymentIntent: vi.fn(),
    cancelPaymentIntent: vi.fn(),
  };
});

const buyer = new mongoose.Types.ObjectId();
const seller = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };
const now = new Date('2026-10-17T10:00:00Z');
const AMOUNT = 4000;

function stripeFault(statusCode?: number): StripeError {
  return new StripeError('Stripe failure', statusCode === undefined ? undefined : Object.assign(new Error('x'), { statusCode }));
}

function validIntent(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    status: 'requires_capture',
    capture_method: 'manual',
    amount: AMOUNT,
    amount_capturable: AMOUNT,
    amount_received: 0,
    currency: 'usd',
    customer: 'cus_test',
    metadata: {},
    latest_charge: { object: 'charge', payment_method_details: { card: { capture_before: Math.floor((now.getTime() + 3 * 24 * 3600 * 1000) / 1000) } } },
    ...overrides,
  } as any;
}

function succeededIntent(id: string, amountReceived = AMOUNT) {
  return validIntent(id, { status: 'succeeded', amount_capturable: 0, amount_received: amountReceived });
}

async function makeOrder(overrides: Record<string, unknown> = {}) {
  const product = await Product.create({
    name: 'Item', description: 'd', category: 'Books', price: 20, stock: 8, soldCount: 2, image: 'i.png', sellerId: seller,
  });
  const order = await Order.create({
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
    amountMinor: AMOUNT,
    currency: 'USD',
    authorizationExpiresAt: new Date(now.getTime() + 3 * 24 * 3600 * 1000),
    acceptBy: new Date(now.getTime() + 3600 * 1000),
    ...overrides,
  });
  return { order, product };
}

function accept(orderId: string, at: Date = now) {
  return acceptOrder({ orderId, sellerId: seller.toString(), now: at });
}

async function rejection(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    return error as AppError;
  }
  throw new Error('expected the call to reject');
}

describe('order capture (replica set, Stripe mocked)', () => {
  const originalVisibility = process.env.SELLER_SEES_MANUAL_CAPTURE;
  let errorSpy: MockInstance;

  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), Coupon.init(), PaymentOperation.init()]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(retrieveIntentWithCharge).mockImplementation(async (id: string) => validIntent(id));
    vi.mocked(capturePaymentIntent).mockImplementation(async (id: string, amount: number) => ({ id, status: 'succeeded', amountReceived: amount }));
  });

  afterEach(async () => {
    errorSpy.mockRestore();
    await Promise.all([Product.deleteMany({}), Order.deleteMany({}), Coupon.deleteMany({}), PaymentOperation.deleteMany({})]);
  });

  afterAll(async () => {
    if (originalVisibility === undefined) delete process.env.SELLER_SEES_MANUAL_CAPTURE;
    else process.env.SELLER_SEES_MANUAL_CAPTURE = originalVisibility;
    await mongoose.disconnect();
  });

  it('captures the exact amount once with the generation 1 key and moves the order to preparing', async () => {
    const { order } = await makeOrder();

    const outcome = await accept(order.id);

    expect(outcome.kind).toBe('completed');
    expect(capturePaymentIntent).toHaveBeenCalledTimes(1);
    expect(capturePaymentIntent).toHaveBeenCalledWith(order.paymentIntentId, AMOUNT, `order:${order.id}:capture:1`);
    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('preparing');
    expect(stored!.paymentStatus).toBe('captured');
    expect(stored!.capturedAt).toEqual(now);
    expect(outcome.order.status).toBe('preparing');
    const operation = await PaymentOperation.findOne({ orderId: order._id, action: 'capture' }).lean();
    expect(operation!.status).toBe('succeeded');
    expect(operation!.idempotencyKey).toBe(`order:${order.id}:capture:1`);
    expect(operation!.paymentIntentId).toBe(order.paymentIntentId);
  });

  it('captures once when two accepts race for the same order', async () => {
    const { order } = await makeOrder();

    const results = await Promise.all([accept(order.id), accept(order.id)]);

    expect(capturePaymentIntent).toHaveBeenCalledTimes(1);
    expect(results.some(result => result.kind === 'completed')).toBe(true);
    expect(results.every(result => result.kind === 'completed' || result.kind === 'resolving')).toBe(true);
    expect((await Order.findById(order._id).lean())!.status).toBe('preparing');
  });

  it('captures once when two runCapture calls race on one claimed order', async () => {
    const { order } = await makeOrder({ paymentStatus: 'capture_pending' });

    const results = await Promise.all([runCapture(order, now), runCapture(order, now)]);

    expect(capturePaymentIntent).toHaveBeenCalledTimes(1);
    expect(results.map(result => result.kind).sort()).toEqual(['completed', 'resolving']);
    expect(await PaymentOperation.countDocuments({ orderId: order._id })).toBe(1);
  });

  it('keeps the order capture_pending and flags support when the captured amount differs', async () => {
    const { order } = await makeOrder();
    vi.mocked(capturePaymentIntent).mockResolvedValueOnce({ id: order.paymentIntentId!, status: 'succeeded', amountReceived: 3000 });

    const outcome = await accept(order.id);

    expect(outcome.kind).toBe('resolving');
    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('pending');
    expect(stored!.paymentStatus).toBe('capture_pending');
    expect(stored!.capturedAt).toBeUndefined();
    expect((await PaymentOperation.findOne({ orderId: order._id }).lean())!.status).toBe('needs_support');
  });

  it('finalizes without capturing when Stripe already shows the intent succeeded', async () => {
    const { order } = await makeOrder();
    vi.mocked(retrieveIntentWithCharge).mockImplementation(async (id: string) => succeededIntent(id));

    const outcome = await accept(order.id);

    expect(outcome.kind).toBe('completed');
    expect(capturePaymentIntent).not.toHaveBeenCalled();
    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('preparing');
    expect(stored!.paymentStatus).toBe('captured');
    expect((await PaymentOperation.findOne({ orderId: order._id }).lean())!.status).toBe('succeeded');
  });

  it('cancels the order and restores stock once when the hold was canceled at Stripe', async () => {
    const { order, product } = await makeOrder();
    vi.mocked(retrieveIntentWithCharge).mockImplementation(async (id: string) => validIntent(id, { status: 'canceled', amount_capturable: 0 }));

    const error = await rejection(accept(order.id));

    expect([error.statusCode, error.code]).toEqual([409, 'authorization_expired']);
    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('cancelled');
    expect(stored!.cancelReason).toBe('authorization_expired');
    expect(stored!.paymentStatus).toBe('released');
    expect(stored!.stockRestoredAt).toEqual(now);
    expect((await Product.findById(product._id).lean())!.stock).toBe(10);
    expect((await Product.findById(product._id).lean())!.soldCount).toBe(0);
    expect(capturePaymentIntent).not.toHaveBeenCalled();
    expect(createManualCapturePaymentIntent).not.toHaveBeenCalled();
    expect((await PaymentOperation.findOne({ orderId: order._id }).lean())!.status).toBe('succeeded');

    const again = await rejection(accept(order.id));
    expect(again.code).toBe('order_not_pending');
    expect((await Product.findById(product._id).lean())!.stock).toBe(10);
  });

  it('cancels the order when the authorization deadline passed and the intent is no longer capturable', async () => {
    const { order, product } = await makeOrder({ authorizationExpiresAt: new Date(now.getTime() - 1000) });
    vi.mocked(retrieveIntentWithCharge).mockImplementation(async (id: string) => validIntent(id, { status: 'requires_payment_method', amount_capturable: 0 }));

    const error = await rejection(accept(order.id));

    expect([error.statusCode, error.code]).toEqual([409, 'authorization_expired']);
    expect((await Order.findById(order._id).lean())!.status).toBe('cancelled');
    expect((await Product.findById(product._id).lean())!.stock).toBe(10);
    expect(capturePaymentIntent).not.toHaveBeenCalled();
  });

  it('returns the order to authorized on a definitive rejection and retries with generation 2', async () => {
    const { order } = await makeOrder();
    vi.mocked(capturePaymentIntent).mockRejectedValueOnce(stripeFault(402));

    const error = await rejection(accept(order.id));

    expect([error.statusCode, error.code]).toEqual([409, 'capture_failed']);
    const reverted = await Order.findById(order._id).lean();
    expect(reverted!.status).toBe('pending');
    expect(reverted!.paymentStatus).toBe('authorized');
    expect(reverted!.paymentError).toMatchObject({ code: 'capture_failed' });
    expect(reverted!.paymentError!.message).not.toMatch(/sk_|secret/i);
    const first = await PaymentOperation.findOne({ idempotencyKey: `order:${order.id}:capture:1` }).lean();
    expect(first!.status).toBe('failed');

    const outcome = await accept(order.id);

    expect(outcome.kind).toBe('completed');
    expect(capturePaymentIntent).toHaveBeenCalledTimes(2);
    expect(capturePaymentIntent).toHaveBeenLastCalledWith(order.paymentIntentId, AMOUNT, `order:${order.id}:capture:2`);
    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('preparing');
    expect(stored!.paymentStatus).toBe('captured');
    expect(stored!.paymentError).toBeUndefined();
  });

  it('never strands a capture_pending order next to a failed operation when the revert write fails', async () => {
    const { order } = await makeOrder({ paymentStatus: 'capture_pending' });
    const key1 = `order:${order.id}:capture:1`;
    vi.mocked(capturePaymentIntent).mockRejectedValueOnce(stripeFault(402));
    // The only Order.updateOne on this path is the revert to authorized: fail it once.
    const updateSpy = vi.spyOn(Order, 'updateOne').mockImplementationOnce((() => {
      throw new Error('database unavailable');
    }) as any);

    try {
      await expect(runCapture(order, now)).rejects.toThrow('database unavailable');
    } finally {
      updateSpy.mockRestore();
    }

    expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('capture_pending');
    const stranded = await PaymentOperation.findOne({ idempotencyKey: key1 }).lean();
    expect(stranded!.status).toBe('in_progress');

    const later = new Date(now.getTime() + LEASE_MS + 1000);
    const operation = await claimNextOperation('worker-1', later);
    expect(operation!.idempotencyKey).toBe(key1);
    await resumeCapture(operation!, 'worker-1', later);

    expect(vi.mocked(capturePaymentIntent).mock.calls.filter(call => call[2] === key1)).toHaveLength(1);
    const reverted = await Order.findById(order._id).lean();
    expect(reverted!.paymentStatus).toBe('authorized');
    expect(reverted!.paymentError).toMatchObject({ code: 'capture_failed' });
    expect((await PaymentOperation.findOne({ idempotencyKey: key1 }).lean())!.status).toBe('failed');

    const outcome = await accept(order.id, later);

    expect(outcome.kind).toBe('completed');
    expect(capturePaymentIntent).toHaveBeenCalledTimes(2);
    expect(capturePaymentIntent).toHaveBeenLastCalledWith(order.paymentIntentId, AMOUNT, `order:${order.id}:capture:2`);
    expect((await Order.findById(order._id).lean())!.status).toBe('preparing');
  });

  it('leaves the operation pending for the worker when capture and retrieval both fail', async () => {
    const { order } = await makeOrder();
    vi.mocked(capturePaymentIntent).mockRejectedValueOnce(stripeFault());
    vi.mocked(retrieveIntentWithCharge)
      .mockImplementationOnce(async (id: string) => validIntent(id))
      .mockRejectedValueOnce(stripeFault());

    const outcome = await accept(order.id);

    expect(outcome.kind).toBe('resolving');
    expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('capture_pending');
    const operation = await PaymentOperation.findOne({ orderId: order._id }).lean();
    expect(operation!.status).toBe('pending');
    expect(operation!.nextAttemptAt!.getTime()).toBeGreaterThan(now.getTime());
    expect(operation!.leaseOwner).toBeUndefined();

    const again = await accept(order.id);
    expect(again.kind).toBe('resolving');
    expect(capturePaymentIntent).toHaveBeenCalledTimes(1);
  });

  it.each([409, 429])('treats a Stripe %i on capture as ambiguous: stays capture_pending and never rejects', async (status) => {
    const { order } = await makeOrder();
    vi.mocked(capturePaymentIntent).mockRejectedValueOnce(stripeFault(status));

    const outcome = await accept(order.id);

    expect(outcome.kind).toBe('resolving');
    const stored = await Order.findById(order._id).lean();
    expect(stored!.paymentStatus).toBe('capture_pending');
    expect((await PaymentOperation.findOne({ orderId: order._id }).lean())!.status).toBe('pending');
  });

  it('finalizes when the capture response was lost but retrieval shows it succeeded', async () => {
    const { order } = await makeOrder();
    vi.mocked(capturePaymentIntent).mockRejectedValueOnce(stripeFault());
    vi.mocked(retrieveIntentWithCharge)
      .mockImplementationOnce(async (id: string) => validIntent(id))
      .mockImplementationOnce(async (id: string) => succeededIntent(id));

    const outcome = await accept(order.id);

    expect(outcome.kind).toBe('completed');
    expect(capturePaymentIntent).toHaveBeenCalledTimes(1);
    expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('captured');
    expect((await PaymentOperation.findOne({ orderId: order._id }).lean())!.status).toBe('succeeded');
  });

  it('recovers a capture whose finalization crashed without capturing again', async () => {
    const { order } = await makeOrder({ paymentStatus: 'capture_pending' });
    // The first Order update in runCapture is the finalize write: fail it once, after Stripe captured.
    const updateSpy = vi.spyOn(Order, 'findOneAndUpdate').mockImplementationOnce((() => {
      throw new Error('database unavailable');
    }) as any);

    try {
      await expect(runCapture(order, now)).rejects.toThrow('database unavailable');
    } finally {
      updateSpy.mockRestore();
    }
    expect(capturePaymentIntent).toHaveBeenCalledTimes(1);
    expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('capture_pending');

    vi.mocked(retrieveIntentWithCharge).mockImplementation(async (id: string) => succeededIntent(id));
    const later = new Date(now.getTime() + LEASE_MS + 1000);
    const operation = await claimNextOperation('worker-1', later);
    expect(operation).not.toBeNull();

    await resumeCapture(operation!, 'worker-1', later);

    expect(capturePaymentIntent).toHaveBeenCalledTimes(1);
    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('preparing');
    expect(stored!.paymentStatus).toBe('captured');
    expect((await PaymentOperation.findById(operation!._id).lean())!.status).toBe('succeeded');
  });

  it('never captures from resumeCapture once the operation is older than the safe retry window', async () => {
    const { order } = await makeOrder({ paymentStatus: 'capture_pending' });
    const created = await PaymentOperation.create({
      action: 'capture',
      idempotencyKey: `order:${order.id}:capture:1`,
      orderId: order._id,
      paymentIntentId: order.paymentIntentId,
      status: 'pending',
    });
    await PaymentOperation.collection.updateOne(
      { _id: created._id },
      { $set: { createdAt: new Date(now.getTime() - 24 * 3600 * 1000) } },
    );
    const operation = await claimNextOperation('worker-1', now);

    await resumeCapture(operation!, 'worker-1', now);

    expect(capturePaymentIntent).not.toHaveBeenCalled();
    expect((await PaymentOperation.findById(created._id).lean())!.status).toBe('needs_support');
    expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('capture_pending');
  });

  it('reverts a claimed order with no payment intent to authorized without calling Stripe', async () => {
    const { order } = await makeOrder({ paymentStatus: 'capture_pending', paymentIntentId: undefined });

    const error = await rejection(runCapture(order, now));

    expect([error.statusCode, error.code]).toEqual([409, 'payment_reference_missing']);
    expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('authorized');
    expect(retrieveIntentWithCharge).not.toHaveBeenCalled();
    expect(capturePaymentIntent).not.toHaveBeenCalled();
    expect(await PaymentOperation.countDocuments({})).toBe(0);
  });

  it('reports resolving without calling Stripe when another owner holds the operation lease', async () => {
    const { order } = await makeOrder({ paymentStatus: 'capture_pending' });
    await PaymentOperation.create({
      action: 'capture',
      idempotencyKey: `order:${order.id}:capture:1`,
      orderId: order._id,
      paymentIntentId: order.paymentIntentId,
      status: 'in_progress',
      leaseOwner: 'other-request',
      leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      attempts: 1,
    });

    const outcome = await runCapture(order, now);

    expect(outcome.kind).toBe('resolving');
    expect(retrieveIntentWithCharge).not.toHaveBeenCalled();
    expect(capturePaymentIntent).not.toHaveBeenCalled();
  });

  describe('finalizeCapture', () => {
    it('returns null and changes nothing when the received amount differs', async () => {
      const { order } = await makeOrder({ paymentStatus: 'capture_pending' });
      expect(await finalizeCapture(order.id, succeededIntent(order.paymentIntentId!, 3000), now)).toBeNull();
      expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('capture_pending');
    });

    it('returns null for an intent that is not succeeded or belongs to another order', async () => {
      const { order } = await makeOrder({ paymentStatus: 'capture_pending' });
      expect(await finalizeCapture(order.id, validIntent(order.paymentIntentId!), now)).toBeNull();
      expect(await finalizeCapture(order.id, succeededIntent('pi_other'), now)).toBeNull();
      expect((await Order.findById(order._id).lean())!.status).toBe('pending');
    });

    it('only finalizes an order that is capture_pending', async () => {
      const { order } = await makeOrder();
      expect(await finalizeCapture(order.id, succeededIntent(order.paymentIntentId!), now)).toBeNull();
      expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('authorized');
    });

    it('moves a verified capture to preparing and captured', async () => {
      const { order } = await makeOrder({ paymentStatus: 'capture_pending' });
      const finalized = await finalizeCapture(order.id, succeededIntent(order.paymentIntentId!), now);
      expect(finalized!.status).toBe('preparing');
      expect(finalized!.paymentStatus).toBe('captured');
      expect(finalized!.capturedAt).toEqual(now);
    });
  });
});
