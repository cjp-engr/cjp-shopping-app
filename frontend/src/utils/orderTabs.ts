interface TabOrder { status: string; paymentStatus?: string | null }

/** Everything paid for the order, shipping included, has been paid back. */
export const isFullyRefunded = (order: Pick<TabOrder, 'paymentStatus'>) => order.paymentStatus === 'refunded';

/**
 * The orders a My Orders tab lists. A fully refunded order is no longer a completed purchase: it leaves
 * Complete (its refund is under Return/Refund) but stays under All.
 */
export function ordersInTab<T extends TabOrder>(tabKey: string, statuses: readonly string[], orders: T[]): T[] {
  if (tabKey === 'all') return orders;
  const inStatus = orders.filter(order => statuses.includes(order.status));
  return tabKey === 'complete' ? inStatus.filter(order => !isFullyRefunded(order)) : inStatus;
}
