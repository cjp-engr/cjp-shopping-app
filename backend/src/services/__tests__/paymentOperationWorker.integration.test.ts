import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import { acceptOrder } from '../orderAcceptance.js';
import { processDueOperations } from '../paymentOperationWorker.js';
import { LEASE_MS, MAX_ATTEMPTS } from '../paymentOperationPolicy.js';
import { releaseIntentOperation } from '../paymentRelease.js';
import {
  cancelPaymentIntent,
  capturePaymentIntent,
  retrieveIntentWithCharge,
  retrievePaymentIntent,
  StripeError,
} from '../stripeService.js';
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

const buyer = new mongoose.Types.ObjectId();
const seller = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };
const now = new Date('2026-10-17T10:00:00Z');
const AMOUNT = 4000;

function stripeFault(statusCode?: number): StripeError {
  return new StripeError('Stripe failure', statusCode === undefined ? undefined : Object.assign(new Error('x'), { statusCode }));
}

function intent(id: string, overrides: Record<string, unknown> = {}) {
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

async function makeOrder(overrides: Record<string, unknown> = {}) {
  const product = await Product.create({
    name: 'Item', description: 'd', category: 'Books', price: 20, stock: 8, soldCount: 2, image: 'i.png', sellerId: seller,
  });
  return Order.create({
    userId: buyer,
    sellerId: seller,
    items: [{ product: product._id, productName: 'Item', productPrice: 20, productImage: 'i.png', quantity: 2 }],
    shippingAddress: address,
    paymentMethod: { type: 'credit-card' },
    subtotal: 40, discount: 0, tax: 0, shipping: 0, total: 40,
    status: 'pending',
    paymentFlowVersion: 'manual_capture',
    paymentStatus: 'capture_pending',
    paymentIntentId: `pi_${new mongoose.Types.ObjectId().toString()}`,
    amountMinor: AMOUNT,
    currency: 'USD',
    authorizationExpiresAt: new Date(now.getTime() + 3 * 24 * 3600 * 1000),
    acceptBy: new Date(now.getTime() + 3600 * 1000),
    ...overrides,
  });
}

function makeCancelledOrder(overrides: Record<string, unknown> = {}) {
  return makeOrder({ status: 'cancelled', cancelReason: 'seller_acceptance_timeout', paymentStatus: 'release_pending', stockRestoredAt: now, ...overrides });
}

async function makeOperation(
  order: { _id: mongoose.Types.ObjectId; paymentIntentId?: string },
  action: 'capture' | 'release',
  overrides: Record<string, unknown> = {},
) {
  return PaymentOperation.create({
    action,
    generation: 1,
    idempotencyKey: `order:${order._id.toString()}:${action}:1`,
    orderId: order._id,
    paymentIntentId: order.paymentIntentId,
    status: 'pending',
    attempts: 0,
    ...overrides,
  });
}

/** Timestamps are bypassed on purpose: the repairs key on how long ago the order last changed. */
async function touch(orderId: mongoose.Types.ObjectId, updatedAt: Date) {
  await Order.collection.updateOne({ _id: orderId }, { $set: { updatedAt } });
}

describe('payment operation worker (replica set, Stripe mocked)', () => {
  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), PaymentOperation.init()]);
  });

  const originalVisibility = process.env.SELLER_SEES_MANUAL_CAPTURE;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(retrieveIntentWithCharge).mockImplementation(async (id: string) => intent(id));
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ id: 'pi', status: 'requires_capture' } as any);
    vi.mocked(cancelPaymentIntent).mockImplementation(async (id: string) => ({ id, status: 'canceled' }) as any);
    vi.mocked(capturePaymentIntent).mockImplementation(async (id: string, amount: number) => ({ id, status: 'succeeded', amountReceived: amount }));
  });

  afterEach(async () => {
    if (originalVisibility === undefined) delete process.env.SELLER_SEES_MANUAL_CAPTURE;
    else process.env.SELLER_SEES_MANUAL_CAPTURE = originalVisibility;
    await Promise.all([Product.deleteMany({}), Order.deleteMany({}), PaymentOperation.deleteMany({})]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('resumes a capture operation whose lease expired and finalizes the order', async () => {
    const order = await makeOrder();
    const operation = await makeOperation(order, 'capture', {
      status: 'in_progress',
      attempts: 1,
      leaseOwner: 'dead-request',
      leaseExpiresAt: new Date(now.getTime() - 1000),
    });
    vi.mocked(retrieveIntentWithCharge).mockImplementation(async (id: string) => intent(id, { status: 'succeeded', amount_capturable: 0, amount_received: AMOUNT }));

    const processed = await processDueOperations('worker-1', now);

    expect(processed).toBe(1);
    expect(capturePaymentIntent).not.toHaveBeenCalled();
    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('preparing');
    expect(stored!.paymentStatus).toBe('captured');
    expect((await PaymentOperation.findById(operation._id).lean())!.status).toBe('succeeded');
  });

  it('resumes a deferred capture operation (pending with a retry time that has passed)', async () => {
    const order = await makeOrder();
    await makeOperation(order, 'capture', { attempts: 1, nextAttemptAt: new Date(now.getTime() - 1000) });

    const processed = await processDueOperations('worker-1', now);

    expect(processed).toBe(1);
    expect(capturePaymentIntent).toHaveBeenCalledTimes(1);
    expect(capturePaymentIntent).toHaveBeenCalledWith(order.paymentIntentId, AMOUNT, `order:${order.id}:capture:1`);
    expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('captured');
  });

  it('does not touch an operation that is still backing off', async () => {
    const order = await makeOrder();
    await makeOperation(order, 'capture', { attempts: 1, nextAttemptAt: new Date(now.getTime() + 60_000) });

    expect(await processDueOperations('worker-1', now)).toBe(0);
    expect(retrieveIntentWithCharge).not.toHaveBeenCalled();
    expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('capture_pending');
  });

  it('completes a release operation left pending after a failed cancel and marks the order released', async () => {
    const order = await makeCancelledOrder();
    const operation = await makeOperation(order, 'release', { attempts: 1, nextAttemptAt: new Date(now.getTime() - 1000) });

    const processed = await processDueOperations('worker-1', now);

    expect(processed).toBe(1);
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
    expect(cancelPaymentIntent).toHaveBeenCalledWith(order.paymentIntentId, `order:${order.id}:release:1`);
    expect((await PaymentOperation.findById(operation._id).lean())!.status).toBe('succeeded');
    expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('released');
  });

  it('keeps the order release_pending and the operation retryable when the release is still failing', async () => {
    const order = await makeCancelledOrder();
    const operation = await makeOperation(order, 'release');
    vi.mocked(cancelPaymentIntent).mockRejectedValue(stripeFault(400));

    await processDueOperations('worker-1', now);

    const stored = await PaymentOperation.findById(operation._id).lean();
    expect(stored!.status).toBe('pending');
    expect(stored!.leaseOwner).toBeUndefined();
    expect(stored!.nextAttemptAt!.getTime()).toBeGreaterThan(now.getTime());
    expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('release_pending');
  });

  it('does not claim operations again within one run after they back off', async () => {
    const order = await makeCancelledOrder();
    await makeOperation(order, 'release');
    vi.mocked(cancelPaymentIntent).mockRejectedValue(stripeFault(400));

    expect(await processDueOperations('worker-1', now)).toBe(1);
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
  });

  it('resumes checkout-level releases as well as order releases', async () => {
    const operation = await PaymentOperation.create({
      action: 'release',
      generation: 1,
      idempotencyKey: 'checkout:abc:release:1',
      checkoutSessionId: 'abc',
      paymentIntentId: 'pi_checkout',
      status: 'pending',
      attempts: 0,
    });

    expect(await processDueOperations('worker-1', now)).toBe(1);
    expect(cancelPaymentIntent).toHaveBeenCalledWith('pi_checkout', 'checkout:abc:release:1');
    expect((await PaymentOperation.findById(operation._id).lean())!.status).toBe('succeeded');
  });

  it('does not claim an operation whose lease is still live', async () => {
    const order = await makeOrder();
    const operation = await makeOperation(order, 'capture', {
      status: 'in_progress',
      attempts: 1,
      leaseOwner: 'live-request',
      leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
    });

    expect(await processDueOperations('worker-1', now)).toBe(0);
    expect(retrieveIntentWithCharge).not.toHaveBeenCalled();
    const stored = await PaymentOperation.findById(operation._id).lean();
    expect(stored!.leaseOwner).toBe('live-request');
    expect(stored!.attempts).toBe(1);
  });

  it('never re-claims a succeeded operation', async () => {
    const order = await makeOrder({ status: 'preparing', paymentStatus: 'captured' });
    await makeOperation(order, 'capture', { status: 'succeeded' });

    expect(await processDueOperations('worker-1', now)).toBe(0);
    expect(retrieveIntentWithCharge).not.toHaveBeenCalled();
  });

  it('repairs an order left release_pending whose release operation already succeeded', async () => {
    const order = await makeCancelledOrder();
    await makeOperation(order, 'release', { status: 'succeeded', completedAt: now });

    await processDueOperations('worker-1', now);

    expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('released');
    expect(cancelPaymentIntent).not.toHaveBeenCalled();
  });

  it('does not mark a release_pending order released while its release operation has not succeeded', async () => {
    const stuck = await makeCancelledOrder();
    await makeOperation(stuck, 'release', { status: 'needs_support' });

    await processDueOperations('worker-1', now);

    expect((await Order.findById(stuck._id).lean())!.paymentStatus).toBe('release_pending');
    expect(cancelPaymentIntent).not.toHaveBeenCalled();
  });

  it('leaves an order alone when its succeeded release operation belongs to an order that moved on', async () => {
    const order = await makeCancelledOrder({ paymentStatus: 'refunded' });
    await makeOperation(order, 'release', { status: 'succeeded', completedAt: now });

    await processDueOperations('worker-1', now);

    expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('refunded');
  });

  describe('a handler that throws', () => {
    function breakOrder(orderId: mongoose.Types.ObjectId) {
      const findById = Order.findById.bind(Order);
      vi.spyOn(Order, 'findById').mockImplementation(((id: any, ...rest: any[]) => {
        if (id?.toString() === orderId.toString()) throw new Error('db hiccup');
        return (findById as any)(id, ...rest);
      }) as any);
    }

    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('keeps working through the queue and puts the broken operation on backoff', async () => {
      const broken = await makeOrder();
      const good = await makeCancelledOrder();
      const brokenOperation = await makeOperation(broken, 'capture', { createdAt: new Date(now.getTime() - 2000) });
      await makeOperation(good, 'release', { createdAt: new Date(now.getTime() - 1000) });
      breakOrder(broken._id);

      const processed = await processDueOperations('worker-1', now);

      expect(processed).toBe(2);
      expect((await Order.findById(good._id).lean())!.paymentStatus).toBe('released');
      const stored = await PaymentOperation.findById(brokenOperation._id).lean();
      expect(stored!.status).toBe('pending');
      expect(stored!.leaseOwner).toBeUndefined();
      expect(stored!.lastError).toMatchObject({ code: 'handler_error', message: 'db hiccup' });
      expect(stored!.nextAttemptAt!.getTime()).toBeGreaterThan(now.getTime());
    });

    it('reaches needs_support after the maximum number of attempts instead of retrying forever', async () => {
      const broken = await makeOrder();
      const operation = await makeOperation(broken, 'capture');
      breakOrder(broken._id);

      for (let run = 0; run < MAX_ATTEMPTS; run += 1) {
        // Each run is far enough on to be past the previous backoff.
        await processDueOperations('worker-1', new Date(now.getTime() + run * 3600 * 1000));
      }

      const stored = await PaymentOperation.findById(operation._id).lean();
      expect(stored!.status).toBe('needs_support');
      expect(stored!.attempts).toBe(MAX_ATTEMPTS);
      expect(stored!.lastError).toMatchObject({ code: 'handler_error' });

      const later = new Date(now.getTime() + 100 * 3600 * 1000);
      expect(await processDueOperations('worker-1', later)).toBe(0);
      expect((await PaymentOperation.findById(operation._id).lean())!.attempts).toBe(MAX_ATTEMPTS);
    });
  });

  describe('claim time', () => {
    /** Records the lease each release holds at the moment Stripe is called. */
    function recordLeases(afterCall: () => Promise<void> = async () => {}) {
      const leases: number[] = [];
      vi.mocked(cancelPaymentIntent).mockImplementation(async (id: string, key?: string) => {
        const operation = await PaymentOperation.findOne({ idempotencyKey: key }).lean();
        leases.push(operation!.leaseExpiresAt!.getTime());
        await afterCall();
        return { id, status: 'canceled' } as any;
      });
      return leases;
    }

    async function queueReleases(count: number) {
      for (let i = 0; i < count; i += 1) {
        const order = await makeCancelledOrder();
        await makeOperation(order, 'release', { createdAt: new Date(now.getTime() - 10_000 + i) });
      }
    }

    it('gives every operation of a long run a lease that starts at its own claim time', async () => {
      await queueReleases(3);
      const leases = recordLeases();
      let readings = 0;
      // Each reading of the clock is two minutes later than the one before.
      const clock = () => new Date(now.getTime() + 2 * 60 * 1000 * readings++);

      await processDueOperations('worker-1', clock);

      expect(leases).toHaveLength(3);
      expect(leases[1]).toBeGreaterThan(leases[0] + 60 * 1000);
      expect(leases[2]).toBeGreaterThan(leases[1] + 60 * 1000);
      expect(leases[0]).toBeGreaterThanOrEqual(now.getTime() + LEASE_MS);
    });

    it('reads the real clock again for each claim when no time is injected', async () => {
      await queueReleases(2);
      const leases = recordLeases(() => new Promise(resolve => setTimeout(resolve, 150)));
      const start = Date.now();

      await processDueOperations('worker-1');

      expect(leases).toHaveLength(2);
      expect(leases[0]).toBeGreaterThanOrEqual(start + LEASE_MS);
      // The second claim came after the first handler's 150 ms of work.
      expect(leases[1] - leases[0]).toBeGreaterThanOrEqual(100);
    });
  });

  describe('orphaned release_pending orders', () => {
    const staleAt = new Date(now.getTime() - 10 * 60 * 1000);
    const freshAt = new Date(now.getTime() - 60 * 1000);

    it('runs the release of a stale cancelled order that has no release operation and marks it released', async () => {
      const order = await makeCancelledOrder();
      await touch(order._id, staleAt);

      const processed = await processDueOperations('worker-1', now);

      expect(processed).toBe(1);
      expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
      expect(cancelPaymentIntent).toHaveBeenCalledWith(order.paymentIntentId, `order:${order.id}:release:1`);
      expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('released');
      const operation = await PaymentOperation.findOne({ idempotencyKey: `order:${order.id}:release:1` }).lean();
      expect(operation!.status).toBe('succeeded');
      expect(operation!.orderId!.toString()).toBe(order.id);
    });

    it('keeps the order release_pending and the operation row for later retries when the release is unresolved', async () => {
      const order = await makeCancelledOrder();
      await touch(order._id, staleAt);
      vi.mocked(cancelPaymentIntent).mockRejectedValue(stripeFault(400));

      expect(await processDueOperations('worker-1', now)).toBe(0);

      expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('release_pending');
      const operation = await PaymentOperation.findOne({ idempotencyKey: `order:${order.id}:release:1` }).lean();
      expect(operation!.status).toBe('pending');
      expect(operation!.nextAttemptAt).toBeDefined();

      // A later run picks the operation up through the normal claim path.
      vi.mocked(cancelPaymentIntent).mockImplementation(async (id: string) => ({ id, status: 'canceled' }) as any);
      // releaseIntentOperation schedules its retry on the real clock, so the later run is relative to it.
      await processDueOperations('worker-1', new Date(Date.now() + 3600 * 1000));
      expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('released');
    });

    it('does not give a second release operation to an order that already has one', async () => {
      const order = await makeCancelledOrder();
      await touch(order._id, staleAt);
      await makeOperation(order, 'release', { status: 'needs_support' });

      await processDueOperations('worker-1', now);

      expect(cancelPaymentIntent).not.toHaveBeenCalled();
      expect(await PaymentOperation.countDocuments({ orderId: order._id, action: 'release' })).toBe(1);
      expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('release_pending');
    });

    it('leaves a fresh release_pending order alone', async () => {
      const order = await makeCancelledOrder();
      await touch(order._id, freshAt);

      expect(await processDueOperations('worker-1', now)).toBe(0);

      expect(cancelPaymentIntent).not.toHaveBeenCalled();
      expect(await PaymentOperation.countDocuments({})).toBe(0);
      expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('release_pending');
    });

    it('leaves a cancelled order with no payment intent alone', async () => {
      const order = await makeCancelledOrder({ paymentIntentId: undefined });
      await touch(order._id, staleAt);

      expect(await processDueOperations('worker-1', now)).toBe(0);

      expect(cancelPaymentIntent).not.toHaveBeenCalled();
      expect(await PaymentOperation.countDocuments({})).toBe(0);
      expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('release_pending');
    });
  });

  describe('orphaned capture_pending orders', () => {
    const staleAt = new Date(now.getTime() - 10 * 60 * 1000);
    const freshAt = new Date(now.getTime() - 60 * 1000);

    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.mocked(console.warn).mockRestore();
    });

    it('reverts a stale capture_pending order that has no capture operation and counts it', async () => {
      const order = await makeOrder();
      await touch(order._id, staleAt);

      const processed = await processDueOperations('worker-1', now);

      expect(processed).toBe(1);
      const stored = await Order.findById(order._id).lean();
      expect(stored!.status).toBe('pending');
      expect(stored!.paymentStatus).toBe('authorized');
      expect(retrieveIntentWithCharge).not.toHaveBeenCalled();
      expect(capturePaymentIntent).not.toHaveBeenCalled();
    });

    it.each(['pending', 'in_progress', 'needs_support', 'succeeded'] as const)(
      'leaves a stale capture_pending order alone when its capture operation is %s',
      async (status) => {
        const order = await makeOrder();
        await touch(order._id, staleAt);
        await makeOperation(order, 'capture', {
          status,
          attempts: 1,
          ...(status === 'pending' ? { nextAttemptAt: new Date(now.getTime() + 60_000) } : {}),
          ...(status === 'in_progress' ? { leaseOwner: 'live-request', leaseExpiresAt: new Date(now.getTime() + LEASE_MS) } : {}),
        });

        await processDueOperations('worker-1', now);

        expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('capture_pending');
      },
    );

    it('reverts a stale capture_pending order whose only capture operation is failed', async () => {
      const order = await makeOrder();
      await touch(order._id, staleAt);
      await makeOperation(order, 'capture', { status: 'failed', attempts: 1 });

      expect(await processDueOperations('worker-1', now)).toBe(1);

      expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('authorized');
      expect(capturePaymentIntent).not.toHaveBeenCalled();
    });

    it('keeps a stale capture_pending order that has a failed generation and a later live one', async () => {
      const order = await makeOrder();
      await touch(order._id, staleAt);
      await makeOperation(order, 'capture', { status: 'failed', attempts: 1 });
      await PaymentOperation.create({
        action: 'capture', generation: 2, idempotencyKey: `order:${order.id}:capture:2`, orderId: order._id,
        paymentIntentId: order.paymentIntentId, status: 'needs_support', attempts: 1,
      });

      expect(await processDueOperations('worker-1', now)).toBe(0);

      expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('capture_pending');
    });

    it('leaves a fresh capture_pending order with no operation alone', async () => {
      const order = await makeOrder();
      await touch(order._id, freshAt);

      expect(await processDueOperations('worker-1', now)).toBe(0);
      expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('capture_pending');
    });

    it('leaves orders that are not pending alone', async () => {
      const cancelled = await makeOrder({ status: 'cancelled', paymentStatus: 'capture_pending' });
      await touch(cancelled._id, staleAt);

      expect(await processDueOperations('worker-1', now)).toBe(0);
      expect((await Order.findById(cancelled._id).lean())!.paymentStatus).toBe('capture_pending');
    });

    it('lets the seller accept the order again after the repair', async () => {
      process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
      const order = await makeOrder();
      await touch(order._id, staleAt);
      await processDueOperations('worker-1', now);

      const outcome = await acceptOrder({ orderId: order.id, sellerId: seller.toString(), now });

      expect(outcome.kind).toBe('completed');
      expect(capturePaymentIntent).toHaveBeenCalledTimes(1);
      const stored = await Order.findById(order._id).lean();
      expect(stored!.status).toBe('preparing');
      expect(stored!.paymentStatus).toBe('captured');
    });
  });

  describe('releaseIntentOperation with an already-held lease', () => {
    it('completes the operation with the owner that holds the lease', async () => {
      const orderId = new mongoose.Types.ObjectId();
      const key = `order:${orderId}:release:1`;
      await PaymentOperation.create({
        action: 'release', generation: 1, idempotencyKey: key, orderId, paymentIntentId: 'pi_held',
        status: 'in_progress', attempts: 1, leaseOwner: 'worker-1', leaseExpiresAt: new Date(Date.now() + LEASE_MS),
      });

      const outcome = await releaseIntentOperation({ idempotencyKey: key, paymentIntentId: 'pi_held', orderId }, { owner: 'worker-1' });

      expect(outcome).toBe('released');
      expect(cancelPaymentIntent).toHaveBeenCalledWith('pi_held', key);
      expect((await PaymentOperation.findOne({ idempotencyKey: key }).lean())!.status).toBe('succeeded');
    });

    it('does not call Stripe when the lease belongs to someone else', async () => {
      const orderId = new mongoose.Types.ObjectId();
      const key = `order:${orderId}:release:1`;
      await PaymentOperation.create({
        action: 'release', generation: 1, idempotencyKey: key, orderId, paymentIntentId: 'pi_held',
        status: 'in_progress', attempts: 1, leaseOwner: 'someone-else', leaseExpiresAt: new Date(Date.now() + LEASE_MS),
      });

      const outcome = await releaseIntentOperation({ idempotencyKey: key, paymentIntentId: 'pi_held', orderId }, { owner: 'worker-1' });

      expect(outcome).toBe('unresolved');
      expect(cancelPaymentIntent).not.toHaveBeenCalled();
    });

    it('still claims the lease itself when no owner is given', async () => {
      const orderId = new mongoose.Types.ObjectId();
      const key = `order:${orderId}:release:1`;

      const outcome = await releaseIntentOperation({ idempotencyKey: key, paymentIntentId: 'pi_new', orderId });

      expect(outcome).toBe('released');
      expect((await PaymentOperation.findOne({ idempotencyKey: key }).lean())!.status).toBe('succeeded');
    });
  });
});
