import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import { getRefundEligibility } from '../refundEligibility.js';
import { connectIntegrationDb } from './integrationDb.js';

const buyer = new mongoose.Types.ObjectId();
const seller = new mongoose.Types.ObjectId();
const stranger = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };
const deliveredAt = new Date('2026-10-12T09:30:00Z');
const deadline = new Date(deliveredAt.getTime() + 604_800_000);
const lineA = new mongoose.Types.ObjectId();
const lineB = new mongoose.Types.ObjectId();

/** Net 10.00 and 20.00, coupon 3.00, tax 2.16, shipping 5.00: captured 34.16; units refund 9.72 and 19.44. */
async function makeOrder(overrides: Record<string, unknown> = {}) {
  return Order.create({
    userId: buyer,
    sellerId: seller,
    items: [
      { _id: lineA, product: new mongoose.Types.ObjectId(), productName: 'Mug', productPrice: 10, productImage: 'i.png', quantity: 1 },
      { _id: lineB, product: new mongoose.Types.ObjectId(), productName: 'Lamp', productPrice: 20, productImage: 'i.png', quantity: 1 },
    ],
    shippingAddress: address,
    paymentMethod: { type: 'credit-card' },
    subtotal: 30, productDiscount: 0, discount: 3, tax: 2.16, shipping: 5, total: 34.16,
    status: 'delivered',
    paymentFlowVersion: 'manual_capture',
    paymentStatus: 'captured',
    paymentIntentId: `pi_${new mongoose.Types.ObjectId().toString()}`,
    amountMinor: 3416,
    currency: 'USD',
    deliveredAt,
    refundRequestDeadlineAt: deadline,
    ...overrides,
  });
}

const eligibility = (orderId: string, at: Date = deliveredAt, who = buyer) => getRefundEligibility(orderId, who.toString(), at);

describe('refund eligibility (replica set)', () => {
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

  it('shows each line with its remaining quantity and unit amounts, shipping excluded', async () => {
    const order = await makeOrder();

    const view = await eligibility(order.id);

    expect(view).toMatchObject({ orderId: order.id, eligible: true, currency: 'usd', deliveredAt, deadlineAt: deadline });
    expect(view.lines).toEqual([
      { lineId: lineA.toString(), productName: 'Mug', productImage: 'i.png', quantityOrdered: 1, quantityAvailable: 1, availableUnitAmountsMinor: [972] },
      { lineId: lineB.toString(), productName: 'Lamp', productImage: 'i.png', quantityOrdered: 1, quantityAvailable: 1, availableUnitAmountsMinor: [1944] },
    ]);
    expect(JSON.stringify(view)).not.toMatch(/pi_|secret|paymentIntent/);
  });

  it('works for a deleted product because it never looks the product up', async () => {
    const order = await makeOrder();
    expect(await Product.countDocuments({})).toBe(0);
    expect((await eligibility(order.id)).eligible).toBe(true);
  });

  describe('allocation snapshot', () => {
    it('stores the allocation on first use and keeps using it even if the order snapshot is edited later', async () => {
      const order = await makeOrder();
      await eligibility(order.id);
      const stored = await Order.findById(order._id).lean();
      expect(stored!.refundAllocation).toMatchObject({ version: 1, currency: 'usd', capturedAmountMinor: 3416, shippingMinor: 500 });

      await Order.collection.updateOne({ _id: order._id }, { $set: { 'items.0.productPrice': 999 } });
      expect((await eligibility(order.id)).lines[0].availableUnitAmountsMinor).toEqual([972]);
    });

    it('stores one allocation when two requests race', async () => {
      const order = await makeOrder();
      const [a, b] = await Promise.all([eligibility(order.id), eligibility(order.id)]);
      expect(a).toEqual(b);
      const stored = await Order.findById(order._id).lean();
      expect(stored!.refundAllocation!.units).toHaveLength(2);
    });

    it('does not rebuild a stored allocation whose captured amount no longer matches the order', async () => {
      const order = await makeOrder();
      await eligibility(order.id);
      await Order.collection.updateOne({ _id: order._id }, { $set: { amountMinor: 9999 } });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'review_needed' });
    });

    it('marks an order whose parts do not reconcile as needing review and stores nothing', async () => {
      const order = await makeOrder({ total: 50 });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'review_needed', lines: [] });
      expect((await Order.findById(order._id).lean())!.refundAllocation).toBeUndefined();
    });
  });

  describe('stored allocation soundness', () => {
    it('keeps historical items that never stored an _id eligible, with the same line ids on every load', async () => {
      const order = await makeOrder();
      await Order.collection.updateOne({ _id: order._id }, {
        $set: {
          items: [
            { product: new mongoose.Types.ObjectId(), productName: 'Mug', productPrice: 10, productImage: 'i.png', quantity: 1 },
            { product: new mongoose.Types.ObjectId(), productName: 'Lamp', productPrice: 20, productImage: 'i.png', quantity: 1 },
          ],
        },
      });

      const first = await eligibility(order.id);
      const second = await eligibility(order.id);

      expect(first.eligible).toBe(true);
      expect(first.lines.map(l => [l.lineId, l.quantityAvailable])).toEqual([['line-0', 1], ['line-1', 1]]);
      expect(second).toEqual(first);
    });

    it('treats a stored allocation without units as needing review', async () => {
      const order = await makeOrder();
      await eligibility(order.id);
      await Order.collection.updateOne({ _id: order._id }, { $unset: { 'refundAllocation.units': '' } });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'review_needed' });
    });

    it('treats a stored allocation whose lines do not match the order items as needing review', async () => {
      const order = await makeOrder();
      await eligibility(order.id);
      await Order.collection.updateOne({ _id: order._id }, { $set: { 'refundAllocation.units.0.lineId': 'someone-else' } });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'review_needed' });
    });

    it('treats a stored allocation whose amounts no longer add up as needing review', async () => {
      const order = await makeOrder();
      await eligibility(order.id);
      await Order.collection.updateOne({ _id: order._id }, { $inc: { 'refundAllocation.units.0.merchandiseMinor': 1 } });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'review_needed' });
    });

    it('replaces a null allocation instead of staying stuck', async () => {
      const order = await makeOrder();
      await Order.collection.updateOne({ _id: order._id }, { $set: { refundAllocation: null } });
      expect((await eligibility(order.id)).eligible).toBe(true);
      expect((await Order.findById(order._id).lean())!.refundAllocation).toMatchObject({ version: 1 });
    });
  });

  describe('seven-day window', () => {
    it.each([
      ['one millisecond before the deadline', -1, true],
      ['exactly at the deadline', 0, true],
      ['one millisecond after the deadline', 1, false],
    ])('%s', async (_name, offset, eligible) => {
      const order = await makeOrder();
      const view = await eligibility(order.id, new Date(deadline.getTime() + offset));
      expect(view.eligible).toBe(eligible);
      if (!eligible) expect(view.reason).toBe('window_closed');
    });

    it('treats a delivered order without recorded timestamps as unknown, never estimating from other dates', async () => {
      const order = await makeOrder({ deliveredAt: undefined, refundRequestDeadlineAt: undefined });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'delivery_unknown' });
    });

    it.each(['pending', 'preparing', 'processing', 'shipped', 'cancelled'])('is not eligible while %s', async (status) => {
      const order = await makeOrder({ status });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'not_delivered' });
    });
  });

  describe('ownership and payment', () => {
    it('answers 404 for another buyer and for an unknown or malformed order', async () => {
      const order = await makeOrder();
      await expect(eligibility(order.id, deliveredAt, stranger)).rejects.toMatchObject({ statusCode: 404, code: 'order_not_found' });
      await expect(eligibility(new mongoose.Types.ObjectId().toString())).rejects.toMatchObject({ statusCode: 404 });
      await expect(eligibility('not-an-id')).rejects.toMatchObject({ statusCode: 404 });
    });

    it.each(['cash-on-delivery', 'paypal'])('does not refund %s money', async (type) => {
      const order = await makeOrder({ paymentMethod: { type }, paymentStatus: 'not_required', amountMinor: undefined, paymentIntentId: undefined });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'unsupported_payment' });
    });

    it.each(['authorized', 'refund_pending', 'refunded', 'released', 'failed'])('is not refundable when the payment is %s', async (paymentStatus) => {
      const order = await makeOrder({ paymentStatus });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'payment_not_refundable' });
    });

    it('is not refundable once a cancellation refund id exists', async () => {
      const order = await makeOrder({ refundId: 're_123' });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'payment_not_refundable' });
    });

    it('requires a persisted seller', async () => {
      const order = await makeOrder({ sellerId: undefined });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'seller_unverified' });
    });

    it('accepts an order that has already been partly refunded', async () => {
      const order = await makeOrder();
      await Order.collection.updateOne({ _id: order._id }, {
        $set: { paymentStatus: 'partially_refunded', refundedAmountMinor: 972, refundUnitsTaken: [{ lineId: lineA.toString(), ordinal: 1 }] },
      });
      const view = await eligibility(order.id);
      expect(view.eligible).toBe(true);
      expect(view.lines.map(l => l.quantityAvailable)).toEqual([0, 1]);
    });

    it('flags money refunded or reserved that no taken unit explains as needing review', async () => {
      const order = await makeOrder({ refundedAmountMinor: 1000 });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'review_needed' });
    });

    it('flags taken units whose value differs from the refunded and reserved money', async () => {
      const order = await makeOrder({ refundUnitsTaken: [{ lineId: lineA.toString(), ordinal: 1 }], refundedAmountMinor: 500 });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'review_needed' });
    });

    it('flags a taken unit that is not part of the allocation or is listed twice', async () => {
      const unknown = await makeOrder({ refundUnitsTaken: [{ lineId: 'nope', ordinal: 1 }], refundedAmountMinor: 0 });
      expect(await eligibility(unknown.id)).toMatchObject({ eligible: false, reason: 'review_needed' });
      const twice = await makeOrder({
        refundUnitsTaken: [{ lineId: lineA.toString(), ordinal: 1 }, { lineId: lineA.toString(), ordinal: 1 }],
        refundedAmountMinor: 1944,
      });
      expect(await eligibility(twice.id)).toMatchObject({ eligible: false, reason: 'review_needed' });
    });

    it('flags refund totals that exceed the captured balance as needing review', async () => {
      const order = await makeOrder({ refundedAmountMinor: 3000, refundReservedAmountMinor: 500 });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'review_needed' });
    });
  });

  describe('requests and remaining units', () => {
    it('is not eligible while another request is unresolved', async () => {
      const order = await makeOrder({ activeRefundRequestId: new mongoose.Types.ObjectId() });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'active_request' });
    });

    it('lists only the units that are not taken, lowest ordinals first', async () => {
      const order = await makeOrder({
        items: [{ _id: lineA, product: new mongoose.Types.ObjectId(), productName: 'Mug', productPrice: 10, productImage: 'i.png', quantity: 3 }],
        subtotal: 30, discount: 0, tax: 2.4, shipping: 0, total: 32.4, amountMinor: 3240,
        refundUnitsTaken: [{ lineId: lineA.toString(), ordinal: 1 }],
        refundedAmountMinor: 1080,
      });

      const view = await eligibility(order.id);

      expect(view.eligible).toBe(true);
      expect(view.lines).toEqual([
        { lineId: lineA.toString(), productName: 'Mug', productImage: 'i.png', quantityOrdered: 3, quantityAvailable: 2, availableUnitAmountsMinor: [1080, 1080] },
      ]);
    });

    it('never offers a zero-value unit, and is not eligible when only those remain', async () => {
      const freeItems = [
        { _id: lineA, product: new mongoose.Types.ObjectId(), productName: 'Mug', productPrice: 10, productImage: 'i.png', quantity: 1 },
        { _id: lineB, product: new mongoose.Types.ObjectId(), productName: 'Gift', productPrice: 10, productImage: 'i.png', quantity: 1, discountPercent: 100 },
      ];
      const money = { subtotal: 20, productDiscount: 10, discount: 0, tax: 0.8, shipping: 0, total: 10.8, amountMinor: 1080 };

      const open = await makeOrder({ items: freeItems, ...money });
      const openView = await eligibility(open.id);
      expect(openView.eligible).toBe(true);
      expect(openView.lines.map(l => [l.quantityAvailable, l.availableUnitAmountsMinor])).toEqual([[1, [1080]], [0, []]]);

      const done = await makeOrder({
        items: freeItems, ...money, paymentIntentId: `pi_${new mongoose.Types.ObjectId().toString()}`,
        refundUnitsTaken: [{ lineId: lineA.toString(), ordinal: 1 }], refundedAmountMinor: 1080,
      });
      expect(await eligibility(done.id)).toMatchObject({ eligible: false, reason: 'no_units_left' });
    });

    it('is not eligible once every unit is taken', async () => {
      const order = await makeOrder({
        refundUnitsTaken: [{ lineId: lineA.toString(), ordinal: 1 }, { lineId: lineB.toString(), ordinal: 1 }],
        refundedAmountMinor: 972 + 1944,
      });
      expect(await eligibility(order.id)).toMatchObject({ eligible: false, reason: 'no_units_left' });
    });
  });
});
