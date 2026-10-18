import { sellerSeesManualCapture } from '../config/checkout.js';

/**
 * Visibility rules for orders. Drafts (`awaiting_payment`) belong to an unfinished checkout
 * and never appear in fulfillment lists or buyer history. Manual-capture orders stay hidden
 * from sellers until SELLER_SEES_MANUAL_CAPTURE is enabled.
 */

interface VisibilityFields {
  status: string;
  paymentFlowVersion?: string;
}

export function isBuyerVisibleOrder(order: Pick<VisibilityFields, 'status'>): boolean {
  return order.status !== 'awaiting_payment';
}

export function isSellerVisibleOrder(order: VisibilityFields): boolean {
  if (!isBuyerVisibleOrder(order)) return false;
  return sellerSeesManualCapture() || order.paymentFlowVersion !== 'manual_capture';
}

export function buyerVisibleOrderFilter(): { status: { $ne: 'awaiting_payment' } } {
  return { status: { $ne: 'awaiting_payment' } };
}

export function sellerVisibleOrderFilter(): {
  status: { $ne: 'awaiting_payment' };
  paymentFlowVersion?: { $ne: 'manual_capture' };
} {
  return sellerSeesManualCapture()
    ? buyerVisibleOrderFilter()
    : { ...buyerVisibleOrderFilter(), paymentFlowVersion: { $ne: 'manual_capture' } };
}
