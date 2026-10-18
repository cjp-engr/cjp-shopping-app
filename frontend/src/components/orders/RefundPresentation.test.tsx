import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RefundHistoryCard, refundOrderLink } from './RefundPresentation';
import { refundDate } from '../../utils/refund';
describe('refund presentation', () => {
  it('shows selected refunded units and original payment breakdown without claiming whole-order refund', () => {
    const html = renderToStaticMarkup(<RefundHistoryCard request={{ id: 'r', orderId: 'o', state: 'refunded', amountMinor: 1080, shippingMinor: 0, currency: 'usd', reasonCode: 'damaged', description: 'Broken handle', submittedAt: '2026-10-18T00:00:00Z', completedAt: '2026-10-18T01:00:00Z', units: [{ lineId: 'a', ordinal: 1, productName: '<Mug>', merchandiseMinor: 1000, taxMinor: 80 }] }} />);
    expect(html).toContain('&lt;Mug&gt;'); expect(html).toContain('Refunded');
    expect(html).toContain('Shipping refund'); expect(html).toContain('Original tax');
    expect(html).toContain('Your bank may take additional time'); expect(html).not.toContain('Entire order refunded');
    expect(refundDate('invalid')).toBe('Date unavailable');
    expect(refundDate('2026-10-18T01:00:00.123Z')).not.toContain('.123');
  });
  it('keeps the order link readable: not the 3.8:1 brand orange, not 12px, underlined, with a 44px tap height', () => {
    expect(refundOrderLink).not.toContain('text-primary-700');
    expect(refundOrderLink).not.toContain('text-xs');
    expect(refundOrderLink).toContain('text-primary-800');
    expect(refundOrderLink).toContain('underline');
    expect(refundOrderLink).toContain('min-h-11');
  });
  it('describes an approved, still-processing refund as approved with its approval date, not as requested', () => {
    const request = { id: 'r', orderId: 'o', state: 'processing' as const, amountMinor: 1080, shippingMinor: 0, currency: 'usd', reasonCode: 'damaged' as const, description: 'Broken handle', submittedAt: '2026-10-18T00:00:00Z', decidedAt: '2026-10-19T02:00:00Z', units: [{ lineId: 'a', ordinal: 1, productName: 'Mug', merchandiseMinor: 1000, taxMinor: 80 }] };
    const html = renderToStaticMarkup(<RefundHistoryCard request={request} />);
    expect(html).toContain('Refund processing'); expect(html).toContain('Refund approved');
    expect(html).toContain('Approved '); expect(html).not.toContain('Requested refund'); expect(html).not.toContain('Submitted ');
  });
  it('keeps a request that is still waiting for the seller described as requested', () => {
    const request = { id: 'r', orderId: 'o', state: 'requested' as const, amountMinor: 1080, shippingMinor: 0, currency: 'usd', reasonCode: 'damaged' as const, description: 'Broken handle', submittedAt: '2026-10-18T00:00:00Z', units: [{ lineId: 'a', ordinal: 1, productName: 'Mug', merchandiseMinor: 1000, taxMinor: 80 }] };
    const html = renderToStaticMarkup(<RefundHistoryCard request={request} />);
    expect(html).toContain('Requested refund'); expect(html).toContain('Submitted ');
  });
});
