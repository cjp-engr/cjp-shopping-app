import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { refundService } from '../../services/refundService';
import type { SellerRefundPage } from '../../types/refund';
import { approvedRefundStates } from '../../utils/refund';
import { refundSecondary, refundSurface } from './RefundPresentation';
import { RefundOrderCard } from './RefundOrderCard';
export function CompletedRefunds() {
  const [page, setPage] = useState(1); const [data, setData] = useState<SellerRefundPage>();
  const [busy, setBusy] = useState(true); const [error, setError] = useState(''); const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    refundService.completed(page).then(result => { if (active) setData(result); }).catch(() => { if (active) setError('Could not load your refunds. Please try again.'); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [page, refresh]);
  function reload(nextPage = page) { setBusy(true); setError(''); setPage(nextPage); setRefresh(n => n + 1); }
  return <section className="space-y-5" aria-label="Return and refund"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Return/Refund</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Refunds your seller has approved, including ones still being processed. Requests waiting for the seller stay with your order under Completed.</p></div><button type="button" className={refundSecondary} disabled={busy} onClick={() => reload()} aria-label="Refresh refunds"><RotateCcw className="h-4 w-4" /></button></div>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    {busy ? <p role="status" className="py-8 text-center text-sm text-gray-600 dark:text-gray-300">Loading your refunds…</p> : !error && data?.total === 0 ? <div className={`${refundSurface} py-12 text-center`}><RotateCcw className="mx-auto mb-4 h-8 w-8 text-gray-400" aria-hidden /><h3 className="font-semibold">No approved refunds yet</h3><p className="mx-auto mt-2 max-w-sm text-gray-600 dark:text-gray-300">When a seller approves a refund request, it moves here. Requests still waiting for the seller stay with your order under Completed, where you can track them in the order details.</p></div> : !error && <div className="space-y-4">{data?.requests.filter(r => approvedRefundStates.includes(r.state)).map(r => <RefundOrderCard key={r.id} request={r} />)}</div>}
    {!busy && !error && !!data?.total && <div className="flex items-center justify-between gap-3"><button type="button" className={refundSecondary} disabled={page <= 1} onClick={() => reload(page - 1)}>Previous</button><span className="text-sm text-gray-600 dark:text-gray-300">Page {data.page} of {data.pages}</span><button type="button" className={refundSecondary} disabled={page >= data.pages} onClick={() => reload(page + 1)}>Next</button></div>}
  </section>;
}
