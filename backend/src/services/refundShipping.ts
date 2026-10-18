import { refundableUnits, type RefundAllocationV1, type RefundUnit } from './refundAllocation.js';
import type { ClientSession, Types } from 'mongoose';
import RefundRequest from '../models/RefundRequest.js';

interface RefundAccounting {
  refundUnitsTaken?: ReadonlyArray<{ lineId: string; ordinal: number }>;
  refundedAmountMinor?: number;
  refundReservedAmountMinor?: number;
  refundedShippingMinor?: number;
  refundReservedShippingMinor?: number;
}
const unitKey = (u: { lineId: string; ordinal: number }) => `${u.lineId}#${u.ordinal}`;
export const isSellerFaultReason = (reason: string) => ['damaged', 'wrong_item', 'missing_items', 'not_as_described'].includes(reason);

/** Unknown or non-seller-fault earlier refunds cannot qualify the whole order for shipping. */
export async function shippingHistoryEligible(order: RefundAccounting & { _id: Types.ObjectId }, session?: ClientSession): Promise<boolean> {
  const previous = await RefundRequest.find({ orderId: order._id, state: 'refunded' }).session(session ?? null);
  return previous.every(r => isSellerFaultReason(r.reasonCode))
    && previous.reduce((sum, r) => sum + r.amountMinor, 0) === (order.refundedAmountMinor ?? 0)
    && previous.reduce((sum, r) => sum + (r.shippingMinor ?? 0), 0) === (order.refundedShippingMinor ?? 0);
}

/** The shipping fee is a single component, separate from the selected item units. */
export function validRefundAccounting(allocation: RefundAllocationV1, order: RefundAccounting): boolean {
  const refunded = order.refundedAmountMinor ?? 0; const reserved = order.refundReservedAmountMinor ?? 0;
  const shipping = order.refundedShippingMinor ?? 0; const shippingReserved = order.refundReservedShippingMinor ?? 0;
  if (![refunded, reserved, shipping, shippingReserved].every(n => Number.isSafeInteger(n) && n >= 0)
      || refunded + reserved > allocation.capturedAmountMinor || shipping > refunded || shippingReserved > reserved
      || ![0, allocation.shippingMinor].includes(shipping) || ![0, allocation.shippingMinor].includes(shippingReserved)
      || shipping + shippingReserved > allocation.shippingMinor) return false;
  const values = new Map(allocation.units.map(u => [unitKey(u), u.merchandiseMinor + u.taxMinor]));
  const seen = new Set<string>(); let total = 0;
  for (const taken of order.refundUnitsTaken ?? []) {
    const key = unitKey(taken); const value = values.get(key);
    if (value === undefined || seen.has(key)) return false;
    seen.add(key); total += value;
  }
  return total + shipping + shippingReserved === refunded + reserved;
}

/** Includes remaining shipping only when this selection covers every remaining paid unit. */
export function shippingForRefundSelection(allocation: RefundAllocationV1, order: RefundAccounting, selected: ReadonlyArray<RefundUnit>, reason = 'damaged'): number {
  if (!isSellerFaultReason(reason)) return 0;
  const left = refundableUnits(allocation, order.refundUnitsTaken ?? []);
  const selectedKeys = new Set(selected.map(unitKey));
  if (!left.length || selectedKeys.size !== selected.length || selected.length !== left.length || !left.every(u => selectedKeys.has(unitKey(u)))) return 0;
  return Math.max(0, allocation.shippingMinor - (order.refundedShippingMinor ?? 0) - (order.refundReservedShippingMinor ?? 0));
}
