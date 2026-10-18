import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const updateOne = vi.hoisted(() => vi.fn());

vi.mock('../../models/PaymentOperation.js', () => ({
  default: { updateOne },
}));

import { withLeaseHeartbeat } from '../paymentOperationService.js';

describe('withLeaseHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    updateOne.mockReset();
    updateOne.mockResolvedValue({ matchedCount: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renews the lease every 20s while the work runs and stops once it resolves', async () => {
    const work = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 45_000));
    const result = withLeaseHeartbeat('op1', 'owner', () => work);

    await vi.advanceTimersByTimeAsync(19_999);
    expect(updateOne).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(updateOne).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(updateOne).toHaveBeenCalledTimes(2);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'op1', leaseOwner: 'owner', status: 'in_progress' },
      expect.anything(),
    );

    await vi.advanceTimersByTimeAsync(5_000);
    expect(await result).toBe('done');

    await vi.advanceTimersByTimeAsync(60_000);
    expect(updateOne).toHaveBeenCalledTimes(2);
  });

  it('stops renewing when the work rejects and propagates the error', async () => {
    const work = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('boom')), 25_000));
    const result = withLeaseHeartbeat('op1', 'owner', () => work);
    const assertion = expect(result).rejects.toThrow('boom');

    await vi.advanceTimersByTimeAsync(25_000);
    await assertion;
    expect(updateOne).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(updateOne).toHaveBeenCalledTimes(1);
  });

  it('keeps the work alive when a lease renewal fails', async () => {
    updateOne.mockRejectedValue(new Error('db down'));
    const work = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 25_000));
    const result = withLeaseHeartbeat('op1', 'owner', () => work);

    await vi.advanceTimersByTimeAsync(25_000);
    expect(await result).toBe('done');
  });
});
