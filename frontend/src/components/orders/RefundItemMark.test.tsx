import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RefundItemMark } from './RefundItemMark';

const marks = [{ lineId: 'a', refunded: 2, processing: 0 }, { lineId: 'b', refunded: 0, processing: 1 }];

describe('refund mark on an order item', () => {
  it('shows a violet Refunded chip for an item that was paid back in full', () => {
    const html = renderToStaticMarkup(<RefundItemMark marks={marks} lineId="a" quantity={2} />);
    expect(html).toContain('Refunded'); expect(html).toContain('bg-violet-100'); expect(html).toContain('dark:bg-violet-500/20');
    expect(html).not.toContain('border-violet-300');
  });

  it('shows an outlined violet chip with the count when only some of the item was refunded', () => {
    const html = renderToStaticMarkup(<RefundItemMark marks={[{ lineId: 'a', refunded: 2, processing: 0 }]} lineId="a" quantity={4} />);
    expect(html).toContain('2 of 4 refunded'); expect(html).toContain('bg-violet-50'); expect(html).toContain('border-violet-300'); expect(html).toContain('dark:text-violet-300');
  });

  it('uses a different icon for full and partial, so they differ without reading the label', () => {
    const full = renderToStaticMarkup(<RefundItemMark marks={marks} lineId="a" quantity={2} />);
    const partial = renderToStaticMarkup(<RefundItemMark marks={[{ lineId: 'a', refunded: 2, processing: 0 }]} lineId="a" quantity={4} />);
    const icon = (html: string) => /<svg[^>]*class="([^"]*)"/.exec(html)![1];
    expect(icon(full)).toContain('lucide-circle-check'); expect(icon(partial)).toContain('lucide-contrast');
  });

  it('shows Refund processing in the warning colour while it is being paid back', () => {
    const html = renderToStaticMarkup(<RefundItemMark marks={marks} lineId="b" quantity={1} />);
    expect(html).toContain('Refund processing'); expect(html).toContain('bg-amber-100'); expect(html).toContain('dark:text-amber-300');
  });

  it('renders nothing for an item without refunds', () => {
    expect(renderToStaticMarkup(<RefundItemMark marks={marks} lineId="z" quantity={1} />)).toBe('');
    expect(renderToStaticMarkup(<RefundItemMark marks={undefined} lineId="a" quantity={1} />)).toBe('');
  });
});
