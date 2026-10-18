import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Coupon from '../../models/Coupon.js';
import CheckoutSession from '../../models/CheckoutSession.js';
import { createCheckoutSession, CheckoutError } from '../checkoutService.js';
import { computeSellerTotals, toMinorUnits, type ProductLike } from '../checkoutPricing.js';
import { connectIntegrationDb } from './integrationDb.js';

const buyerId = new mongoose.Types.ObjectId().toString();
const sellerA = new mongoose.Types.ObjectId();
const sellerB = new mongoose.Types.ObjectId();
const address = { street: '1 Main', city: 'Town', state: 'ST', zipCode: '12345', country: 'PH' };
const card = { type: 'credit-card', last4: '4242', cardHolder: 'Buyer' };

async function makeProduct(overrides: Record<string, unknown> = {}) {
  return Product.create({
    name: 'Book',
    description: 'A book',
    category: 'Books',
    price: 20,
    stock: 5,
    image: 'book.png',
    sellerId: sellerA,
    ...overrides,
  });
}

async function stockOf(id: mongoose.Types.ObjectId | string): Promise<number> {
  const product = await Product.findById(id).lean();
  return product!.stock as number;
}

function body(items: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}) {
  return { items, shippingAddress: address, paymentMethod: card, ...extra };
}

describe('createCheckoutSession (replica set)', () => {
  beforeAll(async () => {
    await connectIntegrationDb();
    await Promise.all([Product.init(), Order.init(), CheckoutSession.init(), Coupon.init()]);
  });

  afterEach(async () => {
    await Promise.all([
      Product.deleteMany({}),
      Order.deleteMany({}),
      CheckoutSession.deleteMany({}),
      Coupon.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('ignores client-sent totals, prices, discounts and amounts and charges the server amount', async () => {
    const product = await makeProduct({ stock: 10, price: 20 });
    const lines = [{ productId: product._id.toString(), quantity: 2 }];

    const honest = await createCheckoutSession(buyerId, 'key-honest-price-1', body(lines));
    const tampered = await createCheckoutSession(
      buyerId,
      'key-tampered-price-1',
      body(
        [{ productId: product._id.toString(), quantity: 2, price: 0.01, productPrice: 0, discount: 99, discountPercent: 99 }],
        { total: 0.01, subtotal: 1, tax: 0, shipping: 0, amountMinor: 1, discount: 99 },
      ),
    );

    const honestAmount = honest.session.sellers[0].amountMinor;
    expect(honestAmount).toBeGreaterThan(1);
    expect(tampered.session.sellers[0].amountMinor).toBe(honestAmount);
    expect(tampered.session.sellers[0].amountMinor).toBe(honest.session.sellers[0].amountMinor);
  });

  it('creates one awaiting-payment draft per seller with exact minor-unit amounts and reserves stock once', async () => {
    const a = await makeProduct({ stock: 5, price: 20 });
    const b = await makeProduct({ stock: 3, price: 40, sellerId: sellerB });

    const { session, replayed } = await createCheckoutSession(
      buyerId,
      'key-multi-seller-1',
      body([
        { productId: a._id.toString(), quantity: 1 },
        { productId: b._id.toString(), quantity: 2 },
      ]),
    );

    expect(replayed).toBe(false);
    expect(session.status).toBe('open');
    expect(session.sellers).toHaveLength(2);
    expect(await stockOf(a._id)).toBe(4);
    expect(await stockOf(b._id)).toBe(1);

    const drafts = await Order.find({ checkoutSessionId: session._id.toString() }).lean();
    expect(drafts).toHaveLength(2);
    for (const draft of drafts) {
      expect(draft.status).toBe('awaiting_payment');
      expect(draft.paymentFlowVersion).toBe('manual_capture');
    }

    const expectedA = computeSellerTotals({
      sellerKey: sellerA.toString(),
      subtotal: 20,
      productDiscount: 0,
      couponDiscount: 0,
      firstProduct: { shippingFee: undefined } as ProductLike,
      deliverySelections: {},
    });
    const draftA = drafts.find(d => d.sellerId?.toString() === sellerA.toString());
    expect(draftA!.amountMinor).toBe(toMinorUnits(expectedA.total, 'usd'));
    expect(draftA!.amountMinor).toBe(3159);
  });

  it('rolls back every reservation when one line lacks stock', async () => {
    const a = await makeProduct({ stock: 5 });
    const b = await makeProduct({ stock: 1, sellerId: sellerB });

    await expect(createCheckoutSession(
      buyerId,
      'key-short-stock-1',
      body([
        { productId: a._id.toString(), quantity: 2 },
        { productId: b._id.toString(), quantity: 3 },
      ]),
    )).rejects.toMatchObject({ code: 'insufficient_stock', statusCode: 409 });

    expect(await stockOf(a._id)).toBe(5);
    expect(await stockOf(b._id)).toBe(1);
    expect(await CheckoutSession.countDocuments({})).toBe(0);
    expect(await Order.countDocuments({})).toBe(0);
  });

  it('returns the same session for a replayed key without reserving stock again', async () => {
    const a = await makeProduct({ stock: 5 });
    const request = body([{ productId: a._id.toString(), quantity: 2 }]);

    const first = await createCheckoutSession(buyerId, 'key-replay-0001', request);
    const second = await createCheckoutSession(buyerId, 'key-replay-0001', request);

    expect(second.replayed).toBe(true);
    expect(second.session._id.toString()).toBe(first.session._id.toString());
    expect(await stockOf(a._id)).toBe(3);
  });

  it('rejects a reused key with a different request', async () => {
    const a = await makeProduct({ stock: 5 });
    await createCheckoutSession(buyerId, 'key-conflict-01', body([{ productId: a._id.toString(), quantity: 1 }]));

    const attempt = createCheckoutSession(buyerId, 'key-conflict-01', body([{ productId: a._id.toString(), quantity: 2 }]));
    await expect(attempt).rejects.toMatchObject({ code: 'idempotency_conflict', statusCode: 409 });
    expect(await stockOf(a._id)).toBe(4);
  });

  it('creates exactly one session for concurrent identical requests', async () => {
    const a = await makeProduct({ stock: 5 });
    const request = body([{ productId: a._id.toString(), quantity: 1 }]);

    const results = await Promise.all(
      Array.from({ length: 3 }, () => createCheckoutSession(buyerId, 'key-concurrent-1', request)),
    );

    const ids = new Set(results.map(r => r.session._id.toString()));
    expect(ids.size).toBe(1);
    expect(await CheckoutSession.countDocuments({ idempotencyKey: 'key-concurrent-1' })).toBe(1);
    expect(await stockOf(a._id)).toBe(4);
  });

  it('reserves variant stock and prices from the variant', async () => {
    const variantId = new mongoose.Types.ObjectId();
    const product = await makeProduct({
      stock: 0,
      variants: [{ _id: variantId, attributes: { Size: 'M' }, price: 30, stock: 2 }],
    });

    const { session } = await createCheckoutSession(
      buyerId,
      'key-variant-0001',
      body([{ productId: product._id.toString(), variantId: variantId.toString(), quantity: 1 }]),
    );

    const refreshed = await Product.findById(product._id).lean();
    expect(refreshed?.variants?.[0]?.stock).toBe(1);
    const draft = await Order.findById(session.sellers[0].draftOrderId).lean();
    expect(draft!.items[0].productPrice).toBe(30);
  });

  it('reserves coupon capacity once and drops an exhausted coupon silently, like the legacy path', async () => {
    const a = await makeProduct({ stock: 10, price: 20 });
    const coupon = await Coupon.create({
      code: 'SAVE10',
      sellerId: sellerA,
      discountType: 'percentage',
      discountValue: 10,
      usageLimit: 1,
      isActive: true,
    });
    const request = body([{ productId: a._id.toString(), quantity: 1 }], { couponCodes: { [sellerA.toString()]: 'SAVE10' } });

    const first = await createCheckoutSession(buyerId, 'key-coupon-0001', request);
    const second = await createCheckoutSession(buyerId, 'key-coupon-0002', request);

    const firstDraft = await Order.findById(first.session.sellers[0].draftOrderId).lean();
    const secondDraft = await Order.findById(second.session.sellers[0].draftOrderId).lean();
    expect(firstDraft!.discount).toBeCloseTo(2);
    expect(secondDraft!.discount).toBe(0);

    const stored = await Coupon.findById(coupon._id).lean();
    expect(stored!.usedCount).toBe(1);
  });

  it('rejects card payment types other than credit or debit cards', async () => {
    const a = await makeProduct();
    await expect(createCheckoutSession(
      buyerId,
      'key-paypal-0001',
      { ...body([{ productId: a._id.toString(), quantity: 1 }]), paymentMethod: { type: 'paypal' } },
    )).rejects.toBeInstanceOf(CheckoutError);
  });
});
