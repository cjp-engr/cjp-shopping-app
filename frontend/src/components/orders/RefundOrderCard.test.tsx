import type React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { RefundOrderCard } from './RefundOrderCard';
import type { RefundRequest } from '../../types/refund';

const base: RefundRequest = {
  id: 'r1', orderId: '6ad4d9ac1234567890abcdef', state: 'refunded', amountMinor: 10038, shippingMinor: 1399, currency: 'usd',
  reasonCode: 'wrong_item', description: 'I ordered the 40L backpack.', submittedAt: '2026-10-18T14:39:00Z', completedAt: '2026-10-19T01:00:00Z',
  sellerName: 'SellerX Xavier', orderPlacedAt: '2026-10-18T10:00:00Z',
  units: [{ lineId: 'a', ordinal: 1, productName: 'Hiking Backpack - 40L', productImage: 'https://img.test/bag.png', merchandiseMinor: 7999, taxMinor: 640 }],
};
const render = (request: RefundRequest) => renderToStaticMarkup(<MemoryRouter><RefundOrderCard request={request} /></MemoryRouter>);

describe('refund order card', () => {
  it('is laid out like an order card: store and status, order number and date, item, total, banner, actions', () => {
    const html = render(base);
    expect(html).toContain('SellerX Xavier'); expect(html).toContain('Refunded');
    expect(html).toContain('Order #6AD4D9AC'); expect(html).toContain('October 18, 2026');
    expect(html).toContain('Hiking Backpack - 40L'); expect(html).toContain('x1 · Wrong item');
    expect(html).toContain('1 item refunded'); expect(html).toContain('incl. $13.99 shipping'); expect(html).toContain('$100.38');
    expect(html).toContain('The refund is confirmed'); expect(html).toContain('Completed ');
    expect(html).toContain('View Details'); expect(html).toContain('Refund details');
    expect(html).toContain('href="/orders/6ad4d9ac1234567890abcdef"');
    expect(html).toContain('data-testid="refund-card-r1"');
  });

  it('shows one row per line with the quantity, the line total and the amount each', () => {
    const units = [1, 2, 3].map(ordinal => ({ lineId: 'a', ordinal, productName: 'Mug', merchandiseMinor: 1000, taxMinor: 80 }));
    const html = render({ ...base, units, amountMinor: 3240, shippingMinor: 0 });
    expect(html).toContain('x3 · Wrong item'); expect(html).toContain('$32.40'); expect(html).toContain('$10.80 each');
    expect(html).toContain('3 items refunded'); expect(html).not.toContain('shipping');
  });

  it('does not invent an each-price when units differ by a cent', () => {
    const units = [{ lineId: 'a', ordinal: 1, productName: 'Mug', merchandiseMinor: 34, taxMinor: 0 }, { lineId: 'a', ordinal: 2, productName: 'Mug', merchandiseMinor: 33, taxMinor: 0 }];
    const html = render({ ...base, units, amountMinor: 67, shippingMinor: 0 });
    expect(html).not.toContain('each');
  });

  it('describes an approved refund that is still processing as approved, with a warning tone', () => {
    const html = render({ ...base, state: 'processing', completedAt: undefined, decidedAt: '2026-10-19T02:00:00Z' });
    expect(html).toContain('Refund processing'); expect(html).toContain('Approved by the seller. Your refund is processing.');
    expect(html).toContain('Approved '); expect(html).not.toContain('Refunded</span>');
  });

  it('flags a refund that needs payment review', () => {
    const html = render({ ...base, state: 'needs_review', completedAt: undefined });
    expect(html).toContain('Refund needs payment review'); expect(html).toContain('Do not submit a replacement request');
  });

  it('falls back to Store, no date and a placeholder image without breaking', () => {
    const html = render({ ...base, sellerName: null, orderPlacedAt: undefined, units: [{ lineId: 'a', ordinal: 1, merchandiseMinor: 1000, taxMinor: 0 }], amountMinor: 1000, shippingMinor: 0 });
    expect(html).toContain('>Store<'); expect(html).toContain('Order item'); expect(html).not.toContain('Invalid Date');
  });

  describe('as the seller', () => {
    const asSeller = (request: RefundRequest, children?: React.ReactNode) =>
      renderToStaticMarkup(<MemoryRouter><RefundOrderCard request={request} viewer="seller">{children}</RefundOrderCard></MemoryRouter>);
    const seller: RefundRequest = { ...base, buyerName: 'Buyer1 Monte Cristo', sellerName: 'SellerX Xavier' };

    it('shows the buyer, links to the seller order page, and explains who explained what', () => {
      const html = asSeller(seller);
      expect(html).toContain('Buyer1 Monte Cristo'); expect(html).not.toContain('SellerX Xavier');
      expect(html).toContain('href="/seller/orders/6ad4d9ac1234567890abcdef"');
      expect(html).toContain('Refund completed and confirmed'); expect(html).toContain('border-l-4');
    });

    it('asks for a decision on a request that is still waiting, and never calls it refunded', () => {
      const html = asSeller({ ...seller, state: 'requested', completedAt: undefined }, <p>decision controls</p>);
      expect(html).toContain('Awaiting seller review'); expect(html).toContain('Awaiting your decision');
      expect(html).toContain('1 item requested'); expect(html).not.toContain('1 item refunded');
      expect(html).toContain('decision controls');
    });

    it('shows a rejection with its reason and date', () => {
      const html = asSeller({ ...seller, state: 'rejected', completedAt: undefined, decidedAt: '2026-10-19T03:00:00Z', rejectionReason: 'Item was used' });
      expect(html).toContain('You rejected this request.'); expect(html).toContain('Reason: Item was used');
      expect(html).toContain('Rejected '); expect(html).toContain('1 item rejected');
    });

    it('falls back to Buyer when the account name is missing', () => {
      expect(asSeller({ ...seller, buyerName: null })).toContain('>Buyer<');
    });
  });

  describe("inside the buyer's own order page (inOrder)", () => {
    const inOrder = (request: RefundRequest) =>
      renderToStaticMarkup(<MemoryRouter><RefundOrderCard request={request} inOrder /></MemoryRouter>);

    it('drops what the page already shows: store header link, order strip and View Details', () => {
      const html = inOrder({ ...base, sellerName: undefined, orderPlacedAt: undefined });
      expect(html).toContain('Refund request'); expect(html).not.toContain('>Store<');
      expect(html).not.toContain('href='); expect(html).not.toContain('Order #');
      expect(html).not.toContain('View Details'); expect(html).toContain('Refund details');
      expect(html).toContain('Hiking Backpack - 40L'); expect(html).toContain('$100.38');
    });

    it('says a request is waiting for the seller', () => {
      const html = inOrder({ ...base, state: 'requested', completedAt: undefined });
      expect(html).toContain('Awaiting seller review'); expect(html).toContain('Waiting for the seller. You can check the decision here.');
      expect(html).toContain('1 item requested'); expect(html).toContain('Submitted ');
    });

    it("shows a rejection with the seller's reason", () => {
      const html = inOrder({ ...base, state: 'rejected', completedAt: undefined, decidedAt: '2026-10-19T03:00:00Z', rejectionReason: 'Item was used' });
      expect(html).toContain('The seller rejected this request.'); expect(html).toContain('Reason: Item was used');
      expect(html).toContain('Rejected '); expect(html).toContain('1 item rejected');
    });
  });
});

describe('refund card status on the Return/Refund tab', () => {
  it('says Partially refunded when only some of the order was refunded, and Fully refunded when all of it was', () => {
    expect(render({ ...base, orderPaymentStatus: 'partially_refunded' })).toContain('Partially refunded');
    expect(render({ ...base, orderPaymentStatus: 'refunded' })).toContain('Fully refunded');
    expect(render(base)).not.toContain('Fully refunded');
  });

  it('keeps the plain Refunded label on the order page, where the card is one request of several', () => {
    const html = renderToStaticMarkup(<MemoryRouter><RefundOrderCard request={{ ...base, orderPaymentStatus: 'partially_refunded' }} inOrder /></MemoryRouter>);
    expect(html).not.toContain('Partially refunded'); expect(html).toContain('Refunded');
  });
});

describe('refund card chip design', () => {
  it('uses the violet and amber chips instead of the green and yellow badges', () => {
    const refunded = render({ ...base, orderPaymentStatus: 'refunded' });
    expect(refunded).toContain('bg-violet-100'); expect(refunded).toContain('Fully refunded');
    const partial = render({ ...base, orderPaymentStatus: 'partially_refunded' });
    expect(partial).toContain('border-violet-300'); expect(partial).toContain('Partially refunded');
    const processing = render({ ...base, state: 'processing' });
    expect(processing).toContain('bg-amber-100'); expect(processing).toContain('Refund processing');
    expect(render({ ...base, state: 'requested' })).toContain('bg-amber-100');
  });

  it('keeps the red badge for a rejected request', () => {
    const html = render({ ...base, state: 'rejected', rejectionReason: 'Used' });
    expect(html).toContain('bg-red-100'); expect(html).not.toContain('bg-violet-100');
  });

  it('draws the chip on the order page card too', () => {
    const html = renderToStaticMarkup(<MemoryRouter><RefundOrderCard request={base} inOrder /></MemoryRouter>);
    expect(html).toContain('bg-violet-100');
  });
});
