import type { Product } from './product';

export interface SelectedVariant {
  _id?: string;
  attributes: Record<string, string>;
  price: number;
  stock: number;
  sku?: string;
  discount?: number;
  image?: string;
  /** Stable composite key: "Attr1:Val1|Attr2:Val2" (sorted) */
  key: string;
}

export interface CartItem {
  /** Order lines only: the id of this line in the order, used to match refunds to items. */
  lineId?: string;
  product: Product;
  quantity: number;
  sellerId?: string;
  sellerName?: string;
  selectedVariant?: SelectedVariant;
  isSelected: boolean;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}
