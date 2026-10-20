import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RefundRequestForm } from './RefundRequestForm';
import type { RefundEligibility } from '../../types/refund';

const eligibility: RefundEligibility = {
  orderId: 'o', eligible: true, requestsEnabled: true, currency: 'usd', deadlineAt: '2026-10-25T14:38:00Z', shippingRefundableMinor: 1399,
  lines: [
    { lineId: 'a', productName: 'Hiking Backpack', quantityOrdered: 2, quantityAvailable: 2, availableUnitAmountsMinor: [8639, 8639] },
    { lineId: 'b', productName: 'Mug', quantityOrdered: 1, quantityAvailable: 0, availableUnitAmountsMinor: [] },
  ],
};

function render(overrides: Partial<Parameters<typeof RefundRequestForm>[0]> = {}) {
  return renderToStaticMarkup(
    <RefundRequestForm
      eligibility={eligibility} quantities={{}} reason="damaged" description="" amount={null} shipping={0}
      busy={false} uncertain={false} onQuantity={vi.fn()} onReason={vi.fn()} onDescription={vi.fn()} onSubmit={vi.fn()}
      {...overrides}
    />,
  );
}

const submitDisabled = (html: string) => /type="submit"[^>]*disabled=""/.test(html);

describe('refund request form', () => {
  it('lists only items that can still be refunded, with the request-by date', () => {
    const html = render();
    expect(html).toContain('Select an item'); expect(html).toContain('Request by ');
    expect(html).toContain('Hiking Backpack'); expect(html).toContain('2 available');
    expect(html).not.toContain('Mug');
  });

  it('draws the request-by pill with shades that exist, so its text can be read in dark mode', () => {
    const html = render();
    const pill = html.slice(html.lastIndexOf('<span', html.indexOf('Request by ')), html.indexOf('Request by '));
    // The orange palette stops at 900; a dark: shade that does not exist leaves a light pill with light text.
    expect(pill).not.toMatch(/primary-950/);
    expect(pill).toContain('dark:bg-primary-500/15'); expect(pill).toContain('dark:text-primary-300');
  });

  it('keeps the labels the stepper and fields are found by', () => {
    const html = render();
    expect(html).toContain('aria-label="Decrease refund quantity for Hiking Backpack"');
    expect(html).toContain('aria-label="Refund quantity for Hiking Backpack"');
    expect(html).toContain('aria-label="Increase refund quantity for Hiking Backpack"');
    expect(html).toContain('Tell the seller what happened'); expect(html).toContain('Reason');
    for (const label of ['Damaged item', 'Wrong item', 'Missing items', 'Not as described', 'Other']) expect(html).toContain(label);
  });

  it('reuses the controls of the rest of the app', () => {
    const html = render({ quantities: { a: 1 } });
    // Quantity: the product page stepper, with a plain number cell instead of a typed field.
    expect(html).toContain('rounded-xl border border-gray-200'); expect(html).not.toContain('type="number"');
    // Reason: styled like the product form's category select.
    expect(html).toMatch(/<select id="refund-reason"[^>]*class="[^"]*rounded-lg[^"]*px-4 py-2\.5/);
    expect(html).toContain('<label for="refund-reason"');
    // Explanation: the review box, four rows, counter under it.
    expect(html).toMatch(/<textarea id="refund-description"[^>]*rows="4"[^>]*class="[^"]*resize-none rounded-xl/);
    expect(html).toContain('<label for="refund-description"');
  });

  it('starts with nothing selected: no amount, stepper down disabled, submit disabled', () => {
    const html = render();
    expect(html).toContain('Not selected'); expect(html).toContain('$0.00');
    expect(html).toMatch(/aria-label="Decrease refund quantity for Hiking Backpack"[^>]*disabled=""|disabled=""[^>]*aria-label="Decrease refund quantity for Hiking Backpack"/);
    expect(submitDisabled(html)).toBe(true);
    expect(html).toContain('Submit refund request');
  });

  it('shows the refund for the selection and enables submit once there is an explanation', () => {
    const html = render({ quantities: { a: 1 }, amount: 8639, description: 'Broken' });
    expect(html).toContain('$86.39 refund'); expect(html).toContain('1 item');
    expect(html).toContain('$86.39'); expect(submitDisabled(html)).toBe(false);
  });

  it('adds up several units of one line', () => {
    const html = render({ quantities: { a: 2 }, amount: 17278, description: 'x' });
    expect(html).toContain('$172.78 refund'); expect(html).toContain('2 items');
  });

  it('says shipping is included when it is part of the refund', () => {
    const html = render({ quantities: { a: 2 }, amount: 18677, shipping: 1399, description: 'x' });
    expect(html).toContain('Shipping ($13.99) is included in your refund.');
  });

  it('explains when shipping is not refunded yet, and says nothing when it can never be', () => {
    expect(render({ quantities: { a: 1 }, amount: 8639, description: 'x' })).toContain('is refunded only when you select every item');
    const none = render({ eligibility: { ...eligibility, shippingRefundableMinor: 0 } });
    expect(none).not.toContain('Shipping ('); expect(none).not.toContain('is refunded only when');
  });

  it('counts the explanation against its limit', () => {
    expect(render({ description: 'Broken' })).toMatch(/6(<!-- -->)?\/(<!-- -->)?1000/);
  });

  it('locks the fields and the button while submitting', () => {
    const html = render({ busy: true, quantities: { a: 1 }, amount: 8639, description: 'x' });
    expect(html).toContain('Submitting…'); expect(html).toMatch(/<fieldset disabled=""/); expect(submitDisabled(html)).toBe(true);
  });

  it('offers to retry the same request after an uncertain result, even without a valid selection', () => {
    const html = render({ uncertain: true });
    expect(html).toContain('Retry same request'); expect(submitDisabled(html)).toBe(false); expect(html).toMatch(/<fieldset disabled=""/);
  });

  describe('submit hint', () => {
    const hintId = 'id="refund-submit-hint"';

    it('says what is missing instead of leaving a silent disabled button', () => {
      const html = render();
      expect(html).toContain('Select an item to refund.');
      expect(html).toContain(hintId);
      expect(html).toContain('aria-describedby="refund-submit-hint"');
    });

    it('asks for the explanation once an item is selected', () => {
      const html = render({ quantities: { a: 1 }, amount: 8639 });
      expect(html).toContain('Describe the issue to continue.');
      expect(html).not.toContain('Select an item to refund.');
    });

    it('shows no hint when the form is complete', () => {
      const html = render({ quantities: { a: 1 }, amount: 8639, description: 'Broken' });
      expect(html).not.toContain('Select an item to refund.');
      expect(html).not.toContain('Describe the issue to continue.');
      expect(html).not.toContain(hintId);
      expect(html).not.toContain('aria-describedby="refund-submit-hint"');
    });

    it('shows no hint while submitting or retrying', () => {
      expect(render({ busy: true })).not.toContain(hintId);
      expect(render({ uncertain: true })).not.toContain(hintId);
    });
  });
});
