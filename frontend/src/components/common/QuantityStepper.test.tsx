import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuantityStepper } from './QuantityStepper';

function render(overrides: Partial<Parameters<typeof QuantityStepper>[0]> = {}) {
  return renderToStaticMarkup(
    <QuantityStepper
      value={1} min={0} max={3} onChange={vi.fn()}
      decreaseLabel="Decrease thing" increaseLabel="Increase thing" valueLabel="Thing quantity"
      {...overrides}
    />,
  );
}

const disabled = (html: string, label: string) =>
  new RegExp(`aria-label="${label}"[^>]*disabled=""|disabled=""[^>]*aria-label="${label}"`).test(html);

describe('quantity stepper', () => {
  it('has the product page look: rounded border, 44px buttons, grey number cell', () => {
    const html = render();
    expect(html).toContain('rounded-xl border border-gray-200');
    expect(html.match(/w-11 h-11/g)).toHaveLength(2);
    expect(html).toContain('bg-gray-50');
  });

  it('shows the number as text, not a typed input, and names it for screen readers', () => {
    const html = render({ value: 2 });
    expect(html).not.toContain('<input');
    expect(html).toMatch(/role="status" aria-label="Thing quantity"[^>]*>2</);
  });

  it('disables minus at the minimum and plus at the maximum', () => {
    expect(disabled(render({ value: 0 }), 'Decrease thing')).toBe(true);
    expect(disabled(render({ value: 0 }), 'Increase thing')).toBe(false);
    expect(disabled(render({ value: 3 }), 'Increase thing')).toBe(true);
    expect(disabled(render({ value: 3 }), 'Decrease thing')).toBe(false);
  });

  it('is locked entirely when disabled', () => {
    const html = render({ value: 1, disabled: true });
    expect(disabled(html, 'Decrease thing')).toBe(true);
    expect(disabled(html, 'Increase thing')).toBe(true);
  });
});
