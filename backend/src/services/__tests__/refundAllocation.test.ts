import { describe, expect, it } from 'vitest';
import {
  availableUnits,
  buildRefundAllocation,
  isConsistentAllocation,
  lineIdFor,
  refundableUnits,
  RefundAllocationError,
  type AllocationSource,
} from '../refundAllocation.js';

function item(id: string, productPrice: number, quantity: number, discountPercent = 0) {
  return { _id: id, product: `product-${id}`, productName: id, productPrice, quantity, discountPercent };
}

/** Builds a consistent order from major-unit components so each test only states what it cares about. */
function source(overrides: Partial<AllocationSource> & { items: AllocationSource['items'] }): AllocationSource {
  const gross = overrides.items.reduce((sum, i) => sum + i.productPrice * i.quantity, 0);
  const net = overrides.items.reduce((sum, i) => sum + i.productPrice * i.quantity * (1 - (i.discountPercent ?? 0) / 100), 0);
  const productDiscount = overrides.productDiscount ?? gross - net;
  const discount = overrides.discount ?? 0;
  const tax = overrides.tax ?? 0;
  const shipping = overrides.shipping ?? 0;
  const total = overrides.total ?? net - discount + tax + shipping;
  const currency = overrides.currency ?? 'USD';
  const exponent = currency === 'JPY' ? 0 : 2;
  return {
    subtotal: gross,
    productDiscount,
    discount,
    tax,
    shipping,
    total,
    currency,
    amountMinor: overrides.amountMinor ?? Math.round(total * 10 ** exponent),
    ...overrides,
  };
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('buildRefundAllocation', () => {
  it('splits the coupon and tax over discounted lines and keeps shipping out of the units', () => {
    // Net 10.00 and 20.00, coupon 3.00, tax 2.16, shipping 5.00: captured 34.16.
    const allocation = buildRefundAllocation(source({
      items: [item('a', 10, 1), item('b', 20, 1)],
      discount: 3,
      tax: 2.16,
      shipping: 5,
    }));

    expect(allocation).toMatchObject({ version: 1, currency: 'usd', capturedAmountMinor: 3416, shippingMinor: 500 });
    expect(allocation.units.map(u => [u.lineId, u.ordinal, u.merchandiseMinor + u.taxMinor])).toEqual([
      ['a', 1, 972],
      ['b', 1, 1944],
    ]);
    expect(sum(allocation.units.map(u => u.merchandiseMinor + u.taxMinor)) + allocation.shippingMinor).toBe(3416);
  });

  it('allocates a 100-cent line of three units as 34/33/33, never 99 or 102', () => {
    const allocation = buildRefundAllocation(source({ items: [item('a', 1 / 3, 3)] }));

    expect(allocation.capturedAmountMinor).toBe(100);
    expect(allocation.units.map(u => u.merchandiseMinor)).toEqual([34, 33, 33]);
    expect(allocation.units.map(u => u.ordinal)).toEqual([1, 2, 3]);
  });

  it('refunding units one at a time can never exceed the captured amount', () => {
    const allocation = buildRefundAllocation(source({
      items: [item('a', 3.33, 3), item('b', 7.01, 2, 15)],
      discount: 1.37,
      tax: 1.73,
      shipping: 4.99,
    }));

    const refundable = sum(allocation.units.map(u => u.merchandiseMinor + u.taxMinor));
    expect(refundable + allocation.shippingMinor).toBe(allocation.capturedAmountMinor);
    expect(allocation.units).toHaveLength(5);
  });

  it('breaks equal remainders by line order', () => {
    // Two equal 1.00 lines and a half-cent tax: captured 2.005 rounds to 201, so one extra cent is left over.
    const allocation = buildRefundAllocation(source({ items: [item('a', 1, 1), item('b', 1, 1)], tax: 0.005, amountMinor: 201 }));

    expect(allocation.capturedAmountMinor).toBe(201);
    expect(allocation.units.map(u => u.merchandiseMinor + u.taxMinor)).toEqual([101, 100]);
  });

  it('gives zero-net lines no tax and no merchandise', () => {
    const allocation = buildRefundAllocation(source({
      items: [item('free', 10, 1, 100), item('paid', 10, 1)],
      tax: 0.8,
    }));

    expect(allocation.units.find(u => u.lineId === 'free')).toMatchObject({ merchandiseMinor: 0, taxMinor: 0 });
    expect(allocation.units.find(u => u.lineId === 'paid')).toMatchObject({ merchandiseMinor: 1000, taxMinor: 80 });
  });

  it('works for a zero-decimal currency', () => {
    const allocation = buildRefundAllocation(source({ items: [item('a', 1000, 2), item('b', 500, 1)], tax: 200, currency: 'JPY' }));

    expect(allocation.currency).toBe('jpy');
    expect(allocation.capturedAmountMinor).toBe(2700);
    expect(allocation.units.map(u => u.merchandiseMinor + u.taxMinor)).toEqual([1080, 1080, 540]);
  });

  it('accepts the sub-cent difference that final-only rounding leaves between the parts and the captured total', () => {
    // 3 x 3.33 = 9.99, tax 0.7992 (8%) => 10.7892, rounded once to 1079.
    const allocation = buildRefundAllocation(source({ items: [item('a', 3.33, 3)], tax: 0.7992 }));
    expect(allocation.capturedAmountMinor).toBe(1079);
    expect(sum(allocation.units.map(u => u.merchandiseMinor + u.taxMinor)) + allocation.shippingMinor).toBe(1079);
  });

  it('falls back to the deprecated variantDiscount on older items', () => {
    const older = { _id: 'a', product: 'p', productName: 'a', productPrice: 10, quantity: 1, variantDiscount: 10 };
    const allocation = buildRefundAllocation(source({ items: [older], productDiscount: 1, subtotal: 10, total: 9, amountMinor: 900, tax: 0 }));
    expect(allocation.units[0].merchandiseMinor).toBe(900);
  });

  it('derives an index-based line id for historical items that have none', () => {
    const allocation = buildRefundAllocation(source({ items: [{ product: 'p', productName: 'a', productPrice: 5, quantity: 2 }] }));
    expect(allocation.units.map(u => u.lineId)).toEqual(['line-0', 'line-0']);
  });

  it('is pure: it needs no product lookup and returns synchronously from the persisted snapshot', () => {
    const result = buildRefundAllocation(source({ items: [item('a', 5, 1)] }));
    expect(result).not.toBeInstanceOf(Promise);
  });

  describe('rejects what it cannot verify', () => {
    const base = () => source({ items: [item('a', 10, 1)], tax: 0.8 });
    const reasonOf = (candidate: AllocationSource) => {
      try {
        buildRefundAllocation(candidate);
      } catch (error) {
        expect(error).toBeInstanceOf(RefundAllocationError);
        return (error as RefundAllocationError).reason;
      }
      throw new Error('expected the allocation to be rejected');
    };

    it.each([
      ['negative tax', { tax: -1 }],
      ['non-finite shipping', { shipping: Number.POSITIVE_INFINITY }],
      ['NaN discount', { discount: Number.NaN }],
      ['missing captured amount', { amountMinor: undefined }],
      ['fractional captured amount', { amountMinor: 1080.5 }],
      ['unsupported currency', { currency: 'XXX' }],
    ])('%s', (_name, patch) => {
      expect(reasonOf({ ...base(), ...patch } as AllocationSource)).toBe('invalid_components');
    });

    it.each([
      ['quantity zero', [item('a', 10, 0)]],
      ['fractional quantity', [item('a', 10, 1.5)]],
      ['negative price', [item('a', -10, 1)]],
      ['discount above 100 percent', [item('a', 10, 1, 120)]],
    ])('an item with %s', (_name, items) => {
      expect(reasonOf({ ...base(), items } as AllocationSource)).toBe('invalid_components');
    });

    it('more units than an allocation may hold', () => {
      expect(reasonOf({ ...base(), items: [item('a', 0.01, 2001)], tax: 0, total: 20.01, subtotal: 20.01, amountMinor: 2001 })).toBe('invalid_components');
    });

    it('no items', () => {
      expect(reasonOf({ ...base(), items: [] })).toBe('invalid_components');
    });

    it('a captured amount that does not reconcile with the order parts', () => {
      expect(reasonOf({ ...base(), amountMinor: 1200 })).toBe('unreconciled');
    });

    it('a stored total that does not reconcile with the order parts', () => {
      expect(reasonOf({ ...base(), total: 13 })).toBe('unreconciled');
    });

    it('item lines that do not reconcile with the stored subtotal', () => {
      expect(reasonOf({ ...base(), subtotal: 50 })).toBe('unreconciled');
    });

    it('a zero merchandise base with non-zero tax', () => {
      expect(reasonOf(source({ items: [item('a', 10, 1, 100)], tax: 1 }))).toBe('unreconciled');
    });

    it('an order with nothing refundable', () => {
      expect(reasonOf(source({ items: [item('a', 10, 1, 100)] }))).toBe('nothing_refundable');
    });
  });
});

describe('buildRefundAllocation invariants over many generated orders', () => {
  it('never gains or loses a cent, never goes negative, and is deterministic', () => {
    let seed = 20261018;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const pick = (max: number) => Math.floor(random() * max);

    for (let run = 0; run < 400; run += 1) {
      const items = Array.from({ length: 1 + pick(4) }, (_, index) =>
        item(`l${index}`, (1 + pick(20000)) / 100, 1 + pick(5), pick(3) === 0 ? pick(60) : 0));
      const net = items.reduce((s, i) => s + i.productPrice * i.quantity * (1 - (i.discountPercent ?? 0) / 100), 0);
      const coupon = pick(3) === 0 ? Math.round(net * random() * 0.5 * 100) / 100 : 0;
      const tax = (net - coupon) * 0.08;
      const shipping = pick(2) === 0 ? 0 : 9.99;
      const candidate = source({ items, discount: coupon, tax, shipping });

      const allocation = buildRefundAllocation(candidate);

      const refundable = sum(allocation.units.map(u => u.merchandiseMinor + u.taxMinor));
      expect(refundable + allocation.shippingMinor).toBe(allocation.capturedAmountMinor);
      expect(allocation.units.every(u => u.merchandiseMinor >= 0 && u.taxMinor >= 0)).toBe(true);
      expect(allocation.units).toHaveLength(items.reduce((s, i) => s + i.quantity, 0));
      expect(buildRefundAllocation(candidate)).toEqual(allocation);
    }
  });
});

describe('availableUnits', () => {
  const allocation = buildRefundAllocation(source({ items: [item('a', 1 / 3, 3), item('b', 5, 1)] }));

  it('returns every unit when none are taken, in line then ordinal order', () => {
    expect(availableUnits(allocation, []).map(u => `${u.lineId}:${u.ordinal}`)).toEqual(['a:1', 'a:2', 'a:3', 'b:1']);
  });

  it('removes taken units and keeps the next ordinals first', () => {
    const left = availableUnits(allocation, [{ lineId: 'a', ordinal: 1 }, { lineId: 'b', ordinal: 1 }]);
    expect(left.map(u => `${u.lineId}:${u.ordinal}`)).toEqual(['a:2', 'a:3']);
  });
});

describe('isConsistentAllocation', () => {
  const items = [item('a', 1 / 3, 3), item('b', 5, 1)];
  const good = () => buildRefundAllocation(source({ items, shipping: 2 }));

  it('accepts what buildRefundAllocation produces', () => {
    expect(isConsistentAllocation(good(), items)).toBe(true);
  });

  it.each([
    ['a wrong version', (a: any) => { a.version = 2; }],
    ['a negative amount', (a: any) => { a.units[0].taxMinor = -1; a.units[1].taxMinor += 1; }],
    ['a fractional amount', (a: any) => { a.units[0].merchandiseMinor += 0.5; a.units[1].merchandiseMinor -= 0.5; }],
    ['units that do not add up', (a: any) => { a.units[0].merchandiseMinor += 1; }],
    ['a missing unit', (a: any) => { a.units.pop(); }],
    ['a duplicated ordinal', (a: any) => { a.units[1].ordinal = 1; }],
    ['an unknown line', (a: any) => { a.units[3].lineId = 'zzz'; }],
    ['units that are not an array', (a: any) => { a.units = undefined; }],
  ])('rejects %s', (_name, mutate) => {
    const allocation = good() as any;
    mutate(allocation);
    expect(isConsistentAllocation(allocation, items)).toBe(false);
  });
});

describe('lineIdFor', () => {
  it('uses the stored item id', () => {
    expect(lineIdFor({ _id: 'abc' }, 3)).toBe('abc');
  });

  it('uses an index id when the item has none, or Mongoose only invented one for it', () => {
    expect(lineIdFor({}, 2)).toBe('line-2');
    expect(lineIdFor({ _id: 'random', $isDefault: (path: string) => path === '_id' }, 2)).toBe('line-2');
    expect(lineIdFor({ _id: 'stored', $isDefault: () => false }, 2)).toBe('stored');
  });
});

describe('refundableUnits', () => {
  it('leaves out units worth nothing', () => {
    const free = buildRefundAllocation(source({ items: [item('free', 10, 1, 100), item('paid', 10, 2)], tax: 1.6 }));
    expect(refundableUnits(free, []).map(u => u.lineId)).toEqual(['paid', 'paid']);
    expect(availableUnits(free, []).map(u => u.lineId)).toEqual(['free', 'paid', 'paid']);
  });
});
