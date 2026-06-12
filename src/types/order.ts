import type { CartItem } from './cart';
import type { Address } from './user';

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface PaymentMethod {
  type: 'credit-card' | 'debit-card' | 'paypal';
  last4?: string;
  cardHolder?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  shippingAddress: Address;
  paymentMethod: PaymentMethod;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  estimatedDelivery?: string;
}

export interface CheckoutData {
  shippingAddress: Address;
  paymentMethod: PaymentMethod;
  contactEmail: string;
  contactPhone: string;
}
