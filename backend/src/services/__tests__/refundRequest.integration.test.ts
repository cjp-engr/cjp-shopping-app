import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import Order from '../../models/Order.js';
import RefundRequest from '../../models/RefundRequest.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import Product from '../../models/Product.js';
import Coupon from '../../models/Coupon.js';
import User from '../../models/User.js';
import { connectIntegrationDb } from './integrationDb.js';
import { createRefundRequest, decideRefundRequest, listBuyerRefundRequests, listCompletedBuyerRefundRequests, listSellerRefundRequests } from '../refundRequestService.js';
import * as eligibilityService from '../refundEligibility.js';

const buyer = new mongoose.Types.ObjectId();
const seller = new mongoose.Types.ObjectId();
const stranger = new mongoose.Types.ObjectId();
const line = new mongoose.Types.ObjectId();
const now = new Date('2026-10-18T00:00:00Z');
const deadline = new Date(now.getTime() + 604800000);
async function order(overrides: Record<string, unknown> = {}) {
  return Order.create({
    userId: buyer, sellerId: seller,
    items: [{ _id: line, product: new mongoose.Types.ObjectId(), productName: 'Mug', productPrice: 10, productImage: 'i', quantity: 2 }],
    shippingAddress: { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' },
    paymentMethod: { type: 'credit-card' }, subtotal: 20, productDiscount: 0, discount: 0, tax: 1.6, shipping: 5, total: 26.6,
    status: 'delivered', paymentFlowVersion: 'manual_capture', paymentStatus: 'captured',
    paymentIntentId: `pi_${new mongoose.Types.ObjectId()}`, amountMinor: 2660, currency: 'usd',
    deliveredAt: now, refundRequestDeadlineAt: deadline, ...overrides,
  });
}
function input(overrides: Record<string, unknown> = {}) {
  return { items: [{ lineId: line.toString(), quantity: 1 }], reasonCode: 'damaged' as const, description: ' Broken handle ', idempotencyKey: new mongoose.Types.ObjectId().toString(), ...overrides };
}
const create = (id: string, payload = input(), at = now) => createRefundRequest(id, buyer.toString(), payload, at);
const decide = (id: string, decision: 'approve' | 'reject' = 'approve', rejectionReason?: string) => decideRefundRequest(id, seller.toString(), { decision, rejectionReason }, now);

describe('delivered refund requests (replica set)', () => {
  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Order.init(), RefundRequest.init(), PaymentOperation.init()]);
  });
  beforeEach(() => { process.env.DELIVERED_REFUNDS_ENABLED = 'true'; process.env.SELLER_SEES_MANUAL_CAPTURE = 'true'; });
  afterEach(async () => {
    vi.restoreAllMocks();
    delete process.env.DELIVERED_REFUNDS_ENABLED; delete process.env.SELLER_SEES_MANUAL_CAPTURE;
    await Promise.all([Order.deleteMany({}), RefundRequest.deleteMany({}), PaymentOperation.deleteMany({})]);
  });
  afterAll(async () => { await mongoose.disconnect(); });

  it('quotes selected units, claims one active request and returns only public fields', async () => {
    const o = await order(); const r = await create(o.id);
    expect(r).toMatchObject({ orderId: o.id, amountMinor: 1080, currency: 'usd', state: 'requested', description: 'Broken handle' });
    expect(r.units).toHaveLength(1);
    expect((await Order.findById(o.id))!.activeRefundRequestId?.toString()).toBe(r.id);
    expect(await listBuyerRefundRequests(o.id, buyer.toString())).toEqual([r]);
    const list = await listSellerRefundRequests(seller.toString(), 1, 20);
    expect(list).toMatchObject({ page: 1, pages: 1, total: 1, requests: [r] });
    expect(JSON.stringify(r)).not.toMatch(/payloadHash|idempotencyKey|paymentIntent|lease|secret/);
  });
  it('lists own seller-approved requests (processing, review, refunded), not waiting or rejected ones, with pagination and the flag off', async () => {
    const waiting = await order(); await create(waiting.id);
    const rejected = await order(); const rejectedRequest = await create(rejected.id);
    await RefundRequest.updateOne({ _id: rejectedRequest.id }, { $set: { state: 'rejected' } });
    const completed = await order(); const first = await create(completed.id);
    await RefundRequest.updateOne({ _id: first.id }, { $set: { state: 'refunded' } });
    await Order.updateOne({ _id: completed.id }, { $set: { paymentStatus: 'partially_refunded' } });
    const approved = await order(); const second = await create(approved.id);
    await RefundRequest.updateOne({ _id: second.id }, { $set: { state: 'processing' } });
    const review = await order(); const third = await create(review.id);
    await RefundRequest.updateOne({ _id: third.id }, { $set: { state: 'needs_review' } });
    process.env.DELIVERED_REFUNDS_ENABLED = 'false';
    const page = await listCompletedBuyerRefundRequests(buyer.toString(), 1, 1);
    expect(page).toMatchObject({ page: 1, pages: 3, total: 3 });
    expect(page.requests).toHaveLength(1);
    const all = (await listCompletedBuyerRefundRequests(buyer.toString(), 1, 10)).requests;
    expect(all.map(r => r.state).sort()).toEqual(['needs_review', 'processing', 'refunded']);
    expect(all.map(r => r.id)).not.toContain(waiting.id);
    expect(all.find(r => r.state === 'refunded')!.completedAt).toBeInstanceOf(Date);
    expect((await listCompletedBuyerRefundRequests(buyer.toString(), 2, 1)).requests[0].id).not.toBe(page.requests[0].id);
    expect((await listCompletedBuyerRefundRequests(stranger.toString())).total).toBe(0);
    await Order.updateOne({ _id: completed.id }, { $set: { userId: stranger } });
    expect((await listCompletedBuyerRefundRequests(buyer.toString())).total).toBe(2);
    await expect(listCompletedBuyerRefundRequests(buyer.toString(), 0)).rejects.toMatchObject({ statusCode: 400 });
  });
  it('adds the store name and the order date to each listed refund so the tab can show an order-style card', async () => {
    await User.collection.insertOne({ _id: seller, firstName: 'Xavier', lastName: 'SellerX' });
    try {
      const withSeller = await order(); const request = await create(withSeller.id);
      await RefundRequest.updateOne({ _id: request.id }, { $set: { state: 'refunded' } });

      const [listed] = (await listCompletedBuyerRefundRequests(buyer.toString())).requests;

      expect(listed).toMatchObject({ id: request.id, sellerName: 'Xavier SellerX' });
      expect(listed.orderPlacedAt).toEqual((await Order.findById(withSeller.id))!.createdAt);
      await User.collection.deleteOne({ _id: seller });
      const [missing] = (await listCompletedBuyerRefundRequests(buyer.toString())).requests;
      expect(missing.sellerName).toBeNull();
    } finally {
      await User.collection.deleteOne({ _id: seller });
    }
  });
  it('groups the seller list into in progress, approved and rejected, with a count for each', async () => {
    const make = async (state: string) => {
      const target = await order(); const request = await create(target.id);
      if (state !== 'requested') await RefundRequest.updateOne({ _id: request.id }, { $set: { state } });
      return request.id;
    };
    const waiting = await make('requested');
    const processing = await make('processing');
    const review = await make('needs_review');
    const refunded = await make('refunded');
    const rejected = await make('rejected');

    const ids = async (group?: string) => (await listSellerRefundRequests(seller.toString(), 1, 20, group)).requests.map(r => r.id).sort();

    expect(await ids('in_progress')).toEqual([waiting]);
    expect(await ids('approved')).toEqual([processing, review, refunded].sort());
    expect(await ids('rejected')).toEqual([rejected]);
    expect(await ids()).toHaveLength(5);
    const approved = await listSellerRefundRequests(seller.toString(), 1, 2, 'approved');
    expect(approved).toMatchObject({ total: 3, pages: 2, counts: { in_progress: 1, approved: 3, rejected: 1 } });
    expect((await listSellerRefundRequests(seller.toString(), 1, 20)).counts).toEqual({ in_progress: 1, approved: 3, rejected: 1 });
    await expect(listSellerRefundRequests(seller.toString(), 1, 20, 'everything')).rejects.toMatchObject({ statusCode: 400 });
    expect((await listSellerRefundRequests(stranger.toString(), 1, 20, 'approved')).counts).toEqual({ in_progress: 0, approved: 0, rejected: 0 });
  });
  it('adds the buyer name and the order date to each refund in the seller list', async () => {
    await User.collection.insertOne({ _id: buyer, firstName: 'Buyer1', lastName: 'Monte Cristo' });
    try {
      const target = await order(); const request = await create(target.id);

      const list = await listSellerRefundRequests(seller.toString(), 1, 20);

      expect(list.requests[0]).toMatchObject({ id: request.id, buyerName: 'Buyer1 Monte Cristo' });
      expect(list.requests[0].orderPlacedAt).toEqual((await Order.findById(target.id))!.createdAt);
      await User.collection.deleteOne({ _id: buyer });
      expect((await listSellerRefundRequests(seller.toString(), 1, 20)).requests[0].buyerName).toBeNull();
    } finally {
      await User.collection.deleteOne({ _id: buyer });
    }
  });
  it('replays same key after deadline and rejects changed payload or another order', async () => {
    const o = await order(); const p = input(); const r = await create(o.id, p);
    expect(await create(o.id, p, new Date(deadline.getTime() + 1))).toEqual(r);
    await expect(create(o.id, { ...p, description: 'different' })).rejects.toMatchObject({ statusCode: 409 });
    const other = await order();
    await expect(create(other.id, p)).rejects.toMatchObject({ statusCode: 409 });
  });
  it('serializes concurrent same-key creates and conflicting creates', async () => {
    const o = await order(); const p = input();
    const results = await Promise.all([create(o.id, p), create(o.id, p)]);
    expect(results[0].id).toBe(results[1].id);
    expect(await RefundRequest.countDocuments({})).toBe(1);
    await expect(create(o.id)).rejects.toMatchObject({ statusCode: 409 });
  });
  it('returns the replay if another creator commits between the first key read and eligibility', async () => {
    const o = await order(); const p = input(); const original = eligibilityService.getRefundEligibility;
    let first = true; let winnerId = '';
    vi.spyOn(eligibilityService, 'getRefundEligibility').mockImplementation(async (...args) => {
      if (first) { first = false; winnerId = (await create(o.id, p)).id; }
      return original(...args);
    });
    expect((await create(o.id, p)).id).toBe(winnerId);
  });
  it('allows exactly one active request for concurrent different keys', async () => {
    const o = await order();
    const results = await Promise.allSettled([create(o.id), create(o.id)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(await RefundRequest.countDocuments({})).toBe(1);
  });
  it('hides foreign buyer history and foreign seller decisions', async () => {
    const o = await order(); const r = await create(o.id);
    await expect(createRefundRequest(o.id, stranger.toString(), input(), now)).rejects.toMatchObject({ statusCode: 404 });
    await expect(listBuyerRefundRequests(o.id, stranger.toString())).rejects.toMatchObject({ statusCode: 404 });
    await expect(decideRefundRequest(r.id, stranger.toString(), { decision: 'approve' }, now)).rejects.toMatchObject({ statusCode: 404 });
    expect((await listSellerRefundRequests(stranger.toString(), 1, 20)).total).toBe(0);
  });
  it.each([0, -1, 0.5, 3, '1', Number.MAX_SAFE_INTEGER])('rejects invalid quantity %s', async quantity => {
    const o = await order();
    await expect(create(o.id, input({ items: [{ lineId: line.toString(), quantity }] }))).rejects.toMatchObject({ statusCode: expect.any(Number) });
    expect(await RefundRequest.countDocuments({})).toBe(0);
  });
  it.each([
    { items: [] }, { items: [{ lineId: line.toString(), quantity: 1 }, { lineId: line.toString(), quantity: 1 }] },
    { items: [{ lineId: 'foreign', quantity: 1 }] }, { reasonCode: 'invalid' }, { description: ' ' },
    { description: 'x'.repeat(1001) }, { idempotencyKey: 'x'.repeat(129) }, { amountMinor: 1 }, { currency: 'usd' },
  ])('rejects malformed or money-bearing payload %j', async overrides => {
    const o = await order(); await expect(create(o.id, input(overrides))).rejects.toMatchObject({ statusCode: expect.any(Number) });
  });
  it('uses exact deadline boundary, rejects late and unsupported requests', async () => {
    const o = await order(); await create(o.id, input(), deadline);
    const late = await order(); await expect(create(late.id, input(), new Date(deadline.getTime() + 1))).rejects.toMatchObject({ statusCode: 409 });
    const cod = await order({ paymentMethod: { type: 'cash-on-delivery' } }); await expect(create(cod.id)).rejects.toMatchObject({ statusCode: 409 });
  });
  it('reserves quoted units and amount and creates exactly one durable refund operation on approval', async () => {
    const o = await order(); const r = await create(o.id);
    const stock = await Product.countDocuments({}); const coupons = await Coupon.countDocuments({});
    const a = await decide(r.id); const b = await decide(r.id);
    expect(a.state).toBe('processing'); expect(b).toEqual(a);
    const stored = (await Order.findById(o.id))!;
    expect(stored).toMatchObject({ status: 'delivered', paymentStatus: 'captured', refundReservedAmountMinor: 1080 });
    expect(stored.refundUnitsTaken).toHaveLength(1);
    const jobs = await PaymentOperation.find({ refundRequestId: r.id });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ action: 'refund', refundPurpose: 'delivered_items', amountMinor: 1080, currency: 'usd', idempotencyKey: `refund-request:${r.id}:refund:1` });
    expect(await Product.countDocuments({})).toBe(stock); expect(await Coupon.countDocuments({})).toBe(coupons);
  });
  it('quotes all items plus shipping before approval and reserves shipping only once', async () => {
    const o = await order();
    const r = await create(o.id, input({ items: [{ lineId: line.toString(), quantity: 2 }] }));
    expect(r).toMatchObject({ amountMinor: 2660, shippingMinor: 500, state: 'requested' });
    await Promise.all([decide(r.id), decide(r.id)]);
    expect(await PaymentOperation.countDocuments({ refundRequestId: r.id })).toBe(1);
    expect(await Order.findById(o.id)).toMatchObject({ refundReservedAmountMinor: 2660, refundReservedShippingMinor: 500 });
  });
  it('rejects change of mind after delivery without creating a request', async () => {
    const o = await order();
    await expect(create(o.id, input({ reasonCode: 'change_of_mind', items: [{ lineId: line.toString(), quantity: 2 }] }))).rejects.toMatchObject({ statusCode: 400 });
    expect(await RefundRequest.countDocuments({})).toBe(0);
  });
  it.each(['other'])('keeps shipping excluded from a full order request for %s', async reasonCode => {
    const o = await order();
    const r = await create(o.id, input({ reasonCode, items: [{ lineId: line.toString(), quantity: 2 }] }));
    expect(r).toMatchObject({ amountMinor: 2160, shippingMinor: 0 });
    await decide(r.id);
    expect(await Order.findById(o.id)).toMatchObject({ refundReservedAmountMinor: 2160, refundReservedShippingMinor: 0 });
  });
  it.each(['wrong_item', 'missing_items', 'not_as_described'])('includes shipping for a full seller-fault request: %s', async reasonCode => {
    const o = await order();
    const r = await create(o.id, input({ reasonCode, items: [{ lineId: line.toString(), quantity: 2 }] }));
    expect(r).toMatchObject({ amountMinor: 2660, shippingMinor: 500 });
  });
  it('rejection does not consume shipping, and an existing old quote is not silently increased', async () => {
    const o = await order();
    const r = await create(o.id, input({ items: [{ lineId: line.toString(), quantity: 2 }] }));
    await decide(r.id, 'reject', 'Please check the items');
    const next = await create(o.id, input({ items: [{ lineId: line.toString(), quantity: 2 }] }));
    expect(next).toMatchObject({ shippingMinor: 500, amountMinor: 2660 });
    await RefundRequest.collection.updateOne({ _id: new mongoose.Types.ObjectId(next.id) }, { $unset: { shippingMinor: '' }, $set: { amountMinor: 2160 } });
    await decide(next.id);
    expect(await Order.findById(o.id)).toMatchObject({ refundReservedAmountMinor: 2160, refundReservedShippingMinor: 0 });
  });
  it('permits a timely request decision after the submission deadline', async () => {
    const o = await order(); const r = await create(o.id);
    expect((await decideRefundRequest(r.id, seller.toString(), { decision: 'approve' }, new Date(deadline.getTime() + 1))).state).toBe('processing');
  });
  it('rejects a changed quote before approval and leaves all reservations untouched', async () => {
    const o = await order(); const r = await create(o.id);
    await RefundRequest.updateOne({ _id: r.id }, { $set: { amountMinor: 999 } });
    await expect(decide(r.id)).rejects.toMatchObject({ statusCode: 409 });
    expect(await PaymentOperation.countDocuments({})).toBe(0);
    expect((await Order.findById(o.id))!.refundReservedAmountMinor ?? 0).toBe(0);
  });
  it('rejects changed payment ownership/balance and hides manual orders from sellers when visibility is off', async () => {
    const o = await order(); const r = await create(o.id);
    process.env.SELLER_SEES_MANUAL_CAPTURE = 'false';
    await expect(decide(r.id)).rejects.toMatchObject({ statusCode: 404 });
    expect((await listSellerRefundRequests(seller.toString(), 1, 20)).total).toBe(0);
    process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
    await Order.updateOne({ _id: o.id }, { $set: { refundedAmountMinor: 2600 } });
    await expect(decide(r.id)).rejects.toMatchObject({ statusCode: 409 });
  });
  it('requires rejection reason, releases active claim and allows a new request', async () => {
    const o = await order(); const r = await create(o.id);
    await expect(decide(r.id, 'reject')).rejects.toMatchObject({ statusCode: 400 });
    const rejected = await decide(r.id, 'reject', ' No damage shown ');
    expect(rejected).toMatchObject({ state: 'rejected', rejectionReason: 'No damage shown' });
    expect((await Order.findById(o.id))!.activeRefundRequestId).toBeUndefined();
    expect((await create(o.id)).state).toBe('requested');
    expect(await PaymentOperation.countDocuments({})).toBe(0);
  });
  it('allows exactly one winner for approval versus rejection', async () => {
    const o = await order(); const r = await create(o.id);
    const results = await Promise.allSettled([decide(r.id), decide(r.id, 'reject', 'Not eligible')]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const stored = (await RefundRequest.findById(r.id))!;
    expect(await PaymentOperation.countDocuments({})).toBe(stored.state === 'processing' ? 1 : 0);
  });
  it('blocks new mutations while flag is off but keeps history reads', async () => {
    const o = await order(); const r = await create(o.id); process.env.DELIVERED_REFUNDS_ENABLED = 'false';
    await expect(create((await order()).id)).rejects.toMatchObject({ statusCode: 409, code: 'delivered_refunds_disabled' });
    await expect(decide(r.id)).rejects.toMatchObject({ statusCode: 409, code: 'delivered_refunds_disabled' });
    expect(await listBuyerRefundRequests(o.id, buyer.toString())).toHaveLength(1);
  });
});
