import { expect } from '@playwright/test';

import { authHeaders } from './api-client';

export function assertBuyerPaysShipping(product: {
  shippingOptions: string[];
  shippingFee: string;
  shippingFeeAmounts: Record<string, number>;
}): void {
  expect(product.shippingOptions).toEqual(
    expect.arrayContaining(['standard', 'express', 'pickup']),
  );
  expect(product.shippingOptions).toHaveLength(3);
  expect(product.shippingFee).toBe('buyer_pays');
  expect(product.shippingFeeAmounts.standard).toBe(10);
  expect(product.shippingFeeAmounts.express).toBe(15);
  expect(product.shippingFeeAmounts.pickup).toBe(5);
}

export function assertVariantAttributes(
  product: { variantAttributes: { name: string; values: string[] }[] },
  name: string,
  values: string[],
): void {
  expect(product.variantAttributes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name,
        values: expect.arrayContaining(values),
      }),
    ]),
  );
}

export function assertTwoImagesPerVariant(
  variants: { images: string[] }[],
): void {
  for (const variant of variants) {
    expect(variant.images).toHaveLength(2);
    expect(variant.images.every(url => url.length > 0)).toBe(true);
  }
}

export async function fetchSavedProduct(
  request: import('@playwright/test').APIRequestContext,
  apiUrl: string,
  productId: string,
  token: string,
): Promise<Record<string, unknown>> {
  const response = await request.get(`${apiUrl}/api/products/${productId}`, {
    headers: authHeaders(token),
  });
  expect(response.ok()).toBeTruthy();
  const { product } = await response.json();
  return product;
}

export async function fetchOrder(
  request: import('@playwright/test').APIRequestContext,
  apiUrl: string,
  orderId: string,
  token: string,
): Promise<Record<string, unknown>> {
  const response = await request.get(`${apiUrl}/api/orders/${orderId}`, {
    headers: authHeaders(token),
  });
  expect(response.ok()).toBeTruthy();
  const { order } = await response.json();
  return order;
}
