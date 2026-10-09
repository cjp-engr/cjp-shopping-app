import {
  createPaymentIntent as stripeCreatePaymentIntent,
  getOrCreateStripeCustomer,
  attachPaymentMethodToCustomer as stripeAttachPaymentMethod,
} from './stripeService.js';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';

const PAYMENT_CURRENCY = 'usd';

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
  private async getOrCreateCustomerForUser(userId: string): Promise<string> {
    const user = await User.findById(userId).select('stripeCustomerId email');
    if (!user) {
      throw new PaymentError(404, 'User not found');
    }

    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customerId = await getOrCreateStripeCustomer(userId, user.email);
    await User.updateOne({ _id: userId }, { stripeCustomerId: customerId });
    return customerId;
  }

  private validateAmount(amount: number): void {
    if (!amount || amount <= 0) {
      throw new PaymentError(400, 'Invalid amount');
    }
  }

  async createPaymentIntent(
    userId: string,
    amountInCents: number,
    stripePaymentMethodId?: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    this.validateAmount(amountInCents);

    const cart = await Cart.findOne({ userId }).populate('sellers.items.product');
    if (!cart) {
      throw new PaymentError(400, 'Cart not found');
    }

    const stripeCustomerId = await this.getOrCreateCustomerForUser(userId);

    // Attempt to attach payment method if provided
    // Note: If already attached to PaymentIntent, this will fail but we continue
    // The PaymentIntent creation with setup_future_usage will handle attachment
    if (stripePaymentMethodId) {
      try {
        await stripeAttachPaymentMethod(stripePaymentMethodId, stripeCustomerId);
        console.log(`[PaymentService] Payment method attached successfully`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.log(`[PaymentService] Attachment not critical, PaymentIntent will handle it: ${errMsg}`);
        // Continue - PaymentIntent creation with setup_future_usage will save the method
      }
    }

    const { id, clientSecret } = await stripeCreatePaymentIntent(
      amountInCents,
      PAYMENT_CURRENCY,
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
    if (!stripePaymentMethodId) {
      throw new PaymentError(400, 'Payment method ID required');
    }

    const stripeCustomerId = await this.getOrCreateCustomerForUser(userId);
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
