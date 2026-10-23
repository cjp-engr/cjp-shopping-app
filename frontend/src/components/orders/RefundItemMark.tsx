import { RotateCcw } from 'lucide-react';
import { Badge } from '../common/Badge';
import { refundMark } from '../../utils/refund';

interface Props {
  marks?: ReadonlyArray<{ lineId: string; refunded: number; processing: number }>;
  lineId?: string;
  quantity: number;
}

/** "Refunded" (or how much of the item was) on an order item whose units were paid back; nothing otherwise. */
export function RefundItemMark({ marks, lineId, quantity }: Props) {
  const mark = refundMark(marks, lineId, quantity);
  if (!mark) return null;
  return (
    <Badge variant={mark.done ? 'success' : 'warning'} size="sm" className="mt-1.5 gap-1">
      <RotateCcw className="h-3 w-3" aria-hidden />{mark.label}
    </Badge>
  );
}
