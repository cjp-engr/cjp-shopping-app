import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import mongoose from 'mongoose';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import Coupon from '../../models/Coupon.js';
import Cart from '../../models/Cart.js';
import CheckoutSession from '../../models/CheckoutSession.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import StripeEventInbox from '../../models/StripeEventInbox.js';
import { createCheckoutSession } from '../checkoutService.js';
import { authorizeCheckoutSession } from '../checkoutAuthorization.js';
import { finalizeCheckoutSession } from '../checkoutFinalization.js';
import { acceptOrder } from '../orderAcceptance.js';
import { cancelOrderAsBuyer } from '../orderService.js';
import { scanAcceptanceDeadlines } from '../acceptanceScanner.js';
import { processDueOperations } from '../paymentOperationWorker.js';
import { dispatchWebhookEvent } from '../checkoutWebhook.js';
import { LEASE_MS } from '../paymentOperationPolicy.js';
import { connectIntegrationDb } from './integrationDb.js';
import { PaymentProvider } from './fixtures/paymentProvider.js';
import paymentService from '../paymentService.js';
import * as stripe from '../stripeService.js';

vi.mock('../stripeService.js', async () => ({
  ...await vi.importActual<typeof import('../stripeService.js')>('../stripeService.js'),
  createManualCapturePaymentIntent: vi.fn(), listCustomerIntentsSince: vi.fn(),
  retrieveIntentWithCharge: vi.fn(), retrievePaymentIntent: vi.fn(),
  capturePaymentIntent: vi.fn(), cancelPaymentIntent: vi.fn(),
}));
vi.mock('../paymentService.js', () => ({ default: { getOrCreateCustomerForUser: vi.fn() } }));

const buyer = new mongoose.Types.ObjectId();
const sellerA = new mongoose.Types.ObjectId();
const sellerB = new mongoose.Types.ObjectId();
const DAY = 86400000;
const HOUR = 3600000;
const MARGIN = 300000;
const children = new Set<ChildProcess>();
let provider: PaymentProvider;
let providerOrigin: string;

async function checkout(sellers = [sellerA], authorizationLifetime = 7 * DAY) {
  const products = await Product.create(sellers.map(sellerId => ({
    name: 'Book', description: 'Test book', category: 'Books', price: 20,
    stock: 10, soldCount: 0, image: 'test.png', sellerId,
  })));
  await Coupon.create({ code: 'SAVE', sellerId: sellerA, discountType: 'percentage', discountValue: 10, usedCount: 0, usageLimit: 20 });
  await Cart.create({ userId: buyer, sellers: products.map(product => ({ sellerId: product.sellerId,
    items: [{ product: product._id, price: 20, quantity: 2, isSelected: true }] })) });
  const { session } = await createCheckoutSession(buyer.toString(), `flow-${new mongoose.Types.ObjectId()}`, {
    items: products.map(product => ({ productId: product.id, quantity: 2 })),
    shippingAddress: { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' },
    paymentMethod: { type: 'credit-card' }, couponCodes: { [sellerA.toString()]: 'SAVE' },
  });
  await authorizeCheckoutSession(session, buyer.toString());
  const now = new Date();
  const captureBefore = Math.floor((now.getTime() + authorizationLifetime) / 1000) * 1000;
  for (const intent of provider.intents.values()) intent.latest_charge.payment_method_details.card.capture_before = captureBefore / 1000;
  const placed = await finalizeCheckoutSession(session.id, buyer.toString(), now);
  return { ...placed, products, captureBefore, now };
}

function startProcess(mode: 'accept' | 'cancel' | 'recover', orderId: string, ownerId: string, now = new Date()) {
  const script = fileURLToPath(new URL('./fixtures/payment-process.mjs', import.meta.url));
  const child = spawn(process.execPath, ['--import', 'tsx', script, mode, orderId, ownerId, now.toISOString()], {
    cwd: process.cwd(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, MONGODB_URI: '', STRIPE_SECRET_KEY: '', PAYMENT_TEST_PROVIDER_ORIGIN: providerOrigin,
      SELLER_SEES_MANUAL_CAPTURE: 'true' },
  });
  children.add(child);
  let output = '';
  child.stdout!.on('data', data => { output += data.toString(); });
  child.stderr!.on('data', data => { output += data.toString(); });
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => { children.delete(child); resolve({ code, signal }); });
  });
  return { child, exited, output: () => output };
}
async function recoverInFreshProcess(now = new Date(Date.now() + LEASE_MS + 1000)) {
  const process = startProcess('recover', '-', '-', now);
  const result = await process.exited;
  if (result.code !== 0) throw new Error(`Recovery process failed (${result.code}): ${process.output()}`);
}
async function crashAfterProviderAction(action: 'capture' | 'release' | 'refund', orderId: string, ownerId: string) {
  const acted = provider.blockResponseAfter(action);
  const process = startProcess(action === 'capture' ? 'accept' : 'cancel', orderId, ownerId);
  await Promise.race([acted, process.exited.then(result => { throw new Error(`Process exited before ${action}: ${JSON.stringify(result)} ${process.output()}`); })]);
  process.child.kill('SIGKILL');
  await process.exited;
}

beforeAll(async () => {
  await connectIntegrationDb();
  await Promise.all([Order.init(), Product.init(), Coupon.init(), Cart.init(), CheckoutSession.init(), PaymentOperation.init(), StripeEventInbox.init()]);
});
beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubEnv('SELLER_SEES_MANUAL_CAPTURE', 'true');
  provider = new PaymentProvider();
  providerOrigin = await provider.listen();
  vi.mocked(paymentService.getOrCreateCustomerForUser).mockResolvedValue('cus_flow');
  vi.mocked(stripe.listCustomerIntentsSince).mockResolvedValue([]);
  vi.mocked(stripe.createManualCapturePaymentIntent).mockImplementation(async params => provider.create(params));
  vi.mocked(stripe.retrieveIntentWithCharge).mockImplementation(async id => provider.retrieve(id));
  vi.mocked(stripe.retrievePaymentIntent).mockImplementation(async id => provider.retrieve(id));
  vi.mocked(stripe.capturePaymentIntent).mockImplementation(async (...args) => provider.capture(...args));
  vi.mocked(stripe.cancelPaymentIntent).mockImplementation(async (...args) => provider.release(...args));
});
afterEach(async () => {
  for (const child of children) { const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited; }
  await provider.close();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await Promise.all([Order.deleteMany({}), Product.deleteMany({}), Coupon.deleteMany({}), Cart.deleteMany({}), CheckoutSession.deleteMany({}), PaymentOperation.deleteMany({}), StripeEventInbox.deleteMany({})]);
});
afterAll(async () => { await mongoose.disconnect(); });

describe('checkout through settlement with real database transactions', () => {
  it('keeps seller payments separate when duplicate accepts race another seller cancellation', async () => {
    const { orders, products } = await checkout([sellerA, sellerB]);
    const a = orders.find(order => order.sellerId!.equals(sellerA))!;
    const b = orders.find(order => order.sellerId!.equals(sellerB))!;
    expect(provider.captures).toHaveLength(0);
    const results = await Promise.allSettled([
      acceptOrder({ orderId: a._id.toString(), sellerId: sellerA.toString() }),
      acceptOrder({ orderId: a._id.toString(), sellerId: sellerA.toString() }),
      cancelOrderAsBuyer(b._id.toString(), buyer.toString()),
    ]);
    expect(results.slice(0, 2).some(result => result.status === 'fulfilled')).toBe(true);
    for (const result of results.slice(0, 2)) {
      if (result.status === 'rejected') expect(result.reason.code).toBe('order_not_pending');
    }
    expect(results[2].status).toBe('fulfilled');
    expect((await Order.findById(a._id))!).toMatchObject({ status: 'preparing', paymentStatus: 'captured' });
    expect((await Order.findById(b._id))!).toMatchObject({ status: 'cancelled', paymentStatus: 'released' });
    expect(provider.captures.map(call => call.id)).toEqual([a.paymentIntentId]);
    expect(provider.releases.map(call => call.id)).toEqual([b.paymentIntentId]);
    for (const product of products) expect((await Product.findById(product.id))!.stock).toBe(product.sellerId!.equals(sellerA) ? 8 : 10);
    expect((await Coupon.findOne({ code: 'SAVE' }))!.usedCount).toBe(1);
    expect((await Cart.findOne({ userId: buyer }))!.sellers).toHaveLength(0);
  });

  it.each([7 * DAY, 2 * HOUR])('persists and enforces the exact deadline for a %i ms authorization', async lifetime => {
    const { orders: [order], products: [product], now, captureBefore } = await checkout([sellerA], lifetime);
    const deadline = Math.min(now.getTime() + DAY, captureBefore - MARGIN);
    expect(order.acceptBy!.getTime()).toBe(deadline);
    expect((await scanAcceptanceDeadlines(new Date(deadline - 1))).cancelled).toBe(0);
    await expect(acceptOrder({ orderId: order._id.toString(), sellerId: sellerA.toString(), now: new Date(deadline) }))
      .rejects.toMatchObject({ code: 'acceptance_deadline_passed' });
    const scans = await Promise.all([scanAcceptanceDeadlines(new Date(deadline)), scanAcceptanceDeadlines(new Date(deadline))]);
    expect(scans.reduce((sum, scan) => sum + scan.cancelled, 0)).toBe(1);
    expect((await Order.findById(order._id))!.paymentStatus).toBe('released');
    expect((await Product.findById(product.id))!.stock).toBe(10);
    expect((await Coupon.findOne({ code: 'SAVE' }))!.usedCount).toBe(0);
    expect(provider.captures).toHaveLength(0);
    expect(provider.releases).toHaveLength(1);
  });

  it('keeps acceptance just before the earlier deadline when the scanner runs afterwards', async () => {
    const { orders: [order], products: [product] } = await checkout([sellerA], 2 * HOUR);
    await acceptOrder({ orderId: order._id.toString(), sellerId: sellerA.toString(), now: new Date(order.acceptBy!.getTime() - 1) });
    expect((await scanAcceptanceDeadlines(order.acceptBy!)).cancelled).toBe(0);
    expect((await Order.findById(order._id))!.status).toBe('preparing');
    expect((await Product.findById(product.id))!.stock).toBe(8);
    expect(provider.captures).toHaveLength(1);
    expect(provider.releases).toHaveLength(0);
  });

  it('cancels an unexpectedly expired hold once when acceptance races a cancellation webhook', async () => {
    const { orders: [order], products: [product] } = await checkout();
    const intent = provider.intents.get(order.paymentIntentId!)!;
    intent.status = 'canceled';
    await Promise.allSettled([
      acceptOrder({ orderId: order._id.toString(), sellerId: sellerA.toString() }),
      dispatchWebhookEvent({ type: 'payment_intent.canceled', data: { object: structuredClone(intent) } } as any),
    ]);
    expect((await Order.findById(order._id))!).toMatchObject({ status: 'cancelled', paymentStatus: 'released' });
    expect((await Product.findById(product.id))!.stock).toBe(10);
    expect((await Coupon.findOne({ code: 'SAVE' }))!.usedCount).toBe(0);
    expect(provider.captures).toHaveLength(0);
  });

  it('retries a definitively rejected acceptance with the next generation and no extra reservation', async () => {
    const { orders: [order], products: [product] } = await checkout();
    vi.mocked(stripe.capturePaymentIntent).mockRejectedValueOnce(new stripe.StripeError('declined', Object.assign(new Error('declined'), { statusCode: 402 })));
    await expect(acceptOrder({ orderId: order._id.toString(), sellerId: sellerA.toString() })).rejects.toMatchObject({ code: 'capture_failed' });
    expect((await Order.findById(order._id))!.paymentStatus).toBe('authorized');
    await acceptOrder({ orderId: order._id.toString(), sellerId: sellerA.toString() });
    expect(provider.captures).toEqual([{ id: order.paymentIntentId, key: `order:${order._id}:capture:2` }]);
    expect((await Product.findById(product.id))!.stock).toBe(8);
    expect((await Coupon.findOne({ code: 'SAVE' }))!.usedCount).toBe(1);
  });

  it('reconciles a lost capture response before two retry workers can capture again', async () => {
    const { orders: [order] } = await checkout();
    vi.mocked(stripe.capturePaymentIntent).mockImplementationOnce(async (...args) => {
      provider.capture(...args);
      vi.mocked(stripe.retrieveIntentWithCharge).mockRejectedValueOnce(new Error('network unavailable'));
      throw new Error('capture response lost');
    });
    expect((await acceptOrder({ orderId: order._id.toString(), sellerId: sellerA.toString() })).kind).toBe('resolving');
    const operation = (await PaymentOperation.findOne({ action: 'capture' }))!;
    const retryAt = new Date(operation.nextAttemptAt!.getTime() + 1);
    await Promise.all([processDueOperations('retry-a', retryAt), processDueOperations('retry-b', retryAt)]);
    expect((await Order.findById(order._id))!.paymentStatus).toBe('captured');
    expect(provider.captures).toHaveLength(1);
    expect(stripe.capturePaymentIntent).toHaveBeenCalledTimes(1);
  });

  it('recovers a database write failure after capture without charging again', async () => {
    const { orders: [order] } = await checkout();
    const original = Order.findOneAndUpdate.bind(Order);
    const update = vi.spyOn(Order, 'findOneAndUpdate').mockImplementation(((filter: any, ...args: any[]) => {
      if (filter.amountMinor !== undefined) throw new Error('database unavailable after capture');
      return (original as any)(filter, ...args);
    }) as any);
    await expect(acceptOrder({ orderId: order._id.toString(), sellerId: sellerA.toString() })).rejects.toThrow('database unavailable');
    update.mockRestore();
    await processDueOperations('restart', new Date(Date.now() + LEASE_MS + 1000));
    expect((await Order.findById(order._id))!.paymentStatus).toBe('captured');
    expect(provider.captures).toHaveLength(1);
  });
});

describe('real process crashes and fresh-process recovery', () => {
  it('recovers a capture made before the accepting process was killed', async () => {
    const { orders: [order], products: [product] } = await checkout();
    await crashAfterProviderAction('capture', order._id.toString(), sellerA.toString());
    expect((await Order.findById(order._id))!.paymentStatus).toBe('capture_pending');
    expect((await PaymentOperation.findOne({ action: 'capture' }))!.status).toBe('in_progress');
    await recoverInFreshProcess();
    expect((await Order.findById(order._id))!).toMatchObject({ status: 'preparing', paymentStatus: 'captured' });
    expect((await PaymentOperation.findOne({ action: 'capture' }))!.status).toBe('succeeded');
    expect((await Product.findById(product.id))!.stock).toBe(8);
    expect(provider.captures).toHaveLength(1);
  });

  it('recovers release after the cancelling process dies without restoring stock or coupons twice', async () => {
    const { orders: [order], products: [product] } = await checkout();
    await crashAfterProviderAction('release', order._id.toString(), buyer.toString());
    expect((await Order.findById(order._id))!.paymentStatus).toBe('release_pending');
    await recoverInFreshProcess();
    await recoverInFreshProcess();
    expect((await Order.findById(order._id))!).toMatchObject({ status: 'cancelled', paymentStatus: 'released' });
    expect((await Product.findById(product.id))!.stock).toBe(10);
    expect((await Coupon.findOne({ code: 'SAVE' }))!.usedCount).toBe(0);
    expect(provider.releases).toHaveLength(1);
  });

  it('finds a legacy refund created before its response was lost on process death', async () => {
    const { orders: [order], products: [product] } = await checkout();
    const intent = provider.intents.get(order.paymentIntentId!)!;
    Object.assign(intent, { status: 'succeeded', amount_received: intent.amount, metadata: { userId: buyer.toString() } });
    await Order.updateOne({ _id: order._id }, { $set: { paymentFlowVersion: 'legacy', paymentStatus: 'captured' } });
    await crashAfterProviderAction('refund', order._id.toString(), buyer.toString());
    expect((await Order.findById(order._id))!.paymentStatus).toBe('refund_pending');
    await recoverInFreshProcess();
    expect((await Order.findById(order._id))!).toMatchObject({ status: 'cancelled', paymentStatus: 'refunded', refundId: provider.refunds[0].id });
    expect((await PaymentOperation.findOne({ action: 'refund' }))!.status).toBe('succeeded');
    expect((await Product.findById(product.id))!.stock).toBe(10);
    expect(provider.refundCalls).toHaveLength(1);
  });

  it('replays a persisted interrupted webhook in a new process without recapturing', async () => {
    const { orders: [order] } = await checkout();
    provider.capture(order.paymentIntentId!, order.amountMinor!, 'already-captured');
    await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: 'capture_pending' } });
    await StripeEventInbox.create({ eventId: 'evt_restart_flow', type: 'payment_intent.succeeded', status: 'processing', attempts: 1,
      leaseOwner: 'dead-server', leaseExpiresAt: new Date(0), eventObject: { id: order.paymentIntentId, metadata: provider.intents.get(order.paymentIntentId!)!.metadata } });
    await recoverInFreshProcess(new Date());
    expect((await Order.findById(order._id))!.paymentStatus).toBe('captured');
    expect((await StripeEventInbox.findOne({ eventId: 'evt_restart_flow' }))!).toMatchObject({ status: 'processed', attempts: 2 });
    expect(provider.captures).toHaveLength(1);
  });

  it.each([7 * DAY, 2 * HOUR])('catches up an overdue order after restart with a %i ms authorization', async lifetime => {
    const { orders: [order], products: [product] } = await checkout([sellerA], lifetime);
    await recoverInFreshProcess(new Date(order.acceptBy!.getTime() + HOUR));
    expect((await Order.findById(order._id))!).toMatchObject({ status: 'cancelled', paymentStatus: 'released' });
    expect((await Product.findById(product.id))!.stock).toBe(10);
    expect(provider.captures).toHaveLength(0);
    expect(provider.releases).toHaveLength(1);
  });
});
