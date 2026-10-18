import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Coupon from '../../models/Coupon.js';
import Cart from '../../models/Cart.js';
import CheckoutSession from '../../models/CheckoutSession.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import { createCheckoutSession } from '../checkoutService.js';
import { authorizeCheckoutSession } from '../checkoutAuthorization.js';
import { finalizeCheckoutSession } from '../checkoutFinalization.js';
import { releaseCheckoutSession } from '../checkoutCompensation.js';
import { cleanExpiredCheckoutSessions } from '../draftCleaner.js';
import {
  cancelPaymentIntent,
  createManualCapturePaymentIntent,
  retrieveIntentWithCharge,
  retrievePaymentIntent,
  StripeError,
} from '../stripeService.js';
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

vi.mock('../paymentService.js', () => ({
  default: { getOrCreateCustomerForUser: vi.fn().mockResolvedValue('cus_test') },
}));

const buyer = new mongoose.Types.ObjectId();
const sellerA = new mongoose.Types.ObjectId();
const sellerB = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };
const card = { type: 'credit-card' };

async function makeProduct(sellerId: mongoose.Types.ObjectId, price = 20) {
  return Product.create({ name: 'Item', description: 'd', category: 'Books', price, stock: 10, image: 'i.png', sellerId });
}

function stripeFault(statusCode?: number): StripeError {
  return new StripeError('Stripe failure', statusCode === undefined ? undefined : Object.assign(new Error('x'), { statusCode }));
}

function validIntent(id: string, sessionId: string, seller: { sellerId: mongoose.Types.ObjectId; draftOrderId: mongoose.Types.ObjectId; amountMinor: number }) {
  return {
    id,
    status: 'requires_capture',
    capture_method: 'manual',
    amount: seller.amountMinor,
    amount_capturable: seller.amountMinor,
    currency: 'usd',
    customer: 'cus_test',
    metadata: { checkoutSessionId: sessionId, sellerId: seller.sellerId.toString(), draftOrderId: seller.draftOrderId.toString() },
    latest_charge: { object: 'charge', payment_method_details: { card: { capture_before: Math.floor((Date.now() + 3 * 24 * 3600 * 1000) / 1000) } } },
  };
}

describe('checkout compensation (replica set, Stripe mocked)', () => {
  it('keeps an uncertain hold pending and retries it after stock was already restored', async () => {
    const product = await makeProduct(sellerA);
    const { session } = await createCheckoutSession(buyer.toString(), 'key-retry-release', {
      items: [{ productId: product.id, quantity: 2 }], shippingAddress: address, paymentMethod: card,
    });
    vi.mocked(createManualCapturePaymentIntent).mockResolvedValueOnce({ id: 'pi_retry', clientSecret: 'cs_retry', status: 'requires_payment_method' });
    await authorizeCheckoutSession(session, buyer.toString());
    vi.mocked(cancelPaymentIntent).mockRejectedValueOnce(stripeFault(500));
    vi.mocked(retrievePaymentIntent).mockRejectedValueOnce(stripeFault());
    const result = await releaseCheckoutSession(session.id, 'failed');
    expect(result.unresolved).toBe(1);
    expect((await Order.findOne({ checkoutSessionId: session.id }))!.paymentStatus).toBe('release_pending');
    await PaymentOperation.updateMany({ action: 'release' }, { $set: { nextAttemptAt: new Date(0) } });
    vi.mocked(cancelPaymentIntent).mockImplementation(async id => ({ id, status: 'canceled' }) as any);
    await cleanExpiredCheckoutSessions();
    expect((await Order.findOne({ checkoutSessionId: session.id }))!.paymentStatus).toBe('released');
    expect((await Product.findById(product._id))!.stock).toBe(10);
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(2);
  });
  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), CheckoutSession.init(), Coupon.init(), Cart.init(), PaymentOperation.init()]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ id: 'pi', status: 'requires_capture' } as any);
    vi.mocked(cancelPaymentIntent).mockImplementation(async (id: string) => ({ id, status: 'canceled' }));
  });

  afterEach(async () => {
    await Promise.all([
      Product.deleteMany({}),
      Order.deleteMany({}),
      CheckoutSession.deleteMany({}),
      Coupon.deleteMany({}),
      Cart.deleteMany({}),
      PaymentOperation.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('cancels the other seller hold and restores stock and coupon once when a seller is rejected', async () => {
    const a = await makeProduct(sellerA, 20);
    const b = await makeProduct(sellerB, 40);
    await Coupon.create({ code: 'SAVE10', sellerId: sellerA, discountType: 'percentage', discountValue: 10, usageLimit: 5, isActive: true });
    const { session } = await createCheckoutSession(buyer.toString(), 'key-comp-0001', {
      items: [{ productId: a._id.toString(), quantity: 1 }, { productId: b._id.toString(), quantity: 1 }],
      shippingAddress: address,
      paymentMethod: card,
      couponCodes: { [sellerA.toString()]: 'SAVE10' },
    });
    vi.mocked(createManualCapturePaymentIntent)
      .mockResolvedValueOnce({ id: 'pi_A', clientSecret: 'cs_A', status: 'requires_payment_method' })
      .mockRejectedValueOnce(stripeFault(400));

    await expect(authorizeCheckoutSession(session, buyer.toString())).rejects.toMatchObject({
      code: 'authorization_rejected',
      retryable: false,
    });

    expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
    expect(cancelPaymentIntent).toHaveBeenCalledWith('pi_A', expect.stringContaining(':release:1'));
    expect((await Product.findById(a._id).lean())!.stock).toBe(10);
    expect((await Product.findById(b._id).lean())!.stock).toBe(10);
    expect((await Product.findById(a._id).lean())!.soldCount ?? 0).toBe(0);
    expect((await Coupon.findOne({ code: 'SAVE10' }).lean())!.usedCount).toBe(0);

    const stored = await CheckoutSession.findById(session._id).lean();
    expect(stored!.status).toBe('failed');
    expect(stored!.stockRestoredAt).toBeDefined();
    const drafts = await Order.find({ checkoutSessionId: session._id.toString() }).lean();
    expect(drafts.every(d => d.paymentStatus === 'released')).toBe(true);
  });

  it('restores stock exactly once when release runs twice', async () => {
    const a = await makeProduct(sellerA, 20);
    const { session } = await createCheckoutSession(buyer.toString(), 'key-comp-0002', {
      items: [{ productId: a._id.toString(), quantity: 2 }],
      shippingAddress: address,
      paymentMethod: card,
    });
    vi.mocked(createManualCapturePaymentIntent).mockResolvedValueOnce({ id: 'pi_R', clientSecret: 'cs_R', status: 'requires_payment_method' });
    await authorizeCheckoutSession(session, buyer.toString());
    expect((await Product.findById(a._id).lean())!.stock).toBe(8);

    const first = await releaseCheckoutSession(session._id, 'failed');
    const second = await releaseCheckoutSession(session._id, 'failed');

    expect(first).toMatchObject({ released: 1, unresolved: 0, stockRestored: true });
    expect(second).toMatchObject({ released: 1, unresolved: 0, stockRestored: true });
    expect((await Product.findById(a._id).lean())!.stock).toBe(10);
    expect(cancelPaymentIntent).toHaveBeenCalledTimes(1);
  });

  it('records an unresolved release for retry and still restores stock', async () => {
    const a = await makeProduct(sellerA, 20);
    const { session } = await createCheckoutSession(buyer.toString(), 'key-comp-0003', {
      items: [{ productId: a._id.toString(), quantity: 1 }],
      shippingAddress: address,
      paymentMethod: card,
    });
    vi.mocked(createManualCapturePaymentIntent).mockResolvedValueOnce({ id: 'pi_U', clientSecret: 'cs_U', status: 'requires_payment_method' });
    await authorizeCheckoutSession(session, buyer.toString());
    vi.mocked(cancelPaymentIntent).mockRejectedValue(stripeFault());
    vi.mocked(retrievePaymentIntent).mockRejectedValue(stripeFault());

    const result = await releaseCheckoutSession(session._id, 'failed');

    expect(result).toMatchObject({ released: 0, unresolved: 1, stockRestored: true });
    const operation = await PaymentOperation.findOne({ action: 'release' }).lean();
    expect(operation!.status).toBe('pending');
    expect((await Product.findById(a._id).lean())!.stock).toBe(10);
    expect((await CheckoutSession.findById(session._id).lean())!.status).toBe('failed');
  });

  it('refuses to release a placed checkout', async () => {
    const a = await makeProduct(sellerA, 20);
    const { session } = await createCheckoutSession(buyer.toString(), 'key-comp-0004', {
      items: [{ productId: a._id.toString(), quantity: 1 }],
      shippingAddress: address,
      paymentMethod: card,
    });
    await CheckoutSession.updateOne({ _id: session._id }, { $set: { status: 'placed', placedAt: new Date() } });

    await expect(releaseCheckoutSession(session._id, 'failed')).rejects.toMatchObject({ code: 'session_placed' });
    expect(cancelPaymentIntent).not.toHaveBeenCalled();
  });

  it('releases the other seller hold when finalization finds one payment canceled', async () => {
    const a = await makeProduct(sellerA, 20);
    const b = await makeProduct(sellerB, 40);
    const { session } = await createCheckoutSession(buyer.toString(), 'key-comp-0005', {
      items: [{ productId: a._id.toString(), quantity: 1 }, { productId: b._id.toString(), quantity: 1 }],
      shippingAddress: address,
      paymentMethod: card,
    });
    vi.mocked(createManualCapturePaymentIntent)
      .mockResolvedValueOnce({ id: 'pi_FA', clientSecret: 'cs', status: 'requires_payment_method' })
      .mockResolvedValueOnce({ id: 'pi_FB', clientSecret: 'cs', status: 'requires_payment_method' });
    await authorizeCheckoutSession(session, buyer.toString());

    const sellerA_ = session.sellers.find(s => s.sellerId.toString() === sellerA.toString())!;
    const sellerB_ = session.sellers.find(s => s.sellerId.toString() === sellerB.toString())!;
    vi.mocked(retrieveIntentWithCharge).mockImplementation(async (id: string) => {
      if (id === 'pi_FA') return validIntent(id, session._id.toString(), sellerA_) as any;
      return { ...validIntent(id, session._id.toString(), sellerB_), status: 'canceled' } as any;
    });

    await expect(finalizeCheckoutSession(session._id.toString(), buyer.toString())).rejects.toMatchObject({
      code: 'authorization_canceled',
    });

    expect(cancelPaymentIntent).toHaveBeenCalledWith('pi_FA', expect.stringContaining(':release:1'));
    expect((await CheckoutSession.findById(session._id).lean())!.status).toBe('failed');
    expect((await Product.findById(a._id).lean())!.stock).toBe(10);
    expect((await Product.findById(b._id).lean())!.stock).toBe(10);
    const orders = await Order.find({ checkoutSessionId: session._id.toString() }).lean();
    expect(orders.every(o => o.status === 'awaiting_payment')).toBe(true);
  });
});
