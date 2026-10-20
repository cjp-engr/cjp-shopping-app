import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { refundService, RefundApiError } from '../../services/refundService';
import type { RefundEligibility, RefundInput, RefundReason, RefundRequest } from '../../types/refund';
import { refundDate, refundEligibilityLabels, refundQuote, refundShippingQuote } from '../../utils/refund';
import { refundButton } from './RefundPresentation';
import { RefundOrderCard } from './RefundOrderCard';
import { RefundRequestForm } from './RefundRequestForm';

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
      setError(unresolved ? 'The response was interrupted. Retry the same request, or reload the page to see its status; do not submit a new request.' : (e as Error).message);
      await load().catch(() => {});
    } finally { inFlight.current = false; setBusy(false); }
  };
  return <section className="space-y-5" aria-label="Delivered item refunds">
    <div><h2 className="text-lg font-bold text-gray-900 dark:text-white">{eligibility?.eligible ? 'Request a refund' : 'Item refunds'}</h2></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
    {!eligibility && !error && <p role="status">Loading refund details…</p>}
    {eligibility && !eligibility.requestsEnabled && <p className="text-sm text-gray-600 dark:text-gray-300">New refund requests are currently unavailable.</p>}
    {eligibility && !eligibility.eligible && eligibility.reason !== 'active_request' && <p className="text-sm text-gray-600 dark:text-gray-300">{refundEligibilityLabels[eligibility.reason ?? ''] ?? 'This order is not eligible for a refund request.'}</p>}
    {eligibility?.eligible && eligibility.requestsEnabled && <>
      <p className="text-sm text-gray-600 dark:text-gray-300">Choose the item and tell us what went wrong.</p>
      <RefundRequestForm
        eligibility={eligibility} quantities={quantities} reason={reason} description={description}
        amount={amount} shipping={shipping} busy={busy} uncertain={uncertain}
        onQuantity={(lineId, quantity) => setQuantities(q => ({ ...q, [lineId]: quantity }))}
        onReason={setReason} onDescription={setDescription} onSubmit={() => void submit()}
      />
    </>}
    {uncertain && (!eligibility?.eligible || !eligibility.requestsEnabled) && <button type="button" disabled={busy} onClick={() => void submit()} className={refundButton}>Retry same request</button>}
    {history.length > 0 && <div className="space-y-4">{history.map(r => <RefundOrderCard key={r.id} request={r} inOrder />)}</div>}
    <details className="text-sm text-gray-600 dark:text-gray-300"><summary className="flex min-h-12 cursor-pointer items-center gap-2 font-semibold"><Clock3 className="h-4 w-4" aria-hidden />Refund policy & shipping</summary><p className="max-w-prose leading-relaxed">Request within seven days of recorded delivery. Seller approval starts the refund; no return is required. Shipping is included only when all paid items are refunded for seller fault. Change of mind is only allowed while pending.</p>{eligibility?.deliveredAt && <p className="mt-2">Delivered {refundDate(eligibility.deliveredAt)}</p>}</details>
  </section>;
}
