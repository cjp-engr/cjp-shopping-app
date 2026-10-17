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

/** Buyer-facing payment status for manual-capture orders. Legacy orders keep their existing display. */
export function paymentStatusNotice(order: Order): PaymentStatusNotice | null {
  if (!isManualCaptureOrder(order)) return null;
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
  return order.status === 'pending' && (!isManualCaptureOrder(order)
    || order.paymentStatus === 'authorized' || order.paymentStatus === 'not_required');
}
