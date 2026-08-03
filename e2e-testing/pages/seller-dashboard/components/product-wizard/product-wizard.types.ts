export type DeliveryOption = 'standard' | 'express' | 'pickup';
export type ShippingFeeOption = 'free' | 'buyer_pays';

export type ShippingConfig = {
  deliveryOptions: DeliveryOption[];
  feeMode: ShippingFeeOption;
  feeAmounts?: Partial<Record<DeliveryOption, string>>;
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
