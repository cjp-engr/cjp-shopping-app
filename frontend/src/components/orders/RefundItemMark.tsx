import { refundMark } from '../../utils/refund';
import { RefundChip } from './RefundChip';

interface Props {
  marks?: ReadonlyArray<{ lineId: string; refunded: number; processing: number }>;
  lineId?: string;
  quantity: number;
}

/** "Refunded" (or how much of the item was) on an order item whose units were paid back; nothing otherwise. */
export function RefundItemMark({ marks, lineId, quantity }: Props) {
  const mark = refundMark(marks, lineId, quantity);
  if (!mark) return null;
  return <RefundChip kind={mark.kind} label={mark.label} size="sm" className="mt-1.5" />;
}
