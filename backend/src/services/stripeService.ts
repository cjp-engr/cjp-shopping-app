import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-08-26.dahlia' as any,
});

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
    const intent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      metadata,
      payment_method_types: ['card'],
      ...(customerId ? { customer: customerId } : {}),
      ...(paymentMethodId ? { payment_method: paymentMethodId } : {}),
    });
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
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      return existing.data[0].id;
    }

    const customer = await stripe.customers.create({
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
    await stripe.paymentMethods.attach(pmId, { customer: customerId });
  } catch (err) {
    throw new StripeError('Failed to attach payment method to customer', err as Error);
  }
}

export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string,
  secret: string,
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    throw new StripeError('Webhook signature verification failed', err as Error);
  }
}

export async function retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.retrieve(id);
  } catch (err) {
    throw new StripeError(`Failed to retrieve payment intent ${id}`, err as Error);
  }
}
