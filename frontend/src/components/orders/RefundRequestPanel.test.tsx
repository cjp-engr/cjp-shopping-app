import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('../../services/refundService', () => ({ refundService: { eligibility: vi.fn(), history: vi.fn(), create: vi.fn() }, RefundApiError: class extends Error {} }));
import { RefundRequestPanel } from './RefundRequestPanel';

describe('refund panel on the order page', () => {
  it('has no refresh button; the refund details load when the page opens', () => {
    const html = renderToStaticMarkup(<RefundRequestPanel orderId="o" />);
    expect(html).toContain('Item refunds');
    expect(html).not.toContain('Refresh refunds');
    expect(html).not.toMatch(/<button/);
  });
});
