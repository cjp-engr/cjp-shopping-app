import { describe, expect, it } from 'vitest';
import Order from '../Order.js';

describe('Order schema', () => {
  it('indexes status and acceptBy for the deadline scan', () => {
    expect(Order.schema.indexes()).toContainEqual([{ status: 1, acceptBy: 1 }, expect.anything()]);
  });

  it('records when stock was restored', () => {
    expect(Order.schema.path('stockRestoredAt')).toBeDefined();
  });
});
