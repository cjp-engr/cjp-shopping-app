import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import CheckoutSession, { type ICheckoutSession } from '../models/CheckoutSession.js';
import { releaseIntentOperation } from './paymentRelease.js';
import { CheckoutError } from './checkoutService.js';

export type ReleaseReason = 'failed' | 'expired';

export interface ReleaseResult {
  released: number;
  unresolved: number;
  stockRestored: boolean;
}

export function releaseOperationKey(sessionId: string, sellerId: string): string {
  return `checkout:${sessionId}:${sellerId}:release:1`;
}

type SellerEntry = ICheckoutSession['sellers'][number];

/**
 * Cancels one seller's hold through a durable release operation. Returns `released`
 * only after Stripe confirms the intent is canceled; any uncertain outcome is `unresolved`
 * and is retried on the next call.
 */
async function releaseHold(session: ICheckoutSession, seller: SellerEntry): Promise<'released' | 'unresolved' | 'none'> {
  if (!seller.paymentIntentId) return 'none';
  if (seller.status === 'released') return 'released';

  return releaseIntentOperation({
    idempotencyKey: releaseOperationKey(session._id.toString(), seller.sellerId.toString()),
    paymentIntentId: seller.paymentIntentId,
    orderId: seller.draftOrderId,
    checkoutSessionId: session._id.toString(),
  });
}

/** Releases one intent that may not be recorded on its session yet, such as one reported by a webhook. */
export async function releaseIntentForSeller(
  session: ICheckoutSession,
  seller: { sellerId: mongoose.Types.ObjectId; draftOrderId: mongoose.Types.ObjectId; paymentIntentId: string; status: string },
): Promise<'released' | 'unresolved' | 'none'> {
  return releaseHold(session, seller as SellerEntry);
}

/**
 * Releases every hold obtained for a checkout and restores its stock and coupon
 * reservations exactly once. A failed or expired checkout cannot place orders. If a hold
 * release is unresolved, its draft remains release_pending and is revisited independently
 * of stock restoration.
 */
export async function releaseCheckoutSession(
  sessionId: mongoose.Types.ObjectId | string,
  reason: ReleaseReason,
  now: Date = new Date(),
): Promise<ReleaseResult> {
  const initial = await CheckoutSession.findById(sessionId);
  if (!initial) {
    throw new CheckoutError(404, 'session_not_found', 'Checkout session not found');
  }
  if (initial.status === 'placed') {
    throw new CheckoutError(409, 'session_placed', 'A placed checkout cannot be released');
  }

  const fallbackStatus: 'failed' | 'expired' = reason === 'expired' ? 'expired' : 'failed';
  let locked = false;

  if (!initial.stockRestoredAt) {
    const claimed = await CheckoutSession.findOneAndUpdate(
      { _id: initial._id, stockRestoredAt: { $exists: false }, status: { $in: ['open', 'failed', 'expired'] } },
      { $set: { status: 'finalizing' } },
      { new: true },
    );
    if (claimed) {
      locked = true;
    } else {
      const latest = await CheckoutSession.findById(initial._id);
      if (latest?.status === 'placed') {
        throw new CheckoutError(409, 'session_placed', 'A placed checkout cannot be released');
      }
      if (!latest?.stockRestoredAt) {
        throw new CheckoutError(409, 'finalization_in_progress', 'This checkout is being updated; retry shortly', undefined, true);
      }
    }
  }

  const working = (await CheckoutSession.findById(initial._id)) ?? initial;
  let released = 0;
  let unresolved = 0;
  const releasedSellers: mongoose.Types.ObjectId[] = [];

  try {
    for (const seller of working.sellers) {
      const outcome = await releaseHold(working, seller);
      if (outcome === 'released') {
        released += 1;
        releasedSellers.push(seller.draftOrderId);
      } else if (outcome === 'unresolved') {
        unresolved += 1;
      }
    }

    if (releasedSellers.length > 0) {
      await CheckoutSession.updateOne(
        { _id: working._id },
        { $set: { 'sellers.$[s].status': 'released' } },
        { arrayFilters: [{ 's.draftOrderId': { $in: releasedSellers } }] },
      );
    }

    // Reservation restoration and payment release are separate outcomes. Also repair
    // drafts on later passes after a successful retry, without restoring stock twice.
    for (const seller of working.sellers) {
      const confirmed = !seller.paymentIntentId || seller.status === 'released'
        || releasedSellers.some(id => id.equals(seller.draftOrderId));
      await Order.updateOne(
        { _id: seller.draftOrderId, status: 'awaiting_payment',
          ...(!confirmed ? { paymentStatus: { $ne: 'released' } } : {}) },
        { $set: { paymentStatus: confirmed ? 'released' : 'release_pending' } },
      );
    }

    if (!locked) {
      return { released, unresolved, stockRestored: Boolean(working.stockRestoredAt) };
    }

    const transaction = await mongoose.startSession();
    try {
      await transaction.withTransaction(async () => {
        const marked = await CheckoutSession.updateOne(
          { _id: working._id, stockRestoredAt: { $exists: false }, status: 'finalizing' },
          { $set: { stockRestoredAt: now, status: fallbackStatus } },
          { session: transaction },
        );
        if (marked.modifiedCount !== 1) {
          throw new CheckoutError(409, 'finalization_in_progress', 'This checkout is being updated; retry shortly', undefined, true);
        }

        for (const reservation of working.stockReservations) {
          if (reservation.variantId) {
            await Product.updateOne(
              { _id: reservation.productId, 'variants._id': reservation.variantId },
              { $inc: { 'variants.$.stock': reservation.quantity, soldCount: -reservation.quantity } },
              { session: transaction },
            );
          } else {
            await Product.updateOne(
              { _id: reservation.productId },
              { $inc: { stock: reservation.quantity, soldCount: -reservation.quantity } },
              { session: transaction },
            );
          }
        }

        for (const coupon of working.couponReservations) {
          await Coupon.updateOne(
            { _id: coupon.couponId, usedCount: { $gt: 0 } },
            { $inc: { usedCount: -1 } },
            { session: transaction },
          );
        }

      });
    } finally {
      await transaction.endSession();
    }

    return { released, unresolved, stockRestored: true };
  } catch (err) {
    if (locked) {
      await CheckoutSession.updateOne(
        { _id: working._id, status: 'finalizing', stockRestoredAt: { $exists: false } },
        { $set: { status: fallbackStatus } },
      );
    }
    throw err;
  }
}
