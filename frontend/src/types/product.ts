export interface VariantAttribute {
  name: string;
  values: string[];
}

export interface ProductVariant {
  _id?: string;
  attributes: Record<string, string>;
  price: number;
  stock: number;
  sku?: string;
  image?: string;
  discount?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  images?: string[];
  stock: number;
  rating: number;
  reviews: number;
  tags?: string[];
  specifications?: Record<string, string>;
  createdAt: string;
  sellerId?: string;
  sellerName?: string;
  brand?: string;
  condition?: 'new' | 'used';
  sku?: string;
  discount?: number;
  shippingOptions?: Array<'standard' | 'express' | 'pickup'>;
  shippingFee?: 'free' | 'buyer_pays';
  shippingFeeAmounts?: Record<string, number>;
  variantAttributes?: VariantAttribute[];
  variants?: ProductVariant[];
}

export interface ProductFilters {
  category?: string;
  priceRange?: { min: number; max: number };
  rating?: number;
  searchQuery?: string;
  tags?: string[];
}

export type SortOption = 'price-asc' | 'price-desc' | 'rating' | 'newest' | 'name';
