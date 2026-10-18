import { beforeAll, beforeEach, afterAll, afterEach, it, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import Coupon from '../../models/Coupon.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import { connectIntegrationDb } from './integrationDb.js';
import { acceptOrder } from '../orderAcceptance.js';
import { cancelOrderAsBuyer } from '../orderService.js';
import { inspectLegacyPayment } from '../legacyPayments.js';
import { processDueOperations } from '../paymentOperationWorker.js';
import paymentService from '../paymentService.js';
import { updateSellerOrderStatus } from '../sellerService.js';
import { reconcileLegacyPayments } from '../../utils/migrations/reconcileLegacyPayments.js';
import * as stripe from '../stripeService.js';

vi.mock('../stripeService.js', async () => ({
  ...await vi.importActual<typeof import('../stripeService.js')>('../stripeService.js'),
  retrieveIntentWithCharge: vi.fn(), listIntentRefunds: vi.fn(), createOrderRefund: vi.fn(),
  retrieveRefund: vi.fn(), capturePaymentIntent: vi.fn(), cancelPaymentIntent: vi.fn(),
}));
const buyer = new mongoose.Types.ObjectId();
const seller = new mongoose.Types.ObjectId();
async function fixture(extra: Record<string, unknown> = {}) {
  const product = await Product.create({ name: 'Item', description: 'd', category: 'Books', price: 20, stock: 8, soldCount: 2, image: 'i', sellerId: seller });
  const order = await Order.create({ userId: buyer, items: [{ product: product._id, productName: 'Item', productPrice: 20, productImage: 'i', quantity: 2 }], shippingAddress: { street: '1', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' }, paymentMethod: { type: 'credit-card' }, subtotal: 40, discount: 0, tax: 0, shipping: 0, total: 40, status: 'pending', paymentIntentId: `pi_${new mongoose.Types.ObjectId()}`, ...extra });
  return { order, product };
}
function paid(order: any, extra = {}) {
  return { id: order.paymentIntentId, status: 'succeeded', amount: 4000, amount_received: 4000, currency: 'usd', metadata: { userId: buyer.toString() }, latest_charge: { id: 'ch_paid', paid: true, amount: 4000, amount_refunded: 0, refunded: false, created: 1700000000 }, ...extra } as any;
}
beforeAll(async () => { await connectIntegrationDb(); await Promise.all([Order.init(), Product.init(), PaymentOperation.init(), Coupon.init()]); });
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(stripe.listIntentRefunds).mockResolvedValue([]);
  vi.mocked(stripe.createOrderRefund).mockImplementation(async (pi: string, amount: number, key: string, orderId: string) => ({ id: 're_full', payment_intent: pi, amount, currency: 'usd', metadata: { orderId, operationKey: key }, status: 'succeeded' }) as any);
});
afterEach(async () => { await Promise.all([Order.deleteMany({}), Product.deleteMany({}), PaymentOperation.deleteMany({}), Coupon.deleteMany({})]); });
afterAll(async () => { await mongoose.disconnect(); });

it('blocks seller cancellation of legacy cards until the seller refund path is implemented', async () => {
  const { order, product } = await fixture();
  await expect(updateSellerOrderStatus(order.id, seller.toString(), 'cancelled')).rejects.toMatchObject({ code: 'cancellation_unavailable' });
  expect((await Order.findById(order.id))!.status).toBe('pending');
  expect((await Product.findById(product.id))!.stock).toBe(8);
});
it('audit defaults to read-only and apply preserves fulfillment and adds no deadline or refund', async () => {
  const { order } = await fixture({ status: 'processing' });
  vi.mocked(stripe.retrieveIntentWithCharge).mockResolvedValue(paid(order));
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  try {
    expect(await reconcileLegacyPayments()).toMatchObject({ checked: 1, updated: 0 });
    expect((await Order.findById(order.id))!.paymentStatus).toBeUndefined();
    expect(await reconcileLegacyPayments(true)).toMatchObject({ checked: 1, updated: 1 });
    const stored = (await Order.findById(order.id))!;
    expect(stored).toMatchObject({ status: 'processing', paymentStatus: 'captured', amountMinor: 4000 });
    expect(stored.acceptBy).toBeUndefined();
    expect(await PaymentOperation.countDocuments()).toBe(0);
    expect(stripe.createOrderRefund).not.toHaveBeenCalled();
  } finally { log.mockRestore(); }
});
it('flags historical cancelled payments without automatically refunding or restoring inventory', async () => {
  const { order, product } = await fixture({ status: 'cancelled' });
  vi.mocked(stripe.retrieveIntentWithCharge).mockResolvedValue(paid(order));
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  try { expect(await reconcileLegacyPayments(true)).toMatchObject({ review: 1 }); }
  finally { log.mockRestore(); }
  expect((await Order.findById(order.id))!.paymentError?.code).toBe('legacy_payment_review');
  expect((await Product.findById(product.id))!.stock).toBe(8);
  expect(stripe.createOrderRefund).not.toHaveBeenCalled();
});

it('verifies a historic charge and accepts without capturing or adding a deadline', async () => {
  const { order } = await fixture();
  vi.mocked(stripe.retrieveIntentWithCharge).mockResolvedValue(paid(order));
  const result = await acceptOrder({ orderId: order.id, sellerId: seller.toString() });
  expect(result.order).toMatchObject({ status: 'preparing', paymentStatus: 'captured', amountMinor: 4000 });
  expect(result.order.acceptBy).toBeUndefined();
  expect(stripe.capturePaymentIntent).not.toHaveBeenCalled();
  await expect(cancelOrderAsBuyer(order.id, buyer.toString())).rejects.toMatchObject({ statusCode: 409 });
});
it('refuses a shared historical intent without calling Stripe or refunding either order', async () => {
  // A pre-index legacy database can contain duplicates. Drop only this test database index.
  await Order.collection.dropIndex('paymentIntentId_1');
  try {
    const { order } = await fixture();
    const { order: duplicate } = await fixture({ paymentIntentId: order.paymentIntentId });
    expect((await inspectLegacyPayment(order)).kind).toBe('review');
    expect(stripe.retrieveIntentWithCharge).not.toHaveBeenCalled();
    expect(stripe.createOrderRefund).not.toHaveBeenCalled();
    await Order.deleteOne({ _id: duplicate._id });
  } finally { await Order.deleteMany({}); await Order.collection.createIndex({ paymentIntentId: 1 }, { unique: true, sparse: true }); }
});
it('refuses another buyer before inspecting or refunding the payment', async () => {
  const { order } = await fixture();
  await expect(cancelOrderAsBuyer(order.id, new mongoose.Types.ObjectId().toString())).rejects.toMatchObject({ statusCode: 403 });
  expect(stripe.retrieveIntentWithCharge).not.toHaveBeenCalled();
  expect(stripe.createOrderRefund).not.toHaveBeenCalled();
});
it.each(['missing', 'amount', 'buyer', 'unpaid', 'refunded'])('blocks acceptance and refund of an unsafe %s reference', async kind => {
  const { order } = await fixture(kind === 'missing' ? { paymentIntentId: undefined } : {});
  const intent = paid(order);
  if (kind === 'amount') intent.amount_received = 5000;
  if (kind === 'buyer') intent.metadata.userId = new mongoose.Types.ObjectId().toString();
  if (kind === 'unpaid') intent.status = 'requires_payment_method';
  if (kind === 'refunded') intent.latest_charge.amount_refunded = 4000;
  vi.mocked(stripe.retrieveIntentWithCharge).mockResolvedValue(intent);
  await expect(acceptOrder({ orderId: order.id, sellerId: seller.toString() })).rejects.toMatchObject({ statusCode: 409 });
  await expect(cancelOrderAsBuyer(order.id, buyer.toString())).rejects.toMatchObject({ statusCode: 409 });
  expect(stripe.capturePaymentIntent).not.toHaveBeenCalled();
  expect(stripe.createOrderRefund).not.toHaveBeenCalled();
});
it('refunds a pending legacy cancellation once and restores reservations once', async () => {
  const { order, product } = await fixture({ couponCode: 'SAVE10' });
  const coupon = await Coupon.create({ code: 'SAVE10', sellerId: seller, discountType: 'percentage', discountValue: 10, usageLimit: 5, usedCount: 1 });
  vi.mocked(stripe.retrieveIntentWithCharge).mockResolvedValue(paid(order));
  expect((await cancelOrderAsBuyer(order.id, buyer.toString())).paymentStatus).toBe('refunded');
  await cancelOrderAsBuyer(order.id, buyer.toString());
  expect(stripe.createOrderRefund).toHaveBeenCalledExactlyOnceWith(order.paymentIntentId, 4000, `order:${order.id}:refund:1`, order.id);
  expect((await Product.findById(product.id))!.stock).toBe(10);
  expect((await Product.findById(product.id))!.soldCount).toBe(0);
  expect((await Coupon.findById(coupon.id))!.usedCount).toBe(0);
  expect(await PaymentOperation.countDocuments({ action: 'refund' })).toBe(1);
  expect(stripe.cancelPaymentIntent).not.toHaveBeenCalled();
  await expect(acceptOrder({ orderId: order.id, sellerId: seller.toString() })).rejects.toMatchObject({ statusCode: 409 });
});
it('cannot refund after preparation and lets only acceptance or cancellation win a race', async () => {
  const { order } = await fixture();
  vi.mocked(stripe.retrieveIntentWithCharge).mockResolvedValue(paid(order));
  const results = await Promise.allSettled([acceptOrder({ orderId: order.id, sellerId: seller.toString() }), cancelOrderAsBuyer(order.id, buyer.toString())]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  const stored = (await Order.findById(order.id))!;
  expect(stripe.createOrderRefund).toHaveBeenCalledTimes(stored.status === 'cancelled' ? 1 : 0);
  expect(stripe.capturePaymentIntent).not.toHaveBeenCalled();
});
it('reconciles a lost refund response before retrying, even after the idempotency window', async () => {
  const { order } = await fixture();
  vi.mocked(stripe.retrieveIntentWithCharge).mockResolvedValue(paid(order));
  vi.mocked(stripe.createOrderRefund).mockRejectedValueOnce(new Error('response lost'));
  expect((await cancelOrderAsBuyer(order.id, buyer.toString())).paymentStatus).toBe('refund_pending');
  const key = `order:${order.id}:refund:1`;
  vi.mocked(stripe.listIntentRefunds).mockResolvedValue([{ id: 're_found', payment_intent: order.paymentIntentId, amount: 4000, currency: 'usd', metadata: { orderId: order.id, operationKey: key }, status: 'succeeded' }] as any);
  await processDueOperations('retry', new Date(Date.now() + 86400000));
  expect((await Order.findById(order.id))!.paymentStatus).toBe('refunded');
  expect(stripe.createOrderRefund).toHaveBeenCalledTimes(1);
});
it('polls an existing pending refund without submitting it again', async () => {
  const { order } = await fixture();
  vi.mocked(stripe.retrieveIntentWithCharge).mockResolvedValue(paid(order));
  vi.mocked(stripe.createOrderRefund).mockResolvedValueOnce({ id: 're_pending', payment_intent: order.paymentIntentId, amount: 4000, currency: 'usd', status: 'pending' } as any);
  expect((await cancelOrderAsBuyer(order.id, buyer.toString())).paymentStatus).toBe('refund_pending');
  vi.mocked(stripe.retrieveRefund).mockResolvedValueOnce({ id: 're_pending', payment_intent: order.paymentIntentId, amount: 4000, currency: 'usd', status: 'succeeded' } as any);
  await processDueOperations('poll', new Date(Date.now() + 60000));
  expect((await Order.findById(order.id))!.paymentStatus).toBe('refunded');
  expect(stripe.createOrderRefund).toHaveBeenCalledTimes(1);
});
it('continues polling when Stripe already includes the pending refund in amount_refunded', async () => {
  const { order } = await fixture();
  vi.mocked(stripe.retrieveIntentWithCharge).mockResolvedValue(paid(order));
  const refund = { id: 're_pending', payment_intent: order.paymentIntentId, amount: 4000, currency: 'usd', status: 'pending', metadata: { orderId: order.id, operationKey: `order:${order.id}:refund:1` } } as any;
  vi.mocked(stripe.createOrderRefund).mockResolvedValueOnce(refund);
  await cancelOrderAsBuyer(order.id, buyer.toString());
  const updated = paid(order); updated.latest_charge.amount_refunded = 4000;
  vi.mocked(stripe.retrieveIntentWithCharge).mockResolvedValue(updated);
  vi.mocked(stripe.listIntentRefunds).mockResolvedValue([refund]);
  await processDueOperations('pending', new Date(Date.now() + 60000));
  expect((await PaymentOperation.findOne({ orderId: order.id }))!.status).toBe('pending');
  expect(stripe.createOrderRefund).toHaveBeenCalledTimes(1);
});
it.each(['failed', 'canceled', 'requires_action'])('flags a %s refund instead of issuing a replacement', async status => {
  const { order } = await fixture();
  vi.mocked(stripe.retrieveIntentWithCharge).mockResolvedValue(paid(order));
  vi.mocked(stripe.createOrderRefund).mockResolvedValueOnce({ id: 're_failed', payment_intent: order.paymentIntentId, amount: 4000, currency: 'usd', status } as any);
  const result = await cancelOrderAsBuyer(order.id, buyer.toString());
  expect(result).toMatchObject({ status: 'cancelled', paymentStatus: 'refund_pending' });
  expect(result.paymentError?.code).toBe('refund_review');
  await processDueOperations('retry', new Date(Date.now() + 60000));
  expect(stripe.createOrderRefund).toHaveBeenCalledTimes(1);
});
it('does not submit a new refund outside the safe retry window', async () => {
  const { order } = await fixture();
  vi.mocked(stripe.retrieveIntentWithCharge).mockResolvedValue(paid(order));
  vi.mocked(stripe.createOrderRefund).mockRejectedValueOnce(new Error('lost response'));
  await cancelOrderAsBuyer(order.id, buyer.toString());
  await processDueOperations('old', new Date(Date.now() + 86400000));
  expect((await PaymentOperation.findOne({ orderId: order.id }))!.status).toBe('needs_support');
  expect((await Order.findById(order.id))!.paymentError?.code).toBe('refund_review');
  expect(stripe.createOrderRefund).toHaveBeenCalledTimes(1);
});
it('refuses an unrelated partial refund and exposes review without another refund', async () => {
  const { order } = await fixture();
  vi.mocked(stripe.retrieveIntentWithCharge).mockResolvedValue(paid(order));
  vi.mocked(stripe.listIntentRefunds).mockResolvedValue([{ id: 're_other', amount: 1000, status: 'pending', metadata: {} }] as any);
  const result = await inspectLegacyPayment(order);
  expect(result.kind).toBe('review');
  expect(stripe.createOrderRefund).not.toHaveBeenCalled();
});
it('late legacy success webhooks classify payment without advancing fulfillment', async () => {
  const { order } = await fixture();
  vi.mocked(stripe.retrieveIntentWithCharge).mockResolvedValue(paid(order));
  await paymentService.handlePaymentIntentSucceeded(order.paymentIntentId!);
  expect((await Order.findById(order.id))!).toMatchObject({ status: 'pending', paymentStatus: 'captured' });
});
