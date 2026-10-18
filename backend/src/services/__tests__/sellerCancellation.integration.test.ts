import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import '../../models/User.js';
import Order from '../../models/Order.js';
import Coupon from '../../models/Coupon.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import { cancelPendingOrder } from '../orderCancellation.js';
import { cancelOrderAsBuyer } from '../orderService.js';
import { acceptOrder } from '../orderAcceptance.js';
import { scanAcceptanceDeadlines } from '../acceptanceScanner.js';
import { cancelOrderAsSeller } from '../sellerCancellation.js';
import { getSellerOrders } from '../sellerService.js';
import { processDueOperations } from '../paymentOperationWorker.js';
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
    retrievePaymentIntent: vi.fn(),
    cancelPaymentIntent: vi.fn(),
    retrieveIntentWithCharge: vi.fn(),
    capturePaymentIntent: vi.fn(),
  };
});

const buyer = new mongoose.Types.ObjectId();
const seller = new mongoose.Types.ObjectId();
const otherSeller = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };

async function makeProduct(extra: Record<string, unknown> = {}) {
  return Product.create({
    name: 'Item', description: 'd', category: 'Books', price: 20, stock: 8, soldCount: 2, image: 'i.png', sellerId: seller, ...extra,
  });
}

/** A card order in the manual-capture shape; `overrides` can turn it into a COD order. */
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
    ...overrides,
  });
}

/** A COD order as `createOrders` now makes it: legacy flow version, not_required, deadline, sellerId. */
const idOf = (o: unknown): string => String((o as { _id: unknown })._id);

function makeCodOrder(product: { _id: mongoose.Types.ObjectId }, overrides: Record<string, unknown> = {}) {
  return makeOrder(product, {
    paymentMethod: { type: 'cash-on-delivery' },
    paymentFlowVersion: 'legacy',
    paymentStatus: 'not_required',
    paymentIntentId: undefined,
    amountMinor: undefined,
    currency: undefined,
    placedAt: new Date(),
    acceptBy: new Date(Date.now() + 3_600_000),
    ...overrides,
  });
}

describe('actor-scoped cancellation (replica set, Stripe mocked)', () => {
  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), Coupon.init(), PaymentOperation.init()]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ id: 'pi', status: 'canceled' } as any);
    vi.mocked(cancelPaymentIntent).mockImplementation(async (id: string) => ({ id, status: 'canceled' }) as any);
    vi.stubEnv('SELLER_SEES_MANUAL_CAPTURE', 'true');
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await Promise.all([Product.deleteMany({}), Order.deleteMany({}), Coupon.deleteMany({}), PaymentOperation.deleteMany({})]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('lets the persisted seller claim an order after its product was deleted', async () => {
    const gone = await makeProduct();
    const order = await makeOrder(gone);
    await Product.deleteOne({ _id: gone._id });

    const result = await cancelPendingOrder(order._id, 'seller_cancelled', new Date(), {
      actor: { role: 'seller', id: seller.toString() },
      cancelReason: 'Out of stock',
    });

    expect(result).not.toBeNull();
    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('cancelled');
    expect(stored!.cancelReason).toBe('Out of stock');
    expect(stored!.cancelledByRole).toBe('seller');
    expect(stored!.cancelledById!.toString()).toBe(seller.toString());
    expect(stored!.cancelledAt).toBeInstanceOf(Date);
  });

  it('does not let a foreign seller claim the order', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product);

    const result = await cancelPendingOrder(order._id, 'seller_cancelled', new Date(), {
      actor: { role: 'seller', id: otherSeller.toString() },
      cancelReason: 'x',
    });

    expect(result).toBeNull();
    const stored = await Order.findById(order._id).lean();
    expect(stored!.status).toBe('pending');
    expect(stored!.cancelledByRole).toBeUndefined();
    expect((await Product.findById(product._id).lean())!.stock).toBe(8);
    expect(cancelPaymentIntent).not.toHaveBeenCalled();
  });

  it('does not let a seller claim an order that has no persisted sellerId, even if they own its product', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product, { sellerId: undefined });

    const result = await cancelPendingOrder(order._id, 'seller_cancelled', new Date(), {
      actor: { role: 'seller', id: seller.toString() },
      cancelReason: 'x',
    });

    expect(result).toBeNull();
    expect((await Order.findById(order._id).lean())!.status).toBe('pending');
  });

  it('keeps the first actor and restores stock once when a second cancellation follows', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product);

    const first = await cancelPendingOrder(order._id, 'seller_cancelled', new Date(), {
      actor: { role: 'seller', id: seller.toString() },
      cancelReason: 'Out of stock',
    });
    const second = await cancelPendingOrder(order._id, 'buyer_cancelled', new Date(), {
      actor: { role: 'buyer', id: buyer.toString() },
      cancelReason: 'Changed my mind',
    });
    const third = await cancelPendingOrder(order._id, 'seller_acceptance_timeout');

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(third).toBeNull();
    const stored = await Order.findById(order._id).lean();
    expect(stored!.cancelledByRole).toBe('seller');
    expect(stored!.cancelReason).toBe('Out of stock');
    const restored = await Product.findById(product._id).lean();
    expect(restored!.stock).toBe(10);
    expect(restored!.soldCount).toBe(0);
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
  });

  it('records the system role, without an id, for expiry cancellations', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product);

    await cancelPendingOrder(order._id, 'seller_acceptance_timeout');

    const stored = await Order.findById(order._id).lean();
    expect(stored!.cancelledByRole).toBe('system');
    expect(stored!.cancelledById).toBeUndefined();
    expect(stored!.cancelledAt).toBeInstanceOf(Date);
    expect(stored!.cancelReason).toBe('seller_acceptance_timeout');
  });

  it('records the buyer role and id when the buyer cancels a card order', async () => {
    const product = await makeProduct();
    const order = await makeOrder(product);

    await cancelOrderAsBuyer(order.id, buyer.toString(), 'Changed my mind');

    const stored = await Order.findById(order._id).lean();
    expect(stored!.cancelledByRole).toBe('buyer');
    expect(stored!.cancelledById!.toString()).toBe(buyer.toString());
    expect(stored!.cancelReason).toBe('Changed my mind');
  });

  describe('cash on delivery', () => {
    it('cancels a COD order through the atomic claim: audit, soldCount and coupon restored, no Stripe', async () => {
      const product = await makeProduct();
      await Coupon.create({ code: 'SAVE10', sellerId: seller, discountType: 'percentage', discountValue: 10, usageLimit: 5, usedCount: 1 });
      const order = await makeCodOrder(product, { couponCode: 'SAVE10' });

      const cancelled = await cancelOrderAsBuyer(order.id, buyer.toString(), 'Changed my mind');

      expect(cancelled.status).toBe('cancelled');
      const stored = await Order.findById(order._id).lean();
      expect(stored!.stockRestoredAt).toBeInstanceOf(Date);
      expect(stored!.cancelledByRole).toBe('buyer');
      const restored = await Product.findById(product._id).lean();
      expect(restored!.stock).toBe(10);
      expect(restored!.soldCount).toBe(0);
      expect((await Coupon.findOne({ code: 'SAVE10' }).lean())!.usedCount).toBe(0);
      expect(cancelPaymentIntent).not.toHaveBeenCalled();
    });

    it('lets only one of a buyer cancellation and a seller acceptance win', async () => {
      const product = await makeProduct();
      const order = await makeCodOrder(product);

      const results = await Promise.allSettled([
        cancelOrderAsBuyer(order.id, buyer.toString()),
        acceptOrder({ orderId: order.id, sellerId: seller.toString() }),
      ]);

      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      const stored = await Order.findById(order._id).lean();
      const stock = (await Product.findById(product._id).lean())!.stock;
      if (stored!.status === 'cancelled') {
        expect(stock).toBe(10);
      } else {
        expect(stored!.status).toBe('preparing');
        expect(stock).toBe(8);
      }
    });

    it('restores stock once when a buyer cancellation races the deadline scanner', async () => {
      const product = await makeProduct();
      const order = await makeCodOrder(product, { acceptBy: new Date(Date.now() - 60_000) });

      await Promise.allSettled([
        cancelOrderAsBuyer(order.id, buyer.toString()),
        scanAcceptanceDeadlines(new Date()),
      ]);

      expect((await Order.findById(order._id).lean())!.status).toBe('cancelled');
      const restored = await Product.findById(product._id).lean();
      expect(restored!.stock).toBe(10);
      expect(restored!.soldCount).toBe(0);
    });
  });

  describe('cancelOrderAsSeller', () => {
    const asSeller = (orderId: string, reason = 'Out of stock', id = seller.toString()) =>
      cancelOrderAsSeller(orderId, id, reason);

    it('releases the hold of an authorized card order and reports a completed release', async () => {
      const product = await makeProduct();
      const order = await makeOrder(product);

      const result = await asSeller(order.id, '  Out of stock  ');

      expect(result.order.status).toBe('cancelled');
      expect(result.order.paymentStatus).toBe('released');
      expect(result.paymentOperation).toEqual({ status: 'completed' });
      expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
      expect(cancelPaymentIntent).toHaveBeenCalledWith(order.paymentIntentId, `order:${order.id}:release:1`);
      const stored = await Order.findById(order._id).lean();
      expect(stored!.cancelReason).toBe('Out of stock');
      expect(stored!.cancelledByRole).toBe('seller');
      expect(stored!.cancelledById!.toString()).toBe(seller.toString());
      const restored = await Product.findById(product._id).lean();
      expect(restored!.stock).toBe(10);
      expect(restored!.soldCount).toBe(0);
    });

    it('cancels a pending COD order without any Stripe call and without a paymentOperation', async () => {
      const product = await makeProduct();
      const order = await makeCodOrder(product);

      const result = await asSeller(order.id);

      expect(result.order.status).toBe('cancelled');
      expect(result.paymentOperation).toBeUndefined();
      expect(cancelPaymentIntent).not.toHaveBeenCalled();
      expect(retrievePaymentIntent).not.toHaveBeenCalled();
      expect((await Product.findById(product._id).lean())!.stock).toBe(10);
    });

    it.each([
      ['empty', ''],
      ['blank after trimming', '   \n '],
      ['over 1000 characters', 'x'.repeat(1001)],
      ['not text', 42 as unknown as string],
      ['missing', undefined as unknown as string],
    ])('rejects a %s reason without changing the order', async (_label, reason) => {
      const order = await makeOrder(await makeProduct());

      await expect(cancelOrderAsSeller(order.id, seller.toString(), reason))
        .rejects.toMatchObject({ statusCode: 400, code: 'invalid_cancel_reason' });
      expect((await Order.findById(order._id).lean())!.status).toBe('pending');
    });

    it('accepts a reason of exactly 1000 characters', async () => {
      const order = await makeOrder(await makeProduct());

      const result = await asSeller(order.id, 'y'.repeat(1000));

      expect(result.order.cancelReason).toHaveLength(1000);
    });

    it('answers 403 to another seller and leaves the order untouched', async () => {
      const product = await makeProduct();
      const order = await makeOrder(product);

      await expect(asSeller(order.id, 'x', otherSeller.toString()))
        .rejects.toMatchObject({ statusCode: 403, code: 'not_order_seller' });
      expect((await Order.findById(order._id).lean())!.status).toBe('pending');
      expect(cancelPaymentIntent).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown order and for a draft', async () => {
      const draft = await makeOrder(await makeProduct(), { status: 'awaiting_payment', paymentStatus: 'awaiting_authorization' });

      await expect(asSeller(new mongoose.Types.ObjectId().toString()))
        .rejects.toMatchObject({ statusCode: 404, code: 'order_not_found' });
      await expect(asSeller(draft.id)).rejects.toMatchObject({ statusCode: 404, code: 'order_not_found' });
    });

    it('refuses an order whose capture is in progress and changes nothing', async () => {
      const product = await makeProduct();
      const order = await makeOrder(product, { paymentStatus: 'capture_pending' });

      await expect(asSeller(order.id)).rejects.toMatchObject({ statusCode: 409, code: 'cancellation_conflict' });
      const stored = await Order.findById(order._id).lean();
      expect(stored!.status).toBe('pending');
      expect(stored!.paymentStatus).toBe('capture_pending');
      expect((await Product.findById(product._id).lean())!.stock).toBe(8);
      expect(cancelPaymentIntent).not.toHaveBeenCalled();
    });

    it.each(['preparing', 'processing', 'shipped', 'delivered'])('refuses an order that is already %s', async status => {
      const order = await makeOrder(await makeProduct(), { status, paymentStatus: 'captured' });

      await expect(asSeller(order.id)).rejects.toMatchObject({ statusCode: 409, code: 'cancellation_conflict' });
      expect((await Order.findById(order._id).lean())!.status).toBe(status);
    });

    it('rejects a legacy-shaped card order as unavailable with no change and no Stripe call', async () => {
      const product = await makeProduct();
      const order = await makeOrder(product, { paymentFlowVersion: 'legacy', paymentStatus: undefined, amountMinor: undefined });

      await expect(asSeller(order.id)).rejects.toMatchObject({ statusCode: 409, code: 'cancellation_unavailable' });
      expect((await Order.findById(order._id).lean())!.status).toBe('pending');
      expect((await Product.findById(product._id).lean())!.stock).toBe(8);
      expect(cancelPaymentIntent).not.toHaveBeenCalled();
      expect(retrievePaymentIntent).not.toHaveBeenCalled();
    });

    it('rejects an order without a persisted sellerId as unavailable', async () => {
      const product = await makeProduct();
      const order = await makeCodOrder(product, { sellerId: undefined });

      await expect(asSeller(order.id)).rejects.toMatchObject({ statusCode: 409, code: 'cancellation_unavailable' });
      expect((await Order.findById(order._id).lean())!.status).toBe('pending');
    });

    it('returns the stored order on a retry without a second release, restoration or actor change', async () => {
      const product = await makeProduct();
      const order = await makeOrder(product);

      const first = await asSeller(order.id, 'Out of stock');
      const retry = await asSeller(order.id, 'A different reason');

      expect(retry.order.status).toBe('cancelled');
      expect(retry.order.cancelReason).toBe('Out of stock');
      expect(retry.paymentOperation).toEqual(first.paymentOperation);
      expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
      expect((await Product.findById(product._id).lean())!.stock).toBe(10);
    });

    it('rejects an invalid reason before it would return a stored result', async () => {
      const order = await makeOrder(await makeProduct());
      await asSeller(order.id);

      await expect(asSeller(order.id, '')).rejects.toMatchObject({ code: 'invalid_cancel_reason' });
    });

    it('still lets a foreign seller learn nothing from an already cancelled order', async () => {
      const order = await makeOrder(await makeProduct());
      await asSeller(order.id);

      await expect(asSeller(order.id, 'x', otherSeller.toString()))
        .rejects.toMatchObject({ statusCode: 403, code: 'not_order_seller' });
    });

    it('cancels the order but reports a pending release when Stripe times out, and the worker finishes with the original key', async () => {
      const product = await makeProduct();
      const order = await makeOrder(product);
      vi.mocked(cancelPaymentIntent).mockRejectedValue(new StripeError('timeout'));
      vi.mocked(retrievePaymentIntent).mockRejectedValue(new StripeError('timeout'));

      const result = await asSeller(order.id);

      expect(result.order.status).toBe('cancelled');
      expect(result.order.paymentStatus).toBe('release_pending');
      expect(result.paymentOperation).toEqual({ status: 'pending' });
      expect((await Product.findById(product._id).lean())!.stock).toBe(10);

      vi.mocked(cancelPaymentIntent).mockClear();
      vi.mocked(cancelPaymentIntent).mockImplementation(async (id: string) => ({ id, status: 'canceled' }) as any);
      await processDueOperations('worker-1', new Date(Date.now() + 3_600_000));

      expect(cancelPaymentIntent).toHaveBeenCalledWith(order.paymentIntentId, `order:${order.id}:release:1`);
      expect((await Order.findById(order._id).lean())!.paymentStatus).toBe('released');
      expect((await Product.findById(product._id).lean())!.stock).toBe(10);
    });

    it('reports needs_review when the release is in support review', async () => {
      const order = await makeOrder(await makeProduct());
      vi.mocked(cancelPaymentIntent).mockRejectedValue(new StripeError('timeout'));
      vi.mocked(retrievePaymentIntent).mockRejectedValue(new StripeError('timeout'));
      await asSeller(order.id);
      await PaymentOperation.updateOne({ idempotencyKey: `order:${order.id}:release:1` }, { $set: { status: 'needs_support' } });

      const retry = await asSeller(order.id);

      expect(retry.paymentOperation).toEqual({ status: 'needs_review' });
    });

    it('lets only one of a seller cancellation and a seller acceptance win, and never captures for the cancel winner', async () => {
      const product = await makeProduct();
      const order = await makeOrder(product, { acceptBy: new Date(Date.now() + 3_600_000) });
      vi.mocked(retrieveIntentWithCharge).mockResolvedValue({ id: order.paymentIntentId, status: 'requires_capture' } as any);
      vi.mocked(capturePaymentIntent).mockResolvedValue({ id: order.paymentIntentId!, status: 'succeeded', amountReceived: 4000 });

      await Promise.allSettled([
        asSeller(order.id),
        acceptOrder({ orderId: order.id, sellerId: seller.toString() }),
      ]);

      const stored = await Order.findById(order._id).lean();
      const stock = (await Product.findById(product._id).lean())!.stock;
      if (stored!.status === 'cancelled') {
        expect(stored!.cancelledByRole).toBe('seller');
        expect(stock).toBe(10);
        expect(capturePaymentIntent).not.toHaveBeenCalled();
        expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
      } else {
        expect(stored!.status).toBe('preparing');
        expect(stock).toBe(8);
        expect(cancelPaymentIntent).not.toHaveBeenCalled();
        expect(capturePaymentIntent).toHaveBeenCalledTimes(1);
      }
    });

    it.each([
      ['card', (p: { _id: mongoose.Types.ObjectId }) => makeOrder(p)],
      ['COD', (p: { _id: mongoose.Types.ObjectId }) => makeCodOrder(p)],
    ])('restores stock once and releases at most once when a seller and a buyer cancel a %s order together', async (_label, make) => {
      const product = await makeProduct();
      const order = await make(product);

      await Promise.allSettled([
        asSeller(order.id),
        cancelOrderAsBuyer(order.id, buyer.toString(), 'Changed my mind'),
      ]);

      const stored = await Order.findById(order._id).lean();
      expect(stored!.status).toBe('cancelled');
      expect(['seller', 'buyer']).toContain(stored!.cancelledByRole);
      const restored = await Product.findById(product._id).lean();
      expect(restored!.stock).toBe(10);
      expect(restored!.soldCount).toBe(0);
      expect(vi.mocked(cancelPaymentIntent).mock.calls.length).toBeLessThanOrEqual(1);
    });

    it('restores stock once when a seller cancellation races the deadline scanner', async () => {
      const product = await makeProduct();
      const order = await makeCodOrder(product, { acceptBy: new Date(Date.now() - 60_000) });

      await Promise.allSettled([asSeller(order.id), scanAcceptanceDeadlines(new Date())]);

      expect((await Order.findById(order._id).lean())!.status).toBe('cancelled');
      expect((await Product.findById(product._id).lean())!.stock).toBe(10);
    });
  });

  describe('seller order list', () => {
    it('still lists an order whose product was deleted, with its snapshot items and the cancel capability', async () => {
      const gone = await makeProduct();
      const order = await makeCodOrder(gone);
      await Product.deleteOne({ _id: gone._id });

      const orders = await getSellerOrders(seller.toString());

      const listed = orders.find(o => idOf(o) === order.id);
      expect(listed).toBeDefined();
      expect((listed!.items as unknown[]).length).toBe(1);
      expect(listed!.canSellerCancelPending).toBe(true);
    });

    it('derives canSellerCancelPending from status, sellerId and payment state', async () => {
      const product = await makeProduct();
      const cases: Array<[string, Record<string, unknown>, boolean]> = [
        ['authorized card', {}, true],
        ['pending COD', { paymentMethod: { type: 'cash-on-delivery' }, paymentFlowVersion: 'legacy', paymentStatus: 'not_required', paymentIntentId: undefined }, true],
        ['capture in progress', { paymentStatus: 'capture_pending' }, false],
        ['preparing', { status: 'preparing', paymentStatus: 'captured' }, false],
        ['cancelled', { status: 'cancelled', paymentStatus: 'released' }, false],
        ['legacy-shaped card', { paymentFlowVersion: 'legacy', paymentStatus: undefined }, false],
        ['no sellerId (matched by product)', { sellerId: undefined }, false],
      ];
      const made = await Promise.all(cases.map(([, overrides]) => makeOrder(product, overrides)));

      const orders = await getSellerOrders(seller.toString());

      cases.forEach(([label, , expected], index) => {
        const listed = orders.find(o => idOf(o) === made[index].id);
        expect(listed, label).toBeDefined();
        expect(listed!.canSellerCancelPending, label).toBe(expected);
      });
    });

    it("does not list another seller's orders", async () => {
      const product = await makeProduct();
      await makeOrder(product, { sellerId: otherSeller });

      expect(await getSellerOrders(seller.toString())).toHaveLength(0);
    });
  });
});
