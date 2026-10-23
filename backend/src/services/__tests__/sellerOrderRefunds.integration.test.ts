import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import User from '../../models/User.js';
import RefundRequest from '../../models/RefundRequest.js';
import { getSellerOrders } from '../sellerService.js';
import { listSellerOrderRefundRequests, listCompletedBuyerRefundRequests } from '../refundRequestService.js';
import { connectIntegrationDb } from './integrationDb.js';

const buyer = new mongoose.Types.ObjectId(); const seller = new mongoose.Types.ObjectId(); const otherSeller = new mongoose.Types.ObjectId();
const lineA = new mongoose.Types.ObjectId(); const lineB = new mongoose.Types.ObjectId();

async function order(productId: mongoose.Types.ObjectId) {
  return Order.create({ userId: buyer, sellerId: seller, status: 'delivered', paymentStatus: 'partially_refunded', paymentFlowVersion: 'manual_capture',
    items: [{ _id: lineA, product: productId, productName: 'Mug', productPrice: 10, quantity: 2, productImage: 'i' },
      { _id: lineB, product: productId, productName: 'Cup', productPrice: 5, quantity: 1, productImage: 'i' }],
    shippingAddress: { street: '1', city: 'Town', state: 'S', zipCode: '1', country: 'PH' }, paymentMethod: { type: 'credit-card' },
    subtotal: 25, productDiscount: 0, discount: 0, tax: 2, shipping: 5, total: 32, amountMinor: 3200, currency: 'usd' });
}
const refund = (orderId: mongoose.Types.ObjectId, sellerId: mongoose.Types.ObjectId, state: string, units: Array<{ lineId: mongoose.Types.ObjectId; ordinal: number }>, key: string, submittedAt = new Date()) =>
  RefundRequest.create({ orderId, buyerId: buyer, sellerId, state, reasonCode: 'damaged', description: 'Broken', amountMinor: 1080, currency: 'usd', allocationVersion: 1,
    idempotencyKey: key, payloadHash: key, submittedAt, units: units.map(u => ({ lineId: u.lineId.toString(), ordinal: u.ordinal, merchandiseMinor: 1000, taxMinor: 80 })) });

describe('refunds on the seller order pages (replica set)', () => {
  let productId: mongoose.Types.ObjectId;
  beforeAll(async () => {
    await connectIntegrationDb(); await Promise.all([Product.init(), Order.init(), User.init(), RefundRequest.init()]);
    await User.collection.insertOne({ _id: buyer, firstName: 'Buyer', lastName: 'One', email: 'buyer@x.test', role: 'buyer' } as any);
    await User.collection.insertOne({ _id: seller, firstName: 'Sel', lastName: 'Ler', email: 'seller@x.test', role: 'seller' } as any);
  });
  beforeEach(async () => {
    process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
    productId = (await Product.create({ name: 'Mug', description: 'A mug', category: 'Books', price: 10, stock: 5, image: 'm.png', sellerId: seller }))._id;
  });
  afterEach(async () => { delete process.env.SELLER_SEES_MANUAL_CAPTURE; await Promise.all([Product.deleteMany({}), Order.deleteMany({}), RefundRequest.deleteMany({})]); });
  afterAll(async () => { await User.deleteMany({}); await mongoose.disconnect(); });

  it('lists one order\'s refund requests for its seller, newest first, with the buyer name and order date', async () => {
    const o = await order(productId); const other = await order(productId);
    await refund(o._id, seller, 'rejected', [{ lineId: lineA, ordinal: 1 }], 'k1', new Date('2026-10-18T10:00:00Z'));
    await refund(o._id, seller, 'refunded', [{ lineId: lineA, ordinal: 2 }], 'k2', new Date('2026-10-19T10:00:00Z'));
    await refund(o._id, otherSeller, 'refunded', [{ lineId: lineB, ordinal: 1 }], 'k3');
    await refund(other._id, seller, 'refunded', [{ lineId: lineB, ordinal: 1 }], 'k4');

    const requests = await listSellerOrderRefundRequests(o.id, seller.toString());

    expect(requests.map(r => r.state)).toEqual(['refunded', 'rejected']);
    expect(requests[0]).toMatchObject({ buyerName: 'Buyer One' });
    expect(new Date(requests[0].orderPlacedAt as unknown as string).toISOString()).toBe(o.createdAt.toISOString());
  });

  it('is empty for an order without refunds and for a seller who does not own it', async () => {
    const o = await order(productId);
    expect(await listSellerOrderRefundRequests(o.id, seller.toString())).toEqual([]);
    await refund(o._id, seller, 'refunded', [{ lineId: lineA, ordinal: 1 }], 'k1');
    expect(await listSellerOrderRefundRequests(o.id, otherSeller.toString())).toEqual([]);
  });

  it('marks refunded items on the seller order list: refunded and processing units per item', async () => {
    const withRefunds = await order(productId); const without = await order(productId);
    await refund(withRefunds._id, seller, 'refunded', [{ lineId: lineA, ordinal: 1 }], 'k1');
    await refund(withRefunds._id, seller, 'processing', [{ lineId: lineA, ordinal: 2 }], 'k2');

    const orders = await getSellerOrders(seller.toString()) as unknown as Array<{ _id: mongoose.Types.ObjectId; refundedItems: unknown }>;

    const byId = (id: mongoose.Types.ObjectId) => orders.find(o => o._id.toString() === id.toString())!;
    expect(byId(withRefunds._id).refundedItems).toEqual([{ lineId: lineA.toString(), refunded: 1, processing: 1 }]);
    expect(byId(without._id).refundedItems).toEqual([]);
  });

  it('sends the unsettled request id and the reserved amount so the clients can say Refund requested or Refund processing', async () => {
    const waiting = await order(productId); const approved = await order(productId); const none = await order(productId);
    await Order.updateOne({ _id: waiting._id }, { $set: { activeRefundRequestId: new mongoose.Types.ObjectId() } });
    await Order.updateOne({ _id: approved._id }, { $set: { activeRefundRequestId: new mongoose.Types.ObjectId(), refundReservedAmountMinor: 1080 } });

    const orders = await getSellerOrders(seller.toString()) as unknown as Array<{ _id: mongoose.Types.ObjectId; activeRefundRequestId?: unknown; refundReservedAmountMinor?: number }>;
    const byId = (id: mongoose.Types.ObjectId) => orders.find(o => o._id.toString() === id.toString())!;

    expect(byId(waiting._id).activeRefundRequestId).toBeTruthy();
    expect(byId(waiting._id).refundReservedAmountMinor ?? 0).toBe(0);
    expect(byId(approved._id)).toMatchObject({ refundReservedAmountMinor: 1080 });
    expect(byId(approved._id).activeRefundRequestId).toBeTruthy();
    expect(byId(none._id).activeRefundRequestId).toBeFalsy();
  });

  it('tells the order payment status with each request, on the seller order list and the buyer Return/Refund list', async () => {
    const o = await order(productId);
    await refund(o._id, seller, 'refunded', [{ lineId: lineA, ordinal: 1 }], 'k1');

    const [sellerView] = await listSellerOrderRefundRequests(o.id, seller.toString());
    const buyerList = await listCompletedBuyerRefundRequests(buyer.toString());

    expect(sellerView).toMatchObject({ orderPaymentStatus: 'partially_refunded' });
    expect(buyerList.requests[0]).toMatchObject({ orderPaymentStatus: 'partially_refunded' });
  });
});
