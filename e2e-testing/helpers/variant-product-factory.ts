import type { APIRequestContext } from '@playwright/test';

import { authHeaders } from './api-client';

export type VariantSeed = {
  id: string;
  size: string;
  price: number;
  stock: number;
  image?: string;
};

export type VariantProductSeed = {
  productId: string;
  name: string;
  variants: VariantSeed[];
};

const BASE_IMAGE =
  'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400';
const M_IMAGE =
  'https://images.unsplash.com/photo-1576566588028-4147f3842f3f?w=400';

/** Creates a Size S/M/L variant product owned by the seller (for buyer checkout tests). */
export async function createVariantProductForCheckout(
  request: APIRequestContext,
  apiUrl: string,
  sellerToken: string,
  name = `E2E Variant Checkout ${Date.now()}`,
): Promise<VariantProductSeed> {
  const response = await request.post(`${apiUrl}/api/products`, {
    headers: {
      ...authHeaders(sellerToken),
      'Content-Type': 'application/json',
    },
    data: {
      name,
      description: 'Variant hoodie for TC-098 buyer checkout.',
      price: 49.99,
      category: 'Clothing',
      stock: 0,
      image: BASE_IMAGE,
      variantAttributes: [{ name: 'Size', values: ['S', 'M', 'L'] }],
      variants: [
        {
          attributes: { Size: 'S' },
          price: 49.99,
          stock: 5,
          images: [BASE_IMAGE],
        },
        {
          attributes: { Size: 'M' },
          price: 54.99,
          stock: 10,
          images: [M_IMAGE],
        },
        {
          attributes: { Size: 'L' },
          price: 59.99,
          stock: 15,
          images: [BASE_IMAGE],
        },
      ],
      shippingOptions: ['standard', 'express', 'pickup'],
      shippingFee: 'buyer_pays',
      shippingFeeAmounts: { standard: 10, express: 15, pickup: 5 },
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create variant product: ${response.status()} ${await response.text()}`,
    );
  }

  const { product } = await response.json();
  const variants: VariantSeed[] = (product.variants ?? []).map((v: {
    _id: string;
    attributes: Record<string, string> | Map<string, string>;
    price: number;
    stock: number;
    images?: string[];
  }) => {
    const attrs =
      v.attributes instanceof Map
        ? Object.fromEntries(v.attributes)
        : v.attributes;
    return {
      id: v._id?.toString?.() ?? String(v._id),
      size: attrs.Size,
      price: v.price,
      stock: v.stock,
      image: v.images?.[0],
    };
  });

  return {
    productId: product._id?.toString?.() ?? product.id,
    name,
    variants,
  };
}

export async function fetchProduct(
  request: APIRequestContext,
  apiUrl: string,
  productId: string,
): Promise<{ variants: VariantSeed[] }> {
  const response = await request.get(`${apiUrl}/api/products/${productId}`);
  if (!response.ok()) {
    throw new Error(`Failed to fetch product: ${response.status()}`);
  }
  const { product } = await response.json();
  const variants: VariantSeed[] = (product.variants ?? []).map((v: {
    _id: string;
    attributes: Record<string, string>;
    price: number;
    stock: number;
    images?: string[];
  }) => ({
    id: v._id?.toString?.() ?? String(v._id),
    size: v.attributes?.Size ?? v.attributes?.size,
    price: v.price,
    stock: v.stock,
    image: v.images?.[0],
  }));
  return { variants };
}

export function variantBySize(
  variants: VariantSeed[],
  size: string,
): VariantSeed {
  const found = variants.find(v => v.size === size);
  if (!found) throw new Error(`Variant size ${size} not found`);
  return found;
}
