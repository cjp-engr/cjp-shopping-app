import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('../../services/refundService', () => ({ refundService: { sellerList: vi.fn(), decide: vi.fn() } }));
import { RefundRequestReview } from './RefundRequestReview';

describe('seller Return/Refund tabs', () => {
  const html = renderToStaticMarkup(<RefundRequestReview />);

  it('offers In Progress, Approved and Rejected, and nothing else', () => {
    expect(html).toContain('In Progress'); expect(html).toContain('Approved'); expect(html).toContain('Rejected');
    expect(html).toContain('data-testid="refund-group-in_progress"'); expect(html).toContain('data-testid="refund-group-approved"'); expect(html).toContain('data-testid="refund-group-rejected"');
    expect(html.match(/role="tab"/g)).toHaveLength(3);
  });

  it('has no refresh button: the list loads when the tab opens or a group is chosen', () => {
    expect(html).not.toContain('Refresh refund requests');
    expect(html).not.toContain('aria-label="Refresh');
  });

  it('opens on In Progress, the requests still waiting for the seller', () => {
    expect(html).toMatch(/role="tab" aria-selected="true"[^>]*data-testid="refund-group-in_progress"/);
    expect(html).toMatch(/role="tab" aria-selected="false"[^>]*data-testid="refund-group-approved"/);
    expect(html).toContain('Return/Refund');
  });
});
