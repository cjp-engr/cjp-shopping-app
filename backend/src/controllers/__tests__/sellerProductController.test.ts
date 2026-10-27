import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';

vi.mock('../../services/sellerService.js', () => ({
  createSellerProduct: vi.fn(),
  updateSellerProduct: vi.fn(),
}));

import * as sellerService from '../../services/sellerService.js';
import { createProduct, updateProduct } from '../sellerController.js';

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
  (res.status as any).mockReturnValue(res);
  return res;
}

const validBody = {
  name: 'Lamp',
  description: 'A lamp',
  price: '20',
  category: 'Home & Garden',
  stock: '5',
  shippingOptions: '["standard"]',
  shippingFee: 'free',
};

function makeReq(body: Record<string, unknown>): any {
  return { user: { id: 'seller-1' }, params: { id: 'product-1' }, body, files: [] };
}

describe('seller createProduct controller', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(sellerService.createSellerProduct).mockResolvedValue({ _id: 'product-1' } as any);
  });

  it('creates the product from multipart text values', async () => {
    const res = makeRes();
    await createProduct(makeReq(validBody), res, vi.fn());

    expect(sellerService.createSellerProduct).toHaveBeenCalledWith(
      'seller-1',
      expect.objectContaining({ price: 20, stock: 5, shippingOptions: ['standard'] }),
      [],
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('accepts a price of 0', async () => {
    await createProduct(makeReq({ ...validBody, price: '0' }), makeRes(), vi.fn());
    expect(sellerService.createSellerProduct).toHaveBeenCalledWith('seller-1', expect.objectContaining({ price: 0 }), []);
  });

  it.each(['', '   '])('answers 400 "required" for an empty price %j instead of creating the product at 0', async price => {
    const res = makeRes();
    await createProduct(makeReq({ ...validBody, price }), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'name, description, price, and category are required' });
    expect(sellerService.createSellerProduct).not.toHaveBeenCalled();
  });

  it('treats an empty stock as not sent (0) and an empty discount as no discount', async () => {
    await createProduct(makeReq({ ...validBody, stock: '', discount: '' }), makeRes(), vi.fn());

    const data = vi.mocked(sellerService.createSellerProduct).mock.calls[0][1];
    expect(data.stock).toBe(0);
    expect(data.discount).toBeUndefined();
  });

  it('passes the arrays of a JSON body through unchanged', async () => {
    const body = { ...validBody, price: 20, stock: 5, shippingOptions: ['standard'], shippingFeeAmounts: { standard: 5 } };
    await createProduct(makeReq(body), makeRes(), vi.fn());

    expect(sellerService.createSellerProduct).toHaveBeenCalledWith(
      'seller-1',
      expect.objectContaining({ price: 20, shippingOptions: ['standard'], shippingFeeAmounts: { standard: 5 } }),
      [],
    );
  });

  it.each(['shippingOptions', 'shippingFeeAmounts', 'variants', 'variantAttributes'])(
    'forwards a 400 invalid_product_json when %s is not valid JSON',
    async field => {
      const next = vi.fn();
      await createProduct(makeReq({ ...validBody, [field]: '[{' }), makeRes(), next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400, code: 'invalid_product_json', message: `${field} must be valid JSON.` }),
      );
      expect(sellerService.createSellerProduct).not.toHaveBeenCalled();
    },
  );
});

describe('seller updateProduct controller', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(sellerService.updateSellerProduct).mockResolvedValue({ _id: 'product-1' } as any);
  });

  it('updates only the fields that were sent', async () => {
    const res = makeRes();
    await updateProduct(makeReq({ price: '25' }), res, vi.fn());

    expect(sellerService.updateSellerProduct).toHaveBeenCalledWith(
      'product-1',
      'seller-1',
      expect.objectContaining({ price: 25, stock: undefined, discount: undefined }),
      undefined,
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it.each(['price', 'stock'])('forwards a 400 when %s is sent empty, instead of setting it to 0', async field => {
    const next = vi.fn();
    await updateProduct(makeReq({ [field]: '' }), makeRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, code: 'invalid_product_number', message: `${field} cannot be empty.` }),
    );
    expect(sellerService.updateSellerProduct).not.toHaveBeenCalled();
  });

  it('leaves the shipping settings out of the update when they were not sent, so the stored ones stay', async () => {
    await updateProduct(makeReq({ price: '25' }), makeRes(), vi.fn());

    const updates = vi.mocked(sellerService.updateSellerProduct).mock.calls[0][2];
    expect(updates.shippingFeeAmounts).toBeUndefined();
    expect(updates.shippingOptions).toBeUndefined();
    expect(updates.shippingFee).toBeUndefined();
  });

  it('passes the shipping settings on when they were sent', async () => {
    await updateProduct(makeReq({ shippingFee: 'buyer_pays', shippingFeeAmounts: '{"standard":5}' }), makeRes(), vi.fn());

    const updates = vi.mocked(sellerService.updateSellerProduct).mock.calls[0][2];
    expect(updates).toMatchObject({ shippingFee: 'buyer_pays', shippingFeeAmounts: { standard: 5 } });
  });

  it('treats an empty discount as not sent, so the stored discount stays', async () => {
    await updateProduct(makeReq({ discount: '' }), makeRes(), vi.fn());

    expect(vi.mocked(sellerService.updateSellerProduct).mock.calls[0][2].discount).toBeUndefined();
  });

  it.each(['shippingOptions', 'shippingFeeAmounts', 'variants', 'variantAttributes'])(
    'forwards a 400 invalid_product_json when %s is not valid JSON',
    async field => {
      const next = vi.fn();
      await updateProduct(makeReq({ [field]: '{' }), makeRes(), next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400, code: 'invalid_product_json', message: `${field} must be valid JSON.` }),
      );
      expect(sellerService.updateSellerProduct).not.toHaveBeenCalled();
    },
  );
});
