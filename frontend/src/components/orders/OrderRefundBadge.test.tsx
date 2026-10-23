import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderRefundBadge } from './OrderRefundBadge';

describe('order refund badge', () => {
  it('shows Partially refunded and Fully refunded in the success colour', () => {
    const partly = renderToStaticMarkup(<OrderRefundBadge order={{ paymentStatus: 'partially_refunded', refundedAmountMinor: 1080 }} />);
    const fully = renderToStaticMarkup(<OrderRefundBadge order={{ paymentStatus: 'refunded', refundedAmountMinor: 3200 }} />);
    expect(partly).toContain('Partially refunded'); expect(partly).toContain('bg-green-100');
    expect(fully).toContain('Fully refunded');
  });

  it('shows Refund processing in the warning colour, and nothing without a refund', () => {
    expect(renderToStaticMarkup(<OrderRefundBadge order={{ refundReservedAmountMinor: 500 }} />)).toContain('bg-yellow-100');
    expect(renderToStaticMarkup(<OrderRefundBadge order={{ paymentStatus: 'captured' }} />)).toBe('');
  });
});
