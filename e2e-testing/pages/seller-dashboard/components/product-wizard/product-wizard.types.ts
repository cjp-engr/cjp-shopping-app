export type DeliveryOption = 'standard' | 'express' | 'pickup';
export type ShippingFeeOption = 'free' | 'buyer_pays';

export type ShippingConfig = {
  deliveryOptions: DeliveryOption[];
  feeMode: ShippingFeeOption;
  feeAmounts?: Partial<Record<DeliveryOption, string>>;
};

export type VariantAttributeConfig = {
  name: string;
  values: string[];
};

export type VariantRowConfig = {
  price: string;
  stock: string;
  imagePaths?: string[];
  /** After uploads, swap cover with second image via move-right on index 0. */
  reorderCover?: boolean;
};

export type VariantProductOptions = {
  name: string;
  category: string;
  brand?: string;
  attributes: VariantAttributeConfig[];
  variantRows: VariantRowConfig[];
  description: string;
  tags?: string[];
  imageUrl: string;
  shipping?: ShippingConfig;
};

export type SimpleProductOptions = {
  name: string;
  category: string;
  brand?: string;
  price: string;
  stock: string;
  sku?: string;
  discount?: string;
  description: string;
  tags?: string[];
  imageUrl: string;
  shipping?: ShippingConfig;
};
