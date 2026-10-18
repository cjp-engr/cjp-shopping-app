import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const claimNextOperation = vi.hoisted(() => vi.fn());
const orderFind = vi.hoisted(() => vi.fn());

vi.mock('../../models/Order.js', () => ({ default: { find: orderFind, updateOne: vi.fn(), updateMany: vi.fn() } }));
vi.mock('../../models/PaymentOperation.js', () => ({ default: { find: vi.fn() } }));
vi.mock('../orderCancellation.js', () => ({ cancelPendingOrder: vi.fn() }));
vi.mock('../orderCapture.js', () => ({ resumeCapture: vi.fn() }));
vi.mock('../paymentRelease.js', () => ({ releaseIntentOperation: vi.fn() }));
vi.mock('../paymentOperationService.js', () => ({ claimNextOperation, failOperation: vi.fn() }));

import { startAcceptanceScanner } from '../acceptanceScanner.js';
import { startPaymentOperationWorker } from '../paymentOperationWorker.js';

/** A query chain whose `lean()` resolves with `rows` once `release` is called. */
function gatedQuery() {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'sort', 'limit']) chain[method] = () => chain;
  chain.lean = () => gate.then(() => []);
  return { chain, release };
}

describe('background loops', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    delete process.env.ACCEPTANCE_SCAN_INTERVAL_MS;
    delete process.env.OPERATION_WORKER_INTERVAL_MS;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the acceptance scanner once at startup, then on its interval, never overlapping', async () => {
    const first = gatedQuery();
    orderFind.mockReturnValueOnce(first.chain).mockReturnValue(gatedQuery().chain);
    process.env.ACCEPTANCE_SCAN_INTERVAL_MS = '1000';

    const stop = startAcceptanceScanner();
    expect(orderFind).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3000);
    expect(orderFind).toHaveBeenCalledTimes(1);

    first.release();
    await vi.advanceTimersByTimeAsync(1000);
    expect(orderFind).toHaveBeenCalledTimes(2);

    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(orderFind).toHaveBeenCalledTimes(2);
  });

  it('runs the operation worker once at startup, then on its interval, never overlapping', async () => {
    let release!: () => void;
    const gate = new Promise<null>((resolve) => { release = () => resolve(null); });
    claimNextOperation.mockReturnValueOnce(gate).mockResolvedValue(null);
    const emptyRepair = { select: () => ({ lean: async () => [] }) };
    orderFind.mockReturnValue(emptyRepair);
    process.env.OPERATION_WORKER_INTERVAL_MS = '500';

    const stop = startPaymentOperationWorker();
    expect(claimNextOperation).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(claimNextOperation).toHaveBeenCalledTimes(1);

    release();
    await vi.advanceTimersByTimeAsync(500);
    expect(claimNextOperation).toHaveBeenCalledTimes(2);
    expect(claimNextOperation).toHaveBeenCalledWith(expect.any(String), expect.any(Date), { actions: ['capture', 'release', 'refund'] });

    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(claimNextOperation).toHaveBeenCalledTimes(2);
  });

  it('does not keep the process alive', () => {
    const unref = vi.fn();
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockReturnValue({ unref } as unknown as NodeJS.Timeout);
    orderFind.mockReturnValue(gatedQuery().chain);
    claimNextOperation.mockResolvedValue(null);

    startAcceptanceScanner();
    startPaymentOperationWorker();

    expect(unref).toHaveBeenCalledTimes(2);
    setIntervalSpy.mockRestore();
  });
});
