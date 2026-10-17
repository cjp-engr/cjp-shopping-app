import type { CartItem } from './cart';
import type { Address } from './user';

export type OrderStatus = 'pending' | 'preparing' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface PaymentMethod {
  type: 'credit-card' | 'debit-card' | 'paypal' | 'cash-on-delivery';
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
  productDiscount: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  cancelReason?: string;
  selectedDeliveryOption?: string;
  createdAt: string;
  estimatedDelivery?: string;
  /** Manual-capture orders are paid by a hold that is captured when the seller starts preparing. */
  paymentFlowVersion?: 'legacy' | 'manual_capture';
  paymentStatus?: string | null;
  placedAt?: string;
  /** Seller acceptance deadline; the order is cancelled and the hold released if not accepted by then. */
  acceptBy?: string;
  authorizationExpiresAt?: string;
}

export interface CheckoutData {
  shippingAddress: Address;
  paymentMethod: PaymentMethod;
  contactEmail: string;
  contactPhone: string;
  paymentIntentId?: string;
}
