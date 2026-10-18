import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Coupon from '../../models/Coupon.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import { cancelPendingOrder } from '../orderCancellation.js';
import { cancelOrderAsBuyer } from '../orderService.js';
import { acceptOrder } from '../orderAcceptance.js';
import { cancelPaymentIntent, retrievePaymentIntent, retrieveIntentWithCharge, capturePaymentIntent, StripeError } from '../stripeService.js';
import { connectIntegrationDb } from './integrationDb.js';

vi.mock('../stripeService.js', async () => {
  const actual = await vi.importActual<typeof import('../stripeService.js')>('../stripeService.js');
  return {
    ...actual,
    retrievePaymentIntent: vi.fn(),
    cancelPaymentIntent: vi.fn(),
    retrieveIntentWithCharge: vi.fn(),
    capturePaymentIntent: vi.fn(),
  };
});

const buyer = new mongoose.Types.ObjectId();
const seller = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };

async function makeProduct(extra: Record<string, unknown> = {}) {
  return Product.create({
    name: 'Item', description: 'd', category: 'Books', price: 20, stock: 8, soldCount: 2, image: 'i.png', sellerId: seller, ...extra,
  });
}

async function makeOrder(
  product: { _id: mongoose.Types.ObjectId },
  overrides: Record<string, unknown> = {},
  item: Record<string, unknown> = {},
) {
  return Order.create({
    userId: buyer,
    sellerId: seller,
    items: [{ product: product._id, productName: 'Item', productPrice: 20, productImage: 'i.png', quantity: 2, ...item }],
    shippingAddress: address,
    paymentMethod: { type: 'credit-card' },
    subtotal: 40, discount: 0, tax: 0, shipping: 0, total: 40,
    status: 'pending',
    paymentFlowVersion: 'manual_capture',
    paymentStatus: 'authorized',
    paymentIntentId: `pi_${new mongoose.Types.ObjectId().toString()}`,
    amountMinor: 4000,
    currency: 'USD',
    ...overrides,
  });
}

function stripeFault(statusCode?: number): StripeError {
  return new StripeError('Stripe failure', statusCode === undefined ? undefined : Object.assign(new Error('x'), { statusCode }));
}

describe('cancelPendingOrder (replica set, Stripe mocked)', () => {
  it('lets the owning buyer cancel and replay without releasing or restoring twice', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product);
    const first = await cancelOrderAsBuyer(order.id, buyer.toString(), 'Changed my mind');
    expect(first.status).toBe('cancelled');
    expect(first.paymentStatus).toBe('released');
    expect(first.cancelReason).toBe('Changed my mind');
    expect((await cancelOrderAsBuyer(order.id, buyer.toString())).status).toBe('cancelled');
    expect((await Product.findById(product._id))!.stock).toBe(10);
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
  });

  it('denies another buyer and refuses cancellation after acceptance claimed the order', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product, { paymentStatus: 'capture_pending' });
    await expect(cancelOrderAsBuyer(order.id, new mongoose.Types.ObjectId().toString()))
      .rejects.toMatchObject({ statusCode: 403 });
    await expect(cancelOrderAsBuyer(order.id, buyer.toString()))
      .rejects.toMatchObject({ statusCode: 409 });
    expect((await Product.findById(product._id))!.stock).toBe(8);
    expect(cancelPaymentIntent).not.toHaveBeenCalled();
  });

  it('cannot accept an order after buyer cancellation wins', async () => {
    vi.stubEnv('SELLER_SEES_MANUAL_CAPTURE', 'true');
    try {
      const order = await makeOrder(await makeProduct(), { acceptBy: new Date(Date.now() + 3600000) });
      await cancelOrderAsBuyer(order.id, buyer.toString());
      await expect(acceptOrder({ orderId: order.id, sellerId: seller.toString() }))
        .rejects.toMatchObject({ statusCode: 409 });
    } finally { vi.unstubAllEnvs(); }
  });

  it('lets only one of concurrent buyer cancellation and seller acceptance win', async () => {
    vi.stubEnv('SELLER_SEES_MANUAL_CAPTURE', 'true');
    try {
      const product = await makeProduct();
      const order = await makeOrder(product, { acceptBy: new Date(Date.now() + 3600000) });
      vi.mocked(retrieveIntentWithCharge).mockResolvedValue({ id: order.paymentIntentId, status: 'requires_capture' } as any);
      vi.mocked(capturePaymentIntent).mockResolvedValue({ id: order.paymentIntentId!, status: 'succeeded', amountReceived: 4000 });
      const results = await Promise.allSettled([
        cancelOrderAsBuyer(order.id, buyer.toString()),
        acceptOrder({ orderId: order.id, sellerId: seller.toString() }),
      ]);
      expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      const stored = await Order.findById(order.id);
      const restored = await Product.findById(product.id);
      if (stored!.status === 'cancelled') {
        expect(restored!.stock).toBe(10);
        expect(capturePaymentIntent).not.toHaveBeenCalled();
        expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
      } else {
        expect(stored!.status).toBe('preparing');
        expect(restored!.stock).toBe(8);
        expect(cancelPaymentIntent).not.toHaveBeenCalled();
        expect(capturePaymentIntent).toHaveBeenCalledTimes(1);
      }
    } finally { vi.unstubAllEnvs(); }
  });
  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), Coupon.init(), PaymentOperation.init()]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ id: 'pi', status: 'requires_capture' } as any);
    vi.mocked(cancelPaymentIntent).mockImplementation(async (id: string) => ({ id, status: 'canceled' }) as any);
  });

  afterEach(async () => {
    await Promise.all([Product.deleteMany({}), Order.deleteMany({}), Coupon.deleteMany({}), PaymentOperation.deleteMany({})]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('cancels an authorized card order, releases the hold and restores stock and coupon', async () => {
    const product = await makeProduct();
    await Coupon.create({ code: 'SAVE10', sellerId: seller, discountType: 'percentage', discountValue: 10, usageLimit: 5, usedCount: 1 });
    const order = await makeOrder(product, { couponCode: 'SAVE10' });

    const result = await cancelPendingOrder(order._id, 'seller_acceptance_timeout');

    expect(result).toEqual({ releaseStatus: 'released' });
    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('cancelled');
    expect(stored!.cancelReason).toBe('seller_acceptance_timeout');
    expect(stored!.paymentStatus).toBe('released');
    expect(stored!.stockRestoredAt).toBeDefined();
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
    expect(cancelPaymentIntent).toHaveBeenCalledWith(order.paymentIntentId, `order:${order._id.toString()}:release:1`);
    const restored = await Product.findById(product._id).lean();
    expect(restored!.stock).toBe(10);
    expect(restored!.soldCount).toBe(0);
    expect((await Coupon.findOne({ code: 'SAVE10' }).lean())!.usedCount).toBe(0);
    const operation = await PaymentOperation.findOne({ action: 'release' }).lean();
    expect(operation!.status).toBe('succeeded');
    expect(operation!.orderId!.toString()).toBe(order._id.toString());
  });

  it('never takes a coupon below zero', async () => {
    const product = await makeProduct();
    await Coupon.create({ code: 'ZERO', sellerId: seller, discountType: 'percentage', discountValue: 10, usedCount: 0 });
    const order = await makeOrder(product, { couponCode: 'ZERO' });

    await cancelPendingOrder(order._id, 'authorization_expired');

    expect((await Coupon.findOne({ code: 'ZERO' }).lean())!.usedCount).toBe(0);
  });

  it('cancels a cash-on-delivery order without calling Stripe', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product, {
      paymentStatus: 'not_required',
      paymentMethod: { type: 'cash-on-delivery' },
      paymentIntentId: undefined,
    });

    const result = await cancelPendingOrder(order._id, 'seller_acceptance_timeout');

    expect(result).toEqual({ releaseStatus: 'not_required' });
    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('cancelled');
    expect(stored!.paymentStatus).toBe('not_required');
    expect(cancelPaymentIntent).not.toHaveBeenCalled();
    expect((await Product.findById(product._id).lean())!.stock).toBe(10);
  });

  it('restores the variant stock, not the product stock, for a variant order', async () => {
    const product = await makeProduct({
      stock: 0,
      variants: [{ attributes: { Size: 'M' }, price: 20, stock: 3 }, { attributes: { Size: 'L' }, price: 20, stock: 4 }],
    });
    const variantId = String((product.variants![0] as unknown as { _id: mongoose.Types.ObjectId })._id);
    const order = await makeOrder(product, {}, { variantId });

    await cancelPendingOrder(order._id, 'seller_acceptance_timeout');

    const restored = await Product.findById(product._id).lean();
    expect(restored!.stock).toBe(0);
    expect(restored!.variants![0].stock).toBe(5);
    expect(restored!.variants![1].stock).toBe(4);
    expect(restored!.soldCount).toBe(0);
  });

  it('lets exactly one of two concurrent calls cancel the order and restore stock once', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product);

    const results = await Promise.all([
      cancelPendingOrder(order._id, 'seller_acceptance_timeout'),
      cancelPendingOrder(order._id, 'seller_acceptance_timeout'),
    ]);

    expect(results.filter(r => r !== null)).toHaveLength(1);
    expect(results.filter(r => r === null)).toHaveLength(1);
    expect((await Product.findById(product._id).lean())!.stock).toBe(10);
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
  });

  it('returns null and changes nothing for a capture_pending order', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product, { paymentStatus: 'capture_pending' });

    expect(await cancelPendingOrder(order._id, 'seller_acceptance_timeout')).toBeNull();

    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('pending');
    expect(stored!.paymentStatus).toBe('capture_pending');
    expect(stored!.stockRestoredAt).toBeUndefined();
    expect((await Product.findById(product._id).lean())!.stock).toBe(8);
    expect(cancelPaymentIntent).not.toHaveBeenCalled();
  });

  it('returns null and changes nothing for a preparing order', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product, { status: 'preparing', paymentStatus: 'captured' });

    expect(await cancelPendingOrder(order._id, 'seller_acceptance_timeout')).toBeNull();

    expect((await Order.findById(order._id).lean())!.status).toBe('preparing');
    expect((await Product.findById(product._id).lean())!.stock).toBe(8);
    expect(cancelPaymentIntent).not.toHaveBeenCalled();
  });

  it('returns null for an order that does not exist', async () => {
    expect(await cancelPendingOrder(new mongoose.Types.ObjectId(), 'authorization_expired')).toBeNull();
  });

  it('leaves the order release_pending when the release is ambiguous, with stock restored once', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product);
    vi.mocked(cancelPaymentIntent).mockRejectedValue(stripeFault(500));
    vi.mocked(retrievePaymentIntent).mockRejectedValue(stripeFault());

    const result = await cancelPendingOrder(order._id, 'seller_acceptance_timeout');

    expect(result).toEqual({ releaseStatus: 'pending' });
    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('cancelled');
    expect(stored!.paymentStatus).toBe('release_pending');
    expect((await Product.findById(product._id).lean())!.stock).toBe(10);
    const operation = await PaymentOperation.findOne({ action: 'release' }).lean();
    expect(operation!.status).not.toBe('succeeded');

    expect(await cancelPendingOrder(order._id, 'seller_acceptance_timeout')).toBeNull();
    expect((await Product.findById(product._id).lean())!.stock).toBe(10);
  });

  it('treats an intent Stripe already canceled as released', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product);
    vi.mocked(cancelPaymentIntent).mockRejectedValue(stripeFault(400));
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ id: 'pi', status: 'canceled' } as any);

    const result = await cancelPendingOrder(order._id, 'authorization_expired');

    expect(result).toEqual({ releaseStatus: 'released' });
    const stored = await Order.findById(order._id).lean();
    expect(stored!.paymentStatus).toBe('released');
    expect(stored!.cancelReason).toBe('authorization_expired');
  });

  it('cancels a card order that has no payment intent, flags it for support and does not call Stripe', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product, { paymentIntentId: undefined });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await cancelPendingOrder(order._id, 'seller_acceptance_timeout');

    expect(result).toEqual({ releaseStatus: 'pending' });
    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('cancelled');
    expect(stored!.paymentStatus).toBe('release_pending');
    expect((await Product.findById(product._id).lean())!.stock).toBe(10);
    expect(cancelPaymentIntent).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
