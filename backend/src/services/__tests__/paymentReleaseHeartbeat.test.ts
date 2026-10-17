import { afterEach, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ findOneAndUpdate: vi.fn(), updateOne: vi.fn() }));
vi.mock('../../models/PaymentOperation.js', () => ({ default: db }));
vi.mock('../stripeService.js', () => ({ cancelPaymentIntent: vi.fn(), retrievePaymentIntent: vi.fn(), isAmbiguousStripeError: () => true }));
import { cancelPaymentIntent } from '../stripeService.js';
import { releaseIntentOperation } from '../paymentRelease.js';

afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); });
it('renews a release lease during a slow Stripe call and stops renewing on completion', async () => {
  vi.useFakeTimers();
  db.findOneAndUpdate.mockResolvedValue({ _id: 'op', status: 'in_progress', leaseOwner: 'owner', attempts: 1 });
  db.updateOne.mockResolvedValue({ matchedCount: 1 });
  let finish!: (value: any) => void;
  vi.mocked(cancelPaymentIntent).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const released = releaseIntentOperation({ idempotencyKey: 'order:1:release:1', paymentIntentId: 'pi' }, { owner: 'owner' });
  await vi.advanceTimersByTimeAsync(65000);
  const renewals = db.updateOne.mock.calls.filter(([, update]) => update.$set?.leaseExpiresAt);
  expect(renewals).toHaveLength(3);
  expect(renewals[2][1].$set.leaseExpiresAt.getTime()).toBeGreaterThan(Date.now());
  finish({ id: 'pi', status: 'canceled' });
  expect(await released).toBe('released');
  const updates = db.updateOne.mock.calls.length;
  await vi.advanceTimersByTimeAsync(60000);
  expect(db.updateOne).toHaveBeenCalledTimes(updates);
});
