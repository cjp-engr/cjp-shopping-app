import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-08-26.dahlia' as any,
});

export async function createPaymentIntent(
  amountInCents: number,
  currency: string,
  metadata: Record<string, string>,
): Promise<{ id: string; clientSecret: string }> {
  const intent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency,
    metadata,
    payment_method_types: ['card'],
  });
  return { id: intent.id, clientSecret: intent.client_secret! };
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
