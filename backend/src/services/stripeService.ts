import Stripe from 'stripe';

let stripe: Stripe;

const STRIPE_API_VERSION = '2026-08-26.dahlia' as any;
const LOG_PREFIX = '[StripeService]';

function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripe = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
    });
  }
  return stripe;
}

export class StripeError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    Object.setPrototypeOf(this, StripeError.prototype);
  }
}

function isAlreadyAttachedError(message: string): boolean {
  return message.includes('already') || message.includes('already_attached');
}

export async function createPaymentIntent(
  amountInCents: number,
  currency: string,
  metadata: Record<string, string>,
  customerId?: string,
  paymentMethodId?: string,
): Promise<{ id: string; clientSecret: string }> {
  try {
    console.log(
      `${LOG_PREFIX} Creating PaymentIntent: amount=${amountInCents}¢ (${(amountInCents / 100).toFixed(2)}${currency}), customerId=${customerId}`,
    );

    const intent = await getStripe().paymentIntents.create({
      amount: amountInCents,
      currency,
      metadata,
      payment_method_types: ['card'],
      ...(customerId && { customer: customerId }),
      ...(paymentMethodId && {
        payment_method: paymentMethodId,
        setup_future_usage: 'off_session', // Allow reuse without CVC
      }),
    });

    console.log(`${LOG_PREFIX} PaymentIntent created: ${intent.id}`);
    return { id: intent.id, clientSecret: intent.client_secret! };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} Failed to create payment intent: ${message}`);
    throw new StripeError('Failed to create payment intent', err as Error);
  }
}

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  try {
    const existing = await getStripe().customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      console.log(`${LOG_PREFIX} Found existing customer for ${email}`);
      return existing.data[0].id;
    }

    const customer = await getStripe().customers.create({
      email,
      metadata: { userId },
    });

    console.log(`${LOG_PREFIX} Created new customer: ${customer.id}`);
    return customer.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} Failed to get or create customer: ${message}`);
    throw new StripeError('Failed to get or create Stripe customer', err as Error);
  }
}

export async function attachPaymentMethodToCustomer(
  pmId: string,
  customerId: string,
): Promise<void> {
  try {
    await getStripe().paymentMethods.attach(pmId, { customer: customerId });
    console.log(`${LOG_PREFIX} Attached payment method ${pmId} to customer ${customerId}`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    if (isAlreadyAttachedError(errorMsg)) {
      console.log(`${LOG_PREFIX} Payment method ${pmId} already attached to customer`);
      return;
    }

    console.error(`${LOG_PREFIX} Failed to attach payment method ${pmId}: ${errorMsg}`);
    throw new StripeError('Failed to attach payment method to customer', err as Error);
  }
}

export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string,
  secret: string,
): Stripe.Event {
  try {
    return getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} Webhook verification failed: ${message}`);
    throw new StripeError('Webhook signature verification failed', err as Error);
  }
}

export async function retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
  try {
    return await getStripe().paymentIntents.retrieve(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} Failed to retrieve payment intent ${id}: ${message}`);
    throw new StripeError(`Failed to retrieve payment intent ${id}`, err as Error);
  }
}
