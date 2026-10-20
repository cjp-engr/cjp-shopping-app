import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import Order from '../../models/Order.js';
import RefundRequest from '../../models/RefundRequest.js';
import { connectIntegrationDb } from './integrationDb.js';
import { attachRefundedItems } from '../orderRefundMarks.js';

const buyer = new mongoose.Types.ObjectId(); const seller = new mongoose.Types.ObjectId();
const lineA = new mongoose.Types.ObjectId(); const lineB = new mongoose.Types.ObjectId();

async function order() {
  return Order.create({ userId: buyer, sellerId: seller, status: 'delivered', paymentStatus: 'partially_refunded', paymentFlowVersion: 'manual_capture',
    items: [{ _id: lineA, product: new mongoose.Types.ObjectId(), productName: 'Mug', productPrice: 10, quantity: 2, productImage: 'i' },
      { _id: lineB, product: new mongoose.Types.ObjectId(), productName: 'Cup', productPrice: 5, quantity: 1, productImage: 'i' }],
    shippingAddress: { street: '1', city: 'Town', state: 'S', zipCode: '1', country: 'PH' }, paymentMethod: { type: 'credit-card' },
    subtotal: 25, productDiscount: 0, discount: 0, tax: 2, shipping: 5, total: 32, amountMinor: 3200, currency: 'usd' });
}
const refund = (orderId: mongoose.Types.ObjectId, state: string, units: Array<{ lineId: mongoose.Types.ObjectId; ordinal: number }>, key: string) =>
  RefundRequest.create({ orderId, buyerId: buyer, sellerId: seller, state, reasonCode: 'damaged', description: 'Broken', amountMinor: 1080, currency: 'usd', allocationVersion: 1,
    idempotencyKey: key, payloadHash: key, submittedAt: new Date(), units: units.map(u => ({ lineId: u.lineId.toString(), ordinal: u.ordinal, merchandiseMinor: 1000, taxMinor: 80 })) });

describe('refunded item marks on the buyer order payload (replica set)', () => {
  beforeAll(async () => { await connectIntegrationDb(); await Promise.all([Order.init(), RefundRequest.init()]); });
  afterEach(async () => { await Promise.all([Order.deleteMany({}), RefundRequest.deleteMany({})]); });
  afterAll(async () => { await mongoose.disconnect(); });

  it('adds the refunded and processing units per item to each order, and an empty list when there are none', async () => {
    const withRefunds = await order(); const without = await order();
    await refund(withRefunds._id, 'refunded', [{ lineId: lineA, ordinal: 1 }], 'k1');
    await refund(withRefunds._id, 'processing', [{ lineId: lineA, ordinal: 2 }, { lineId: lineB, ordinal: 1 }], 'k2');
    await refund(withRefunds._id, 'rejected', [{ lineId: lineB, ordinal: 1 }], 'k3');

    const payload = await attachRefundedItems([withRefunds, without]);

    expect(payload[0].refundedItems).toEqual([
      { lineId: lineA.toString(), refunded: 1, processing: 1 },
      { lineId: lineB.toString(), refunded: 0, processing: 1 },
    ]);
    expect(payload[1].refundedItems).toEqual([]);
  });

  it('keeps the rest of the order as it was sent before', async () => {
    const o = await order();
    const [payload] = await attachRefundedItems([o]);
    expect(payload).toMatchObject({ _id: o._id, status: 'delivered', paymentStatus: 'partially_refunded', total: 32 });
    expect(payload.items).toHaveLength(2);
  });
});
