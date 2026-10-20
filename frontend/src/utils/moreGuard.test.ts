import { describe, expect, it } from 'vitest';
import { createMoreGuard } from './moreGuard';

describe('load-more guard', () => {
  it('lets one load-more run at a time', () => {
    const guard = createMoreGuard();
    expect(guard.tryStart(1)).toBe(true);
    expect(guard.tryStart(1)).toBe(false);
    guard.finish(1);
    expect(guard.tryStart(1)).toBe(true);
  });

  it('frees the guard when a refresh starts, so the new list can load more while the old request is still pending', () => {
    const guard = createMoreGuard();
    expect(guard.tryStart(1)).toBe(true);
    guard.invalidate(); // refresh or group switch while page 2 is in flight
    expect(guard.tryStart(2)).toBe(true);
  });

  it('a stale request finishing later does not free the guard of the newer one', () => {
    const guard = createMoreGuard();
    guard.tryStart(1);
    guard.invalidate();
    guard.tryStart(2);
    guard.finish(1); // the old response arrives
    expect(guard.tryStart(2)).toBe(false);
    guard.finish(2);
    expect(guard.tryStart(3)).toBe(true);
  });
});
