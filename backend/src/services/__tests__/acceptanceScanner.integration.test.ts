import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import { scanAcceptanceDeadlines } from '../acceptanceScanner.js';
import { cancelPaymentIntent, retrievePaymentIntent } from '../stripeService.js';
import { connectIntegrationDb } from './integrationDb.js';

vi.mock('../stripeService.js', async () => {
  const actual = await vi.importActual<typeof import('../stripeService.js')>('../stripeService.js');
  return {
    ...actual,
    retrievePaymentIntent: vi.fn(),
    cancelPaymentIntent: vi.fn(),
  };
});

const buyer = new mongoose.Types.ObjectId();
const seller = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };
const now = new Date('2026-10-17T10:00:00Z');
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

async function makeProduct() {
  return Product.create({
    name: 'Item', description: 'd', category: 'Books', price: 20, stock: 8, soldCount: 2, image: 'i.png', sellerId: seller,
  });
}

async function makeOrder(product: { _id: mongoose.Types.ObjectId }, overrides: Record<string, unknown> = {}) {
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
    acceptBy: new Date(now.getTime() - HOUR),
    ...overrides,
  });
}

describe('acceptance deadline scanner (replica set, Stripe mocked)', () => {
  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), PaymentOperation.init()]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ id: 'pi', status: 'requires_capture' } as any);
    vi.mocked(cancelPaymentIntent).mockImplementation(async (id: string) => ({ id, status: 'canceled' }) as any);
  });

  afterEach(async () => {
    await Promise.all([Product.deleteMany({}), Order.deleteMany({}), PaymentOperation.deleteMany({})]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('cancels overdue authorized orders and leaves future, capture_pending and legacy orders alone', async () => {
    const product = await makeProduct();
    const overdue = [
      await makeOrder(product),
      await makeOrder(product),
      await makeOrder(product),
    ];
    const future = await makeOrder(product, { acceptBy: new Date(now.getTime() + HOUR) });
    const capturePending = await makeOrder(product, { paymentStatus: 'capture_pending' });
    const legacy = await makeOrder(product, { acceptBy: undefined, paymentFlowVersion: undefined });

    const result = await scanAcceptanceDeadlines(now);

    expect(result).toMatchObject({ cancelled: 3 });
    for (const order of overdue) {
      const stored = await Order.findById(order._id).lean();
      expect(stored!.status).toBe('cancelled');
      expect(stored!.cancelReason).toBe('seller_acceptance_timeout');
      expect(stored!.paymentStatus).toBe('released');
    }
    for (const order of [future, capturePending, legacy]) {
      const stored = await Order.findById(order._id).lean();
      expect(stored!.status).toBe('pending');
      expect(stored!.stockRestoredAt).toBeUndefined();
    }
    expect((await Order.findById(capturePending._id).lean())!.paymentStatus).toBe('capture_pending');
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(3);
    // 8 in stock + 3 orders x 2 items back
    expect((await Product.findById(product._id).lean())!.stock).toBe(14);
  });

  it('cancels overdue cash-on-delivery orders without calling Stripe', async () => {
    const product = await makeProduct();
    const cod = await makeOrder(product, {
      paymentStatus: 'not_required',
      paymentMethod: { type: 'cash-on-delivery' },
      paymentIntentId: undefined,
    });

    const result = await scanAcceptanceDeadlines(now);

    expect(result).toMatchObject({ cancelled: 1 });
    expect((await Order.findById(cod._id).lean())!.status).toBe('cancelled');
    expect(cancelPaymentIntent).not.toHaveBeenCalled();
  });

  it('cancels an order whose deadline is exactly now', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product, { acceptBy: now });

    const result = await scanAcceptanceDeadlines(now);

    expect(result).toMatchObject({ cancelled: 1 });
    expect((await Order.findById(order._id).lean())!.status).toBe('cancelled');
  });

  it('does not touch an order whose deadline is one millisecond away', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product, { acceptBy: new Date(now.getTime() + 1) });

    expect(await scanAcceptanceDeadlines(now)).toMatchObject({ cancelled: 0 });
    expect((await Order.findById(order._id).lean())!.status).toBe('pending');
  });

  it('catches up on orders that went overdue while the server was down for 3 days', async () => {
    const product = await makeProduct();
    const orders = [
      await makeOrder(product, { acceptBy: new Date(now.getTime() - 3 * DAY) }),
      await makeOrder(product, { acceptBy: new Date(now.getTime() - 3 * DAY - HOUR) }),
      await makeOrder(product, { acceptBy: new Date(now.getTime() - 2 * DAY) }),
    ];

    const result = await scanAcceptanceDeadlines(now);

    expect(result).toMatchObject({ cancelled: 3 });
    for (const order of orders) {
      expect((await Order.findById(order._id).lean())!.status).toBe('cancelled');
    }
    expect((await Product.findById(product._id).lean())!.stock).toBe(14);
  });

  it('restores stock and cancels the PaymentIntent once per order when scanned twice', async () => {
    const product = await makeProduct();
    await makeOrder(product);
    await makeOrder(product);

    const first = await scanAcceptanceDeadlines(now);
    const second = await scanAcceptanceDeadlines(now);

    expect(first).toMatchObject({ cancelled: 2 });
    expect(second).toEqual({ cancelled: 0, skipped: 0 });
    expect((await Product.findById(product._id).lean())!.stock).toBe(12);
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(2);
  });

  it('restores stock and cancels the PaymentIntent once per order when two scans run concurrently', async () => {
    const product = await makeProduct();
    await makeOrder(product);
    await makeOrder(product);
    await makeOrder(product);

    const [a, b] = await Promise.all([scanAcceptanceDeadlines(now), scanAcceptanceDeadlines(now)]);

    expect(a.cancelled + b.cancelled).toBe(3);
    expect((await Product.findById(product._id).lean())!.stock).toBe(14);
    expect((await Product.findById(product._id).lean())!.soldCount).toBe(-4);
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(3);
    expect(await PaymentOperation.countDocuments({ action: 'release' })).toBe(3);
  });

  it('leaves the order release_pending when the release cannot be confirmed, and does not cancel it twice', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product);
    vi.mocked(cancelPaymentIntent).mockRejectedValue(new Error('network'));
    vi.mocked(retrievePaymentIntent).mockRejectedValue(new Error('network'));

    const first = await scanAcceptanceDeadlines(now);
    const second = await scanAcceptanceDeadlines(now);

    expect(first).toMatchObject({ cancelled: 1 });
    expect(second).toMatchObject({ cancelled: 0 });
    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('cancelled');
    expect(stored!.paymentStatus).toBe('release_pending');
    expect((await Product.findById(product._id).lean())!.stock).toBe(10);
  });

  it('counts an order it could not cancel as skipped and keeps going', async () => {
    const product = await makeProduct();
    const good = await makeOrder(product);
    const bad = await makeOrder(product);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const original = Order.findOneAndUpdate.bind(Order);
    const spy = vi.spyOn(Order, 'findOneAndUpdate').mockImplementation(((filter: any, ...rest: any[]) => {
      if (filter?._id?.toString() === bad._id.toString()) return Promise.reject(new Error('db down'));
      return (original as any)(filter, ...rest);
    }) as any);

    const result = await scanAcceptanceDeadlines(now);

    spy.mockRestore();
    errorSpy.mockRestore();
    expect(result).toEqual({ cancelled: 1, skipped: 1 });
    expect((await Order.findById(good._id).lean())!.status).toBe('cancelled');
    expect((await Order.findById(bad._id).lean())!.status).toBe('pending');
  });
});
