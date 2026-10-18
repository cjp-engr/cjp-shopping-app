import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Order from '../../models/Order.js';
import { startAutoCompleteJob } from '../autoCompleteOrders.js';

describe('order completion scheduler', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('does not update orders or schedule work when disabled', async () => {
    vi.stubEnv('AUTO_COMPLETE_ORDERS_ENABLED', 'false');
    const update = vi.spyOn(Order, 'updateMany').mockResolvedValue({ modifiedCount: 0 } as never);
    startAutoCompleteJob();
    await vi.advanceTimersByTimeAsync(3 * 60 * 60 * 1000);
    expect(update).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('delivers with a per-order pipeline update so the refund window starts at shippedAt + 48h, not at run time', async () => {
    vi.stubEnv('AUTO_COMPLETE_ORDERS_ENABLED', 'true');
    const update = vi.spyOn(Order, 'updateMany').mockResolvedValue({ modifiedCount: 0 } as never);
    startAutoCompleteJob();
    await vi.advanceTimersByTimeAsync(0);

    const [filter, pipeline] = update.mock.calls[0] as [Record<string, any>, any[]];
    expect(filter).toMatchObject({ status: 'shipped', refundRequestedAt: { $exists: false }, deliveredAt: { $exists: false } });
    const set = pipeline[0].$set;
    expect(set.status).toBe('delivered');
    expect(set.deliveredAt).toEqual({ $add: ['$shippedAt', 48 * 60 * 60 * 1000] });
    expect(set.refundRequestDeadlineAt).toEqual({ $add: ['$shippedAt', (48 + 168) * 60 * 60 * 1000] });
  });

  it('skips hourly ticks while a previous database update is pending, then resumes', async () => {
    vi.stubEnv('AUTO_COMPLETE_ORDERS_ENABLED', 'true');
    let finish!: (result: never) => void;
    const update = vi.spyOn(Order, 'updateMany').mockImplementationOnce(() =>
      new Promise(resolve => { finish = resolve; }) as never,
    ).mockResolvedValue({ modifiedCount: 0 } as never);
    const stop = startAutoCompleteJob();
    await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(1);
    finish({ modifiedCount: 0 } as never);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(2);
    expect(stop).toBeTypeOf('function');
    stop!();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('recovers on the next tick after a failed update', async () => {
    vi.stubEnv('AUTO_COMPLETE_ORDERS_ENABLED', 'true');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const update = vi.spyOn(Order, 'updateMany')
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValue({ modifiedCount: 0 } as never);
    startAutoCompleteJob();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(2);
  });
});
