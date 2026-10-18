import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Coupon from '../../models/Coupon.js';
import User from '../../models/User.js';
import CheckoutSession from '../../models/CheckoutSession.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import { createCheckoutSession, CheckoutError } from '../checkoutService.js';
import { assertSavedCardOwned, authorizeCheckoutSession, intentOperationKey } from '../checkoutAuthorization.js';
import {
  createManualCapturePaymentIntent,
  listCustomerIntentsSince,
  retrievePaymentIntent,
  StripeError,
} from '../stripeService.js';
import { connectIntegrationDb } from './integrationDb.js';

vi.mock('../stripeService.js', async () => {
  const actual = await vi.importActual<typeof import('../stripeService.js')>('../stripeService.js');
  return {
    ...actual,
    createManualCapturePaymentIntent: vi.fn(),
    listCustomerIntentsSince: vi.fn(),
    retrievePaymentIntent: vi.fn(),
    retrieveIntentWithCharge: vi.fn(),
    cancelPaymentIntent: vi.fn(),
  };
});

vi.mock('../paymentService.js', () => ({
  default: { getOrCreateCustomerForUser: vi.fn() },
}));

import paymentService from '../paymentService.js';

const buyer = new mongoose.Types.ObjectId();
const sellerA = new mongoose.Types.ObjectId();
const sellerB = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };
const card = { type: 'credit-card', last4: '4242', cardHolder: 'Buyer' };

async function makeProduct(sellerId: mongoose.Types.ObjectId, price = 20) {
  return Product.create({ name: 'Book', description: 'A book', category: 'Books', price, stock: 10, image: 'b.png', sellerId });
}

async function makeSession(key: string, sellers: Array<{ product: mongoose.Types.ObjectId; quantity: number }>) {
  const { session } = await createCheckoutSession(buyer.toString(), key, {
    items: sellers.map(s => ({ productId: s.product.toString(), quantity: s.quantity })),
    shippingAddress: address,
    paymentMethod: card,
  });
  return session;
}

let intentCounter = 0;

describe('authorizeCheckoutSession (replica set, Stripe mocked)', () => {
  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), CheckoutSession.init(), Coupon.init(), PaymentOperation.init(), User.init()]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    intentCounter = 0;
    vi.mocked(paymentService.getOrCreateCustomerForUser).mockResolvedValue('cus_test');
    vi.mocked(listCustomerIntentsSince).mockResolvedValue([]);
    vi.mocked(createManualCapturePaymentIntent).mockImplementation(async () => {
      intentCounter += 1;
      return { id: `pi_${intentCounter}`, clientSecret: `cs_${intentCounter}`, status: 'requires_payment_method' };
    });
    vi.mocked(retrievePaymentIntent).mockImplementation(async (id: string) => ({ id, client_secret: `cs_for_${id}` } as any));
  });

  afterEach(async () => {
    await Promise.all([
      Product.deleteMany({}),
      Order.deleteMany({}),
      CheckoutSession.deleteMany({}),
      Coupon.deleteMany({}),
      PaymentOperation.deleteMany({}),
      User.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('creates one manual-capture intent per seller with exact parameters and saves the IDs', async () => {
    const a = await makeProduct(sellerA, 20);
    const b = await makeProduct(sellerB, 40);
    const session = await makeSession('key-auth-0001', [{ product: a._id, quantity: 1 }, { product: b._id, quantity: 1 }]);

    const results = await authorizeCheckoutSession(session, buyer.toString());

    expect(results).toHaveLength(2);
    expect(createManualCapturePaymentIntent).toHaveBeenCalledTimes(2);
    for (const seller of session.sellers) {
      const call = vi.mocked(createManualCapturePaymentIntent).mock.calls.find(
        ([params]) => params.metadata.sellerId === seller.sellerId.toString(),
      )![0];
      expect(call).toMatchObject({
        amountMinor: seller.amountMinor,
        currency: 'usd',
        customerId: 'cus_test',
        idempotencyKey: intentOperationKey(session._id.toString(), seller.sellerId.toString()),
        metadata: {
          checkoutSessionId: session._id.toString(),
          sellerId: seller.sellerId.toString(),
          draftOrderId: seller.draftOrderId.toString(),
        },
      });
    }

    const stored = await CheckoutSession.findById(session._id).lean();
    expect(stored!.sellers.every(s => !!s.paymentIntentId)).toBe(true);
    const order = await Order.findById(stored!.sellers[0].draftOrderId).lean();
    expect(order!.paymentIntentId).toBe(stored!.sellers[0].paymentIntentId);
    expect(order!.paymentStatus).toBe('awaiting_authorization');
    const operation = await PaymentOperation.findOne({ idempotencyKey: intentOperationKey(session._id.toString(), stored!.sellers[0].sellerId.toString()) }).lean();
    expect(operation!.status).toBe('succeeded');
  });

  it('does not create a second intent when the session is authorized again', async () => {
    const a = await makeProduct(sellerA);
    const session = await makeSession('key-auth-0002', [{ product: a._id, quantity: 1 }]);

    const first = await authorizeCheckoutSession(session, buyer.toString());
    const stored = await CheckoutSession.findById(session._id);
    const second = await authorizeCheckoutSession(stored!, buyer.toString());

    expect(createManualCapturePaymentIntent).toHaveBeenCalledTimes(1);
    expect(second[0].paymentIntentId).toBe(first[0].paymentIntentId);
    expect(second[0].clientSecret).toBe(`cs_for_${first[0].paymentIntentId}`);
  });

  it('fails the checkout on a definitive rejection and does not create again', async () => {
    const a = await makeProduct(sellerA);
    const session = await makeSession('key-auth-0003', [{ product: a._id, quantity: 1 }]);
    vi.mocked(createManualCapturePaymentIntent).mockRejectedValueOnce(
      new StripeError('Failed', Object.assign(new Error('bad customer'), { statusCode: 400 })),
    );

    await expect(authorizeCheckoutSession(session, buyer.toString())).rejects.toMatchObject({
      code: 'authorization_rejected',
      retryable: false,
    });

    const stored = await CheckoutSession.findById(session._id);
    expect(stored!.status).toBe('failed');
    await expect(authorizeCheckoutSession(stored!, buyer.toString())).rejects.toMatchObject({ code: 'session_closed' });
    expect(createManualCapturePaymentIntent).toHaveBeenCalledTimes(1);
  });

  it('escalates an ambiguous failure to support instead of creating another intent', async () => {
    const a = await makeProduct(sellerA);
    const session = await makeSession('key-auth-0004', [{ product: a._id, quantity: 1 }]);
    vi.mocked(createManualCapturePaymentIntent).mockRejectedValueOnce(new StripeError('Timeout'));

    await expect(authorizeCheckoutSession(session, buyer.toString())).rejects.toMatchObject({
      code: 'authorization_unresolved',
      retryable: false,
    });

    const operation = await PaymentOperation.findOne({ checkoutSessionId: session._id.toString() }).lean();
    expect(operation!.status).toBe('needs_support');

    await expect(authorizeCheckoutSession(session, buyer.toString())).rejects.toMatchObject({
      code: 'authorization_unresolved',
    });
    expect(createManualCapturePaymentIntent).toHaveBeenCalledTimes(1);
  });

  it('recovers an intent created before its ID was saved instead of creating a duplicate', async () => {
    const a = await makeProduct(sellerA);
    const session = await makeSession('key-auth-0005', [{ product: a._id, quantity: 1 }]);
    const draftId = session.sellers[0].draftOrderId.toString();
    vi.mocked(listCustomerIntentsSince).mockResolvedValueOnce([
      { id: 'pi_recovered', client_secret: 'cs_recovered', metadata: { draftOrderId: draftId } },
    ] as any);

    const [result] = await authorizeCheckoutSession(session, buyer.toString());

    expect(createManualCapturePaymentIntent).not.toHaveBeenCalled();
    expect(result.paymentIntentId).toBe('pi_recovered');
    const order = await Order.findById(draftId).lean();
    expect(order!.paymentIntentId).toBe('pi_recovered');
  });

  it('accepts a saved card only when it belongs to the buyer', async () => {
    await User.collection.insertOne({
      _id: buyer,
      savedCards: [{ stripePaymentMethodId: 'pm_OWNED', brand: 'visa', last4: '4242', expiryMonth: 12, expiryYear: 2030 }],
    } as any);

    await expect(assertSavedCardOwned(buyer.toString(), 'pm_OWNED')).resolves.toBeUndefined();
    await expect(assertSavedCardOwned(buyer.toString(), 'pm_OTHER')).rejects.toMatchObject({
      code: 'saved_card_not_owned',
      statusCode: 403,
    });
    await expect(assertSavedCardOwned(buyer.toString(), 'pm_OTHER')).rejects.toBeInstanceOf(CheckoutError);
  });
});
