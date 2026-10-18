import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import PaymentOperation from '../../models/PaymentOperation.js';
import {
  claimNextOperation,
  completeOperation,
  failOperation,
  markOperationFailed,
  renewLease,
} from '../paymentOperationService.js';
import { MAX_ATTEMPTS } from '../paymentOperationPolicy.js';
import { connectIntegrationDb } from './integrationDb.js';

async function createOperation(overrides: Record<string, unknown> = {}) {
  return PaymentOperation.create({
    action: 'create_intent',
    idempotencyKey: `key-${new mongoose.Types.ObjectId().toString()}`,
    ...overrides,
  });
}

describe('paymentOperationService (replica set)', () => {
  beforeAll(async () => {
    await connectIntegrationDb();
  });

  afterEach(async () => {
    await PaymentOperation.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('lets exactly one of several concurrent workers claim a pending operation', async () => {
    await createOperation();
    const claims = await Promise.all(
      Array.from({ length: 5 }, (_, i) => claimNextOperation(`worker-${i}`)),
    );
    expect(claims.filter(Boolean)).toHaveLength(1);
  });

  it('reclaims an operation whose lease expired and counts the attempt', async () => {
    const past = new Date(Date.now() - 60_000);
    await createOperation({
      status: 'in_progress',
      leaseOwner: 'crashed-worker',
      leaseExpiresAt: past,
      attempts: 1,
    });
    const claimed = await claimNextOperation('new-worker');
    expect(claimed).not.toBeNull();
    expect(claimed!.leaseOwner).toBe('new-worker');
    expect(claimed!.attempts).toBe(2);
  });

  it('does not let a worker renew a lease it does not own', async () => {
    const op = await createOperation();
    await claimNextOperation('owner');
    expect(await renewLease(op._id.toString(), 'intruder')).toBe(false);
    expect(await renewLease(op._id.toString(), 'owner')).toBe(true);
  });

  it('completes only for the lease owner', async () => {
    const op = await createOperation();
    await claimNextOperation('owner');
    expect(await completeOperation(op._id.toString(), 'intruder', { paymentIntentId: 'pi_x' })).toBe(false);
    expect(await completeOperation(op._id.toString(), 'owner', { paymentIntentId: 'pi_x' })).toBe(true);
    const stored = await PaymentOperation.findById(op._id);
    expect(stored!.status).toBe('succeeded');
    expect(stored!.paymentIntentId).toBe('pi_x');
    expect(stored!.leaseOwner).toBeUndefined();
  });

  it('schedules a retry after a conclusive failure', async () => {
    const op = await createOperation();
    await claimNextOperation('owner');
    const next = await failOperation(op._id.toString(), 'owner', { code: 'stripe_error', message: 'rate limited' }, { ambiguous: false });
    expect(next).toBe('pending');
    const stored = await PaymentOperation.findById(op._id);
    expect(stored!.status).toBe('pending');
    expect(stored!.nextAttemptAt!.getTime()).toBeGreaterThan(Date.now());
    expect(stored!.lastError!.code).toBe('stripe_error');
  });

  it('escalates to support after the attempt limit', async () => {
    const op = await createOperation({ attempts: MAX_ATTEMPTS - 1 });
    await claimNextOperation('owner');
    const next = await failOperation(op._id.toString(), 'owner', { code: 'stripe_error', message: 'x' }, { ambiguous: false });
    expect(next).toBe('needs_support');
  });

  it('escalates ambiguous results immediately and never reclaims them', async () => {
    const op = await createOperation();
    await claimNextOperation('owner');
    const next = await failOperation(op._id.toString(), 'owner', { code: 'timeout', message: 'no response' }, { ambiguous: true });
    expect(next).toBe('needs_support');
    expect(await claimNextOperation('another-worker')).toBeNull();
  });

  it('ignores failure reports from a worker that lost its lease', async () => {
    const op = await createOperation();
    await claimNextOperation('owner');
    const next = await failOperation(op._id.toString(), 'intruder', { code: 'x', message: 'x' }, { ambiguous: false });
    expect(next).toBeNull();
  });

  it('claims only operations matching the key prefix', async () => {
    await createOperation({ idempotencyKey: 'checkout:s:x:release:1', action: 'release' });
    const order = await createOperation({ idempotencyKey: 'order:o:capture:1', action: 'capture' });

    const claimed = await claimNextOperation('w', new Date(), { keyPrefix: 'order:' });

    expect(claimed!._id.toString()).toBe(order._id.toString());
    expect(await claimNextOperation('w2', new Date(), { keyPrefix: 'order:' })).toBeNull();
  });

  it('treats the key prefix literally, not as a pattern', async () => {
    await createOperation({ idempotencyKey: 'orderX:o:capture:1', action: 'capture' });
    expect(await claimNextOperation('w', new Date(), { keyPrefix: 'order.' })).toBeNull();
  });

  it('marks an operation terminally failed only for the lease owner', async () => {
    const op = await createOperation({ nextAttemptAt: new Date(Date.now() - 1000) });
    await claimNextOperation('owner');

    expect(await markOperationFailed(op._id.toString(), 'intruder', { code: 'x', message: 'x' })).toBe(false);
    expect(await markOperationFailed(op._id.toString(), 'owner', { code: 'authorization_expired', message: 'hold gone' })).toBe(true);

    const stored = await PaymentOperation.findById(op._id);
    expect(stored!.status).toBe('failed');
    expect(stored!.leaseOwner).toBeUndefined();
    expect(stored!.leaseExpiresAt).toBeUndefined();
    expect(stored!.nextAttemptAt).toBeUndefined();
    expect(stored!.lastError!.code).toBe('authorization_expired');
    expect(await claimNextOperation('another-worker')).toBeNull();
  });
});
