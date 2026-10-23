/**
 * Lets one "load more" request run at a time for a list that can be refreshed or switched to another
 * group while a page is loading. The guard remembers which generation of the list started the request:
 * a refresh frees it at once (the old response is ignored anyway), and an old request finishing late
 * cannot free the guard of a newer one.
 */
export function createMoreGuard() {
  let owner: number | null = null;
  return {
    /** True when this generation may start a load-more now. */
    tryStart(generation: number): boolean {
      if (owner !== null) return false;
      owner = generation;
      return true;
    },
    /** A refresh or group switch began: whatever load-more was running no longer counts. */
    invalidate() { owner = null; },
    /** The request started under `generation` ended. Only its own claim is released. */
    finish(generation: number) { if (owner === generation) owner = null; },
  };
}
