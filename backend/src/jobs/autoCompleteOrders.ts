import Order from '../models/Order.js';

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // run every hour

async function autoCompleteOrders(): Promise<void> {
  const cutoff = new Date(Date.now() - TWO_DAYS_MS);

  const result = await Order.updateMany(
    {
      status: 'shipped',
      shippedAt: { $lte: cutoff },
      refundRequestedAt: { $exists: false }
    },
    { $set: { status: 'delivered' } }
  );

  if (result.modifiedCount > 0) {
    console.log(`[autoCompleteOrders] Auto-completed ${result.modifiedCount} order(s)`);
  }
}

export function startAutoCompleteJob(): () => void {
  const enabled = process.env.AUTO_COMPLETE_ORDERS_ENABLED ?? 'true';
  if (enabled !== 'true' && enabled !== 'false') {
    throw new Error('AUTO_COMPLETE_ORDERS_ENABLED must be true or false');
  }
  if (enabled === 'false') return () => {};

  let running = false;
  const run = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      await autoCompleteOrders();
    } catch (err) {
      console.error('[autoCompleteOrders] Error:', err);
    } finally {
      running = false;
    }
  };
  // Run once on startup to catch any orders that passed the window while the server was down
  void run();

  const timer = setInterval(() => { void run(); }, CHECK_INTERVAL_MS);
  return () => clearInterval(timer);
}
