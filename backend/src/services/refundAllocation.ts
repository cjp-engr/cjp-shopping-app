import { currencyExponent } from './checkoutPricing.js';

export interface RefundUnit {
  lineId: string;
  /** 1-based position of the unit inside its line; refunds take the lowest free ordinals first. */
  ordinal: number;
  merchandiseMinor: number;
  taxMinor: number;
}

/**
 * What each unit of a captured order can be refunded for, in currency minor units. Built once
 * from the order's persisted snapshot and then stored, so later price, tax or coupon changes never
 * affect it. Shipping is kept out of every unit.
 */
export interface RefundAllocationV1 {
  version: 1;
  currency: string;
  capturedAmountMinor: number;
  shippingMinor: number;
  units: RefundUnit[];
}

export type RefundAllocationFailure = 'invalid_components' | 'unreconciled' | 'nothing_refundable';

export class RefundAllocationError extends Error {
  constructor(readonly reason: RefundAllocationFailure, message: string) {
    super(message);
    this.name = 'RefundAllocationError';
  }
}

/** The persisted order fields the allocation depends on; nothing is looked up. */
export interface AllocationSource {
  items: Array<{
    _id?: unknown;
    product?: unknown;
    productName?: string;
    productPrice: number;
    quantity: number;
    discountPercent?: number;
    /** @deprecated Older orders stored the item discount only here. */
    variantDiscount?: number;
  }>;
  subtotal: number;
  productDiscount: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  currency?: string;
  /** The verified captured amount. */
  amountMinor?: number;
}

/** Checkout rounds the final payment once, so parts and total may differ by under one minor unit. */
const RECONCILE_TOLERANCE_MINOR = 1;
/** Fail closed rather than store an allocation too large for a document. */
const MAX_UNITS = 2000;
/** Weights are compared as integers of a millionth of a minor unit, which keeps ties exact. */
const WEIGHT_SCALE = 1_000_000;

/**
 * Stable id of an order line: its persisted item id. Mongoose invents a fresh random `_id` each
 * time it loads an item that never stored one, so such historical items use an index-derived id.
 */
export function lineIdFor(item: object, index: number): string {
  const doc = item as { _id?: unknown; $isDefault?: (path: string) => boolean };
  if (doc._id == null) return `line-${index}`;
  if (typeof doc.$isDefault === 'function' && doc.$isDefault('_id')) return `line-${index}`;
  return String(doc._id);
}

function fail(reason: RefundAllocationFailure, message: string): never {
  throw new RefundAllocationError(reason, message);
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Splits `total` into integers proportional to `weights` (largest remainder). Equal remainders go
 * to the lower index, and a zero weight never receives anything.
 */
function allocate(total: number, weights: bigint[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0n);
  if (weightSum <= 0n) {
    if (total === 0) return weights.map(() => 0);
    return fail('unreconciled', 'There is nothing to apportion this amount over');
  }
  const amount = BigInt(total);
  const shares = weights.map(w => (amount * w) / weightSum);
  const remainders = weights.map(w => (amount * w) % weightSum);
  let left = total - shares.reduce((sum, share) => sum + Number(share), 0);
  const order = weights.map((_, index) => index)
    .sort((a, b) => (remainders[a] === remainders[b] ? a - b : remainders[a] > remainders[b] ? -1 : 1));
  const result = shares.map(Number);
  for (const index of order) {
    if (left <= 0) break;
    result[index] += 1;
    left -= 1;
  }
  return result;
}

function weight(valueMinor: number): bigint {
  const scaled = Math.round(valueMinor * WEIGHT_SCALE);
  if (!Number.isSafeInteger(scaled)) fail('invalid_components', 'An order amount is too large to apportion');
  return BigInt(scaled);
}

/**
 * Builds the refundable allocation of a captured order from its persisted snapshot only.
 *
 * The captured total is first apportioned over merchandise (after product and coupon discounts),
 * tax and shipping by their original weights, which preserves checkout's single final rounding.
 * Merchandise and tax are then spread over the lines by net value and split into units, always
 * with the largest-remainder rule, so repeated partial refunds can never gain or lose a cent.
 */
export function buildRefundAllocation(order: AllocationSource): RefundAllocationV1 {
  const currency = typeof order.currency === 'string' ? order.currency.toLowerCase() : '';
  let exponent: number;
  try {
    exponent = currencyExponent(currency);
  } catch {
    return fail('invalid_components', 'The order currency is not supported');
  }
  const minor = 10 ** exponent;

  const captured = order.amountMinor;
  if (typeof captured !== 'number' || !Number.isSafeInteger(captured) || captured < 0) {
    return fail('invalid_components', 'The order has no verified captured amount');
  }
  for (const [name, value] of Object.entries({
    subtotal: order.subtotal, productDiscount: order.productDiscount, discount: order.discount,
    tax: order.tax, shipping: order.shipping, total: order.total,
  })) {
    if (!finiteNonNegative(value)) return fail('invalid_components', `The order ${name} is not a valid amount`);
  }
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return fail('invalid_components', 'The order has no items');
  }

  const totalUnits = order.items.reduce((sum, item) => sum + (Number.isInteger(item.quantity) ? item.quantity : 0), 0);
  if (totalUnits > MAX_UNITS) return fail('invalid_components', 'The order has too many units to allocate');

  const lines = order.items.map((item, index) => {
    const percent = item.discountPercent ?? item.variantDiscount ?? 0;
    if (!finiteNonNegative(item.productPrice) || !Number.isInteger(item.quantity) || item.quantity < 1
        || !finiteNonNegative(percent) || percent > 100) {
      return fail('invalid_components', `Order item ${index} has an invalid price, quantity or discount`);
    }
    return {
      lineId: lineIdFor(item, index),
      quantity: item.quantity,
      net: item.productPrice * item.quantity * (1 - percent / 100),
    };
  });

  const netTotal = lines.reduce((sum, line) => sum + line.net, 0);
  const merchandise = netTotal - order.discount;
  const within = (a: number, b: number) => Math.abs(a - b) * minor <= RECONCILE_TOLERANCE_MINOR;
  if (!within(netTotal, order.subtotal - order.productDiscount)) {
    return fail('unreconciled', 'The order items do not match the stored subtotal and product discount');
  }
  if (merchandise < -RECONCILE_TOLERANCE_MINOR / minor) {
    return fail('unreconciled', 'The coupon discount exceeds the merchandise value');
  }
  const expectedTotal = merchandise + order.tax + order.shipping;
  if (!within(expectedTotal, order.total) || !within(expectedTotal, captured / minor)) {
    return fail('unreconciled', 'The order parts do not match the stored total and the captured amount');
  }

  if (merchandise * minor <= 0) {
    return fail(order.tax > 0 ? 'unreconciled' : 'nothing_refundable',
      order.tax > 0 ? 'The order has tax but no merchandise value' : 'The order has no refundable value');
  }

  const [merchandiseMinor, taxMinor, shippingMinor] = allocate(captured, [
    weight(merchandise * minor), weight(order.tax * minor), weight(order.shipping * minor),
  ]);

  const lineWeights = lines.map(line => weight(Math.max(line.net, 0) * minor));
  const merchandiseByLine = allocate(merchandiseMinor, lineWeights);
  const taxByLine = allocate(taxMinor, lineWeights);

  const units: RefundUnit[] = [];
  lines.forEach((line, index) => {
    const equal = Array.from({ length: line.quantity }, () => 1n);
    const merchandiseUnits = allocate(merchandiseByLine[index], equal);
    const taxUnits = allocate(taxByLine[index], equal);
    for (let ordinal = 0; ordinal < line.quantity; ordinal += 1) {
      units.push({ lineId: line.lineId, ordinal: ordinal + 1, merchandiseMinor: merchandiseUnits[ordinal], taxMinor: taxUnits[ordinal] });
    }
  });

  const allocation: RefundAllocationV1 = { version: 1, currency, capturedAmountMinor: captured, shippingMinor, units };
  if (!isConsistentAllocation(allocation, order.items)) {
    return fail('unreconciled', 'The unit amounts do not add up to the captured amount');
  }
  return allocation;
}

/**
 * Whether an allocation is internally sound and describes exactly these items: safe non-negative
 * integer amounts, units that add up (with shipping) to the captured amount, and for every line
 * precisely `quantity` units numbered 1..quantity. Used on freshly built and on stored allocations.
 */
export function isConsistentAllocation(allocation: RefundAllocationV1, items: ReadonlyArray<object & { quantity?: number }>): boolean {
  const safe = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
  if (allocation.version !== 1 || !safe(allocation.capturedAmountMinor) || !safe(allocation.shippingMinor)
      || !Array.isArray(allocation.units)) {
    return false;
  }
  let total = allocation.shippingMinor;
  for (const unit of allocation.units) {
    if (!safe(unit.merchandiseMinor) || !safe(unit.taxMinor) || !Number.isInteger(unit.ordinal)) return false;
    total += unit.merchandiseMinor + unit.taxMinor;
  }
  if (total !== allocation.capturedAmountMinor) return false;

  const byLine = new Map<string, number[]>();
  for (const unit of allocation.units) {
    byLine.set(unit.lineId, [...(byLine.get(unit.lineId) ?? []), unit.ordinal]);
  }
  if (byLine.size !== items.length) return false;
  return items.every((item, index) => {
    const ordinals = byLine.get(lineIdFor(item, index));
    return ordinals !== undefined
      && ordinals.length === item.quantity
      && ordinals.every((ordinal, position) => ordinal === position + 1);
  });
}

/** Units not yet reserved or refunded, in line then ordinal order. */
export function availableUnits(
  allocation: RefundAllocationV1,
  taken: ReadonlyArray<{ lineId: string; ordinal: number }>,
): RefundUnit[] {
  const used = new Set(taken.map(unit => `${unit.lineId}#${unit.ordinal}`));
  return allocation.units.filter(unit => !used.has(`${unit.lineId}#${unit.ordinal}`));
}

/** Available units that are worth something; a zero-value unit (a fully discounted line) is never requested. */
export function refundableUnits(
  allocation: RefundAllocationV1,
  taken: ReadonlyArray<{ lineId: string; ordinal: number }>,
): RefundUnit[] {
  return availableUnits(allocation, taken).filter(unit => unit.merchandiseMinor + unit.taxMinor > 0);
}
