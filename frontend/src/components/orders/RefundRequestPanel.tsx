import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock3, RotateCcw } from 'lucide-react';
import { refundService, RefundApiError } from '../../services/refundService';
import type { RefundEligibility, RefundInput, RefundReason, RefundRequest } from '../../types/refund';
import { refundDate, refundEligibilityLabels, refundQuote, refundShippingQuote, refundReasonLabels } from '../../utils/refund';
import { RefundBreakdown, RefundHistoryCard, RefundProduct, refundButton, refundField, refundSecondary, refundSurface } from './RefundPresentation';

export function RefundRequestPanel({ orderId, onUpdated }: { orderId: string; onUpdated?: () => void }) {
  const [eligibility, setEligibility] = useState<RefundEligibility>(); const [history, setHistory] = useState<RefundRequest[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({}); const [reason, setReason] = useState<RefundReason>('damaged');
  const [description, setDescription] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false); const attempt = useRef<RefundInput | null>(null); const inFlight = useRef(false);
  const load = useCallback(async () => {
    const [e, h] = await Promise.all([refundService.eligibility(orderId), refundService.history(orderId)]);
    setEligibility(e); setHistory(h);
  }, [orderId]);
  useEffect(() => {
    let active = true;
    Promise.all([refundService.eligibility(orderId), refundService.history(orderId)]).then(([e, h]) => {
      if (active) { setEligibility(e); setHistory(h); }
    }).catch(() => { if (active) setError('Could not load refund details. Please refresh.'); });
    return () => { active = false; };
  }, [orderId]);
  const itemsAmount = eligibility ? refundQuote(eligibility.lines, quantities) : null;
  const shipping = eligibility ? refundShippingQuote(eligibility.lines, quantities, reason, eligibility.shippingRefundableMinor) : 0;
  const amount = itemsAmount === null ? null : itemsAmount + shipping;
  const submit = async () => {
    if (inFlight.current || (!attempt.current && (!eligibility?.eligible || !amount || !description.trim()))) return;
    inFlight.current = true; setBusy(true); setError('');
    attempt.current ??= { items: Object.entries(quantities).filter(([, q]) => q > 0).map(([lineId, quantity]) => ({ lineId, quantity })),
      reasonCode: reason, description: description.trim(), idempotencyKey: crypto.randomUUID() };
    try {
      await refundService.submit(orderId, attempt.current); attempt.current = null;
      setUncertain(false); setQuantities({}); setDescription('');
      await load().catch(() => setError('Request saved. Refresh to see its current status.')); onUpdated?.();
    } catch (e) {
      const unresolved = !(e instanceof RefundApiError) || e.status >= 500; setUncertain(unresolved);
      if (!unresolved) attempt.current = null;
      setError(unresolved ? 'The response was interrupted. Retry the same request or refresh its status; do not submit a new request.' : (e as Error).message);
      await load().catch(() => {});
    } finally { inFlight.current = false; setBusy(false); }
  };
  const refresh = async () => {
    if (inFlight.current) return; setBusy(true); setError('');
    try { await load(); onUpdated?.(); } catch { setError('Could not refresh refund details.'); } finally { setBusy(false); }
  };
  return <section className="space-y-5" aria-label="Delivered item refunds">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-gray-900 dark:text-white">{eligibility?.eligible ? 'Request a refund' : 'Item refunds'}</h2><button type="button" onClick={() => void refresh()} disabled={busy} className={refundSecondary} aria-label="Refresh refunds"><RotateCcw className={`h-4 w-4 ${busy ? 'motion-safe:animate-spin' : ''}`} /></button></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
    {!eligibility && !error && <p role="status">Loading refund details…</p>}
    {eligibility && !eligibility.requestsEnabled && <p className="text-sm text-gray-600 dark:text-gray-300">New refund requests are currently unavailable.</p>}
    {eligibility && !eligibility.eligible && eligibility.reason !== 'active_request' && <p className="text-sm text-gray-600 dark:text-gray-300">{refundEligibilityLabels[eligibility.reason ?? ''] ?? 'This order is not eligible for a refund request.'}</p>}
    {eligibility?.eligible && eligibility.requestsEnabled && <>
      <p className="text-sm text-gray-600 dark:text-gray-300">Choose the item and tell us what went wrong.</p>
      {eligibility.deadlineAt && <div className="flex items-center gap-3 rounded-xl bg-primary-50 p-3 text-sm text-primary-800 dark:bg-primary-950 dark:text-primary-200"><Clock3 className="h-4 w-4 shrink-0" aria-hidden /><span>Request by {refundDate(eligibility.deadlineAt)}</span></div>}
      <form onSubmit={e => { e.preventDefault(); void submit(); }} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <fieldset disabled={busy || uncertain} className={`${refundSurface} space-y-5`}>
          <legend className="sr-only">Select items and describe the issue</legend><h3 className="font-semibold">Select an item</h3>
          {eligibility.lines.filter(l => l.quantityAvailable > 0).map(l => <RefundProduct key={l.lineId} name={l.productName} image={l.productImage} detail={`${l.quantityAvailable} available`}>
            <div className="mt-2 inline-flex items-center overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
              <button type="button" className="min-h-12 min-w-12 text-xl disabled:opacity-40" aria-label={`Decrease refund quantity for ${l.productName}`} disabled={!quantities[l.lineId] || busy || uncertain} onClick={() => setQuantities(q => ({ ...q, [l.lineId]: Math.max(0, (q[l.lineId] ?? 0) - 1) }))}>−</button>
              <input aria-label={`Refund quantity for ${l.productName}`} type="number" min={0} max={l.quantityAvailable} step={1} value={quantities[l.lineId] ?? 0} onChange={e => setQuantities(q => ({ ...q, [l.lineId]: Number(e.target.value) }))} className="min-h-12 w-14 bg-transparent text-center text-sm font-semibold" />
              <button type="button" className="min-h-12 min-w-12 text-xl disabled:opacity-40" aria-label={`Increase refund quantity for ${l.productName}`} disabled={(quantities[l.lineId] ?? 0) >= l.quantityAvailable || busy || uncertain} onClick={() => setQuantities(q => ({ ...q, [l.lineId]: Math.min(l.quantityAvailable, (q[l.lineId] ?? 0) + 1) }))}>+</button>
            </div>
          </RefundProduct>)}
          <label className="block text-sm font-semibold">Reason<select value={reason} onChange={e => setReason(e.target.value as RefundReason)} className={refundField}>{Object.entries(refundReasonLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
          <label className="block text-sm font-semibold">Tell the seller what happened<textarea required maxLength={1000} rows={3} placeholder="Describe the issue with the item you received." value={description} onChange={e => setDescription(e.target.value)} className={refundField} /></label>
          <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">Describe the problem so the seller can review your request. {description.length}/1000</p>
        </fieldset>
        <div className={refundSurface}><h3 className="mb-5 font-semibold">Your refund</h3><RefundBreakdown amount={amount ?? 0} shipping={shipping} currency={eligibility.currency ?? 'usd'} /><p className="mt-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300">Your original discounts and tax are included. Shipping eligibility updates with your selection and reason.</p>
          <button type="submit" disabled={busy || (!uncertain && (!amount || !description.trim()))} className={`${refundButton} mt-5 w-full`}>{busy ? 'Submitting…' : uncertain ? 'Retry same request' : 'Submit refund request'}</button><p className="mt-3 text-center text-xs text-gray-600 dark:text-gray-300">The seller reviews your request first.</p>
        </div>
      </form>
    </>}
    {uncertain && (!eligibility?.eligible || !eligibility.requestsEnabled) && <button type="button" disabled={busy} onClick={() => void submit()} className={refundButton}>Retry same request</button>}
    {history.map(r => <RefundHistoryCard key={r.id} request={r} />)}
    <details className="text-sm text-gray-600 dark:text-gray-300"><summary className="flex min-h-12 cursor-pointer items-center gap-2 font-semibold"><Clock3 className="h-4 w-4" aria-hidden />Refund policy & shipping</summary><p className="max-w-prose leading-relaxed">Request within seven days of recorded delivery. Seller approval starts the refund; no return is required. Shipping is included only when all paid items are refunded for seller fault. Change of mind is only allowed while pending.</p>{eligibility?.deliveredAt && <p className="mt-2">Delivered {refundDate(eligibility.deliveredAt)}</p>}</details>
  </section>;
}
