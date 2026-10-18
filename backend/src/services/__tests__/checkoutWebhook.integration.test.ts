import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import type Stripe from 'stripe';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Coupon from '../../models/Coupon.js';
import CheckoutSession from '../../models/CheckoutSession.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import { createCheckoutSession } from '../checkoutService.js';
import { dispatchWebhookEvent } from '../checkoutWebhook.js';
import { cancelPaymentIntent, retrieveIntentWithCharge, retrievePaymentIntent } from '../stripeService.js';
import { connectIntegrationDb } from './integrationDb.js';

vi.mock('../stripeService.js', async () => {
  const actual = await vi.importActual<typeof import('../stripeService.js')>('../stripeService.js');
  return {
    ...actual,
    createManualCapturePaymentIntent: vi.fn(),
    listCustomerIntentsSince: vi.fn().mockResolvedValue([]),
    retrievePaymentIntent: vi.fn(),
    retrieveIntentWithCharge: vi.fn(),
    cancelPaymentIntent: vi.fn(),
  };
});

vi.mock('../paymentService.js', async () => {
  const actual = await vi.importActual<typeof import('../paymentService.js')>('../paymentService.js');
  return actual;
});

const buyer = new mongoose.Types.ObjectId();
const seller = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };

function event(type: string, object: Record<string, unknown>): Stripe.Event {
  return { id: `evt_${Math.random()}`, type, data: { object } } as unknown as Stripe.Event;
}

async function makeSession(key: string, status: 'open' | 'placed' | 'failed' | 'expired' = 'open', expired = false) {
  const product = await Product.create({ name: 'Item', description: 'd', category: 'Books', price: 20, stock: 10, image: 'i.png', sellerId: seller });
  const { session } = await createCheckoutSession(buyer.toString(), key, {
    items: [{ productId: product._id.toString(), quantity: 2 }],
    shippingAddress: address,
    paymentMethod: { type: 'credit-card' },
  });
  const sellerEntry = session.sellers[0];
  const intentId = `pi_${key}`;
  await CheckoutSession.updateOne(
    { _id: session._id, 'sellers.draftOrderId': sellerEntry.draftOrderId },
    { $set: { 'sellers.$.paymentIntentId': intentId, status, ...(expired ? { expiresAt: new Date(Date.now() - 60_000) } : {}) } },
  );
  await Order.updateOne({ _id: sellerEntry.draftOrderId }, { $set: { paymentIntentId: intentId } });
  return {
    sessionId: session._id.toString(),
    draftOrderId: sellerEntry.draftOrderId,
    productId: product._id,
    intentId,
    intentObject: {
      id: intentId,
      object: 'payment_intent',
      metadata: {
        checkoutSessionId: session._id.toString(),
        sellerId: seller.toString(),
        draftOrderId: sellerEntry.draftOrderId.toString(),
      },
    },
  };
}

async function stockOf(id: mongoose.Types.ObjectId) {
  return (await Product.findById(id).lean())!.stock;
}

describe('manual-capture webhook rules (replica set, Stripe mocked)', () => {
  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), CheckoutSession.init(), Coupon.init(), PaymentOperation.init()]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(cancelPaymentIntent).mockImplementation(async (id: string) => ({ id, status: 'canceled' }));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all([
      Product.deleteMany({}),
      Order.deleteMany({}),
      CheckoutSession.deleteMany({}),
      Coupon.deleteMany({}),
      PaymentOperation.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  async function placeOrder(s: Awaited<ReturnType<typeof makeSession>>, fields: Record<string, unknown>) {
    await Order.updateOne({ _id: s.draftOrderId }, { $set: fields });
    return (await Order.findById(s.draftOrderId).lean())!;
  }

  function succeededIntent(s: Awaited<ReturnType<typeof makeSession>>, amountReceived: number) {
    return { id: s.intentId, status: 'succeeded', amount_received: amountReceived, metadata: s.intentObject.metadata } as any;
  }

  it('finishes a started acceptance when the success event arrives for a capture_pending order', async () => {
    const s = await makeSession('key-wh-0001', 'placed');
    const order = await placeOrder(s, { status: 'pending', paymentStatus: 'capture_pending' });
    vi.mocked(retrieveIntentWithCharge).mockResolvedValue(succeededIntent(s, order.amountMinor!));

    await dispatchWebhookEvent(event('payment_intent.succeeded', { ...s.intentObject }));

    const after = await Order.findById(s.draftOrderId).lean();
    expect(retrieveIntentWithCharge).toHaveBeenCalledWith(s.intentId);
    expect(after!.status).toBe('preparing');
    expect(after!.paymentStatus).toBe('captured');
    expect(after!.paymentError?.code).toBeUndefined();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('does not finalize on a success event whose retrieved Stripe state is not a full capture', async () => {
    const s = await makeSession('key-wh-0001b', 'placed');
    const order = await placeOrder(s, { status: 'pending', paymentStatus: 'capture_pending' });
    vi.mocked(retrieveIntentWithCharge).mockResolvedValue(succeededIntent(s, order.amountMinor! - 1));

    await dispatchWebhookEvent(event('payment_intent.succeeded', { ...s.intentObject }));

    const after = await Order.findById(s.draftOrderId).lean();
    expect(after!.status).toBe('pending');
    expect(after!.paymentStatus).toBe('capture_pending');
  });

  it('ignores a duplicate success event for an order that is already captured', async () => {
    const s = await makeSession('key-wh-0001c', 'placed');
    const order = await placeOrder(s, { status: 'preparing', paymentStatus: 'captured', capturedAt: new Date() });
    vi.mocked(retrieveIntentWithCharge).mockResolvedValue(succeededIntent(s, order.amountMinor!));

    await dispatchWebhookEvent(event('payment_intent.succeeded', { ...s.intentObject }));

    const after = await Order.findById(s.draftOrderId).lean();
    expect(after!.status).toBe('preparing');
    expect(after!.paymentStatus).toBe('captured');
    expect(after!.paymentError).toBeUndefined();
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([
    ['authorized', { status: 'pending', paymentStatus: 'authorized' }],
    ['cancelled', { status: 'cancelled', paymentStatus: 'released' }],
    ['release_pending', { status: 'cancelled', paymentStatus: 'release_pending' }],
  ])('alerts without changing fulfillment when a success event arrives for a %s order', async (label, fields) => {
    const s = await makeSession(`key-wh-0001-${label}`, 'placed');
    const order = await placeOrder(s, fields);
    vi.mocked(retrieveIntentWithCharge).mockResolvedValue(succeededIntent(s, order.amountMinor!));

    await dispatchWebhookEvent(event('payment_intent.succeeded', { ...s.intentObject }));

    const after = await Order.findById(s.draftOrderId).lean();
    expect(after!.status).toBe(fields.status);
    expect(after!.paymentStatus).toBe(fields.paymentStatus);
    expect(after!.paymentError?.code).toBe('unexpected_capture');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('ALERT'));
  });

  it('logs and returns normally when a success event arrives before any order has its intent id', async () => {
    const s = await makeSession('key-wh-0001d', 'placed');
    await Order.updateOne({ _id: s.draftOrderId }, { $unset: { paymentIntentId: '' } });
    vi.mocked(retrieveIntentWithCharge).mockResolvedValue(succeededIntent(s, 4000));

    await expect(dispatchWebhookEvent(event('payment_intent.succeeded', { ...s.intentObject }))).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining(s.intentId));
    const after = await Order.findById(s.draftOrderId).lean();
    expect(after!.paymentError).toBeUndefined();
  });

  it('cancels a pending authorized order with authorization_expired once and restores stock once', async () => {
    const s = await makeSession('key-wh-0009', 'placed');
    await placeOrder(s, { status: 'pending', paymentStatus: 'authorized' });
    expect(await stockOf(s.productId)).toBe(8);
    vi.mocked(retrieveIntentWithCharge).mockResolvedValue({ id: s.intentId, status: 'canceled' } as any);

    await dispatchWebhookEvent(event('payment_intent.canceled', { ...s.intentObject }));
    await dispatchWebhookEvent(event('payment_intent.canceled', { ...s.intentObject }));

    const after = await Order.findById(s.draftOrderId).lean();
    expect(after!.status).toBe('cancelled');
    expect(after!.cancelReason).toBe('authorization_expired');
    expect(await stockOf(s.productId)).toBe(10);
  });

  it('leaves the order alone on a canceled event when Stripe does not report the intent canceled', async () => {
    const s = await makeSession('key-wh-0010', 'placed');
    await placeOrder(s, { status: 'pending', paymentStatus: 'authorized' });
    vi.mocked(retrieveIntentWithCharge).mockResolvedValue({ id: s.intentId, status: 'requires_capture' } as any);

    await dispatchWebhookEvent(event('payment_intent.canceled', { ...s.intentObject }));

    const after = await Order.findById(s.draftOrderId).lean();
    expect(after!.status).toBe('pending');
    expect(after!.paymentStatus).toBe('authorized');
  });

  it('leaves a capture_pending order alone on a canceled event: its operation owns it', async () => {
    const s = await makeSession('key-wh-0011', 'placed');
    await placeOrder(s, { status: 'pending', paymentStatus: 'capture_pending' });
    vi.mocked(retrieveIntentWithCharge).mockResolvedValue({ id: s.intentId, status: 'canceled' } as any);

    await dispatchWebhookEvent(event('payment_intent.canceled', { ...s.intentObject }));

    const after = await Order.findById(s.draftOrderId).lean();
    expect(after!.status).toBe('pending');
    expect(after!.paymentStatus).toBe('capture_pending');
    expect(await stockOf(s.productId)).toBe(8);
  });

  it('leaves a placed preparing order alone on a canceled event', async () => {
    const s = await makeSession('key-wh-0012', 'placed');
    await placeOrder(s, { status: 'preparing', paymentStatus: 'captured' });
    vi.mocked(retrieveIntentWithCharge).mockResolvedValue({ id: s.intentId, status: 'canceled' } as any);

    await dispatchWebhookEvent(event('payment_intent.canceled', { ...s.intentObject }));

    const after = await Order.findById(s.draftOrderId).lean();
    expect(after!.status).toBe('preparing');
    expect(after!.paymentStatus).toBe('captured');
    expect(await stockOf(s.productId)).toBe(8);
  });

  it('records a payment failure on an awaiting draft without changing its status', async () => {
    const s = await makeSession('key-wh-0002');

    await dispatchWebhookEvent(event('payment_intent.payment_failed', {
      ...s.intentObject,
      last_payment_error: { code: 'card_declined', message: 'Your card was declined.' },
    }));

    const order = await Order.findById(s.draftOrderId).lean();
    expect(order!.status).toBe('awaiting_payment');
    expect(order!.paymentError).toMatchObject({ code: 'card_declined', message: 'Your card was declined.' });
    expect(JSON.stringify(order!.paymentError)).not.toContain('client_secret');
  });

  it('does not cancel a placed order because of a payment failure event', async () => {
    const s = await makeSession('key-wh-0003', 'placed');
    await Order.updateOne({ _id: s.draftOrderId }, { $set: { status: 'pending', paymentStatus: 'authorized' } });

    await dispatchWebhookEvent(event('payment_intent.payment_failed', { ...s.intentObject, last_payment_error: { code: 'x', message: 'y' } }));

    expect((await Order.findById(s.draftOrderId).lean())!.status).toBe('pending');
  });

  it('releases a late hold on an expired checkout and restores stock', async () => {
    const s = await makeSession('key-wh-0004', 'open', true);
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ id: s.intentId, status: 'requires_capture' } as any);

    await dispatchWebhookEvent(event('payment_intent.amount_capturable_updated', { ...s.intentObject }));

    expect(cancelPaymentIntent).toHaveBeenCalledWith(s.intentId, expect.stringContaining(':release:1'));
    expect((await CheckoutSession.findById(s.sessionId).lean())!.status).toBe('expired');
    expect(await stockOf(s.productId)).toBe(10);
  });

  it('releases a late hold on a failed checkout even when the intent was never recorded', async () => {
    const s = await makeSession('key-wh-0005', 'failed');
    await CheckoutSession.updateOne({ _id: s.sessionId }, { $set: { 'sellers.0.paymentIntentId': undefined } });
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ id: s.intentId, status: 'requires_capture' } as any);

    await dispatchWebhookEvent(event('payment_intent.amount_capturable_updated', { ...s.intentObject }));

    expect(cancelPaymentIntent).toHaveBeenCalledWith(s.intentId, expect.any(String));
    expect(await stockOf(s.productId)).toBe(10);
  });

  it('leaves an active checkout alone when its hold arrives', async () => {
    const s = await makeSession('key-wh-0006', 'open');
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ id: s.intentId, status: 'requires_capture' } as any);

    await dispatchWebhookEvent(event('payment_intent.amount_capturable_updated', { ...s.intentObject }));

    expect(cancelPaymentIntent).not.toHaveBeenCalled();
    expect((await CheckoutSession.findById(s.sessionId).lean())!.status).toBe('open');
  });

  it('acts on current Stripe state, so a stale hold event for an already-canceled intent does nothing', async () => {
    const s = await makeSession('key-wh-0007', 'expired');
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ id: s.intentId, status: 'canceled' } as any);

    await dispatchWebhookEvent(event('payment_intent.amount_capturable_updated', { ...s.intentObject }));

    expect(cancelPaymentIntent).not.toHaveBeenCalled();
  });

  it('keeps legacy success and failure handlers from touching manual-capture or fulfilled orders', async () => {
    const s = await makeSession('key-wh-0008', 'placed');
    await Order.updateOne({ _id: s.draftOrderId }, { $set: { status: 'shipped', paymentStatus: 'authorized' } });

    const { default: paymentService } = await import('../paymentService.js');
    await paymentService.handlePaymentIntentSucceeded(s.intentId);
    await paymentService.handlePaymentIntentFailed(s.intentId);

    expect((await Order.findById(s.draftOrderId).lean())!.status).toBe('shipped');
  });
});
