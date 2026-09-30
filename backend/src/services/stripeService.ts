import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-08-26.dahlia' as any,
});

export async function createPaymentIntent(
  amountInCents: number,
  currency: string,
  metadata: Record<string, string>,
  customerId?: string,
): Promise<{ id: string; clientSecret: string }> {
  const intent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency,
    metadata,
    payment_method_types: ['card'],
    ...(customerId ? { customer: customerId } : {}),
  });
  return { id: intent.id, clientSecret: intent.client_secret! };
}

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) return existing.data[0].id;
  const customer = await stripe.customers.create({ email, metadata: { userId } });
  return customer.id;
}

export async function attachPaymentMethodToCustomer(
  pmId: string,
  customerId: string,
): Promise<void> {
  await stripe.paymentMethods.attach(pmId, { customer: customerId });
}

export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string,
  secret: string,
): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

export async function retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.retrieve(id);
}
