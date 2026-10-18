import type { Order, SellerPaymentOperation } from '../types/order';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** True while the seller's payment capture for this order is still being resolved. */
export function isCapturePending(order: Pick<Order, 'paymentStatus'>): boolean {
  return order.paymentStatus === 'capture_pending';
}

/** Polling continues only while at least one listed order is still waiting on its payment capture. */
export function hasCapturePending(orders: ReadonlyArray<Pick<Order, 'paymentStatus'>>): boolean {
  return orders.some(isCapturePending);
}

/** Interval between silent refreshes while a capture is resolving. */
export const CAPTURE_POLL_INTERVAL_MS = 5000;

/** Legacy orders have no `acceptBy` and stay acceptable; at the exact deadline acceptance is rejected. */
export function canAcceptOrder(order: Order, now: Date): boolean {
  if (order.status !== 'pending' || isCapturePending(order)) return false;
  if (!order.acceptBy) return true;
  return new Date(order.acceptBy).getTime() > now.getTime();
}

export function acceptanceErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'acceptance_deadline_passed':
      return 'The acceptance window for this order has ended.';
    case 'order_not_pending':
      return 'This order is no longer waiting for acceptance. Refresh to see its latest status.';
    case 'capture_failed':
      return 'The payment could not be charged. Try accepting again.';
    case 'authorization_expired':
      return "The buyer's payment reservation expired, so this order was cancelled.";
    case 'payment_reference_missing':
      return 'This order has no payment on file. Contact support.';
    case 'not_order_seller':
    case 'order_not_found':
      return 'This order is not available to you.';
    default:
      return 'Could not accept the order. Please try again.';
  }
}

/** Seller-facing countdown for a pending order; null when there is no deadline to show. */
export function acceptanceDeadlineText(order: Order, now: Date): string | null {
  if (order.status !== 'pending' || !order.acceptBy) return null;
  const deadline = new Date(order.acceptBy).getTime();
  const remainingMs = deadline - now.getTime();
  if (remainingMs <= 0) return 'Acceptance window ended';
  if (remainingMs > DAY_MS) return `Accept by ${new Date(deadline).toLocaleString()}`;

  const totalMinutes = Math.ceil(remainingMs / MINUTE_MS);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [hours > 0 ? `${hours}h` : '', minutes > 0 ? `${minutes}m` : ''].filter(Boolean);
  return `Accept within ${parts.join(' ')}`;
}

export const MAX_CANCEL_REASON_LENGTH = 1000;

/** Validation message for a cancellation reason (trimmed, 1 to 1000 characters); null when it is acceptable. */
export function cancelReasonError(reason: string): string | null {
  const trimmed = reason.trim();
  if (trimmed.length < 1) return 'Enter a reason for the cancellation. The buyer will see it.';
  if (trimmed.length > MAX_CANCEL_REASON_LENGTH) return `The reason must be at most ${MAX_CANCEL_REASON_LENGTH} characters.`;
  return null;
}

export function cancellationErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'invalid_cancel_reason':
      return 'Enter a reason of 1 to 1000 characters.';
    case 'cancellation_conflict':
      return 'This order was accepted, is being charged, or is no longer pending. Refresh to see its latest status.';
    case 'cancellation_unavailable':
      return 'This order cannot be cancelled by the seller.';
    case 'not_order_seller':
    case 'order_not_found':
      return 'This order is not available to you.';
    default:
      return 'Could not cancel the order. Please try again.';
  }
}

/** The order moved on (or is not the seller's), so the screen should close the dialog and refresh. */
export function isStaleCancellation(code: string | undefined): boolean {
  return code === 'cancellation_conflict' || code === 'cancellation_unavailable'
    || code === 'not_order_seller' || code === 'order_not_found';
}

/** Confirmation after a cancellation. Money is only called returned once the release is complete. */
export function cancellationOutcomeMessage(operation: SellerPaymentOperation | undefined): string {
  switch (operation?.status) {
    case 'pending':
      return 'Order cancelled. The card hold is being released.';
    case 'completed':
      return 'Order cancelled. The card hold was released.';
    case 'needs_review':
      return 'Order cancelled. Releasing the card hold needs support review.';
    default:
      return 'Order cancelled.';
  }
}
