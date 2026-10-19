import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { CheckCircle, Clock, RotateCcw, XCircle } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { refundButton, refundField, refundSecondary } from '../orders/RefundPresentation';
import { RefundOrderCard } from '../orders/RefundOrderCard';
import { useLoadMoreSentinel } from '../../hooks/useLoadMoreSentinel';
import { refundService } from '../../services/refundService';
import type { RefundRequest, SellerRefundGroup, SellerRefundPage } from '../../types/refund';
import { canLoadMore, hasMore, initialPaged, pagedReducer } from '../../utils/pagedList';
import { refundMoney } from '../../utils/refund';

const GROUPS: Array<{ key: SellerRefundGroup; label: string; icon: typeof Clock; empty: string }> = [
  { key: 'in_progress', label: 'In Progress', icon: Clock, empty: 'No refund requests in progress.' },
  { key: 'approved', label: 'Approved', icon: CheckCircle, empty: 'No approved refunds yet.' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, empty: 'No rejected requests.' },
];

/** The seller's Return/Refund tab: requests in three groups, decided in place. More load as the list is scrolled. */
export function RefundRequestReview({ onUpdated }: { onUpdated?: () => void }) {
  const [group, setGroup] = useState<SellerRefundGroup>('in_progress');
  const [state, dispatch] = useReducer(pagedReducer<RefundRequest>, undefined, initialPaged<RefundRequest>);
  // Kept apart from the list so the counts do not blink to 0 while another group loads.
  const [counts, setCounts] = useState<SellerRefundPage['counts']>();
  const [rejecting, setRejecting] = useState('');
  const [approving, setApproving] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const generation = useRef(0);
  const decisionInFlight = useRef(false);
  const moreInFlight = useRef(false);

  /** Loads a group's first page into the list and returns the group counts for the caller to keep. */
  const fetchFirst = useCallback(async (target: SellerRefundGroup): Promise<SellerRefundPage['counts']> => {
    const current = ++generation.current;
    try {
      const result = await refundService.sellerList(1, target);
      if (current !== generation.current) return undefined;
      dispatch({ type: 'first', items: result.requests, page: result.page, pages: result.pages });
      return result.counts;
    } catch {
      if (current === generation.current) dispatch({ type: 'firstFailed', message: 'Could not load refund requests.' });
      return undefined;
    }
  }, []);

  useEffect(() => {
    const counter = generation; // the aliased ref lets the cleanup invalidate in-flight responses
    void fetchFirst(group).then(latest => { if (latest) setCounts(latest); });
    return () => { counter.current++; };
  }, [fetchFirst, group]);

  const loadMore = useCallback(async () => {
    if (moreInFlight.current) return;
    moreInFlight.current = true;
    dispatch({ type: 'moreStart' });
    const current = generation.current;
    try {
      const result = await refundService.sellerList(state.page + 1, group);
      if (current !== generation.current) return;
      dispatch({ type: 'more', items: result.requests, page: result.page, pages: result.pages });
      if (result.counts) setCounts(result.counts);
    } catch {
      if (current === generation.current) dispatch({ type: 'moreFailed' });
    } finally {
      moreInFlight.current = false;
    }
  }, [state.page, group]);

  const loading = state.status === 'loading';
  const sentinel = useLoadMoreSentinel(canLoadMore(state) && !busy, () => void loadMore(), state.items.length);

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    if (decisionInFlight.current || loading) return;
    decisionInFlight.current = true;
    setBusy(id);
    setActionError('');
    try {
      await refundService.decide(id, decision, reasons[id]?.trim());
      // The decided request moves to another group, so the list starts again from its first page.
      dispatch({ type: 'reload' });
      const latest = await fetchFirst(group);
      if (latest) setCounts(latest);
      onUpdated?.();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not save decision. Refresh before retrying.');
      dispatch({ type: 'reload' });
      const latest = await fetchFirst(group);
      if (latest) setCounts(latest);
    } finally {
      decisionInFlight.current = false;
      setBusy('');
    }
  };

  const refresh = () => {
    setActionError('');
    dispatch({ type: 'reload' });
    void fetchFirst(group).then(latest => {
      if (latest) setCounts(latest);
      onUpdated?.();
    });
  };

  const chooseGroup = (key: SellerRefundGroup) => {
    if (key === group) return;
    setActionError('');
    dispatch({ type: 'reset' });
    setGroup(key);
  };

  const selected = state.items.find(request => request.id === approving);
  const error = actionError || (state.status === 'error' ? state.error : '');

  return (
    <section className="space-y-5" aria-label="Seller refund requests">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Return/Refund</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Review the buyer’s issue and exact refund amount.</p>
        </div>
        <button type="button" disabled={!!busy || loading} aria-label="Refresh refund requests" onClick={refresh} className={refundSecondary}>
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Refund status">
        {GROUPS.map(({ key, label, icon: Icon }) => {
          const active = group === key;
          return (
            <button
              key={key} type="button" role="tab" aria-selected={active} disabled={!!busy} data-testid={`refund-group-${key}`}
              onClick={() => chooseGroup(key)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${active ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-primary-400'}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />{label}
              <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-xs ${active ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>{counts?.[key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:text-red-200">{error}</p>}
      {loading && state.items.length === 0 && !error && <p role="status" className="text-sm text-gray-600 dark:text-gray-300">Loading refund requests…</p>}
      {state.status === 'ready' && state.items.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-600 dark:text-gray-300">{GROUPS.find(g => g.key === group)!.empty}</p>
      )}

      <div className="space-y-4">
        {state.items.map(request => (
          <RefundOrderCard key={request.id} request={request} viewer="seller">
            {request.state === 'requested' && request.canDecide && (
              <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-700">
                <p className="mb-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300">Approval starts the refund immediately. The buyer keeps the item.</p>
                {rejecting === request.id && (
                  <label className="mb-4 block text-sm font-semibold">
                    Reason for rejecting
                    <textarea
                      aria-label={`Rejection reason for ${request.id}`} disabled={!!busy || loading} maxLength={1000}
                      value={reasons[request.id] ?? ''} onChange={e => setReasons(v => ({ ...v, [request.id]: e.target.value }))}
                      className={refundField} autoFocus
                    />
                  </label>
                )}
                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button" className={refundSecondary}
                    disabled={!!busy || loading || (rejecting === request.id && !reasons[request.id]?.trim())}
                    onClick={() => rejecting === request.id ? void decide(request.id, 'reject') : setRejecting(request.id)}
                  >{rejecting === request.id ? 'Confirm rejection' : 'Reject request'}</button>
                  <button type="button" className={refundButton} disabled={!!busy || loading} onClick={() => setApproving(request.id)}>
                    Approve {refundMoney(request.amountMinor, request.currency)}
                  </button>
                </div>
              </div>
            )}
            {request.state === 'requested' && !request.canDecide && (
              <p className="border-t border-gray-100 px-5 py-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">Refund decisions are currently unavailable.</p>
            )}
          </RefundOrderCard>
        ))}
      </div>

      {hasMore(state) && <div ref={sentinel} aria-hidden="true" className="h-1" />}
      {state.loadingMore && <p role="status" className="py-4 text-center text-sm text-gray-600 dark:text-gray-300">Loading more requests…</p>}
      {state.moreFailed && (
        <div className="text-center">
          <button type="button" className={refundSecondary} onClick={() => void loadMore()}>Could not load more. Try again.</button>
        </div>
      )}

      <ConfirmDialog
        open={!!selected} title="Approve this refund?" confirmLabel="Approve refund" cancelLabel="Keep reviewing" variant="warning" loading={!!busy}
        message={selected ? `Refund ${refundMoney(selected.amountMinor, selected.currency)}, including ${refundMoney(selected.shippingMinor ?? 0, selected.currency)} shipping, to the original payment method? The buyer keeps the item.` : ''}
        onCancel={() => { if (!busy) setApproving(''); }}
        onConfirm={() => { if (selected) void decide(selected.id, 'approve').finally(() => setApproving('')); }}
      />
    </section>
  );
}
