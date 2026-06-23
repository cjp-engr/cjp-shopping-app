import type { Product } from './product';

export interface CartItem {
  product: Product;
  quantity: number;
  sellerId?: string;
  sellerName?: string;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}
