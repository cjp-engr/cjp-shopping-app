// Test-only loader: child processes cannot reach the real Stripe service.
export async function resolve(specifier, context, nextResolve) {
  if (/\/stripeService\.(js|ts)$/.test(specifier) && context.parentURL?.includes('/src/services/')) {
    return { url: new URL('./stripe-process-stub.mjs', import.meta.url).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
