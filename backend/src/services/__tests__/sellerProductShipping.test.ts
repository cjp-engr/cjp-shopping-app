import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../models/Order.js', () => ({ default: { findById: vi.fn() } }));
vi.mock('../../models/Product.js', () => ({
  default: { create: vi.fn(), findById: vi.fn() },
}));
vi.mock('../orderAcceptance.js', () => ({ acceptOrder: vi.fn() }));
vi.mock('../sellerCancellation.js', () => ({ cancelOrderAsSeller: vi.fn(), canSellerCancelPending: vi.fn() }));

import Product from '../../models/Product.js';
import { createSellerProduct, updateSellerProduct } from '../sellerService.js';

const sellerId = '507f1f77bcf86cd799439012';
const otherSellerId = '507f1f77bcf86cd799439099';
const productId = '507f1f77bcf86cd799439021';

const base = { name: 'Book', description: 'A book', price: 10, category: 'Books' };
const valid = { shippingOptions: ['standard'], shippingFee: 'free' };

function existingProduct(overrides: Record<string, unknown> = {}) {
  return {
    sellerId: { toString: () => sellerId },
    price: 10,
    shippingOptions: ['standard'],
    shippingFee: 'free',
    shippingFeeAmounts: new Map<string, number>(),
    save: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.mocked(Product.create).mockReset().mockResolvedValue({ _id: productId } as never);
  vi.mocked(Product.findById).mockReset();
});

describe('createSellerProduct shipping settings', () => {
  it('rejects a product with no shipping settings and creates nothing', async () => {
    await expect(createSellerProduct(sellerId, { ...base }, [])).rejects.toMatchObject({
      statusCode: 400,
      code: 'invalid_shipping_settings',
      message: 'At least one delivery option is required.',
    });
    expect(Product.create).not.toHaveBeenCalled();
  });

  it('rejects a missing fee option, a buyer-pays product without a fee, and a negative fee', async () => {
    await expect(createSellerProduct(sellerId, { ...base, shippingOptions: ['standard'] }, []))
      .rejects.toMatchObject({ statusCode: 400, message: 'Shipping fee option is required.' });
    await expect(createSellerProduct(sellerId, { ...base, shippingOptions: ['standard'], shippingFee: 'buyer_pays' }, []))
      .rejects.toMatchObject({ statusCode: 400, message: 'Shipping fee amount is required for delivery option "standard".' });
    await expect(createSellerProduct(sellerId, {
      ...base, shippingOptions: ['standard'], shippingFee: 'buyer_pays', shippingFeeAmounts: { standard: -3 },
    }, [])).rejects.toMatchObject({ statusCode: 400, message: 'Shipping fee amount for "standard" cannot be negative.' });
    expect(Product.create).not.toHaveBeenCalled();
  });

  it('creates the product when the shipping settings are valid', async () => {
    await createSellerProduct(sellerId, { ...base, ...valid }, []);
    expect(Product.create).toHaveBeenCalledTimes(1);
    expect(Product.create).toHaveBeenCalledWith(expect.objectContaining({ sellerId, shippingFee: 'free', shippingOptions: ['standard'] }));
  });
});

describe('updateSellerProduct shipping settings', () => {
  it('lets a partial update through when the product keeps valid shipping settings', async () => {
    const product = existingProduct();
    vi.mocked(Product.findById).mockResolvedValue(product);
    await updateSellerProduct(productId, sellerId, { price: 12 });
    expect(product.save).toHaveBeenCalledTimes(1);
    expect(product.price).toBe(12);
  });

  it('rejects an update that leaves an older product without shipping settings', async () => {
    const product = existingProduct({ shippingOptions: [], shippingFee: undefined });
    vi.mocked(Product.findById).mockResolvedValue(product);
    await expect(updateSellerProduct(productId, sellerId, { price: 12 })).rejects.toMatchObject({
      statusCode: 400,
      code: 'invalid_shipping_settings',
    });
    expect(product.save).not.toHaveBeenCalled();
  });

  it('accepts an update that adds the missing shipping settings to an older product', async () => {
    const product = existingProduct({ shippingOptions: [], shippingFee: undefined });
    vi.mocked(Product.findById).mockResolvedValue(product);
    await updateSellerProduct(productId, sellerId, { shippingOptions: ['standard'], shippingFee: 'free' });
    expect(product.save).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid shipping values supplied in the update', async () => {
    const product = existingProduct();
    vi.mocked(Product.findById).mockResolvedValue(product);
    await expect(updateSellerProduct(productId, sellerId, { shippingFee: 'flat' }))
      .rejects.toMatchObject({ statusCode: 400, message: 'Shipping fee must be "free" or "buyer_pays".' });
    expect(product.save).not.toHaveBeenCalled();
  });

  it('checks the stored fees too: a new delivery option needs its own fee', async () => {
    const product = existingProduct({
      shippingOptions: ['standard'],
      shippingFee: 'buyer_pays',
      shippingFeeAmounts: new Map([['standard', 5]]),
    });
    vi.mocked(Product.findById).mockResolvedValue(product);
    await expect(updateSellerProduct(productId, sellerId, { shippingOptions: ['standard', 'express'] }))
      .rejects.toMatchObject({ statusCode: 400, message: 'Shipping fee amount is required for delivery option "express".' });

    await updateSellerProduct(productId, sellerId, {
      shippingOptions: ['standard', 'express'],
      shippingFeeAmounts: { standard: 5, express: 12 },
    });
    expect(product.save).toHaveBeenCalledTimes(1);
  });

  it('reads stored fees held as a plain object as well as a Map', async () => {
    const product = existingProduct({
      shippingOptions: ['standard'],
      shippingFee: 'buyer_pays',
      shippingFeeAmounts: { standard: 5 },
    });
    vi.mocked(Product.findById).mockResolvedValue(product);
    await updateSellerProduct(productId, sellerId, { price: 12 });
    expect(product.save).toHaveBeenCalledTimes(1);
  });

  it('answers 403 for another seller before it looks at the shipping settings', async () => {
    const product = existingProduct({ shippingOptions: [], shippingFee: undefined });
    vi.mocked(Product.findById).mockResolvedValue(product);
    await expect(updateSellerProduct(productId, otherSellerId, { price: 1 })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('answers 404 for an unknown product', async () => {
    vi.mocked(Product.findById).mockResolvedValue(null);
    await expect(updateSellerProduct(productId, sellerId, { price: 1 })).rejects.toMatchObject({ statusCode: 404 });
  });
});
