import { useEffect, useRef, useState } from 'react';

/**
 * Calls `onLoadMore` when the returned element scrolls near the viewport, for lists that grow as
 * they are scrolled. Put the returned ref on an empty element after the last item.
 *
 * `version` should change whenever the list changes (for example its length): the observer is then
 * set up again, so a sentinel that is still in view after a page loads asks for the next page too.
 */
export function useLoadMoreSentinel(enabled: boolean, onLoadMore: () => void, version: unknown) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const latest = useRef(onLoadMore);
  useEffect(() => { latest.current = onLoadMore; });

  useEffect(() => {
    if (!enabled || !node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) latest.current();
    }, { rootMargin: '320px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, node, version]);

  return setNode;
}
