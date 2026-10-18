import mongoose, { type ClientSession } from 'mongoose';
import Order, { type IOrder } from '../models/Order.js';
import { AppError } from '../middleware/errorHandler.js';
import { deliveredRefundsEnabled } from '../config/checkout.js';
import { shippingHistoryEligible, validRefundAccounting } from './refundShipping.js';
import { isBuyerVisibleOrder } from './orderVisibility.js';
import {
  buildRefundAllocation,
  isConsistentAllocation,
  lineIdFor,
  refundableUnits,
  RefundAllocationError,
  type RefundAllocationV1,
} from './refundAllocation.js';

export type RefundIneligibleReason =
  | 'not_delivered'
  | 'delivery_unknown'
  | 'window_closed'
  | 'unsupported_payment'
  | 'payment_not_refundable'
  | 'seller_unverified'
  | 'active_request'
  | 'no_units_left'
  | 'review_needed';

export interface RefundLineView {
  productImage?: string;
  lineId: string;
  productName: string;
  quantityOrdered: number;
  quantityAvailable: number;
  /** Refund amounts of the units still available, lowest ordinal first; a request for n units takes the first n. */
  availableUnitAmountsMinor: number[];
}

export interface RefundEligibilityView {
  shippingRefundableMinor?: number;
  requestsEnabled: boolean;
  orderId: string;
  eligible: boolean;
  reason?: RefundIneligibleReason;
  currency?: string;
  deliveredAt?: Date;
  deadlineAt?: Date;
  lines: RefundLineView[];
}

const CARD_TYPES = ['credit-card', 'debit-card'];
/** A fully captured payment, or one that has already been partly refunded and still has balance. */
const REFUNDABLE_PAYMENT_STATUSES: readonly string[] = ['captured', 'partially_refunded'];

function notFound(): AppError {
  return new AppError(404, 'Order not found', 'order_not_found');
}

function plainAllocation(raw: unknown): RefundAllocationV1 | undefined {
  if (!raw) return undefined;
  const value = (typeof (raw as { toObject?: unknown }).toObject === 'function'
    ? (raw as { toObject: () => RefundAllocationV1 }).toObject()
    : raw) as RefundAllocationV1;
  return {
    version: value.version,
    currency: value.currency,
    capturedAmountMinor: value.capturedAmountMinor,
    shippingMinor: value.shippingMinor,
    units: Array.isArray(value.units)
      ? value.units.map(u => ({ lineId: u.lineId, ordinal: u.ordinal, merchandiseMinor: u.merchandiseMinor, taxMinor: u.taxMinor }))
      : [],
  };
}

/** A stored allocation is only trusted while it is sound, describes these items, and matches the verified captured payment. */
function matchesPayment(allocation: RefundAllocationV1, order: Pick<IOrder, 'amountMinor' | 'currency' | 'items'>): boolean {
  return allocation.version === 1
    && allocation.capturedAmountMinor === order.amountMinor
    && allocation.currency === order.currency?.toLowerCase()
    && isConsistentAllocation(allocation, order.items);
}

/**
 * The refundable allocation for a captured order: the stored one, or one built now from the
 * order's persisted snapshot and stored with a compare-and-set so concurrent readers agree.
 * Returns undefined when the snapshot cannot be verified. Pass the caller's `session` when called
 * inside a transaction so the write belongs to it.
 */
export async function ensureRefundAllocation(order: IOrder, session?: ClientSession): Promise<RefundAllocationV1 | undefined> {
  const existing = plainAllocation(order.refundAllocation);
  if (existing) return matchesPayment(existing, order) ? existing : undefined;

  let built: RefundAllocationV1;
  try {
    built = buildRefundAllocation(order);
  } catch (error) {
    if (error instanceof RefundAllocationError) return undefined;
    throw error;
  }
  const stored = await Order.findOneAndUpdate(
    { _id: order._id, $or: [{ refundAllocation: { $exists: false } }, { refundAllocation: null }] },
    { $set: { refundAllocation: built } },
    { new: true, session },
  );
  if (stored) return built;
  // Another request stored one first; use theirs so every reader sees the same amounts.
  const current = await Order.findById(order._id).session(session ?? null);
  const winner = plainAllocation(current?.refundAllocation);
  return winner && matchesPayment(winner, order) ? winner : undefined;
}

/** Combined value of the taken units, or undefined if any is not part of the allocation or repeats. */
function takenUnitsValue(allocation: RefundAllocationV1, taken: ReadonlyArray<{ lineId: string; ordinal: number }>): number | undefined {
  const values = new Map(allocation.units.map(u => [`${u.lineId}#${u.ordinal}`, u.merchandiseMinor + u.taxMinor]));
  const seen = new Set<string>();
  let total = 0;
  for (const unit of taken) {
    const key = `${unit.lineId}#${unit.ordinal}`;
    const value = values.get(key);
    if (value === undefined || seen.has(key)) return undefined;
    seen.add(key);
    total += value;
  }
  return total;
}

/**
 * What the buyer can ask to have refunded for one of their delivered orders. The deadline is the
 * recorded `refundRequestDeadlineAt`; an order without recorded delivery is never estimated.
 */
export async function getRefundEligibility(orderId: string, buyerId: string, now: Date = new Date()): Promise<RefundEligibilityView> {
  if (!mongoose.isValidObjectId(orderId) || !mongoose.isValidObjectId(buyerId)) throw notFound();
  const order = await Order.findOne({ _id: orderId, userId: buyerId });
  if (!order || !isBuyerVisibleOrder(order)) throw notFound();

  const base = { orderId: order.id as string, deliveredAt: order.deliveredAt, deadlineAt: order.refundRequestDeadlineAt, requestsEnabled: deliveredRefundsEnabled() };
  const no = (reason: RefundIneligibleReason): RefundEligibilityView => ({ ...base, eligible: false, reason, lines: [] });

  if (order.status !== 'delivered') return no('not_delivered');
  if (!order.deliveredAt || !order.refundRequestDeadlineAt) return no('delivery_unknown');
  if (!CARD_TYPES.includes(order.paymentMethod.type)) return no('unsupported_payment');
  if (!order.paymentStatus || !REFUNDABLE_PAYMENT_STATUSES.includes(order.paymentStatus) || order.refundId) {
    return no('payment_not_refundable');
  }
  if (!order.sellerId) return no('seller_unverified');
  if (now.getTime() > order.refundRequestDeadlineAt.getTime()) return no('window_closed');
  if (order.activeRefundRequestId) return no('active_request');

  if (typeof order.amountMinor !== 'number') return no('review_needed');
  const allocation = await ensureRefundAllocation(order);
  if (!allocation) return no('review_needed');

  // Money already refunded or reserved must be exactly the value of the units taken for it. Anything
  // else (an unexplained refund, a unit that is not in the allocation) needs a person, not a quote.
  const taken = order.refundUnitsTaken ?? [];
  if (!validRefundAccounting(allocation, order)) {
    return no('review_needed');
  }

  const left = refundableUnits(allocation, taken);
  if (left.length === 0) return no('no_units_left');

  const lines = order.items.map((item, index): RefundLineView => {
    const lineId = lineIdFor(item, index);
    const units = left.filter(unit => unit.lineId === lineId);
    return {
      lineId,
      productName: item.productName,
      productImage: item.productImage,
      quantityOrdered: item.quantity,
      quantityAvailable: units.length,
      availableUnitAmountsMinor: units.map(unit => unit.merchandiseMinor + unit.taxMinor),
    };
  });
  const shippingRefundableMinor = await shippingHistoryEligible(order) ? allocation.shippingMinor - (order.refundedShippingMinor ?? 0) - (order.refundReservedShippingMinor ?? 0) : 0;
  return { ...base, eligible: true, currency: allocation.currency, shippingRefundableMinor, lines };
}
