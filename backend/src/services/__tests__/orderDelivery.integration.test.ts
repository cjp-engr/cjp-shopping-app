import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import { confirmOrderReceived } from '../orderService.js';
import { updateSellerOrderStatus } from '../sellerService.js';
import { autoDeliverShippedOrders, markOrderDelivered, REFUND_WINDOW_MS } from '../orderDelivery.js';
import { connectIntegrationDb } from './integrationDb.js';

const buyer = new mongoose.Types.ObjectId();
const seller = new mongoose.Types.ObjectId();
const stranger = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };
const HOUR = 60 * 60 * 1000;
const shippedAt = new Date('2026-10-10T08:00:00Z');
const deliveredAt = new Date('2026-10-12T09:30:00Z');

async function makeOrder(overrides: Record<string, unknown> = {}) {
  return Order.create({
    userId: buyer,
    sellerId: seller,
    items: [{ product: new mongoose.Types.ObjectId(), productName: 'Item', productPrice: 20, productImage: 'i.png', quantity: 1 }],
    shippingAddress: address,
    paymentMethod: { type: 'credit-card' },
    subtotal: 20, discount: 0, tax: 0, shipping: 0, total: 20,
    status: 'shipped',
    shippedAt,
    ...overrides,
  });
}

describe('order delivery timestamps (replica set)', () => {
  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Order.init(), Product.init()]);
  });

  afterEach(async () => {
    await Order.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('keeps the refund window at exactly seven days', () => {
    expect(REFUND_WINDOW_MS).toBe(604_800_000);
  });

  describe('markOrderDelivered', () => {
    it('records delivery for the buyer who confirms receipt, with a deadline exactly 168 hours later', async () => {
      const order = await makeOrder();

      const delivered = await markOrderDelivered(order.id, 'shipped', deliveredAt, { role: 'buyer', id: buyer.toString() });

      expect(delivered!.status).toBe('delivered');
      expect(delivered!.deliveredAt).toEqual(deliveredAt);
      expect(delivered!.refundRequestDeadlineAt!.getTime() - deliveredAt.getTime()).toBe(604_800_000);
      const stored = await Order.findById(order._id).lean();
      expect(stored!.deliveredAt).toEqual(deliveredAt);
      expect(stored!.refundRequestDeadlineAt).toEqual(new Date(deliveredAt.getTime() + 604_800_000));
    });

    it('records delivery for the seller who owns the order', async () => {
      const order = await makeOrder();
      const delivered = await markOrderDelivered(order.id, 'shipped', deliveredAt, { role: 'seller', id: seller.toString() });
      expect(delivered!.status).toBe('delivered');
      expect(delivered!.deliveredAt).toEqual(deliveredAt);
    });

    it('accepts a seller for an older order with no persisted sellerId (the caller already checked product ownership)', async () => {
      const order = await makeOrder({ sellerId: undefined });
      const delivered = await markOrderDelivered(order.id, 'shipped', deliveredAt, { role: 'seller', id: seller.toString() });
      expect(delivered!.status).toBe('delivered');
    });

    it('records delivery for the system actor without an owner', async () => {
      const order = await makeOrder();
      const delivered = await markOrderDelivered(order.id, 'shipped', deliveredAt, { role: 'system' });
      expect(delivered!.status).toBe('delivered');
    });

    it('refuses a foreign buyer and a foreign seller and leaves the order untouched', async () => {
      const order = await makeOrder();

      expect(await markOrderDelivered(order.id, 'shipped', deliveredAt, { role: 'buyer', id: stranger.toString() })).toBeNull();
      expect(await markOrderDelivered(order.id, 'shipped', deliveredAt, { role: 'seller', id: stranger.toString() })).toBeNull();

      const stored = await Order.findById(order._id).lean();
      expect(stored!.status).toBe('shipped');
      expect(stored!.deliveredAt).toBeUndefined();
      expect(stored!.refundRequestDeadlineAt).toBeUndefined();
    });

    it.each(['pending', 'preparing', 'processing', 'cancelled', 'delivered'])(
      'refuses an order that is %s, not shipped',
      async (status) => {
        const order = await makeOrder({ status });
        expect(await markOrderDelivered(order.id, 'shipped', deliveredAt, { role: 'system' })).toBeNull();
        const stored = await Order.findById(order._id).lean();
        expect(stored!.status).toBe(status);
        expect(stored!.deliveredAt).toBeUndefined();
      },
    );

    it('never moves the deadline on a duplicate delivery', async () => {
      const order = await makeOrder();
      await markOrderDelivered(order.id, 'shipped', deliveredAt, { role: 'buyer', id: buyer.toString() });

      const later = new Date(deliveredAt.getTime() + 3 * 24 * HOUR);
      expect(await markOrderDelivered(order.id, 'shipped', later, { role: 'seller', id: seller.toString() })).toBeNull();

      const stored = await Order.findById(order._id).lean();
      expect(stored!.deliveredAt).toEqual(deliveredAt);
      expect(stored!.refundRequestDeadlineAt).toEqual(new Date(deliveredAt.getTime() + 604_800_000));
    });

    it('lets exactly one of two simultaneous deliveries win', async () => {
      const order = await makeOrder();
      const results = await Promise.all([
        markOrderDelivered(order.id, 'shipped', deliveredAt, { role: 'buyer', id: buyer.toString() }),
        markOrderDelivered(order.id, 'shipped', new Date(deliveredAt.getTime() + HOUR), { role: 'seller', id: seller.toString() }),
      ]);
      expect(results.filter(Boolean)).toHaveLength(1);
      const stored = await Order.findById(order._id).lean();
      expect(stored!.deliveredAt!.getTime()).toBe(results.find(Boolean)!.deliveredAt!.getTime());
    });

    it('returns null for an unknown or malformed order id', async () => {
      expect(await markOrderDelivered(new mongoose.Types.ObjectId().toString(), 'shipped', deliveredAt, { role: 'system' })).toBeNull();
      expect(await markOrderDelivered('not-an-id', 'shipped', deliveredAt, { role: 'system' })).toBeNull();
    });
  });

  describe('the buyer and seller routes record delivery', () => {
    it('confirmOrderReceived stores the delivery time and deadline, and a repeat does not change them', async () => {
      const order = await makeOrder();
      const delivered = await confirmOrderReceived(order.id, buyer.toString());
      expect(delivered.status).toBe('delivered');
      expect(delivered.refundRequestDeadlineAt!.getTime() - delivered.deliveredAt!.getTime()).toBe(604_800_000);

      await expect(confirmOrderReceived(order.id, buyer.toString())).rejects.toMatchObject({ statusCode: 400 });
      const stored = await Order.findById(order._id).lean();
      expect(stored!.deliveredAt).toEqual(delivered.deliveredAt);
    });

    it('confirmOrderReceived still refuses a foreign buyer', async () => {
      const order = await makeOrder();
      await expect(confirmOrderReceived(order.id, stranger.toString())).rejects.toMatchObject({ statusCode: 403 });
      expect((await Order.findById(order._id).lean())!.status).toBe('shipped');
    });

    it('a seller delivering a shipped order records the same fields', async () => {
      const product = await Product.create({ name: 'Item', description: 'd', category: 'Books', price: 20, stock: 5, image: 'i.png', sellerId: seller });
      const order = await makeOrder({
        items: [{ product: product._id, productName: 'Item', productPrice: 20, productImage: 'i.png', quantity: 1 }],
      });

      const result = await updateSellerOrderStatus(order.id, seller.toString(), 'delivered');

      expect(result.outcome).toBe('completed');
      expect(result.order.status).toBe('delivered');
      const stored = await Order.findById(order._id).lean();
      expect(stored!.deliveredAt).toBeInstanceOf(Date);
      expect(stored!.refundRequestDeadlineAt!.getTime() - stored!.deliveredAt!.getTime()).toBe(604_800_000);
      await Product.deleteMany({});
    });

    it('a seller delivering after the buyer already confirmed receipt is refused and the first deadline stays', async () => {
      const product = await Product.create({ name: 'Item', description: 'd', category: 'Books', price: 20, stock: 5, image: 'i.png', sellerId: seller });
      const order = await makeOrder({
        items: [{ product: product._id, productName: 'Item', productPrice: 20, productImage: 'i.png', quantity: 1 }],
      });
      const first = await confirmOrderReceived(order.id, buyer.toString());

      await expect(updateSellerOrderStatus(order.id, seller.toString(), 'delivered')).rejects.toMatchObject({ statusCode: 400 });
      expect((await Order.findById(order._id).lean())!.deliveredAt).toEqual(first.deliveredAt);
      await Product.deleteMany({});
    });
  });

  describe('autoDeliverShippedOrders', () => {
    it('uses shippedAt + 48h as the delivery time, not the time the job ran, after downtime', async () => {
      const order = await makeOrder();
      const tenDaysLater = new Date(shippedAt.getTime() + 10 * 24 * HOUR);

      const count = await autoDeliverShippedOrders(tenDaysLater);

      expect(count).toBe(1);
      const stored = await Order.findById(order._id).lean();
      expect(stored!.status).toBe('delivered');
      expect(stored!.deliveredAt).toEqual(new Date(shippedAt.getTime() + 48 * HOUR));
      expect(stored!.refundRequestDeadlineAt).toEqual(new Date(shippedAt.getTime() + 48 * HOUR + 604_800_000));
    });

    it('delivers at exactly 48 hours and not one millisecond earlier', async () => {
      const order = await makeOrder();
      expect(await autoDeliverShippedOrders(new Date(shippedAt.getTime() + 48 * HOUR - 1))).toBe(0);
      expect((await Order.findById(order._id).lean())!.status).toBe('shipped');
      expect(await autoDeliverShippedOrders(new Date(shippedAt.getTime() + 48 * HOUR))).toBe(1);
    });

    it('keeps the existing exclusions: refund-requested, not shipped, no shippedAt', async () => {
      const refunded = await makeOrder({ refundRequestedAt: new Date('2026-10-11T00:00:00Z') });
      const preparing = await makeOrder({ status: 'preparing' });
      const noShipDate = await makeOrder({ shippedAt: undefined });

      expect(await autoDeliverShippedOrders(new Date(shippedAt.getTime() + 10 * 24 * HOUR))).toBe(0);

      for (const order of [refunded, preparing, noShipDate]) {
        const stored = await Order.findById(order._id).lean();
        expect(stored!.deliveredAt).toBeUndefined();
        expect(stored!.status).not.toBe('delivered');
      }
    });

    it('leaves old delivered orders without timestamps unknown, and is idempotent', async () => {
      const old = await makeOrder({ status: 'delivered' });
      const shipped = await makeOrder();
      const now = new Date(shippedAt.getTime() + 10 * 24 * HOUR);

      expect(await autoDeliverShippedOrders(now)).toBe(1);
      const firstDeadline = (await Order.findById(shipped._id).lean())!.refundRequestDeadlineAt;
      expect(await autoDeliverShippedOrders(new Date(now.getTime() + 5 * 24 * HOUR))).toBe(0);

      expect((await Order.findById(old._id).lean())!.deliveredAt).toBeUndefined();
      expect((await Order.findById(old._id).lean())!.refundRequestDeadlineAt).toBeUndefined();
      expect((await Order.findById(shipped._id).lean())!.refundRequestDeadlineAt).toEqual(firstDeadline);
    });
  });
});
