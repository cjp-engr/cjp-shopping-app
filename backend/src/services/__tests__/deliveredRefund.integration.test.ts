import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import type Stripe from 'stripe';
import Order from '../../models/Order.js';
import RefundRequest from '../../models/RefundRequest.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import CheckoutSession from '../../models/CheckoutSession.js';
import StripeEventInbox from '../../models/StripeEventInbox.js';
import { connectIntegrationDb } from './integrationDb.js';
import { createRefundRequest, decideRefundRequest } from '../refundRequestService.js';
import { processDueOperations } from '../paymentOperationWorker.js';
import { reconcileDeliveredRefund } from '../deliveredRefund.js';
import * as stripe from '../stripeService.js';
import { processStripeInboxEvent, stripeEventSnapshot } from '../stripeInboxWorker.js';
import { dispatchWebhookEvent } from '../checkoutWebhook.js';
vi.mock('../stripeService.js', async () => ({ ...await vi.importActual<typeof import('../stripeService.js')>('../stripeService.js'),
  retrieveIntentWithCharge: vi.fn(), listIntentRefunds: vi.fn(), createOrderRefund: vi.fn(), retrieveRefund: vi.fn() }));
const buyer = new mongoose.Types.ObjectId(); const seller = new mongoose.Types.ObjectId(); const line = new mongoose.Types.ObjectId();
const now = new Date('2026-10-18T01:00:00Z');
let providerRefunds: any[] = []; let payment: any;
async function fixture() {
  const o = await Order.create({ userId: buyer, sellerId: seller, items: [{ _id: line, product: new mongoose.Types.ObjectId(), productName: 'Mug', productPrice: 10, quantity: 2, productImage: 'i' }],
    shippingAddress: { street: '1', city: 'Town', state: 'S', zipCode: '1', country: 'PH' }, paymentMethod: { type: 'credit-card' },
    subtotal: 20, productDiscount: 0, discount: 0, tax: 1.6, shipping: 5, total: 26.6,
    status: 'delivered', paymentStatus: 'captured', paymentFlowVersion: 'manual_capture', amountMinor: 2660, currency: 'usd',
    paymentIntentId: `pi_${new mongoose.Types.ObjectId()}`, deliveredAt: now, refundRequestDeadlineAt: new Date(now.getTime() + 604800000) });
  payment = { id: o.paymentIntentId, status: 'succeeded', amount: 2660, amount_received: 2660, currency: 'usd', livemode: false,
    metadata: { userId: buyer.toString(), sellerId: seller.toString(), draftOrderId: o.id },
    latest_charge: { id: 'ch_test', paid: true, amount: 2660, amount_refunded: 0, disputed: false } };
  const checkout = await CheckoutSession.create({ buyerId: buyer, idempotencyKey: o.id, requestHash: 'h', status: 'placed', expiresAt: now,
    sellers: [{ sellerId: seller, draftOrderId: o._id, amountMinor: 2660, currency: 'usd', paymentIntentId: o.paymentIntentId, status: 'authorized' }] });
  o.checkoutSessionId = checkout.id; await o.save(); payment.metadata.checkoutSessionId = checkout.id;
  return o;
}
async function approve(o: { _id: mongoose.Types.ObjectId }, quantity = 1, reasonCode: 'damaged' | 'other' = 'damaged') {
  const r = await createRefundRequest(o._id.toString(), buyer.toString(), { items: [{ lineId: line.toString(), quantity }], reasonCode, description: 'Broken', idempotencyKey: new mongoose.Types.ObjectId().toString() }, now);
  await decideRefundRequest(r.id, seller.toString(), { decision: 'approve' }, now); return r;
}
function providerRefund(key: string, orderId: string, requestId?: string) {
  return { id: `re_${providerRefunds.length + 1}`, payment_intent: payment.id, amount: 1080, currency: 'usd', status: 'succeeded', livemode: false,
    metadata: { operationKey: key, orderId, ...(requestId ? { refundRequestId: requestId } : {}) } };
}
describe('delivered refund settlement (replica set, Stripe mocked)', () => {
  beforeAll(async () => { await connectIntegrationDb(); await Promise.all([Order.init(), RefundRequest.init(), PaymentOperation.init()]); });
  beforeEach(() => {
    vi.resetAllMocks(); providerRefunds = []; process.env.DELIVERED_REFUNDS_ENABLED = 'true'; process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
    vi.mocked(stripe.retrieveIntentWithCharge).mockImplementation(async () => structuredClone(payment));
    vi.mocked(stripe.listIntentRefunds).mockImplementation(async () => structuredClone(providerRefunds));
    vi.mocked(stripe.retrieveRefund).mockImplementation(async id => structuredClone(providerRefunds.find(r => r.id === id)));
    vi.mocked(stripe.createOrderRefund).mockImplementation(async (_id, _amount, key, orderId, requestId?: string) => {
      const r = { ...providerRefund(key, orderId, requestId), amount: _amount }; providerRefunds.push(r); payment.latest_charge.amount_refunded += r.amount; return structuredClone(r) as unknown as Stripe.Refund;
    });
  });
  afterEach(async () => { delete process.env.DELIVERED_REFUNDS_ENABLED; delete process.env.SELLER_SEES_MANUAL_CAPTURE;
    await Promise.all([Order.deleteMany({}), RefundRequest.deleteMany({}), PaymentOperation.deleteMany({}), CheckoutSession.deleteMany({}), StripeEventInbox.deleteMany({})]); });
  afterAll(async () => { await mongoose.disconnect(); });
  it('settles exactly once, retains delivered fulfillment and does not restore reservations', async () => {
    const o = await fixture(); const r = await approve(o); await processDueOperations('w', now); await processDueOperations('w2', now);
    expect(stripe.createOrderRefund).toHaveBeenCalledTimes(1);
    expect(stripe.createOrderRefund).toHaveBeenCalledWith(o.paymentIntentId, 1080, `refund-request:${r.id}:refund:1`, o.id, r.id);
    expect(await RefundRequest.findById(r.id)).toMatchObject({ state: 'refunded' });
    expect(await Order.findById(o.id)).toMatchObject({ status: 'delivered', total: 26.6, paymentStatus: 'partially_refunded', refundedAmountMinor: 1080, refundReservedAmountMinor: 0 });
    expect((await Order.findById(o.id))!.stockRestoredAt).toBeUndefined();
    expect((await Order.findById(o.id))!.activeRefundRequestId).toBeUndefined();
  });
  it('adds shipping only to the final unit refund and fully refunds the order', async () => {
    const o = await fixture(); await approve(o); await processDueOperations('w', now);
    await approve(o); await processDueOperations('w2', now);
    expect(providerRefunds.map(r => r.amount)).toEqual([1080, 1580]);
    expect(await Order.findById(o.id)).toMatchObject({ refundedAmountMinor: 2660, refundedShippingMinor: 500, refundReservedAmountMinor: 0, refundReservedShippingMinor: 0, paymentStatus: 'refunded' });
    expect((await Order.findById(o.id))!.refundUnitsTaken).toHaveLength(2);
  });
  it('refunds shipping in an all-item request and survives duplicate settlement', async () => {
    const o = await fixture(); const r = await approve(o, 2);
    expect(r).toMatchObject({ amountMinor: 2660, shippingMinor: 500 });
    await processDueOperations('w', now); await reconcileDeliveredRefund(r.id, now);
    expect(stripe.createOrderRefund).toHaveBeenCalledTimes(1);
    expect(await Order.findById(o.id)).toMatchObject({ status: 'delivered', paymentStatus: 'refunded', refundedAmountMinor: 2660, refundedShippingMinor: 500 });
  });
  it('refunds the whole payment including shipping for a one-item seller-fault order', async () => {
    const o = await fixture();
    await Order.updateOne({ _id: o.id }, { $set: { 'items.0.quantity': 1, 'items.0.productPrice': 20 } });
    const r = await approve(o);
    expect(r).toMatchObject({ amountMinor: 2660, shippingMinor: 500 });
    await processDueOperations('w', now);
    expect(providerRefunds.map(r => r.amount)).toEqual([2660]);
    expect(await Order.findById(o.id)).toMatchObject({ status: 'delivered', paymentStatus: 'refunded', refundedShippingMinor: 500 });
  });
  it('keeps shipping when an earlier confirmed request did not establish seller fault', async () => {
    const o = await fixture(); await approve(o, 1, 'other'); await processDueOperations('w', now);
    const last = await approve(o); expect(last).toMatchObject({ amountMinor: 1080, shippingMinor: 0 });
    await processDueOperations('w2', now);
    expect(providerRefunds.map(r => r.amount)).toEqual([1080, 1080]);
    expect(await Order.findById(o.id)).toMatchObject({ refundedAmountMinor: 2160, refundedShippingMinor: 0, paymentStatus: 'partially_refunded' });
  });
  it('verifies the real manual checkout metadata, which has no userId field', async () => {
    const o = await fixture(); const r = await approve(o); delete payment.metadata.userId;
    await processDueOperations('w', now); expect((await RefundRequest.findById(r.id))!.state).toBe('refunded');
  });
  it('reconciles a provider-created refund after the create response was lost', async () => {
    const o = await fixture(); const r = await approve(o);
    providerRefunds.push(providerRefund(`refund-request:${r.id}:refund:1`, o.id, r.id)); payment.latest_charge.amount_refunded = 1080;
    await processDueOperations('fresh-worker', now);
    expect(stripe.createOrderRefund).not.toHaveBeenCalled(); expect((await RefundRequest.findById(r.id))!.state).toBe('refunded');
  });
  it('keeps pending funds reserved and later settles a verified success with the flag off', async () => {
    const o = await fixture(); const r = await approve(o); const refund = providerRefund(`refund-request:${r.id}:refund:1`, o.id, r.id);
    refund.status = 'pending'; providerRefunds.push(refund); await processDueOperations('w', now);
    expect((await RefundRequest.findById(r.id))!.state).toBe('processing'); expect((await Order.findById(o.id))!.refundReservedAmountMinor).toBe(1080);
    refund.status = 'succeeded'; payment.latest_charge.amount_refunded = 1080; process.env.DELIVERED_REFUNDS_ENABLED = 'false';
    await reconcileDeliveredRefund(r.id, new Date(now.getTime() + 61000));
    expect((await RefundRequest.findById(r.id))!.state).toBe('refunded'); expect(stripe.createOrderRefund).not.toHaveBeenCalled();
  });
  it.each(['failed', 'canceled', 'requires_action'])('keeps %s refunds in review without releasing the reservation', async status => {
    const o = await fixture(); const r = await approve(o); const refund = providerRefund(`refund-request:${r.id}:refund:1`, o.id, r.id); refund.status = status; providerRefunds.push(refund);
    await processDueOperations('w', now);
    expect((await RefundRequest.findById(r.id))!.state).toBe('needs_review'); expect((await Order.findById(o.id))!.refundReservedAmountMinor).toBe(1080);
    await reconcileDeliveredRefund(r.id, new Date(now.getTime() + 61000)); expect(stripe.createOrderRefund).not.toHaveBeenCalled();
  });
  it.each(['currency', 'amount', 'dispute', 'live', 'buyer', 'seller'])('fails closed on provider mismatch %s', async type => {
    const o = await fixture(); const r = await approve(o);
    if (type === 'currency') payment.currency = 'eur'; if (type === 'amount') payment.amount_received = 1;
    if (type === 'dispute') payment.latest_charge.disputed = true; if (type === 'live') payment.livemode = true;
    if (type === 'buyer') payment.metadata.userId = 'foreign'; if (type === 'seller') payment.metadata.sellerId = 'foreign';
    await processDueOperations('w', now);
    expect((await RefundRequest.findById(r.id))!.state).toBe('needs_review'); expect(stripe.createOrderRefund).not.toHaveBeenCalled();
  });
  it('does not create a refund if Stripe already has an unrelated refund', async () => {
    const o = await fixture(); const r = await approve(o); providerRefunds.push({ ...providerRefund('external', o.id), amount: 50 }); payment.latest_charge.amount_refunded = 50;
    await processDueOperations('w', now); expect((await RefundRequest.findById(r.id))!.state).toBe('needs_review'); expect(stripe.createOrderRefund).not.toHaveBeenCalled();
  });
  it('retains an ambiguous request for review and can reconcile a later matching refund', async () => {
    const o = await fixture(); const r = await approve(o);
    vi.mocked(stripe.createOrderRefund).mockImplementation(async () => { throw new Error('network response lost'); });
    await processDueOperations('w', now); expect((await RefundRequest.findById(r.id))!.state).toBe('needs_review');
    providerRefunds.push(providerRefund(`refund-request:${r.id}:refund:1`, o.id, r.id)); payment.latest_charge.amount_refunded = 1080;
    await reconcileDeliveredRefund(r.id, new Date(now.getTime() + 61000)); expect((await RefundRequest.findById(r.id))!.state).toBe('refunded');
    expect(stripe.createOrderRefund).toHaveBeenCalledTimes(1);
  });
  it('retries a transient provider read failure before any refund could have been issued', async () => {
    const o = await fixture(); const r = await approve(o);
    vi.mocked(stripe.retrieveIntentWithCharge).mockRejectedValueOnce(new Error('temporary read outage'));
    await processDueOperations('w', now);
    expect((await PaymentOperation.findOne({ refundRequestId: r.id }))!.status).toBe('pending');
    expect((await RefundRequest.findById(r.id))!.state).toBe('processing');
    expect(stripe.createOrderRefund).not.toHaveBeenCalled();
    await processDueOperations('w2', new Date(now.getTime() + 61000));
    expect((await RefundRequest.findById(r.id))!.state).toBe('refunded');
  });
  it('does not let fifty unresolved review requests starve a later recoverable refund', async () => {
    const o = await fixture(); const r = await approve(o);
    const original = (await RefundRequest.findById(r.id))!.toObject();
    await RefundRequest.insertMany(Array.from({ length: 50 }, (_, index) => ({ ...original,
      _id: new mongoose.Types.ObjectId(index.toString(16).padStart(24, '0')), orderId: new mongoose.Types.ObjectId(),
      idempotencyKey: `unresolved-${index}`, state: 'needs_review', updatedAt: new Date(now.getTime() - 86400000),
    })));
    await RefundRequest.updateOne({ _id: r.id }, { $set: { state: 'needs_review' } });
    await PaymentOperation.updateOne({ refundRequestId: r.id }, { $set: { status: 'needs_support' } });
    providerRefunds.push(providerRefund(`refund-request:${r.id}:refund:1`, o.id, r.id)); payment.latest_charge.amount_refunded = 1080;
    await processDueOperations('w', now); await processDueOperations('w2', now);
    expect((await RefundRequest.findById(r.id))!.state).toBe('refunded');
  });
  it('settles concurrent worker/webhook reconciliation once', async () => {
    const o = await fixture(); const r = await approve(o);
    await Promise.all([processDueOperations('w', now), reconcileDeliveredRefund(r.id, now)]);
    expect((await Order.findById(o.id))!.refundedAmountMinor).toBe(1080); expect(stripe.createOrderRefund).toHaveBeenCalledTimes(1);
  });
  it('replays refund events from the durable inbox using current provider state', async () => {
    const o = await fixture(); const r = await approve(o); const refund = providerRefund(`refund-request:${r.id}:refund:1`, o.id, r.id);
    refund.status = 'pending'; providerRefunds.push(refund); await processDueOperations('w', now);
    refund.status = 'succeeded'; payment.latest_charge.amount_refunded = 1080;
    const event = { id: 'evt_refund', type: 'refund.updated', data: { object: refund } } as unknown as Stripe.Event;
    await StripeEventInbox.create({ eventId: event.id, type: event.type, status: 'received', eventObject: stripeEventSnapshot(event) });
    const later = new Date(now.getTime() + 61000);
    expect(await processStripeInboxEvent(event.id, undefined, later)).toBe('processed');
    expect((await RefundRequest.findById(r.id))!.state).toBe('refunded');
    expect(await processStripeInboxEvent(event.id, undefined, later)).toBe('busy');
    expect((await Order.findById(o.id))!.refundedAmountMinor).toBe(1080);
  });
  it('ignores a delayed payment success event after a partial refund', async () => {
    const o = await fixture(); await approve(o); await processDueOperations('w', now);
    await dispatchWebhookEvent({ type: 'payment_intent.succeeded', data: { object: payment } } as Stripe.Event);
    expect((await Order.findById(o.id))!.paymentError?.code).toBeUndefined();
    expect((await Order.findById(o.id))!.paymentStatus).toBe('partially_refunded');
  });
});
