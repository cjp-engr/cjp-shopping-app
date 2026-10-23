import type { CartItem } from './cart';
import type { Address } from './user';

export type OrderStatus = 'pending' | 'preparing' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface PaymentMethod {
  type: 'credit-card' | 'debit-card' | 'paypal' | 'cash-on-delivery';
  last4?: string;
  cardHolder?: string;
}

/** Units of one order line that were paid back, and approved ones still being paid back. */
export interface RefundedItemMark { lineId: string; refunded: number; processing: number }

export interface Order {
  /** Items with refunded units, for marking them in the order lists. */
  refundedItems?: RefundedItemMark[];
  deliveredAt?: string;
  refundRequestDeadlineAt?: string;
  refundedAmountMinor?: number;
  refundReservedAmountMinor?: number;
  currency?: string;
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
  paymentErrorCode?: string;
  placedAt?: string;
  /** Seller acceptance deadline; the order is cancelled and the hold released if not accepted by then. */
  acceptBy?: string;
  authorizationExpiresAt?: string;
  /** Who cancelled the order; absent on older cancellations. `system` means the deadline or an expired hold. */
  cancelledByRole?: 'buyer' | 'seller' | 'system';
  cancelledAt?: string;
  /** Seller list only: the server says this seller can cancel this pending order right now. */
  canSellerCancelPending?: boolean;
}

/** Where the card hold release stands after a seller cancellation; absent for cash on delivery. */
export interface SellerPaymentOperation {
  status: 'pending' | 'completed' | 'needs_review';
}

export interface CheckoutData {
  shippingAddress: Address;
  paymentMethod: PaymentMethod;
  contactEmail: string;
  contactPhone: string;
  paymentIntentId?: string;
}
