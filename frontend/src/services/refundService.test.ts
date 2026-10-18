import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../config/api', () => ({ API_ENDPOINTS: { ORDERS: '/api/orders', SELLER_ORDERS: '/api/seller/orders' }, getAuthHeaders: () => ({ Authorization: 'Bearer test' }) }));
import { refundService, RefundApiError } from './refundService';
import { refundQuote, netOrderRevenue } from '../utils/refund';
afterEach(() => vi.unstubAllGlobals());
describe('delivered refund client', () => {
  it('loads paginated completed refunds separately from order fulfillment', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ requests: [], page: 2, pages: 2, total: 21 }) }); vi.stubGlobal('fetch', fetcher);
    expect(await refundService.completed(2)).toMatchObject({ page: 2, total: 21 });
    expect(fetcher.mock.calls[0][0]).toBe('/api/orders/refund-requests/completed?page=2&limit=20');
  });
  it('sends selections and stable key without a client-controlled amount', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ request: { id: 'r', state: 'requested' } }) }); vi.stubGlobal('fetch', fetcher);
    const input = { items: [{ lineId: 'a', quantity: 1 }], reasonCode: 'damaged' as const, description: 'Broken', idempotencyKey: 'same-key' };
    await refundService.submit('order', input); await refundService.submit('order', input);
    expect(fetcher.mock.calls[0][0]).toBe('/api/orders/order/refund-requests');
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(input);
    expect(fetcher.mock.calls[1][1].body).toBe(fetcher.mock.calls[0][1].body);
  });
  it('preserves conflict code/status so the UI can refresh eligibility', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ message: 'Changed', code: 'refund_conflict' }) }));
    await expect(refundService.decide('r', 'approve')).rejects.toMatchObject({ status: 409, code: 'refund_conflict' });
  });
  it('uses safe errors when the server returns a non-JSON failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error('html'); } }));
    await expect(refundService.history('o')).rejects.toBeInstanceOf(RefundApiError);
  });
  it('quotes exact ordered unit amounts and rejects over-selection', () => {
    const lines = [{ lineId: 'a', productName: 'Mug', quantityOrdered: 3, quantityAvailable: 3, availableUnitAmountsMinor: [34, 33, 33] }];
    expect(refundQuote(lines, { a: 2 })).toBe(67);
    expect(refundQuote(lines, { a: 4 })).toBeNull(); expect(refundQuote(lines, { a: 0.5 })).toBeNull();
    expect(refundQuote(lines, { foreign: 1 })).toBeNull();
  });
  it('subtracts confirmed refunded amount only without changing original totals', () => {
    expect(netOrderRevenue({ total: 21.6, refundedAmountMinor: 500, currency: 'usd' })).toBe(16.6);
    expect(netOrderRevenue({ total: 21.6, refundedAmountMinor: 0, currency: 'usd' })).toBe(21.6);
    expect(netOrderRevenue({ total: 2160, refundedAmountMinor: 500, currency: 'jpy' })).toBe(1660);
  });
});
