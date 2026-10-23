import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { sellerRefundListRules, validateRefund } from '../refundValidators.js';

async function validate(query: Record<string, string>) {
  const req = { query } as unknown as Request;
  await Promise.all(sellerRefundListRules.map(rule => rule.run(req)));
  const next = vi.fn();
  validateRefund(req, {} as Response, next);
  return next.mock.calls[0][0] as { statusCode?: number; code?: string } | undefined;
}

describe('seller refund list query', () => {
  it.each(['in_progress', 'approved', 'rejected'])('accepts the %s group', async (status) => {
    expect(await validate({ status, page: '1', limit: '20' })).toBeUndefined();
  });

  it('accepts no group', async () => {
    expect(await validate({})).toBeUndefined();
  });

  it.each(['everything', 'requested', 'refunded', '', 'APPROVED'])('rejects the group "%s" with 400 refund_validation', async (status) => {
    expect(await validate({ status })).toMatchObject({ statusCode: 400, code: 'refund_validation' });
  });
});
