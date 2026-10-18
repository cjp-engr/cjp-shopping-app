// No SDK or credentials: every provider call goes to the test's loopback HTTP server.
const origin = new URL(process.env.PAYMENT_TEST_PROVIDER_ORIGIN);
if (origin.hostname !== '127.0.0.1' || origin.protocol !== 'http:') throw new Error('Test provider must use loopback HTTP');
async function call(action, args) {
  const response = await fetch(new URL(action, origin), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(args),
  });
  if (!response.ok) throw new Error(`Test provider rejected ${action}: ${response.status}`);
  return response.json();
}
export class StripeError extends Error {}
export const isAmbiguousStripeError = () => true;
export const retrieveIntentWithCharge = id => call('retrieve', [id]);
export const retrievePaymentIntent = retrieveIntentWithCharge;
export const capturePaymentIntent = (...args) => call('capture', args);
export const cancelPaymentIntent = (...args) => call('release', args);
export const listIntentRefunds = (...args) => call('list-refunds', args);
export const createOrderRefund = (...args) => call('refund', args);
export const retrieveRefund = (...args) => call('retrieve-refund', args);
const unexpected = () => { throw new Error('Unexpected Stripe call in restart test'); };
export const createPaymentIntent = unexpected;
export const createManualCapturePaymentIntent = unexpected;
export const getOrCreateStripeCustomer = unexpected;
export const attachPaymentMethodToCustomer = unexpected;
export const retrieveStripeEvent = unexpected;
