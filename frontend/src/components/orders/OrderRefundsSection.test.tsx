import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { OrderRefundsSection } from './OrderRefundsSection';
import type { RefundRequest } from '../../types/refund';

const request = (id: string, state: RefundRequest['state'], amountMinor: number): RefundRequest => ({
  id, orderId: 'o1', state, amountMinor, currency: 'usd', reasonCode: 'damaged', description: 'Broken', submittedAt: '2026-10-18T14:39:00Z',
  buyerName: 'Buyer1 Monte Cristo', orderPlacedAt: '2026-10-18T10:00:00Z',
  units: [{ lineId: 'a', ordinal: 1, productName: 'Wireless Mouse', merchandiseMinor: 2999, taxMinor: 240 }],
});
const render = (requests: RefundRequest[]) => renderToStaticMarkup(<MemoryRouter><OrderRefundsSection requests={requests} /></MemoryRouter>);

describe('refunds on the seller order page', () => {
  it('lists every refund request of the order as a seller card, inside the order page', () => {
    const html = render([request('r1', 'refunded', 3239), request('r2', 'rejected', 3239)]);
    expect(html).toContain('Refunds'); expect(html).toContain('data-testid="refund-card-r1"'); expect(html).toContain('data-testid="refund-card-r2"');
    expect(html).toContain('Refund request'); expect(html).toContain('Wireless Mouse'); expect(html).toContain('$32.39');
    // On the order page itself: no store link and no View Details back to this same order.
    expect(html).not.toContain('View Details');
  });

  it('renders nothing when the order has no refund requests', () => {
    expect(render([])).toBe('');
  });
});
