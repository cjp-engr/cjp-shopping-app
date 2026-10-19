import { useCallback, useEffect, useReducer, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { useLoadMoreSentinel } from '../../hooks/useLoadMoreSentinel';
import { refundService } from '../../services/refundService';
import type { RefundRequest } from '../../types/refund';
import { canLoadMore, hasMore, initialPaged, pagedReducer } from '../../utils/pagedList';
import { approvedRefundStates } from '../../utils/refund';
import { refundSecondary, refundSurface } from './RefundPresentation';
import { RefundOrderCard } from './RefundOrderCard';

/** The buyer's Return/Refund tab: refunds a seller has approved. More load as the list is scrolled. */
export function CompletedRefunds({ onTotal }: { onTotal?: (total: number) => void } = {}) {
  const [state, dispatch] = useReducer(pagedReducer<RefundRequest>, undefined, initialPaged<RefundRequest>);
  const generation = useRef(0);
  const inFlight = useRef(false);
  // Tells the page how many approved refunds there are, for the tab badge, without refetching when the callback changes.
  const onTotalRef = useRef(onTotal);
  useEffect(() => { onTotalRef.current = onTotal; }, [onTotal]);

  const fetchFirst = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await refundService.completed(1);
      if (current === generation.current) {
        dispatch({ type: 'first', items: result.requests, page: result.page, pages: result.pages });
        onTotalRef.current?.(result.total);
      }
    } catch {
      if (current === generation.current) dispatch({ type: 'firstFailed', message: 'Could not load your refunds. Please try again.' });
    }
  }, []);

  useEffect(() => {
    const counter = generation; // the aliased ref lets the cleanup invalidate in-flight responses
    void fetchFirst();
    return () => { counter.current++; };
  }, [fetchFirst]);

  const reload = () => { dispatch({ type: 'reload' }); void fetchFirst(); };

  const loadMore = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    dispatch({ type: 'moreStart' });
    const current = generation.current;
    try {
      const result = await refundService.completed(state.page + 1);
      if (current === generation.current) dispatch({ type: 'more', items: result.requests, page: result.page, pages: result.pages });
    } catch {
      if (current === generation.current) dispatch({ type: 'moreFailed' });
    } finally {
      inFlight.current = false;
    }
  }, [state.page]);

  const sentinel = useLoadMoreSentinel(canLoadMore(state), () => void loadMore(), state.items.length);
  const loading = state.status === 'loading';
  const approved = state.items.filter(request => approvedRefundStates.includes(request.state));

  return (
    <section className="space-y-5" aria-label="Return and refund">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Return/Refund</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Refunds your seller has approved, including ones still being processed. Requests waiting for the seller stay with your order under Completed.
          </p>
        </div>
        <button type="button" className={refundSecondary} disabled={loading} onClick={reload} aria-label="Refresh refunds">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {state.status === 'error' && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{state.error}</p>}
      {loading && state.items.length === 0 && (
        <p role="status" className="py-8 text-center text-sm text-gray-600 dark:text-gray-300">Loading your refunds…</p>
      )}

      {state.status === 'ready' && state.items.length === 0 && (
        <div className={`${refundSurface} py-12 text-center`}>
          <RotateCcw className="mx-auto mb-4 h-8 w-8 text-gray-400" aria-hidden />
          <h3 className="font-semibold">No approved refunds yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-gray-600 dark:text-gray-300">
            When a seller approves a refund request, it moves here. Requests still waiting for the seller stay with your order under Completed, where you can track them in the order details.
          </p>
        </div>
      )}

      {approved.length > 0 && (
        <div className="space-y-4">
          {approved.map(request => <RefundOrderCard key={request.id} request={request} />)}
        </div>
      )}

      {hasMore(state) && <div ref={sentinel} aria-hidden="true" className="h-1" />}
      {state.loadingMore && <p role="status" className="py-4 text-center text-sm text-gray-600 dark:text-gray-300">Loading more refunds…</p>}
      {state.moreFailed && (
        <div className="text-center">
          <button type="button" className={refundSecondary} onClick={() => void loadMore()}>Could not load more. Try again.</button>
        </div>
      )}
    </section>
  );
}
