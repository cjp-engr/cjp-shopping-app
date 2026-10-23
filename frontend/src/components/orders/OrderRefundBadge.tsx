import { orderRefundLabel } from '../../utils/refund';
import { RefundChip } from './RefundChip';

/** "Refund requested", "Refund processing", "Partially refunded" or "Fully refunded" beside an order's status; nothing without a refund. */
export function OrderRefundBadge({ order, className = '' }: { order: { paymentStatus?: string | null; refundedAmountMinor?: number; refundReservedAmountMinor?: number; activeRefundRequestId?: string | null }; className?: string }) {
  const label = orderRefundLabel(order);
  if (!label) return null;
  return <RefundChip kind={label.kind} label={label.label} className={className} />;
}
