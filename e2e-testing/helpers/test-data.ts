import path from 'path';

import type { ShippingAddress } from '../pages/checkout.page';
import type {
  ShippingConfig,
  VariantAttributeConfig,
  VariantRowConfig,
} from '../pages/seller-dashboard/components/product-wizard/product-wizard.types';

export const API_URL = process.env.API_URL ?? 'http://localhost:5000';

const ALL_OPTIONS = ['standard', 'express', 'pickup'] as const;
type ShipOption = typeof ALL_OPTIONS[number];

/** Returns a random non-empty subset of shipping options. */
function randomOptions(): ShipOption[] {
  const shuffled = [...ALL_OPTIONS].sort(() => Math.random() - 0.5);
  const count = Math.floor(Math.random() * ALL_OPTIONS.length) + 1;
  return shuffled.slice(0, count);
}

/** Random shipping fields for JSON-body product creation requests. */
export function randomShipping(): {
  shippingOptions: ShipOption[];
  shippingFee: 'free' | 'buyer_pays';
  shippingFeeAmounts?: Partial<Record<ShipOption, number>>;
} {
  const options = randomOptions();
  const fee = Math.random() < 0.5 ? 'free' : 'buyer_pays';
  if (fee === 'buyer_pays') {
    const amounts: Partial<Record<ShipOption, number>> = {};
    for (const o of options) amounts[o] = Math.floor(Math.random() * 20) + 1;
    return { shippingOptions: options, shippingFee: fee, shippingFeeAmounts: amounts };
  }
  return { shippingOptions: options, shippingFee: fee };
}

/** Random shipping fields serialized for multipart/form-data product creation requests. */
export function randomShippingMultipart(): Record<string, string> {
  const s = randomShipping();
  const fields: Record<string, string> = {
    shippingOptions: JSON.stringify(s.shippingOptions),
    shippingFee: s.shippingFee,
  };
  if (s.shippingFeeAmounts) fields.shippingFeeAmounts = JSON.stringify(s.shippingFeeAmounts);
  return fields;
}

export const DEFAULT_SHIPPING_ADDRESS: ShippingAddress = {
  street: '123 Test Street',
  city: 'Manila',
  state: 'Metro Manila',
  zip: '1000',
  phone: '+63 912 345 6789',
};

/** TC-042 / TC-064 shared shipping configuration (buyer pays fees). */
export const BUYER_PAYS_SHIPPING: ShippingConfig = {
  deliveryOptions: ['standard', 'express', 'pickup'],
  feeMode: 'buyer_pays',
  feeAmounts: {
    standard: '10',
    express: '15',
    pickup: '5',
  },
};

export const VARIANT_IMAGE_DIR = path.join(
  __dirname,
  '../fixtures/images/variants',
);

export const variantFixturePath = (filename: string): string =>
  path.join(VARIANT_IMAGE_DIR, filename);

export const TC064_SIZE_VARIANTS: {
  attribute: VariantAttributeConfig;
  rows: VariantRowConfig[];
  priceBySize: Record<'S' | 'M' | 'L', string>;
  stockBySize: Record<'S' | 'M' | 'L', string>;
} = {
  attribute: { name: 'Size', values: ['S', 'M', 'L'] },
  rows: [
    {
      price: '49.99',
      stock: '5',
      imagePaths: [
        variantFixturePath('variant-s-1.png'),
        variantFixturePath('variant-s-2.png'),
      ],
      reorderCover: true,
    },
    {
      price: '54.99',
      stock: '10',
      imagePaths: [
        variantFixturePath('variant-m-1.png'),
        variantFixturePath('variant-m-2.png'),
      ],
    },
    {
      price: '59.99',
      stock: '15',
      imagePaths: [
        variantFixturePath('variant-l-1.png'),
        variantFixturePath('variant-l-2.png'),
      ],
    },
  ],
  priceBySize: {
    S: '$49.99',
    M: '$54.99',
    L: '$59.99',
  },
  stockBySize: {
    S: '5 in stock',
    M: '10 in stock',
    L: '15 in stock',
  },
};
