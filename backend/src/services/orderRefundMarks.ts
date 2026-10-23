import RefundRequest from '../models/RefundRequest.js';

/** How many units of one order line have been paid back, and how many are approved but still being paid back. */
export interface RefundedItemMark { lineId: string; refunded: number; processing: number }

interface MarkSource { orderId: { toString(): string } | string; state: string; units: ReadonlyArray<{ lineId: string }> }

/**
 * Per order, the lines that have refunded units, for marking items in the buyer's order list. Settled
 * refunds count as refunded; approved ones still being paid back (or awaiting payment review) as
 * processing. Requests waiting for the seller and rejected ones mark nothing.
 */
export function summarizeRefundedItems(requests: ReadonlyArray<MarkSource>): Map<string, RefundedItemMark[]> {
  const marks = new Map<string, Map<string, RefundedItemMark>>();
  for (const request of requests) {
    const field = request.state === 'refunded' ? 'refunded' : ['processing', 'needs_review'].includes(request.state) ? 'processing' : null;
    if (!field) continue;
    const orderId = request.orderId.toString();
    const lines = marks.get(orderId) ?? new Map<string, RefundedItemMark>();
    marks.set(orderId, lines);
    for (const { lineId } of request.units) {
      const mark = lines.get(lineId) ?? { lineId, refunded: 0, processing: 0 };
      mark[field] += 1;
      lines.set(lineId, mark);
    }
  }
  return new Map([...marks].map(([orderId, lines]) => [orderId, [...lines.values()]]));
}

/** Loads the marks for a set of the buyer's orders in one query. */
export async function refundedItemsByOrder(orderIds: ReadonlyArray<string>): Promise<Map<string, RefundedItemMark[]>> {
  if (!orderIds.length) return new Map();
  const requests = await RefundRequest.find({ orderId: { $in: orderIds }, state: { $in: ['refunded', 'processing', 'needs_review'] } }).select('orderId state units.lineId').lean();
  return summarizeRefundedItems(requests);
}

/** The orders as sent to the buyer, each with its `refundedItems` (empty when nothing was refunded). */
export async function attachRefundedItems(orders: ReadonlyArray<{ _id: { toString(): string }; toJSON(): Record<string, any> }>): Promise<Array<Record<string, any> & { refundedItems: RefundedItemMark[] }>> {
  const marks = await refundedItemsByOrder(orders.map(order => order._id.toString()));
  return orders.map(order => ({ ...order.toJSON(), refundedItems: marks.get(order._id.toString()) ?? [] }));
}
