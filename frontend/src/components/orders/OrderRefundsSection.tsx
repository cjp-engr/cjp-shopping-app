import type { RefundRequest } from '../../types/refund';
import { RefundOrderCard } from './RefundOrderCard';

/** The refund history of one order on the seller's order page: every request as a seller card; nothing when there are none. */
export function OrderRefundsSection({ requests }: { requests: RefundRequest[] }) {
  if (!requests.length) return null;
  return (
    <section className="space-y-3" aria-label="Refunds on this order">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Refunds</h2>
      {requests.map(request => <RefundOrderCard key={request.id} request={request} viewer="seller" inOrder />)}
    </section>
  );
}
