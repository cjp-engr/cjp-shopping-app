import { describe, expect, it } from 'vitest';
import { AppError } from '../../middleware/errorHandler.js';
import { diagnoseUnclaimedOrder } from '../orderAcceptance.js';

const now = new Date('2026-10-17T10:00:00Z');
const future = new Date(now.getTime() + 1000);

function cardOrder(overrides: Record<string, unknown> = {}) {
  return {
    status: 'pending',
    paymentFlowVersion: 'manual_capture',
    paymentStatus: 'authorized',
    paymentIntentId: 'pi_1',
    acceptBy: future,
    ...overrides,
  } as any;
}

function expectError(result: unknown, statusCode: number, code: string): AppError {
  expect(result).toBeInstanceOf(AppError);
  const error = result as AppError;
  expect(error.statusCode).toBe(statusCode);
  expect(error.code).toBe(code);
  return error;
}

describe('diagnoseUnclaimedOrder', () => {
  it('reports a card order that is already being captured as resolving', () => {
    expect(diagnoseUnclaimedOrder(cardOrder({ paymentStatus: 'capture_pending' }), now)).toBe('resolving');
  });

  it('rejects a deadline equal to now', () => {
    expectError(diagnoseUnclaimedOrder(cardOrder({ acceptBy: now }), now), 409, 'acceptance_deadline_passed');
  });

  it('rejects a deadline in the past for COD too', () => {
    const cod = cardOrder({ paymentStatus: 'not_required', paymentIntentId: undefined, acceptBy: new Date(now.getTime() - 1) });
    expectError(diagnoseUnclaimedOrder(cod, now), 409, 'acceptance_deadline_passed');
  });

  it('includes the current status in the not-pending message', () => {
    const error = expectError(diagnoseUnclaimedOrder(cardOrder({ status: 'preparing' }), now), 409, 'order_not_pending');
    expect(error.message).toContain('preparing');
    expectError(diagnoseUnclaimedOrder(cardOrder({ status: 'cancelled', paymentStatus: 'released' }), now), 409, 'order_not_pending');
  });

  it('reports a missing payment reference on an authorized card order', () => {
    expectError(diagnoseUnclaimedOrder(cardOrder({ paymentIntentId: undefined }), now), 409, 'payment_reference_missing');
  });

  it('has no deadline for legacy orders', () => {
    const legacy = { status: 'preparing', paymentFlowVersion: 'legacy' } as any;
    expectError(diagnoseUnclaimedOrder(legacy, now), 409, 'order_not_pending');
  });

  it('falls back to not-pending when a pending order is claimable but the claim was lost', () => {
    expectError(diagnoseUnclaimedOrder(cardOrder(), now), 409, 'order_not_pending');
  });
});
