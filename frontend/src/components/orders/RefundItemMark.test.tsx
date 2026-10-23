import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RefundItemMark } from './RefundItemMark';

const marks = [{ lineId: 'a', refunded: 2, processing: 0 }, { lineId: 'b', refunded: 0, processing: 1 }];

describe('refund mark on an order item', () => {
  it('shows a Refunded badge for an item that was paid back', () => {
    const html = renderToStaticMarkup(<RefundItemMark marks={marks} lineId="a" quantity={2} />);
    expect(html).toContain('Refunded'); expect(html).toContain('bg-green-100');
  });

  it('shows Refund processing in the warning colour while it is being paid back', () => {
    const html = renderToStaticMarkup(<RefundItemMark marks={marks} lineId="b" quantity={1} />);
    expect(html).toContain('Refund processing'); expect(html).toContain('bg-yellow-100');
  });

  it('renders nothing for an item without refunds', () => {
    expect(renderToStaticMarkup(<RefundItemMark marks={marks} lineId="z" quantity={1} />)).toBe('');
    expect(renderToStaticMarkup(<RefundItemMark marks={undefined} lineId="a" quantity={1} />)).toBe('');
  });
});
