import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderRefundBadge } from './OrderRefundBadge';

describe('order refund badge', () => {
  it('shows Fully refunded as a violet tint and Partially refunded as a violet outline', () => {
    const partly = renderToStaticMarkup(<OrderRefundBadge order={{ paymentStatus: 'partially_refunded', refundedAmountMinor: 1080 }} />);
    const fully = renderToStaticMarkup(<OrderRefundBadge order={{ paymentStatus: 'refunded', refundedAmountMinor: 3200 }} />);
    expect(partly).toContain('Partially refunded'); expect(partly).toContain('border-violet-300'); expect(partly).toContain('bg-violet-50');
    expect(fully).toContain('Fully refunded'); expect(fully).toContain('bg-violet-100'); expect(fully).not.toContain('border-violet-300');
  });

  it('shows Refund processing in the warning colour, and nothing without a refund', () => {
    expect(renderToStaticMarkup(<OrderRefundBadge order={{ refundReservedAmountMinor: 500 }} />)).toContain('bg-amber-100');
    expect(renderToStaticMarkup(<OrderRefundBadge order={{ paymentStatus: 'captured' }} />)).toBe('');
  });
});
