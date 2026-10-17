import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Cart from '../../models/Cart.js';
import CheckoutSession from '../../models/CheckoutSession.js';
import { createCheckoutSession, CheckoutError } from '../checkoutService.js';
import { finalizeCheckoutSession } from '../checkoutFinalization.js';
import { retrieveIntentWithCharge } from '../stripeService.js';
import { connectIntegrationDb } from './integrationDb.js';

vi.mock('../stripeService.js', async () => {
  const actual = await vi.importActual<typeof import('../stripeService.js')>('../stripeService.js');
  return {
    ...actual,
    createManualCapturePaymentIntent: vi.fn(),
    listCustomerIntentsSince: vi.fn(),
    retrievePaymentIntent: vi.fn().mockImplementation(async (id: string) => ({ id, status: 'canceled' } as any)),
    retrieveIntentWithCharge: vi.fn(),
    cancelPaymentIntent: vi.fn().mockImplementation(async (id: string) => ({ id, status: 'canceled' })),
  };
});

vi.mock('../paymentService.js', () => ({
  default: { getOrCreateCustomerForUser: vi.fn() },
}));

import paymentService from '../paymentService.js';

const buyer = new mongoose.Types.ObjectId();
const sellerA = new mongoose.Types.ObjectId();
const sellerB = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };
const DAY_MS = 24 * 60 * 60 * 1000;

type Intents = Map<string, any>;
let intents: Intents;

async function makeProduct(sellerId: mongoose.Types.ObjectId, price: number) {
  return Product.create({ name: 'Item', description: 'd', category: 'Books', price, stock: 10, image: 'i.png', sellerId });
}

/** Creates a session with one draft per seller and a Stripe intent recorded against each draft. */
async function setupSession(key: string, lines: Array<{ product: mongoose.Types.ObjectId; seller: mongoose.Types.ObjectId }>) {
  const { session } = await createCheckoutSession(buyer.toString(), key, {
    items: lines.map(line => ({ productId: line.product.toString(), quantity: 1 })),
    shippingAddress: address,
    paymentMethod: { type: 'credit-card' },
  });
  for (const seller of session.sellers) {
    const intentId = `pi_${seller.sellerId.toString().slice(-6)}_${key}`;
    await CheckoutSession.updateOne(
      { _id: session._id, 'sellers.draftOrderId': seller.draftOrderId },
      { $set: { 'sellers.$.paymentIntentId': intentId } },
    );
    await Order.updateOne({ _id: seller.draftOrderId }, { $set: { paymentIntentId: intentId } });
    intents.set(intentId, {
      id: intentId,
      status: 'requires_capture',
      capture_method: 'manual',
      amount: seller.amountMinor,
      amount_capturable: seller.amountMinor,
      currency: 'usd',
      customer: 'cus_test',
      metadata: {
        checkoutSessionId: session._id.toString(),
        sellerId: seller.sellerId.toString(),
        draftOrderId: seller.draftOrderId.toString(),
      },
      latest_charge: {
        object: 'charge',
        payment_method_details: { card: { capture_before: Math.floor((Date.now() + 3 * DAY_MS) / 1000) } },
      },
    });
  }
  return session._id.toString();
}

async function seedCart(lines: Array<{ seller: mongoose.Types.ObjectId; product: mongoose.Types.ObjectId }>) {
  const grouped = new Map<string, Array<{ product: mongoose.Types.ObjectId }>>();
  for (const line of lines) {
    const key = line.seller.toString();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push({ product: line.product });
  }
  await Cart.create({
    userId: buyer,
    sellers: [...grouped.entries()].map(([sellerId, items]) => ({
      sellerId: new mongoose.Types.ObjectId(sellerId),
      items: items.map(item => ({ product: item.product, price: 10, quantity: 1, isSelected: true })),
    })),
  });
}

describe('finalizeCheckoutSession (replica set, Stripe mocked)', () => {
  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), CheckoutSession.init(), Cart.init()]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    intents = new Map();
    vi.mocked(paymentService.getOrCreateCustomerForUser).mockResolvedValue('cus_test');
    vi.mocked(retrieveIntentWithCharge).mockImplementation(async (id: string) => intents.get(id) as any);
  });

  afterEach(async () => {
    await Promise.all([
      Product.deleteMany({}),
      Order.deleteMany({}),
      CheckoutSession.deleteMany({}),
      Cart.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('places every order and removes only the checked-out cart lines', async () => {
    const a = await makeProduct(sellerA, 20);
    const b = await makeProduct(sellerB, 40);
    const unrelated = await makeProduct(sellerB, 5);
    await seedCart([
      { seller: sellerA, product: a._id },
      { seller: sellerB, product: b._id },
      { seller: sellerB, product: unrelated._id },
    ]);
    const sessionId = await setupSession('key-final-0001', [
      { product: a._id, seller: sellerA },
      { product: b._id, seller: sellerB },
    ]);

    const { session, orders } = await finalizeCheckoutSession(sessionId, buyer.toString());

    expect(session.status).toBe('placed');
    expect(orders).toHaveLength(2);
    for (const order of orders) {
      expect(order.status).toBe('pending');
      expect(order.paymentStatus).toBe('authorized');
      expect(order.acceptBy!.getTime() - order.placedAt!.getTime()).toBe(DAY_MS);
    }

    const cart = await Cart.findOne({ userId: buyer }).lean();
    const remaining = cart!.sellers.flatMap(s => s.items.map(i => i.product.toString()));
    expect(remaining).toEqual([unrelated._id.toString()]);
  });

  it('returns the existing orders on a second confirm without contacting Stripe again', async () => {
    const a = await makeProduct(sellerA, 20);
    const sessionId = await setupSession('key-final-0002', [{ product: a._id, seller: sellerA }]);
    const first = await finalizeCheckoutSession(sessionId, buyer.toString());
    vi.mocked(retrieveIntentWithCharge).mockClear();

    const second = await finalizeCheckoutSession(sessionId, buyer.toString());

    expect(retrieveIntentWithCharge).not.toHaveBeenCalled();
    expect(second.orders.map(o => o._id.toString())).toEqual(first.orders.map(o => o._id.toString()));
  });

  it('keeps the session open and places nothing while a seller has not finished payment', async () => {
    const a = await makeProduct(sellerA, 20);
    const b = await makeProduct(sellerB, 40);
    const sessionId = await setupSession('key-final-0003', [
      { product: a._id, seller: sellerA },
      { product: b._id, seller: sellerB },
    ]);
    const pending = [...intents.values()][1];
    pending.status = 'requires_payment_method';

    const attempt = finalizeCheckoutSession(sessionId, buyer.toString());
    await expect(attempt).rejects.toMatchObject({ code: 'authorization_not_ready', retryable: true });

    const session = await CheckoutSession.findById(sessionId).lean();
    expect(session!.status).toBe('open');
    const orders = await Order.find({ checkoutSessionId: sessionId }).lean();
    expect(orders.every(o => o.status === 'awaiting_payment')).toBe(true);
  });

  it('fails the session when a seller payment does not match the order', async () => {
    const a = await makeProduct(sellerA, 20);
    const sessionId = await setupSession('key-final-0004', [{ product: a._id, seller: sellerA }]);
    const [only] = [...intents.values()];
    only.amount_capturable = 1;

    await expect(finalizeCheckoutSession(sessionId, buyer.toString())).rejects.toMatchObject({
      code: 'authorization_mismatch',
    });
    const session = await CheckoutSession.findById(sessionId).lean();
    expect(session!.status).toBe('failed');
  });

  it('fails the session when the authorization deadline is unknown', async () => {
    const a = await makeProduct(sellerA, 20);
    const sessionId = await setupSession('key-final-0005', [{ product: a._id, seller: sellerA }]);
    const [only] = [...intents.values()];
    only.latest_charge = { object: 'charge', payment_method_details: { card: {} } };

    await expect(finalizeCheckoutSession(sessionId, buyer.toString())).rejects.toMatchObject({
      code: 'authorization_deadline_invalid',
    });
    expect((await CheckoutSession.findById(sessionId).lean())!.status).toBe('failed');
  });

  it('uses the earlier authorization deadline when it is shorter than 24 hours', async () => {
    const a = await makeProduct(sellerA, 20);
    const sessionId = await setupSession('key-final-0006', [{ product: a._id, seller: sellerA }]);
    const [only] = [...intents.values()];
    const twoHours = Math.floor((Date.now() + 2 * 60 * 60 * 1000) / 1000);
    only.latest_charge = { object: 'charge', payment_method_details: { card: { capture_before: twoHours } } };

    const { orders } = await finalizeCheckoutSession(sessionId, buyer.toString());

    expect(orders[0].acceptBy!.getTime()).toBe(twoHours * 1000 - 5 * 60 * 1000);
    expect(orders[0].acceptBy!.getTime() - orders[0].placedAt!.getTime()).toBeLessThan(DAY_MS);
  });

  it('refuses to place an expired session without contacting Stripe', async () => {
    const a = await makeProduct(sellerA, 20);
    const sessionId = await setupSession('key-final-0007', [{ product: a._id, seller: sellerA }]);
    await CheckoutSession.updateOne({ _id: sessionId }, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    await expect(finalizeCheckoutSession(sessionId, buyer.toString())).rejects.toMatchObject({ code: 'session_expired' });
    expect(retrieveIntentWithCharge).not.toHaveBeenCalled();
  });

  it('places the orders exactly once when confirms race', async () => {
    const a = await makeProduct(sellerA, 20);
    const b = await makeProduct(sellerB, 40);
    const sessionId = await setupSession('key-final-0008', [
      { product: a._id, seller: sellerA },
      { product: b._id, seller: sellerB },
    ]);

    const results = await Promise.allSettled(
      Array.from({ length: 3 }, () => finalizeCheckoutSession(sessionId, buyer.toString())),
    );

    const succeeded = results.filter(r => r.status === 'fulfilled');
    expect(succeeded.length).toBeGreaterThan(0);
    for (const result of results) {
      if (result.status === 'rejected') {
        expect(result.reason).toBeInstanceOf(CheckoutError);
      }
    }
    const orders = await Order.find({ checkoutSessionId: sessionId }).lean();
    expect(orders).toHaveLength(2);
    expect(new Set(orders.map(o => o.placedAt!.getTime())).size).toBe(1);
  });
});

describe('finalizeCheckoutSession ownership (replica set, Stripe mocked)', () => {
  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), CheckoutSession.init(), Cart.init()]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    intents = new Map();
    vi.mocked(paymentService.getOrCreateCustomerForUser).mockResolvedValue('cus_test');
    vi.mocked(retrieveIntentWithCharge).mockImplementation(async (id: string) => intents.get(id) as any);
  });

  afterEach(async () => {
    await Promise.all([
      Product.deleteMany({}),
      Order.deleteMany({}),
      CheckoutSession.deleteMany({}),
      Cart.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('answers 404 to another buyer and leaves the session and its drafts untouched', async () => {
    const a = await makeProduct(sellerA, 20);
    const sessionId = await setupSession('key-owner-0001', [{ product: a._id, seller: sellerA }]);
    const stranger = new mongoose.Types.ObjectId().toString();

    await expect(finalizeCheckoutSession(sessionId, stranger)).rejects.toMatchObject({
      statusCode: 404,
      code: 'session_not_found',
    });

    expect(retrieveIntentWithCharge).not.toHaveBeenCalled();
    const session = await CheckoutSession.findById(sessionId).lean();
    expect(session!.status).toBe('open');
    const drafts = await Order.find({ checkoutSessionId: sessionId }).lean();
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.every(d => d.status === 'awaiting_payment')).toBe(true);
  });
});
