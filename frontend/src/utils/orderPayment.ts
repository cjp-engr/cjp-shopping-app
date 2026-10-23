import type { Order } from '../types/order';

// Matches the backend's SELLER_ACCEPT_WINDOW_MS: a seller has 24 hours to accept an order.
export const SELLER_ACCEPT_WINDOW_MS = 24 * 60 * 60 * 1000;

export type PaymentNoticeTone = 'info' | 'success' | 'neutral' | 'warning';

export interface PaymentStatusNotice {
  tone: PaymentNoticeTone;
  title: string;
  body: string;
}

export function isManualCaptureOrder(order: Pick<Order, 'paymentFlowVersion'>): boolean {
  return order.paymentFlowVersion === 'manual_capture';
}

/** Legacy refunds share the status display; legacy captures keep their original display. */
export function paymentStatusNotice(order: Order): PaymentStatusNotice | null {
  if (order.paymentErrorCode === 'refund_review' || order.paymentErrorCode === 'legacy_payment_review') {
    return { tone: 'warning', title: 'Payment needs review', body: 'Please contact support to check this payment or refund. Do not pay again.' };
  }
  if (!isManualCaptureOrder(order) && !['refund_pending', 'refunded', 'partially_refunded'].includes(order.paymentStatus ?? '')) return null;
  switch (order.paymentStatus) {
    case 'authorized':
      return {
        tone: 'info',
        title: 'Payment reserved',
        body: 'Your payment is reserved. It is charged when the seller starts preparing your order.',
      };
    case 'capture_pending':
      return { tone: 'info', title: 'Charging payment', body: 'Your payment is being charged as the seller starts preparing your order.' };
    case 'captured':
      return { tone: 'success', title: 'Payment charged', body: 'Your payment was charged when the seller started preparing your order.' };
    case 'release_pending':
      return { tone: 'neutral', title: 'Releasing reservation', body: 'The payment reservation is being released. You will not be charged.' };
    case 'released':
      return { tone: 'neutral', title: 'Reservation released', body: 'The payment reservation was released. You were not charged.' };
    case 'refund_pending':
      return { tone: 'neutral', title: 'Refund in progress', body: 'Your refund has been requested and is being processed.' };
    case 'refunded':
      return { tone: 'success', title: 'Refunded', body: 'Your payment was refunded.' };
    case 'partially_refunded':
      return { tone: 'neutral', title: 'Partially refunded', body: 'Part of your payment was refunded. See item refund history for the amounts and decisions.' };
    case 'failed':
      return {
        tone: 'warning',
        title: 'Payment problem',
        body: 'We could not complete the payment for this order. Contact support if this continues.',
      };
    default:
      return null;
  }
}

/** The seller's acceptance deadline, while the seller has not accepted the order yet. */
export function acceptanceDeadline(order: Order): string | null {
  if (!isManualCaptureOrder(order) || order.status !== 'pending') return null;
  return order.acceptBy ?? null;
}

/** True when the card authorization ends before the usual 24-hour acceptance window. */
export function hasShortAcceptanceWindow(order: Order): boolean {
  if (!order.placedAt || !order.acceptBy) return false;
  return new Date(order.acceptBy).getTime() < new Date(order.placedAt).getTime() + SELLER_ACCEPT_WINDOW_MS;
}

/** Acceptance claims the payment before capture; cancellation is no longer available then. */
export function canBuyerCancel(order: Order): boolean {
  return order.status === 'pending' && !['refund_pending', 'refunded', 'failed'].includes(order.paymentStatus ?? '') && (!isManualCaptureOrder(order)
    || order.paymentStatus === 'authorized' || order.paymentStatus === 'not_required');
}

/**
 * A pending order is cancellable only when the server says so (`canSellerCancelPending`): the client does not
 * infer it from the payment shape. After pending the existing rule stays: cash on delivery only, never a card order.
 */
export function canSellerCancel(
  order: Pick<Order, 'paymentFlowVersion' | 'paymentMethod' | 'canSellerCancelPending'> & { status: string },
): boolean {
  if (order.status === 'pending') return order.canSellerCancelPending === true;
  return ['preparing', 'processing'].includes(order.status)
    && !isManualCaptureOrder(order) && !['credit-card', 'debit-card'].includes(order.paymentMethod.type);
}

/** What the buyer sees when the seller cancelled their order, with the reason the seller gave. */
export function cancelledBySellerNotice(order: Order): PaymentStatusNotice | null {
  if (order.status !== 'cancelled' || order.cancelledByRole !== 'seller') return null;
  return {
    tone: 'neutral',
    title: 'Cancelled by the seller',
    body: order.cancelReason ? `The seller cancelled this order. Reason: ${order.cancelReason}` : 'The seller cancelled this order.',
  };
}
