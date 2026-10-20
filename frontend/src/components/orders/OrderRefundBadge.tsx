import { RotateCcw } from 'lucide-react';
import { Badge } from '../common/Badge';
import { orderRefundLabel } from '../../utils/refund';

/** "Partially refunded", "Fully refunded" or "Refund processing" beside an order's status; nothing without a refund. */
export function OrderRefundBadge({ order, className = '' }: { order: { paymentStatus?: string | null; refundedAmountMinor?: number; refundReservedAmountMinor?: number }; className?: string }) {
  const label = orderRefundLabel(order);
  if (!label) return null;
  return (
    <Badge variant={label.done ? 'success' : 'warning'} size="sm" className={`gap-1 ${className}`}>
      <RotateCcw className="h-3 w-3" aria-hidden />{label.label}
    </Badge>
  );
}
