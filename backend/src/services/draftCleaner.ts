import CheckoutSession from '../models/CheckoutSession.js';
import type mongoose from 'mongoose';
import { releaseCheckoutSession, type ReleaseReason } from './checkoutCompensation.js';

const CLEAN_INTERVAL_MS = 60 * 1000;
const STALE_FINALIZING_MS = 5 * 60 * 1000;
const BATCH_SIZE = 50;

export interface CleanupResult {
  released: number;
  skipped: number;
}

/**
 * Reverts sessions stuck in `finalizing` by a crashed request so they can be expired or
 * confirmed again. Placed orders are never touched: placement is a single transaction.
 */
async function recoverStaleFinalizing(now: Date): Promise<void> {
  await CheckoutSession.updateMany(
    { status: 'finalizing', placedAt: { $exists: false }, updatedAt: { $lt: new Date(now.getTime() - STALE_FINALIZING_MS) } },
    { $set: { status: 'open' } },
  );
}

/**
 * Releases checkouts that were abandoned, expired, or failed without releasing their holds.
 * Each release is exclusive and idempotent (see releaseCheckoutSession), so concurrent
 * cleaners and confirms cannot restore stock twice.
 */
export async function cleanExpiredCheckoutSessions(now: Date = new Date()): Promise<CleanupResult> {
  await recoverStaleFinalizing(now);

  let afterId: mongoose.Types.ObjectId | undefined;
  let released = 0;
  let skipped = 0;
  for (;;) {
    const candidates = await CheckoutSession.find({
      ...(afterId ? { _id: { $gt: afterId } } : {}),
      $and: [{ $or: [
        { stockRestoredAt: { $exists: false } },
        { sellers: { $elemMatch: { paymentIntentId: { $exists: true }, status: { $ne: 'released' } } } },
      ] }],
      $or: [
        { status: 'open', expiresAt: { $lte: now } },
        { status: 'expired' },
        { status: 'failed' },
      ],
    })
      .sort({ _id: 1 })
      .select('_id status')
      .limit(BATCH_SIZE)
      .lean();

    if (candidates.length === 0) break;
    afterId = candidates[candidates.length - 1]._id;
    for (const candidate of candidates) {
      const reason: ReleaseReason = candidate.status === 'failed' ? 'failed' : 'expired';
      try {
        await releaseCheckoutSession(candidate._id, reason, now);
        released += 1;
      } catch (err) {
        skipped += 1;
        console.error(`[DraftCleaner] Could not release checkout ${candidate._id}:`, err);
      }
    }
  }
  return { released, skipped };
}

export function startDraftCleaner(): () => void {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await cleanExpiredCheckoutSessions();
      if (result.released > 0 || result.skipped > 0) {
        console.log(`[DraftCleaner] Processed ${result.released} checkout(s); ${result.skipped} could not be processed`);
      }
    } catch (err) {
      console.error('[DraftCleaner] Run failed:', err);
    } finally {
      running = false;
    }
  };

  void run();
  const timer = setInterval(() => void run(), CLEAN_INTERVAL_MS);
  timer.unref?.();
  return () => clearInterval(timer);
}
