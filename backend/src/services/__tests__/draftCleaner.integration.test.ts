import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Coupon from '../../models/Coupon.js';
import CheckoutSession from '../../models/CheckoutSession.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import { createCheckoutSession } from '../checkoutService.js';
import { finalizeCheckoutSession } from '../checkoutFinalization.js';
import { cleanExpiredCheckoutSessions } from '../draftCleaner.js';
import { cancelPaymentIntent, retrieveIntentWithCharge, retrievePaymentIntent, createManualCapturePaymentIntent } from '../stripeService.js';
import { connectIntegrationDb } from './integrationDb.js';

vi.mock('../stripeService.js', async () => {
  const actual = await vi.importActual<typeof import('../stripeService.js')>('../stripeService.js');
  return {
    ...actual,
    createManualCapturePaymentIntent: vi.fn(),
    listCustomerIntentsSince: vi.fn().mockResolvedValue([]),
    retrievePaymentIntent: vi.fn(),
    retrieveIntentWithCharge: vi.fn(),
    cancelPaymentIntent: vi.fn(),
  };
});

vi.mock('../paymentService.js', () => ({
  default: { getOrCreateCustomerForUser: vi.fn().mockResolvedValue('cus_test') },
}));

const buyer = new mongoose.Types.ObjectId();
const seller = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };
const pastSeconds = () => new Date(Date.now() - 60_000);

async function makeSession(key: string, options: { expired?: boolean; intent?: boolean } = {}) {
  const product = await Product.create({ name: 'Item', description: 'd', category: 'Books', price: 20, stock: 10, image: 'i.png', sellerId: seller });
  const { session } = await createCheckoutSession(buyer.toString(), key, {
    items: [{ productId: product._id.toString(), quantity: 2 }],
    shippingAddress: address,
    paymentMethod: { type: 'credit-card' },
  });
  if (options.intent) {
    const intentId = `pi_${key}`;
    await CheckoutSession.updateOne(
      { _id: session._id, 'sellers.draftOrderId': session.sellers[0].draftOrderId },
      { $set: { 'sellers.$.paymentIntentId': intentId } },
    );
    await Order.updateOne({ _id: session.sellers[0].draftOrderId }, { $set: { paymentIntentId: intentId } });
  }
  if (options.expired) {
    await CheckoutSession.updateOne({ _id: session._id }, { $set: { expiresAt: pastSeconds() } });
  }
  return { sessionId: session._id, productId: product._id, intentId: options.intent ? `pi_${key}` : undefined };
}

async function stockOf(id: mongoose.Types.ObjectId) {
  return (await Product.findById(id).lean())!.stock;
}

describe('draft cleaner (replica set, Stripe mocked)', () => {
  it('does not starve later expired sessions behind a full batch of exhausted releases', async () => {
    for (let i = 0; i < 50; i++) {
      const session = await CheckoutSession.create({ buyerId: buyer, idempotencyKey: `stuck-${i}`, requestHash: 'x',
        status: 'failed', expiresAt: pastSeconds(), stockRestoredAt: new Date(),
        sellers: [{ sellerId: seller, draftOrderId: new mongoose.Types.ObjectId(), amountMinor: 100, currency: 'usd',
          paymentIntentId: `pi_stuck_${i}`, status: 'awaiting_authorization' }] });
      await PaymentOperation.create({ action: 'release', idempotencyKey: `checkout:${session.id}:${seller}:release:1`,
        checkoutSessionId: session.id, generation: 1, status: 'needs_support', attempts: 5 });
    }
    const next = await makeSession('key-after-stuck', { expired: true });
    const result = await cleanExpiredCheckoutSessions();
    expect(result.released).toBe(51);
    expect(await stockOf(next.productId)).toBe(10);
    expect((await CheckoutSession.findById(next.sessionId))!.status).toBe('expired');
  });
  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), CheckoutSession.init(), Coupon.init(), PaymentOperation.init()]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cancelPaymentIntent).mockImplementation(async (id: string) => ({ id, status: 'canceled' }));
  });

  afterEach(async () => {
    await Promise.all([
      Product.deleteMany({}),
      Order.deleteMany({}),
      CheckoutSession.deleteMany({}),
      Coupon.deleteMany({}),
      PaymentOperation.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('releases only expired open checkouts and leaves active and placed ones alone', async () => {
    const expired = await makeSession('key-clean-0001', { expired: true, intent: true });
    const active = await makeSession('key-clean-0002', { intent: true });
    const placed = await makeSession('key-clean-0003', { expired: true });
    await CheckoutSession.updateOne({ _id: placed.sessionId }, { $set: { status: 'placed', placedAt: new Date() } });
    expect(await stockOf(expired.productId)).toBe(8);

    const result = await cleanExpiredCheckoutSessions();

    expect(result).toEqual({ released: 1, skipped: 0 });
    expect((await CheckoutSession.findById(expired.sessionId).lean())!.status).toBe('expired');
    expect((await CheckoutSession.findById(active.sessionId).lean())!.status).toBe('open');
    expect((await CheckoutSession.findById(placed.sessionId).lean())!.status).toBe('placed');
    expect(await stockOf(expired.productId)).toBe(10);
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
    expect(cancelPaymentIntent).toHaveBeenCalledWith(expired.intentId, expect.stringContaining(':release:1'));
  });

  it('releases each checkout once when two cleaners run at the same time', async () => {
    const expired = await makeSession('key-clean-0004', { expired: true, intent: true });

    const [first, second] = await Promise.all([cleanExpiredCheckoutSessions(), cleanExpiredCheckoutSessions()]);

    expect(first.released + second.released).toBe(1);
    expect(await stockOf(expired.productId)).toBe(10);
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
  });

  it('rejects a confirm after cleanup and releases any hold it finds', async () => {
    const expired = await makeSession('key-clean-0005', { expired: true, intent: true });

    await expect(finalizeCheckoutSession(expired.sessionId.toString(), buyer.toString())).rejects.toMatchObject({
      code: 'session_expired',
    });

    expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
    expect(retrieveIntentWithCharge).not.toHaveBeenCalled();
    expect(await stockOf(expired.productId)).toBe(10);
    expect((await CheckoutSession.findById(expired.sessionId).lean())!.status).toBe('expired');
  });

  it('settles exactly one outcome when a confirm races the cleaner on an expired checkout', async () => {
    const expired = await makeSession('key-clean-0006', { expired: true, intent: true });

    const [confirm, clean] = await Promise.allSettled([
      finalizeCheckoutSession(expired.sessionId.toString(), buyer.toString()),
      cleanExpiredCheckoutSessions(),
    ]);

    expect(confirm.status).toBe('rejected');
    expect(clean.status).toBe('fulfilled');
    expect(await stockOf(expired.productId)).toBe(10);
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
    expect((await CheckoutSession.findById(expired.sessionId).lean())!.status).toBe('expired');
    expect(await Order.countDocuments({ checkoutSessionId: expired.sessionId.toString(), status: 'pending' })).toBe(0);
  });

  it('recovers a checkout left in finalizing by a crashed request', async () => {
    const stuck = await makeSession('key-clean-0007', { expired: true, intent: true });
    await CheckoutSession.collection.updateOne(
      { _id: stuck.sessionId },
      { $set: { status: 'finalizing', updatedAt: new Date(Date.now() - 10 * 60 * 1000) } },
    );

    await cleanExpiredCheckoutSessions();

    expect((await CheckoutSession.findById(stuck.sessionId).lean())!.status).toBe('expired');
    expect(await stockOf(stuck.productId)).toBe(10);
  });

  it('releases a failed checkout whose holds were never released', async () => {
    const failed = await makeSession('key-clean-0008', { intent: true });
    await CheckoutSession.updateOne({ _id: failed.sessionId }, { $set: { status: 'failed' } });

    const result = await cleanExpiredCheckoutSessions();

    expect(result.released).toBe(1);
    expect(cancelPaymentIntent).toHaveBeenCalledWith(failed.intentId, expect.any(String));
    expect(await stockOf(failed.productId)).toBe(10);
    expect((await CheckoutSession.findById(failed.sessionId).lean())!.status).toBe('failed');
  });

  it('does not create a new intent for an expired checkout that is authorized again', async () => {
    const expired = await makeSession('key-clean-0009', { expired: true });
    const stored = await CheckoutSession.findById(expired.sessionId);
    const { authorizeCheckoutSession } = await import('../checkoutAuthorization.js');

    await expect(authorizeCheckoutSession(stored!, buyer.toString())).rejects.toMatchObject({ code: 'session_expired' });
    expect(createManualCapturePaymentIntent).not.toHaveBeenCalled();
    expect(await stockOf(expired.productId)).toBe(10);
  });
});

describe('draft cleaner during a Stripe outage (replica set, Stripe mocked)', () => {
  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), CheckoutSession.init(), Coupon.init(), PaymentOperation.init()]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await Promise.all([
      Product.deleteMany({}),
      Order.deleteMany({}),
      CheckoutSession.deleteMany({}),
      Coupon.deleteMany({}),
      PaymentOperation.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('keeps revisiting unreleased holds without restoring stock twice', async () => {
    const outage = await makeSession('key-outage-0001', { expired: true, intent: true });
    vi.mocked(cancelPaymentIntent).mockRejectedValue(new Error('Stripe unavailable'));
    vi.mocked(retrievePaymentIntent).mockRejectedValue(new Error('Stripe unavailable'));

    const first = await cleanExpiredCheckoutSessions();

    expect(first.skipped).toBe(0);
    expect(first.released).toBe(1);
    expect(await stockOf(outage.productId)).toBe(10);
    const hold = await PaymentOperation.findOne({ idempotencyKey: { $regex: ':release:1$' } }).lean();
    expect(hold).not.toBeNull();
    expect(hold!.status).not.toBe('completed');

    const second = await cleanExpiredCheckoutSessions();

    expect(second).toEqual({ released: 1, skipped: 0 });
    expect(await stockOf(outage.productId)).toBe(10);
  });
});
