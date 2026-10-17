import type mongoose from 'mongoose';
import Order from '../models/Order.js';
import { acceptanceScanIntervalMs } from '../config/checkout.js';
import { cancelPendingOrder } from './orderCancellation.js';

const BATCH_SIZE = 50;

export interface AcceptanceScanResult {
  cancelled: number;
  skipped: number;
}

/**
 * Cancels pending orders the seller did not accept before `acceptBy` (the deadline itself is
 * already too late), restoring their reservations and releasing the card hold. A `capture_pending`
 * order is owned by its capture operation and orders without `acceptBy` (legacy) have no expiry,
 * so neither is selected. Each cancellation is exclusive and idempotent (see cancelPendingOrder),
 * so overlapping scans and a server that was down past many deadlines cancel each order once.
 */
export async function scanAcceptanceDeadlines(now: Date = new Date()): Promise<AcceptanceScanResult> {
  const seen: mongoose.Types.ObjectId[] = [];
  let cancelled = 0;
  let skipped = 0;

  for (;;) {
    const batch = await Order.find({
      _id: { $nin: seen },
      status: 'pending',
      acceptBy: { $lte: now },
      paymentStatus: { $in: ['authorized', 'not_required'] },
    })
      .select('_id')
      .sort({ acceptBy: 1 })
      .limit(BATCH_SIZE)
      .lean();
    if (batch.length === 0) break;

    for (const candidate of batch) {
      seen.push(candidate._id);
      try {
        const result = await cancelPendingOrder(candidate._id, 'seller_acceptance_timeout', now);
        if (result) cancelled += 1;
        else skipped += 1;
      } catch (err) {
        skipped += 1;
        console.error(`[AcceptanceScanner] Could not cancel order ${candidate._id}:`, err);
      }
    }
  }
  return { cancelled, skipped };
}

export function startAcceptanceScanner(): () => void {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await scanAcceptanceDeadlines();
      if (result.cancelled > 0 || result.skipped > 0) {
        console.log(`[AcceptanceScanner] Cancelled ${result.cancelled} unaccepted order(s); ${result.skipped} skipped`);
      }
    } catch (err) {
      console.error('[AcceptanceScanner] Run failed:', err);
    } finally {
      running = false;
    }
  };

  void run();
  const timer = setInterval(() => void run(), acceptanceScanIntervalMs());
  timer.unref?.();
  return () => clearInterval(timer);
}
