import type { APIRequestContext } from '@playwright/test';

import { authHeaders } from './api-client';
import { API_URL } from './test-data';

/** Creates a simple product with a discount percentage — use for TC-012 sale price tests. */
export async function createDiscountedProduct(
  request: APIRequestContext,
  sellerToken: string,
  opts: { price?: number; discount?: number } = {},
): Promise<string> {
  const price = opts.price ?? 100;
  const discount = opts.discount ?? 20;
  const res = await request.post(`${API_URL}/api/products`, {
    headers: { ...authHeaders(sellerToken), 'Content-Type': 'application/json' },
    data: {
      name: `E2E Sale Product ${Date.now()}`,
      description: 'Sale price strikethrough test product.',
      price,
      discount,
      category: 'Clothing',
      stock: 10,
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
      shippingOptions: ['standard'],
      shippingFee: 'free',
    },
  });
  if (!res.ok()) throw new Error(`Failed to create discounted product: ${res.status()}`);
  const { product } = await res.json();
  return product._id as string;
}

/** Creates a minimal simple product — use for catalog visibility / read tests. */
export async function createSimpleProduct(
  request: APIRequestContext,
  sellerToken: string,
  name: string,
  opts: { price?: number; category?: string } = {},
): Promise<string> {
  const res = await request.post(`${API_URL}/api/products`, {
    headers: { ...authHeaders(sellerToken), 'Content-Type': 'application/json' },
    data: {
      name,
      description: 'Catalog visibility test product.',
      price: opts.price ?? 29.99,
      category: opts.category ?? 'Electronics',
      stock: 5,
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
      shippingOptions: ['standard'],
      shippingFee: 'free',
    },
  });
  if (!res.ok()) throw new Error(`Failed to create product: ${res.status()}`);
  const { product } = await res.json();
  return product._id as string;
}
