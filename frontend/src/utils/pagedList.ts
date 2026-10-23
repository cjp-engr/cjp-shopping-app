/**
 * State of a list that is loaded a page at a time and grows as it is scrolled: the first page
 * replaces everything, each later page is appended once, and a failed page waits for a retry.
 */
export interface PagedState<T extends { id: string }> {
  items: T[];
  page: number;
  pages: number;
  status: 'loading' | 'ready' | 'error';
  error: string;
  loadingMore: boolean;
  moreFailed: boolean;
}

export type PagedAction<T> =
  | { type: 'reset' }
  | { type: 'reload' }
  | { type: 'first'; items: T[]; page: number; pages: number }
  | { type: 'firstFailed'; message: string }
  | { type: 'moreStart' }
  | { type: 'more'; items: T[]; page: number; pages: number }
  | { type: 'moreFailed' };

export function initialPaged<T extends { id: string }>(): PagedState<T> {
  return { items: [], page: 0, pages: 0, status: 'loading', error: '', loadingMore: false, moreFailed: false };
}

/** Appends `incoming` to `existing`, skipping anything already there. */
export function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const known = new Set(existing.map(item => item.id));
  return [...existing, ...incoming.filter(item => !known.has(item.id))];
}

export function pagedReducer<T extends { id: string }>(state: PagedState<T>, action: PagedAction<T>): PagedState<T> {
  switch (action.type) {
    case 'reset':
      return initialPaged<T>();
    case 'reload':
      // Keep what is shown until the new first page arrives.
      return { ...state, status: 'loading', error: '', loadingMore: false, moreFailed: false };
    case 'first':
      return { items: action.items, page: action.page, pages: action.pages, status: 'ready', error: '', loadingMore: false, moreFailed: false };
    case 'firstFailed':
      return { ...state, status: 'error', error: action.message, loadingMore: false };
    case 'moreStart':
      return { ...state, loadingMore: true, moreFailed: false };
    case 'more':
      // A page we already have (a repeated or late response) changes nothing.
      if (action.page <= state.page) return { ...state, loadingMore: false };
      return { ...state, items: mergeById(state.items, action.items), page: action.page, pages: action.pages, loadingMore: false };
    case 'moreFailed':
      return { ...state, loadingMore: false, moreFailed: true };
  }
}

export const hasMore = <T extends { id: string }>(state: PagedState<T>) => state.status === 'ready' && state.page < state.pages;

/** More can be asked for now: there is a next page, nothing is loading, and the last try did not fail. */
export const canLoadMore = <T extends { id: string }>(state: PagedState<T>) => hasMore(state) && !state.loadingMore && !state.moreFailed;
