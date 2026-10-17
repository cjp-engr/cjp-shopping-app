import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import User from '../../models/User.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getSellerOrders, updateSellerOrderStatus } from '../sellerService.js';
import { cancelOrderAsBuyer, getOrderById, getUserOrders } from '../orderService.js';
import { connectIntegrationDb } from './integrationDb.js';

const buyer = new mongoose.Types.ObjectId();
const seller = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };

type Status = 'awaiting_payment' | 'pending' | 'preparing';

async function makeOrder(
  productId: mongoose.Types.ObjectId,
  status: Status,
  paymentFlowVersion: 'legacy' | 'manual_capture',
) {
  return Order.create({
    userId: buyer,
    items: [{ product: productId, productName: 'Book', productPrice: 10, productImage: 'b.png', quantity: 1 }],
    shippingAddress: address,
    paymentMethod: { type: 'cash-on-delivery' },
    subtotal: 10,
    tax: 0.8,
    shipping: 0,
    total: 10.8,
    status,
    paymentFlowVersion,
    sellerId: seller,
  });
}

describe('order visibility (replica set)', () => {
  const original = process.env.SELLER_SEES_MANUAL_CAPTURE;
  let productId: mongoose.Types.ObjectId;
  let legacy: Awaited<ReturnType<typeof makeOrder>>;
  let draft: Awaited<ReturnType<typeof makeOrder>>;
  let manual: Awaited<ReturnType<typeof makeOrder>>;

  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), User.init()]);
    await User.collection.insertOne({ _id: seller, firstName: 'Sel', lastName: 'Ler', role: 'seller' } as any);
  });

  beforeEach(async () => {
    delete process.env.SELLER_SEES_MANUAL_CAPTURE;
    const product = await Product.create({
      name: 'Book', description: 'A book', category: 'Books', price: 10, stock: 5, image: 'b.png', sellerId: seller,
    });
    productId = product._id;
    legacy = await makeOrder(productId, 'pending', 'legacy');
    draft = await makeOrder(productId, 'awaiting_payment', 'manual_capture');
    manual = await makeOrder(productId, 'pending', 'manual_capture');
  });

  afterEach(async () => {
    if (original === undefined) delete process.env.SELLER_SEES_MANUAL_CAPTURE;
    else process.env.SELLER_SEES_MANUAL_CAPTURE = original;
    await Promise.all([Product.deleteMany({}), Order.deleteMany({})]);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  const idsOf = (orders: unknown[]) => orders.map(o => String((o as { _id: unknown })._id));

  describe('seller order list', () => {
    it('hides drafts and manual-capture orders when the flag is off', async () => {
      const ids = idsOf(await getSellerOrders(seller.toString()));
      expect(ids).toEqual([legacy._id.toString()]);
    });

    it('shows manual-capture orders but still hides drafts when the flag is on', async () => {
      process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
      const ids = idsOf(await getSellerOrders(seller.toString())).sort();
      expect(ids).toEqual([legacy._id.toString(), manual._id.toString()].sort());
    });
  });

  describe('buyer order history', () => {
    it('hides drafts and keeps placed manual-capture orders, with the flag off', async () => {
      const ids = idsOf(await getUserOrders(buyer.toString())).sort();
      expect(ids).toEqual([legacy._id.toString(), manual._id.toString()].sort());
    });

    it('hides drafts the same way with the flag on', async () => {
      process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
      const ids = idsOf(await getUserOrders(buyer.toString())).sort();
      expect(ids).toEqual([legacy._id.toString(), manual._id.toString()].sort());
    });

    it('returns 404 for a draft detail and shows a placed order', async () => {
      await expect(getOrderById(draft._id.toString(), buyer.toString())).rejects.toMatchObject({ statusCode: 404 });
      await expect(getOrderById(manual._id.toString(), buyer.toString())).resolves.toBeTruthy();
    });
  });

  describe('buyer cancellation', () => {
    it('cancels a legacy pending order', async () => {
      const order = await cancelOrderAsBuyer(legacy._id.toString(), buyer.toString(), 'changed mind');
      expect(order.status).toBe('cancelled');
    });


    it('returns 404 for a draft, not a cancellation error', async () => {
      await expect(cancelOrderAsBuyer(draft._id.toString(), buyer.toString())).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('seller status transitions', () => {
    it('moves a legacy order forward with the flag off', async () => {
      const { order, outcome } = await updateSellerOrderStatus(legacy._id.toString(), seller.toString(), 'preparing');
      expect(order.status).toBe('preparing');
      expect(outcome).toBe('completed');
    });

    it('returns 404 for a manual-capture order with the flag off, so it is not discoverable', async () => {
      await expect(
        updateSellerOrderStatus(manual._id.toString(), seller.toString(), 'preparing'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('returns 404 for a draft with the flag on', async () => {
      process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
      await expect(
        updateSellerOrderStatus(draft._id.toString(), seller.toString(), 'preparing'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('returns 409 cancellation_unavailable when cancelling a manual-capture order with the flag on', async () => {
      process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
      const error = await updateSellerOrderStatus(manual._id.toString(), seller.toString(), 'cancelled').catch(e => e);
      expect(error).toMatchObject({ statusCode: 409, code: 'cancellation_unavailable' });

      const stored = await Order.findById(manual._id);
      expect(stored?.status).toBe('pending');
    });

    it('still rejects an invalid transition for a visible manual-capture order', async () => {
      process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
      await expect(
        updateSellerOrderStatus(manual._id.toString(), seller.toString(), 'delivered'),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
