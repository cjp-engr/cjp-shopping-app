import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import User from '../../models/User.js';
import CheckoutSession from '../../models/CheckoutSession.js';
import PaymentOperation from '../../models/PaymentOperation.js';
import { createCheckoutSession, getCheckoutSessionForBuyer, CheckoutError } from '../checkoutService.js';
import { ownerClientSecrets } from '../checkoutAuthorization.js';
import { retrievePaymentIntent } from '../stripeService.js';
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

const buyer = new mongoose.Types.ObjectId();
const otherBuyer = new mongoose.Types.ObjectId();
const seller = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };

async function makeOpenSession(key: string) {
  const product = await Product.create({ name: 'Book', description: 'A book', category: 'Books', price: 20, stock: 10, image: 'b.png', sellerId: seller });
  const { session } = await createCheckoutSession(buyer.toString(), key, {
    items: [{ productId: product._id.toString(), quantity: 1 }],
    shippingAddress: address,
    paymentMethod: { type: 'credit-card' },
  });
  await CheckoutSession.updateOne(
    { _id: session._id, 'sellers.draftOrderId': session.sellers[0].draftOrderId },
    { $set: { 'sellers.$.paymentIntentId': 'pi_read_1' } },
  );
  return session._id.toString();
}

describe('checkout session read (replica set, Stripe mocked)', () => {
  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), CheckoutSession.init(), PaymentOperation.init(), User.init()]);
    await User.collection.insertOne({ _id: seller, firstName: 'Sel', lastName: 'Ler', role: 'seller' } as any);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await Promise.all([Product.deleteMany({}), Order.deleteMany({}), CheckoutSession.deleteMany({}), PaymentOperation.deleteMany({})]);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  it('returns the session only to its owner', async () => {
    const id = await makeOpenSession('key-read-owner1');

    await expect(getCheckoutSessionForBuyer(id, buyer.toString())).resolves.toMatchObject({ status: 'open' });
    await expect(getCheckoutSessionForBuyer(id, otherBuyer.toString())).rejects.toMatchObject({
      code: 'session_not_found',
      statusCode: 404,
    });
    await expect(getCheckoutSessionForBuyer('not-an-id', buyer.toString())).rejects.toBeInstanceOf(CheckoutError);
  });

  it('returns a client secret while the seller payment awaits confirmation', async () => {
    const id = await makeOpenSession('key-read-secret1');
    vi.mocked(retrievePaymentIntent).mockImplementation(async (intentId: string) => ({
      id: intentId,
      status: 'requires_payment_method',
      client_secret: 'pi_read_1_secret_x',
      metadata: { checkoutSessionId: id },
    } as any));

    const session = await getCheckoutSessionForBuyer(id, buyer.toString());
    const secrets = await ownerClientSecrets(session, new Date());

    expect(secrets.get(seller.toString())).toBe('pi_read_1_secret_x');
  });

  it('omits the client secret once the payment is already authorized', async () => {
    const id = await makeOpenSession('key-read-auth1');
    vi.mocked(retrievePaymentIntent).mockImplementation(async (intentId: string) => ({
      id: intentId,
      status: 'requires_capture',
      client_secret: 'pi_read_1_secret_x',
      metadata: { checkoutSessionId: id },
    } as any));

    const session = await getCheckoutSessionForBuyer(id, buyer.toString());
    const secrets = await ownerClientSecrets(session, new Date());

    expect(secrets.size).toBe(0);
  });

  it('does not contact Stripe for an expired session', async () => {
    const id = await makeOpenSession('key-read-expired1');
    await CheckoutSession.updateOne({ _id: id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    const session = await getCheckoutSessionForBuyer(id, buyer.toString());
    const secrets = await ownerClientSecrets(session, new Date());

    expect(secrets.size).toBe(0);
    expect(retrievePaymentIntent).not.toHaveBeenCalled();
  });

  it('ignores an intent that is not tagged with this session', async () => {
    const id = await makeOpenSession('key-read-foreign1');
    vi.mocked(retrievePaymentIntent).mockResolvedValue({
      id: 'pi_read_1',
      status: 'requires_payment_method',
      client_secret: 'pi_read_1_secret_x',
      metadata: { checkoutSessionId: new mongoose.Types.ObjectId().toString() },
    } as any);

    const session = await getCheckoutSessionForBuyer(id, buyer.toString());
    const secrets = await ownerClientSecrets(session, new Date());

    expect(secrets.size).toBe(0);
  });
});
