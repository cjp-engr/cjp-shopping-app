import { describe, expect, it } from 'vitest';
import Product from '../Product.js';

const valid = { name: 'Lamp', description: 'A lamp', price: 20, category: 'Home & Garden', stock: 5 };

describe('Product leading and trailing spaces', () => {
  it('are removed from text fields, tags and variant attributes, and kept inside a value', async () => {
    const doc = new Product({
      ...valid,
      name: '  Desk  Lamp ',
      brand: ' Acme ',
      sku: ' S1 ',
      tags: [' a ', ' b c '],
      variantAttributes: [{ name: ' Size ', values: [' M ', ' L'] }],
      variants: [{ attributes: { ' Size ': ' M ' }, sku: ' V1 ', price: 1 }],
    });
    await doc.validate();

    expect(doc.name).toBe('Desk  Lamp');
    expect(doc.brand).toBe('Acme');
    expect(doc.sku).toBe('S1');
    expect(Array.from(doc.tags ?? [])).toEqual(['a', 'b c']);
    expect(doc.variantAttributes?.[0].name).toBe('Size');
    expect(Array.from(doc.variantAttributes?.[0].values ?? [])).toEqual(['M', 'L']);
    expect(doc.variants?.[0].sku).toBe('V1');
    expect(Object.fromEntries(doc.variants![0].attributes as unknown as Map<string, string>)).toEqual({ Size: 'M' });
  });

  it('are removed from the attributes of every variant', async () => {
    const doc = new Product({
      ...valid,
      variants: [
        { attributes: { ' Size': 'M ', 'Color ': ' Red' }, price: 1 },
        { attributes: { 'Size ': ' L' }, price: 1 },
      ],
    });
    await doc.validate();

    expect(Object.fromEntries(doc.variants![0].attributes as unknown as Map<string, string>)).toEqual({ Size: 'M', Color: 'Red' });
    expect(Object.fromEntries(doc.variants![1].attributes as unknown as Map<string, string>)).toEqual({ Size: 'L' });
  });

  it('leave a product without variants alone', async () => {
    const doc = new Product(valid);
    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('do not make an allowed value valid: category stays exact', () => {
    expect(new Product({ ...valid, category: ' Electronics' }).validateSync()?.errors.category).toBeDefined();
  });
});

describe('Product description', () => {
  it('is required', () => {
    expect(new Product({ ...valid, description: '' }).validateSync()?.errors.description).toBeDefined();
  });

  it('is rejected when it holds only spaces', () => {
    const doc = new Product({ ...valid, description: '   ' });
    expect(doc.validateSync()?.errors.description).toBeDefined();
    expect(doc.description).toBe('');
  });

  it('accepts exactly 200 characters and rejects 201', () => {
    expect(new Product({ ...valid, description: 'x'.repeat(200) }).validateSync()).toBeUndefined();
    expect(new Product({ ...valid, description: 'x'.repeat(201) }).validateSync()?.errors.description).toBeDefined();
  });
});
