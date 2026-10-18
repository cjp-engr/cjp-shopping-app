// Explicit manual check, never run by unit/integration suites. All fixtures are new.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Stripe from 'stripe';

if (!process.argv.includes('--run-test-mode')) throw new Error('Explicit --run-test-mode is required');
const uri = 'mongodb://127.0.0.1:27018/tokomart_delivered_refund_manual_test?replicaSet=rs0&directConnection=true';
const target = new URL(uri.replace('mongodb:', 'http:'));
assert.equal(target.hostname, '127.0.0.1'); assert.equal(target.port, '27018'); assert.match(target.pathname, /_test$/);
const env = dotenv.parse(fs.readFileSync(new URL('../.env', import.meta.url)));
const key = process.env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY;
if (!key?.startsWith('sk_test_')) throw new Error('A Stripe test secret key is required');
process.env.STRIPE_SECRET_KEY = key;
process.env.DELIVERED_REFUNDS_ENABLED = 'true';
process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
const stripe = new Stripe(key);
const { default: Order } = await import('../src/models/Order.ts');
const { default: Product } = await import('../src/models/Product.ts');
const { default: CheckoutSession } = await import('../src/models/CheckoutSession.ts');
const { default: RefundRequest } = await import('../src/models/RefundRequest.ts');
const { default: PaymentOperation } = await import('../src/models/PaymentOperation.ts');
const { acceptOrder } = await import('../src/services/orderAcceptance.ts');
const { updateSellerOrderStatus } = await import('../src/services/sellerService.ts');
const { confirmOrderReceived } = await import('../src/services/orderService.ts');
const { createRefundRequest, decideRefundRequest } = await import('../src/services/refundRequestService.ts');
const { reconcileDeliveredRefund } = await import('../src/services/deliveredRefund.ts');
let orderId; let intentId;
try {
  await mongoose.connect(uri);
  assert.ok((await mongoose.connection.db.admin().command({ hello: 1 })).setName);
  await Promise.all([Order.init(), Product.init(), CheckoutSession.init(), RefundRequest.init(), PaymentOperation.init()]);
  const buyerId = new mongoose.Types.ObjectId(); const sellerId = new mongoose.Types.ObjectId();
  const oid = new mongoose.Types.ObjectId(); const sid = new mongoose.Types.ObjectId();
  const product = await Product.create({ sellerId, name: 'Fresh delivered refund verification', description: 'Stripe test fixture only', category: 'Home & Garden', price: 10, image: 'test.png', stock: 8, soldCount: 2 });
  const order = await Order.create({ _id: oid, userId: buyerId, sellerId, checkoutSessionId: sid.toString(),
    items: [{ product: product._id, productName: product.name, productPrice: 10, quantity: 2, productImage: 'test.png' }],
    shippingAddress: { street: 'Test address', city: 'Test city', state: 'Test state', zipCode: '100', country: 'PH' },
    paymentMethod: { type: 'credit-card', last4: '4242' }, subtotal: 20, productDiscount: 0, discount: 0, tax: 1.6, shipping: 5, total: 26.6,
    status: 'awaiting_payment', paymentFlowVersion: 'manual_capture', paymentStatus: 'awaiting_authorization', amountMinor: 2660, currency: 'usd' });
  orderId = order.id;
  const intent = await stripe.paymentIntents.create({ amount: 2660, currency: 'usd', capture_method: 'manual', payment_method: 'pm_card_visa', payment_method_types: ['card'], confirm: true,
    metadata: { checkoutSessionId: sid.toString(), sellerId: sellerId.toString(), draftOrderId: order.id } }, { idempotencyKey: `manual-delivered-refund:${order.id}` });
  intentId = intent.id;
  assert.equal(intent.livemode, false); assert.equal(intent.status, 'requires_capture'); assert.equal(intent.amount_received, 0);
  await CheckoutSession.create({ _id: sid, buyerId, idempotencyKey: order.id, requestHash: order.id, status: 'placed', expiresAt: new Date(Date.now() + 3600000),
    sellers: [{ sellerId, draftOrderId: oid, amountMinor: 2660, currency: 'usd', paymentIntentId: intent.id, status: 'authorized' }], stockReservations: [{ productId: product._id, quantity: 2 }] });
  await Order.updateOne({ _id: oid }, { $set: { status: 'pending', paymentStatus: 'authorized', paymentIntentId: intent.id,
    authorizedAt: new Date(), placedAt: new Date(), acceptBy: new Date(Date.now() + 3600000), authorizationExpiresAt: new Date(Date.now() + 86400000) } });
  assert.equal((await acceptOrder({ orderId, sellerId: sellerId.toString() })).kind, 'completed');
  await updateSellerOrderStatus(orderId, sellerId.toString(), 'processing');
  await updateSellerOrderStatus(orderId, sellerId.toString(), 'shipped');
  await confirmOrderReceived(orderId, buyerId.toString());
  const lineId = order.items[0]._id.toString(); const refunds = [];
  for (let index = 0; index < 2; index++) {
    const request = await createRefundRequest(orderId, buyerId.toString(), { items: [{ lineId, quantity: 1 }], reasonCode: 'damaged', description: 'Fresh Stripe test verification unit', idempotencyKey: `${orderId}:unit:${index}` });
    const expectedAmount = index === 0 ? 1080 : 1580;
    assert.equal(request.amountMinor, expectedAmount);
    assert.equal(request.shippingMinor, index === 0 ? 0 : 500);
    await decideRefundRequest(request.id, sellerId.toString(), { decision: 'approve' });
    for (let attempt = 0; attempt < 5; attempt++) {
      await reconcileDeliveredRefund(request.id);
      if ((await RefundRequest.findById(request.id)).state === 'refunded') break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    const persisted = await RefundRequest.findById(request.id); assert.equal(persisted.state, 'refunded');
    const refund = await stripe.refunds.retrieve(persisted.providerRefundId);
    assert.equal(refund.status, 'succeeded'); assert.equal(refund.amount, expectedAmount);
    refunds.push({ requestId: request.id, refundId: refund.id, amountMinor: refund.amount, status: refund.status });
  }
  const final = await Order.findById(orderId); const charge = await stripe.paymentIntents.retrieve(intent.id, { expand: ['latest_charge'] });
  assert.equal(charge.livemode, false); assert.equal(charge.amount_received, 2660); assert.equal(charge.latest_charge.amount_refunded, 2660);
  assert.equal(final.status, 'delivered'); assert.equal(final.paymentStatus, 'refunded'); assert.equal(final.refundedAmountMinor, 2660); assert.equal(final.refundReservedAmountMinor, 0);
  assert.equal(final.refundedShippingMinor, 500); assert.equal(final.refundReservedShippingMinor, 0);
  assert.equal(final.total, 26.6); assert.equal((await Product.findById(product.id)).stock, 8); assert.equal((await Product.findById(product.id)).soldCount, 2);
  const result = { checkedAt: new Date().toISOString(), database: target.pathname.slice(1), orderId, intentId, livemode: false, capturedMinor: 2660, refundedMinor: 2660, refundedShippingMinor: 500, retainedShippingMinor: 0, orderStatus: final.status, paymentStatus: final.paymentStatus, refunds };
  const directory = new URL('../test-results/', import.meta.url); fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(new URL('delivered-refund-shipping-evidence.json', directory), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} catch {
  console.error(JSON.stringify({ status: 'failed', orderId, intentId, message: 'Manual test did not complete; inspect these test-mode fixture IDs without retrying blindly' }));
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
