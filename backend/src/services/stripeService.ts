import Stripe from 'stripe';

let stripe: Stripe;

function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripe = new Stripe(key, {
      apiVersion: '2026-08-26.dahlia' as any,
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

export async function createPaymentIntent(
  amountInCents: number,
  currency: string,
  metadata: Record<string, string>,
  customerId?: string,
  paymentMethodId?: string,
): Promise<{ id: string; clientSecret: string }> {
  try {
    console.log(`[StripeService] Creating PaymentIntent: amount=${amountInCents}¢ (${amountInCents / 100}${currency}), customerId=${customerId}, paymentMethodId=${paymentMethodId}`);
    const intent = await getStripe().paymentIntents.create({
      amount: amountInCents,
      currency,
      metadata,
      payment_method_types: ['card'],
      ...(customerId ? { customer: customerId } : {}),
      ...(paymentMethodId ? { payment_method: paymentMethodId } : {}),
    });
    console.log(`[StripeService] PaymentIntent created: ${intent.id}`);
    return { id: intent.id, clientSecret: intent.client_secret! };
  } catch (err) {
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
      return existing.data[0].id;
    }

    const customer = await getStripe().customers.create({
      email,
      metadata: { userId },
    });
    return customer.id;
  } catch (err) {
    throw new StripeError('Failed to get or create Stripe customer', err as Error);
  }
}

export async function attachPaymentMethodToCustomer(
  pmId: string,
  customerId: string,
): Promise<void> {
  try {
    await getStripe().paymentMethods.attach(pmId, { customer: customerId });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // If already attached or customer mismatch, that's fine — method exists as intended
    if (errorMsg.includes('already') || errorMsg.includes('already_attached')) {
      console.log(`[StripeService] Payment method ${pmId} already attached to customer ${customerId}`);
      return;
    }
    console.error(`[StripeService] Failed to attach payment method ${pmId} to customer ${customerId}: ${errorMsg}`);
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
    throw new StripeError('Webhook signature verification failed', err as Error);
  }
}

export async function retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
  try {
    return await getStripe().paymentIntents.retrieve(id);
  } catch (err) {
    throw new StripeError(`Failed to retrieve payment intent ${id}`, err as Error);
  }
}
