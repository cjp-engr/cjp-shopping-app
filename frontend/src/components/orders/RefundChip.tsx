import { CircleCheck, Clock3, Contrast } from 'lucide-react';
import type { RefundKind } from '../../utils/refund';

// Full: a violet tint and a check. Partial: a violet outline and a half circle. Processing: amber and a clock.
const KINDS: Record<RefundKind, { classes: string; Icon: typeof CircleCheck }> = {
  full: { classes: 'border-transparent bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200', Icon: CircleCheck },
  partial: { classes: 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/50 dark:bg-violet-500/10 dark:text-violet-300', Icon: Contrast },
  processing: { classes: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300', Icon: Clock3 },
};

/** The chip for a refund: on an order (`md`) or on one of its items (`sm`). The three kinds differ in fill and icon, not only in the label. */
export function RefundChip({ kind, label, size = 'md', className = '' }: { kind: RefundKind; label: string; size?: 'sm' | 'md'; className?: string }) {
  const { classes, Icon } = KINDS[kind];
  const sizing = size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-semibold leading-none ${sizing} ${classes} ${className}`}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />{label}
    </span>
  );
}
