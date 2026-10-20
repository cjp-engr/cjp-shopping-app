import { describe, expect, it } from 'vitest';
import { isFullyRefunded, ordersInTab } from './orderTabs';

const order = (id: string, status: string, paymentStatus?: string | null) => ({ id, status, paymentStatus });

describe('order tabs', () => {
  const orders = [
    order('delivered-plain', 'delivered', 'captured'),
    order('delivered-partial', 'delivered', 'partially_refunded'),
    order('delivered-refunded', 'delivered', 'refunded'),
    order('delivered-cod', 'delivered', 'not_required'),
    order('delivered-old', 'delivered'),
    order('shipped', 'shipped', 'authorized'),
    order('cancelled-refunded', 'cancelled', 'refunded'),
  ];
  const ids = (list: { id: string }[]) => list.map(o => o.id);

  it('knows a fully refunded order by its payment status only', () => {
    expect(isFullyRefunded(order('a', 'delivered', 'refunded'))).toBe(true);
    expect(isFullyRefunded(order('a', 'delivered', 'partially_refunded'))).toBe(false);
    expect(isFullyRefunded(order('a', 'delivered', 'captured'))).toBe(false);
    expect(isFullyRefunded(order('a', 'delivered'))).toBe(false);
    expect(isFullyRefunded(order('a', 'delivered', null))).toBe(false);
  });

  it('removes fully refunded orders from Complete and keeps every other delivered order', () => {
    expect(ids(ordersInTab('complete', ['delivered'], orders))).toEqual(['delivered-plain', 'delivered-partial', 'delivered-cod', 'delivered-old']);
  });

  it('keeps fully refunded orders under All', () => {
    expect(ids(ordersInTab('all', [], orders))).toHaveLength(orders.length);
  });

  it('leaves the other status tabs alone, including a refunded cancelled order', () => {
    expect(ids(ordersInTab('to-receive', ['shipped'], orders))).toEqual(['shipped']);
    expect(ids(ordersInTab('cancelled', ['cancelled'], orders))).toEqual(['cancelled-refunded']);
  });
});
