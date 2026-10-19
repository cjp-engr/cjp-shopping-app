import { describe, expect, it } from 'vitest';
import { canLoadMore, hasMore, initialPaged, mergeById, pagedReducer, type PagedAction, type PagedState } from './pagedList';

interface Row { id: string; label?: string }
const row = (id: string): Row => ({ id });
const run = (state: PagedState<Row>, ...actions: PagedAction<Row>[]) => actions.reduce(pagedReducer, state);
const start = () => initialPaged<Row>();

describe('paged list state', () => {
  it('starts loading with nothing to show', () => {
    expect(start()).toMatchObject({ items: [], status: 'loading', loadingMore: false, moreFailed: false });
    expect(hasMore(start())).toBe(false);
    expect(canLoadMore(start())).toBe(false);
  });

  it('shows the first page and knows when there is more', () => {
    const state = run(start(), { type: 'first', items: [row('a'), row('b')], page: 1, pages: 3 });
    expect(state).toMatchObject({ status: 'ready', page: 1, pages: 3 });
    expect(state.items.map(r => r.id)).toEqual(['a', 'b']);
    expect(hasMore(state)).toBe(true);
    expect(canLoadMore(state)).toBe(true);
  });

  it('appends the next page in order and stops at the last one', () => {
    const state = run(start(),
      { type: 'first', items: [row('a')], page: 1, pages: 2 },
      { type: 'moreStart' },
      { type: 'more', items: [row('b'), row('c')], page: 2, pages: 2 });
    expect(state.items.map(r => r.id)).toEqual(['a', 'b', 'c']);
    expect(state).toMatchObject({ page: 2, loadingMore: false });
    expect(hasMore(state)).toBe(false);
    expect(canLoadMore(state)).toBe(false);
  });

  it('never shows the same item twice when pages overlap', () => {
    const state = run(start(),
      { type: 'first', items: [row('a'), row('b')], page: 1, pages: 2 },
      { type: 'more', items: [row('b'), row('c')], page: 2, pages: 2 });
    expect(state.items.map(r => r.id)).toEqual(['a', 'b', 'c']);
    expect(mergeById([row('a')], [row('a'), row('b')]).map(r => r.id)).toEqual(['a', 'b']);
  });

  it('ignores a page it already has, such as a repeated or late response', () => {
    const state = run(start(),
      { type: 'first', items: [row('a')], page: 1, pages: 3 },
      { type: 'more', items: [row('b')], page: 2, pages: 3 },
      { type: 'more', items: [row('x')], page: 2, pages: 3 },
      { type: 'more', items: [row('y')], page: 1, pages: 3 });
    expect(state.items.map(r => r.id)).toEqual(['a', 'b']);
    expect(state.page).toBe(2);
  });

  it('does not ask for more while one page is already loading', () => {
    const state = run(start(), { type: 'first', items: [row('a')], page: 1, pages: 3 }, { type: 'moreStart' });
    expect(state.loadingMore).toBe(true);
    expect(canLoadMore(state)).toBe(false);
  });

  it('keeps what is shown when a page fails, and waits for a retry instead of looping', () => {
    const failed = run(start(),
      { type: 'first', items: [row('a')], page: 1, pages: 2 },
      { type: 'moreStart' },
      { type: 'moreFailed' });
    expect(failed.items.map(r => r.id)).toEqual(['a']);
    expect(failed).toMatchObject({ moreFailed: true, loadingMore: false });
    expect(canLoadMore(failed)).toBe(false);

    const retrying = run(failed, { type: 'moreStart' });
    expect(retrying).toMatchObject({ moreFailed: false, loadingMore: true });
  });

  it('refresh keeps the shown items until the first page arrives, then replaces them', () => {
    const shown = run(start(), { type: 'first', items: [row('a'), row('b')], page: 1, pages: 2 }, { type: 'more', items: [row('c')], page: 2, pages: 2 });
    const refreshing = run(shown, { type: 'reload' });
    expect(refreshing.status).toBe('loading');
    expect(refreshing.items.map(r => r.id)).toEqual(['a', 'b', 'c']);
    expect(canLoadMore(refreshing)).toBe(false);

    const fresh = run(refreshing, { type: 'first', items: [row('z')], page: 1, pages: 1 });
    expect(fresh.items.map(r => r.id)).toEqual(['z']);
    expect(fresh).toMatchObject({ status: 'ready', page: 1, moreFailed: false });
  });

  it('reset drops the list, for switching to another group', () => {
    const state = run(start(), { type: 'first', items: [row('a')], page: 1, pages: 2 }, { type: 'reset' });
    expect(state.items).toEqual([]);
    expect(state.status).toBe('loading');
    expect(hasMore(state)).toBe(false);
  });

  it('shows an error when the first page cannot be loaded, and offers no more pages', () => {
    const state = run(start(), { type: 'firstFailed', message: 'Could not load refunds.' });
    expect(state).toMatchObject({ status: 'error', error: 'Could not load refunds.' });
    expect(canLoadMore(state)).toBe(false);
  });
});
