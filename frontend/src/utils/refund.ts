import type { RefundLine } from '../types/refund';
export function refundDate(value?: string) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
export function minorFactor(currency = 'usd') { return currency.toLowerCase() === 'jpy' ? 1 : 100; }
export function refundMoney(amountMinor: number, currency: string) { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amountMinor / minorFactor(currency)); }
export function refundQuote(lines: RefundLine[], selection: Record<string, number>): number | null {
  let amount = 0;
  for (const [id, quantity] of Object.entries(selection)) {
    const line = lines.find(l => l.lineId === id);
    if (!line || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > line.quantityAvailable || quantity > line.availableUnitAmountsMinor.length) return null;
    amount += line.availableUnitAmountsMinor.slice(0, quantity).reduce((a, b) => a + b, 0);
  }
  return Number.isSafeInteger(amount) ? amount : null;
}
export function refundShippingQuote(lines: RefundLine[], selection: Record<string, number>, reason: string, shippingMinor = 0): number {
  if (!['damaged', 'wrong_item', 'missing_items', 'not_as_described'].includes(reason) || !refundQuote(lines, selection)
    || !Number.isSafeInteger(shippingMinor) || shippingMinor < 0) return 0;
  return lines.every(l => (selection[l.lineId] ?? 0) === l.quantityAvailable) ? shippingMinor : 0;
}
export function netOrderRevenue(order: { total: number; refundedAmountMinor?: number; currency?: string }) {
  const factor = minorFactor(order.currency);
  return Math.max(0, (Math.round(order.total * factor) - (order.refundedAmountMinor ?? 0)) / factor);
}
export const refundStateLabels = { requested: 'Awaiting seller review', rejected: 'Rejected', processing: 'Refund processing', refunded: 'Refunded', needs_review: 'Refund needs payment review' };
/** States that appear in the Return/Refund tab: the seller has approved the request. Waiting and rejected requests stay with the order under Completed. */
export const approvedRefundStates: string[] = ['processing', 'needs_review', 'refunded'];
export function refundDateCaption(request: { state: string; submittedAt: string; decidedAt?: string; completedAt?: string }) {
  if (request.state === 'refunded') return `Completed ${refundDate(request.completedAt)}`;
  if (approvedRefundStates.includes(request.state)) return `Approved ${refundDate(request.decidedAt ?? request.submittedAt)}`;
  if (request.state === 'rejected') return `Rejected ${refundDate(request.decidedAt ?? request.submittedAt)}`;
  return `Submitted ${refundDate(request.submittedAt)}`;
}
export const refundReasonLabels = { damaged: 'Damaged item', wrong_item: 'Wrong item', missing_items: 'Missing items', not_as_described: 'Not as described', other: 'Other' };
export const refundEligibilityLabels: Record<string, string> = {
  not_delivered: 'Refund requests are available after delivery.', delivery_unknown: 'This order has no verified delivery date.',
  window_closed: 'The seven-day refund request window has ended.', unsupported_payment: 'This payment method does not support in-app refunds.',
  payment_not_refundable: 'This payment is not eligible for another refund.', seller_unverified: 'Seller details need review.',
  active_request: 'A refund request is already awaiting a decision or payment outcome.', no_units_left: 'All refundable units have been requested.', review_needed: 'Payment details need review before another refund can be requested.',
};

/**
 * How to mark an order item that has refunded units: "Refunded" when all of it was paid back, a count
 * when only some was, and "Refund processing" while approved units are still being paid back.
 * `done` is false while any part is still processing. Null when nothing was refunded.
 */
export function refundMark(marks: ReadonlyArray<{ lineId: string; refunded: number; processing: number }> | undefined, lineId: string | undefined, quantity: number): { label: string; done: boolean } | null {
  const mark = lineId ? marks?.find(m => m.lineId === lineId) : undefined;
  if (!mark || mark.refunded + mark.processing === 0) return null;
  if (mark.processing === 0) return { label: mark.refunded >= quantity ? 'Refunded' : `${mark.refunded} of ${quantity} refunded`, done: true };
  return { label: mark.refunded === 0 ? 'Refund processing' : `${mark.refunded} refunded, ${mark.processing} processing`, done: false };
}

/** The seller's Return/Refund tab badge: the requests still waiting for the seller (0 hides the badge). */
export function sellerRefundBadge(page: { total: number; counts?: Record<string, number> }): number {
  return page.counts?.in_progress ?? page.total;
}
