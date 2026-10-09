import {
  createPaymentIntent as stripeCreatePaymentIntent,
  getOrCreateStripeCustomer,
  attachPaymentMethodToCustomer as stripeAttachPaymentMethod,
} from './stripeService.js';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';

export class PaymentError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

class PaymentService {
  async createPaymentIntent(
    userId: string,
    amountInCents: number,
    stripePaymentMethodId?: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    if (!amountInCents || amountInCents <= 0) {
      throw new PaymentError(400, 'Invalid amount');
    }

    // Verify cart exists
    const cart = await Cart.findOne({ userId }).populate('sellers.items.product');
    if (!cart) {
      throw new PaymentError(400, 'Cart not found');
    }

    // Get or create Stripe Customer
    const user = await User.findById(userId).select('stripeCustomerId email');
    if (!user) {
      throw new PaymentError(404, 'User not found');
    }

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      stripeCustomerId = await getOrCreateStripeCustomer(userId, user.email);
      await User.updateOne({ _id: userId }, { stripeCustomerId });
    }

    // Attach payment method to customer BEFORE using it in PaymentIntent
    // (Stripe won't allow reusing a payment method that was used without attachment)
    if (stripePaymentMethodId) {
      try {
        await stripeAttachPaymentMethod(stripePaymentMethodId, stripeCustomerId);
      } catch (err) {
        // If already attached or other non-critical error, continue
        console.log(`Note: Payment method attachment status: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Create PaymentIntent with payment method attached if provided
    const { id, clientSecret } = await stripeCreatePaymentIntent(
      amountInCents,
      'usd',
      { userId },
      stripeCustomerId,
      stripePaymentMethodId,
    );

    return { paymentIntentId: id, clientSecret };
  }

  async attachPaymentMethod(
    userId: string,
    stripePaymentMethodId: string,
  ): Promise<void> {
    const user = await User.findById(userId).select('stripeCustomerId email');
    if (!user) {
      throw new PaymentError(404, 'User not found');
    }

    if (!stripePaymentMethodId) {
      throw new PaymentError(400, 'Payment method ID required');
    }

    // Get or create Stripe Customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      stripeCustomerId = await getOrCreateStripeCustomer(userId, user.email);
      await User.updateOne({ _id: userId }, { stripeCustomerId });
    }

    // Attach payment method to Stripe customer
    await stripeAttachPaymentMethod(stripePaymentMethodId, stripeCustomerId);
  }

  async handlePaymentIntentSucceeded(paymentIntentId: string): Promise<void> {
    const order = await Order.findOneAndUpdate(
      { paymentIntentId },
      { status: 'processing' },
      { new: true },
    );

    if (!order) {
      console.warn(`Order not found for PaymentIntent ${paymentIntentId}`);
    }
  }

  async handlePaymentIntentFailed(paymentIntentId: string): Promise<void> {
    const order = await Order.findOneAndUpdate(
      { paymentIntentId },
      { status: 'cancelled' },
      { new: true },
    );

    if (!order) {
      console.warn(`Order not found for PaymentIntent ${paymentIntentId}`);
    }
  }
}

export default new PaymentService();
