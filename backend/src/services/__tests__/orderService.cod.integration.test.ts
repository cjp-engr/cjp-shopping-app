import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import { createOrders } from '../orderService.js';
import { scanAcceptanceDeadlines } from '../acceptanceScanner.js';
import { cancelPaymentIntent, retrievePaymentIntent } from '../stripeService.js';
import { SELLER_ACCEPT_WINDOW_MS } from '../paymentOperationPolicy.js';
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
const cod = { type: 'cash-on-delivery' };

async function makeProduct(overrides: Record<string, unknown> = {}) {
  return Product.create({
    name: 'Item', description: 'd', category: 'Books', price: 20, stock: 8, soldCount: 2, image: 'i.png', sellerId: seller,
    ...overrides,
  });
}

function place(product: { _id: mongoose.Types.ObjectId }, paymentMethod: object = cod, extra: Record<string, unknown> = {}) {
  return createOrders({
    userId: buyer.toString(),
    items: [{ productId: product._id.toString(), quantity: 2 }],
    shippingAddress: address,
    paymentMethod,
    ...extra,
  });
}

describe('createOrders cash-on-delivery acceptance deadline (replica set, Stripe mocked)', () => {
  const originalFlow = process.env.CHECKOUT_FLOW;

  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), PaymentOperation.init()]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ id: 'pi', status: 'succeeded' } as any);
    vi.mocked(cancelPaymentIntent).mockImplementation(async (id: string) => ({ id, status: 'canceled' }) as any);
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (originalFlow === undefined) delete process.env.CHECKOUT_FLOW;
    else process.env.CHECKOUT_FLOW = originalFlow;
    await Promise.all([Product.deleteMany({}), Order.deleteMany({}), PaymentOperation.deleteMany({})]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('under manual_capture gives a COD order not_required, placedAt, a 24h acceptBy and its sellerId, and keeps the legacy flow version', async () => {
    process.env.CHECKOUT_FLOW = 'manual_capture';
    const product = await makeProduct();
    const before = Date.now();

    const [order] = await place(product);
    const after = Date.now();

    const stored = await Order.findById(order._id).lean();
    expect(stored!.paymentStatus).toBe('not_required');
    expect(stored!.paymentFlowVersion).toBe('legacy');
    expect(stored!.sellerId!.toString()).toBe(seller.toString());
    expect(stored!.placedAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(stored!.placedAt!.getTime()).toBeLessThanOrEqual(after);
    expect(stored!.acceptBy!.getTime() - stored!.placedAt!.getTime()).toBe(SELLER_ACCEPT_WINDOW_MS);
    expect(stored!.status).toBe('pending');
  });

  it('uses one timestamp for every order created by the same call', async () => {
    process.env.CHECKOUT_FLOW = 'manual_capture';
    const otherSeller = new mongoose.Types.ObjectId();
    const first = await makeProduct();
    const second = await makeProduct({ sellerId: otherSeller });

    const orders = await createOrders({
      userId: buyer.toString(),
      items: [
        { productId: first._id.toString(), quantity: 1 },
        { productId: second._id.toString(), quantity: 1 },
      ],
      shippingAddress: address,
      paymentMethod: cod,
    });

    expect(orders).toHaveLength(2);
    const stored = await Order.find({ _id: { $in: orders.map(o => o._id) } }).lean();
    expect(new Set(stored.map(o => o.placedAt!.getTime())).size).toBe(1);
    expect(new Set(stored.map(o => o.acceptBy!.getTime())).size).toBe(1);
    expect(new Set(stored.map(o => o.sellerId!.toString()))).toEqual(new Set([seller.toString(), otherSeller.toString()]));
  });

  it('under the default legacy flow sets none of the acceptance fields', async () => {
    delete process.env.CHECKOUT_FLOW;
    const product = await makeProduct();

    const [order] = await place(product);

    const stored = await Order.findById(order._id).lean();
    expect(stored!.paymentStatus).toBeUndefined();
    expect(stored!.placedAt).toBeUndefined();
    expect(stored!.acceptBy).toBeUndefined();
    expect(stored!.sellerId).toBeUndefined();
    expect(stored!.paymentFlowVersion).toBe('legacy');
  });

  it('under an explicit legacy flow sets none of the acceptance fields', async () => {
    process.env.CHECKOUT_FLOW = 'legacy';
    const product = await makeProduct();

    const [order] = await place(product);

    const stored = await Order.findById(order._id).lean();
    expect(stored!.paymentStatus).toBeUndefined();
    expect(stored!.placedAt).toBeUndefined();
    expect(stored!.acceptBy).toBeUndefined();
    expect(stored!.sellerId).toBeUndefined();
  });

  it('leaves a card order untouched even under manual_capture', async () => {
    process.env.CHECKOUT_FLOW = 'manual_capture';
    const product = await makeProduct();

    // Saved/mock card path: no PaymentIntent is verified.
    const [order] = await place(product, { type: 'credit-card' });

    const stored = await Order.findById(order._id).lean();
    expect(stored!.paymentStatus).toBeUndefined();
    expect(stored!.placedAt).toBeUndefined();
    expect(stored!.acceptBy).toBeUndefined();
    expect(stored!.sellerId).toBeUndefined();
    expect(stored!.paymentFlowVersion).toBe('legacy');
  });

  it('omits sellerId when the product has no valid seller id but still sets the deadline', async () => {
    process.env.CHECKOUT_FLOW = 'manual_capture';
    const product = await makeProduct({ sellerId: undefined });

    const [order] = await place(product);

    const stored = await Order.findById(order._id).lean();
    expect(stored!.sellerId).toBeUndefined();
    expect(stored!.paymentStatus).toBe('not_required');
    expect(stored!.acceptBy).toBeInstanceOf(Date);
  });

  it('is cancelled by the deadline scanner once acceptBy has passed, restoring stock without Stripe', async () => {
    process.env.CHECKOUT_FLOW = 'manual_capture';
    const product = await makeProduct();
    const [order] = await place(product);
    expect((await Product.findById(product._id).lean())!.stock).toBe(6);
    await Order.updateOne({ _id: order._id }, { $set: { acceptBy: new Date(Date.now() - 60_000) } });

    const result = await scanAcceptanceDeadlines(new Date());

    expect(result).toMatchObject({ cancelled: 1 });
    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('cancelled');
    expect(stored!.cancelReason).toBe('seller_acceptance_timeout');
    expect((await Product.findById(product._id).lean())!.stock).toBe(8);
    expect(cancelPaymentIntent).not.toHaveBeenCalled();
  });
});
