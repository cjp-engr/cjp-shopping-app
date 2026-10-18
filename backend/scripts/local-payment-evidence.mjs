// Run with: node --import tsx scripts/local-payment-evidence.mjs [expire ORDER_ID]
// Intentionally fixed to the isolated database used for local UI verification.
import fs from 'node:fs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Stripe from 'stripe';
import Order from '../src/models/Order.ts';

// Deliberately not configurable: the expiry command must not target hosted data.
const verificationDatabase = 'mongodb://127.0.0.1:27018/tokomart_local_payments_20261017?replicaSet=rs0';
const evidenceDirectory = new URL('../test-results/local-payment-verification/', import.meta.url);
const config = dotenv.parse(fs.readFileSync(new URL('../.env', import.meta.url)));
if (!config.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  throw new Error('Stripe test key required');
}
const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
  maxNetworkRetries: 0,
  timeout: 15000,
});
await mongoose.connect(verificationDatabase);
try {
  if (process.argv[2] === 'expire') {
    if (!mongoose.isValidObjectId(process.argv[3])) {
      throw new Error('An order ID is required');
    }
    const result = await Order.updateOne({
      _id: process.argv[3],
      status: 'pending',
      paymentFlowVersion: 'manual_capture',
      paymentStatus: 'authorized',
    }, { $set: { acceptBy: new Date(Date.now() - 1000) } });
    if (result.modifiedCount !== 1) {
      throw new Error('No eligible local order matched');
    }
    console.log(JSON.stringify({ orderId: process.argv[3], acceleratedExpiry: true }));
  } else {
    const records = [];
    const orders = await Order.find({
      paymentFlowVersion: 'manual_capture',
      paymentIntentId: { $exists: true },
    }).sort({ createdAt: 1 });
    for (const order of orders) {
      const intent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
      if (intent.livemode) throw new Error('Unexpected live-mode payment');
      records.push({
        orderId: order.id,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        intentId: intent.id,
        livemode: intent.livemode,
        captureMethod: intent.capture_method,
        stripeStatus: intent.status,
        amount: intent.amount,
        amountCapturable: intent.amount_capturable,
        amountReceived: intent.amount_received,
        cancellationReason: intent.cancellation_reason,
      });
    }
    fs.mkdirSync(evidenceDirectory, { recursive: true });
    fs.writeFileSync(
      new URL('stripe-evidence.json', evidenceDirectory),
      JSON.stringify({ checkedAt: new Date().toISOString(), records }, null, 2),
    );
    console.log(JSON.stringify(records));
  }
} finally {
  await mongoose.disconnect();
}
