import { register } from 'node:module';
register('./stripe-process-loader.mjs', import.meta.url);

// Deliberately import after installing the loader; even accidental provider calls are isolated.
const { connectIntegrationDb } = await import('../integrationDb.ts');
const { default: mongoose } = await import('mongoose');
await connectIntegrationDb();
try {
  const [mode, orderId, ownerId, clock] = process.argv.slice(2);
  if (mode === 'accept') {
    const { acceptOrder } = await import('../../orderAcceptance.ts');
    await acceptOrder({ orderId, sellerId: ownerId });
  } else if (mode === 'cancel') {
    const { cancelOrderAsBuyer } = await import('../../orderService.ts');
    await cancelOrderAsBuyer(orderId, ownerId);
  } else if (mode === 'recover') {
    const { processDueOperations } = await import('../../paymentOperationWorker.ts');
    const { replayStripeInbox } = await import('../../stripeInboxWorker.ts');
    const { scanAcceptanceDeadlines } = await import('../../acceptanceScanner.ts');
    const now = new Date(clock);
    await processDueOperations(`fresh-process-${process.pid}`, now);
    await replayStripeInbox(now);
    await scanAcceptanceDeadlines(now);
  } else throw new Error(`Unknown test mode: ${mode}`);
} finally { await mongoose.disconnect(); }
