import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { refundButton, refundField, refundSecondary } from '../orders/RefundPresentation';
import { RefundOrderCard } from '../orders/RefundOrderCard';
import { refundService } from '../../services/refundService';
import type { SellerRefundPage } from '../../types/refund';
import { refundMoney } from '../../utils/refund';

export function RefundRequestReview({ onUpdated }: { onUpdated?: () => void }) {
  const [page, setPage] = useState(1); const [data, setData] = useState<SellerRefundPage>();
  const [loading, setLoading] = useState(true); const generation = useRef(0);
  const [rejecting, setRejecting] = useState(''); const [approving, setApproving] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const inFlight = useRef(false);
  const load = useCallback(async () => {
    const current = ++generation.current;
    try { const result = await refundService.sellerList(page); if (current === generation.current) setData(result); }
    finally { if (current === generation.current) setLoading(false); }
  }, [page]);
  useEffect(() => {
    let active = true;
    void load().catch(() => { if (active) setError('Could not load refund requests.'); });
    return () => { active = false; generation.current++; };
  }, [load]);
  const decide = async (id: string, decision: 'approve' | 'reject') => {
    if (inFlight.current || loading) return;
    inFlight.current = true; setBusy(id); setError('');
    try { await refundService.decide(id, decision, reasons[id]?.trim()); await load(); onUpdated?.(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save decision. Refresh before retrying.'); await load().catch(() => {}); }
    finally { inFlight.current = false; setBusy(''); }
  };
  const selected = data?.requests.find(r => r.id === approving);
  return <section className="space-y-5" aria-label="Seller refund requests">
    <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-gray-900 dark:text-white">Refund requests</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Review the buyer’s issue and exact refund amount.</p></div><button type="button" disabled={!!busy || loading} aria-label="Refresh refund requests" onClick={() => { setLoading(true); setError(''); void load().then(() => onUpdated?.()).catch(() => setError('Could not refresh refund requests.')); }} className={refundSecondary}><RotateCcw className="h-4 w-4" /></button></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:text-red-200">{error}</p>}
    {!data && !error && <p role="status" className="text-sm text-gray-600 dark:text-gray-300">Loading refund requests…</p>}
    {data?.total === 0 && <p className="py-8 text-center text-sm text-gray-600 dark:text-gray-300">No refund requests to review.</p>}
    <div className="space-y-4">{data?.requests.map(r => <RefundOrderCard key={r.id} request={r} viewer="seller">
      {r.state === 'requested' && r.canDecide && <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-700">
        <p className="mb-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300">Approval starts the refund immediately. The buyer keeps the item.</p>
        {rejecting === r.id && <label className="mb-4 block text-sm font-semibold">Reason for rejecting<textarea aria-label={`Rejection reason for ${r.id}`} disabled={!!busy || loading} maxLength={1000} value={reasons[r.id] ?? ''} onChange={e => setReasons(v => ({ ...v, [r.id]: e.target.value }))} className={refundField} autoFocus /></label>}
        <div className="flex flex-wrap justify-end gap-3"><button disabled={!!busy || loading || (rejecting === r.id && !reasons[r.id]?.trim())} type="button" onClick={() => rejecting === r.id ? void decide(r.id, 'reject') : setRejecting(r.id)} className={refundSecondary}>{rejecting === r.id ? 'Confirm rejection' : 'Reject request'}</button><button disabled={!!busy || loading} type="button" onClick={() => setApproving(r.id)} className={refundButton}>Approve {refundMoney(r.amountMinor, r.currency)}</button></div>
      </div>}
      {r.state === 'requested' && !r.canDecide && <p className="border-t border-gray-100 px-5 py-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">Refund decisions are currently unavailable.</p>}
    </RefundOrderCard>)}</div>
    {!!data?.total && <div className="flex items-center justify-between gap-3 text-sm"><button className={refundSecondary} disabled={page <= 1 || !!busy || loading} onClick={() => { setLoading(true); setError(''); setPage(p => p - 1); }}>Previous</button><span className="text-gray-600 dark:text-gray-300">Page {data.page} of {data.pages}</span><button className={refundSecondary} disabled={page >= data.pages || !!busy || loading} onClick={() => { setLoading(true); setError(''); setPage(p => p + 1); }}>Next</button></div>}
    <ConfirmDialog open={!!selected} title="Approve this refund?" message={selected ? `Refund ${refundMoney(selected.amountMinor, selected.currency)}, including ${refundMoney(selected.shippingMinor ?? 0, selected.currency)} shipping, to the original payment method? The buyer keeps the item.` : ''} confirmLabel="Approve refund" cancelLabel="Keep reviewing" variant="warning" loading={!!busy} onCancel={() => { if (!busy) setApproving(''); }} onConfirm={() => { if (selected) void decide(selected.id, 'approve').finally(() => setApproving('')); }} />
  </section>;
}

