import type { Product } from './product';

export interface SelectedVariant {
  _id?: string;
  attributes: Record<string, string>;
  price: number;
  stock: number;
  sku?: string;
  discount?: number;
  /** Stable composite key: "Attr1:Val1|Attr2:Val2" (sorted) */
  key: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  sellerId?: string;
  sellerName?: string;
  selectedVariant?: SelectedVariant;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}
