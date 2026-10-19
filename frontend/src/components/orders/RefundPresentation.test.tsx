import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RefundBreakdown } from './RefundPresentation';
import { refundDate } from '../../utils/refund';

describe('refund presentation', () => {
  it('breaks a refund into items, original tax, shipping and total', () => {
    const html = renderToStaticMarkup(<RefundBreakdown amount={10038} shipping={1399} tax={640} currency="usd" />);
    expect(html).toContain('Items after discounts'); expect(html).toContain('$79.99');
    expect(html).toContain('Original tax'); expect(html).toContain('$6.40');
    expect(html).toContain('Shipping refund'); expect(html).toContain('$13.99');
    expect(html).toContain('Refund total'); expect(html).toContain('$100.38');
  });

  it('formats dates safely', () => {
    expect(refundDate('invalid')).toBe('Date unavailable');
    expect(refundDate(undefined)).toBe('Date unavailable');
    expect(refundDate('2026-10-18T01:00:00.123Z')).not.toContain('.123');
  });
});
