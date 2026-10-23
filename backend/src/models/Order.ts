import mongoose, { Schema, Document } from 'mongoose';
import { IAddress } from './User.js';
import type { RefundAllocationV1 } from '../services/refundAllocation.js';

export type OrderStatus = 'awaiting_payment' | 'pending' | 'preparing' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export const CANCELLED_BY_ROLES = ['buyer', 'seller', 'system'] as const;
export type CancelledByRole = typeof CANCELLED_BY_ROLES[number];

export interface ICartItem {
  product: mongoose.Types.ObjectId;
  variantId?: string;
  selectedAttributes?: Map<string, string>;
  productName: string;
  productPrice: number;
  productImage: string;
  variantImages?: string[];
  variantSku?: string;
  discountPercent?: number;
  /** @deprecated Kept for compatibility with existing orders. */
  variantDiscount?: number;
  quantity: number;
}

export interface IPaymentMethod {
  type: 'credit-card' | 'debit-card' | 'paypal' | 'cash-on-delivery';
  last4?: string;
  cardHolder?: string;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  shippingAddress: IAddress;
  paymentMethod: IPaymentMethod;
  subtotal: number;
  productDiscount: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  couponCode?: string;
  paymentIntentId?: string;
  status: OrderStatus;
  estimatedDelivery?: Date;
  shippedAt?: Date;
  /** Recorded delivery time and the end of the buyer's refund window (delivery + 168h); written once, never backfilled. */
  deliveredAt?: Date;
  refundRequestDeadlineAt?: Date;
  refundRequestedAt?: Date;
  cancelReason?: string;
  /** Who cancelled the order and when; written once by the cancellation claim. Older orders have none. */
  cancelledByRole?: CancelledByRole;
  cancelledById?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  sellerMessages?: Record<string, string>;
  deliverySelections?: Record<string, string>;
  selectedDeliveryOption?: string;
  sellerId?: mongoose.Types.ObjectId;
  checkoutSessionId?: string;
  paymentFlowVersion: 'legacy' | 'manual_capture';
  paymentStatus?: PaymentStatus;
  amountMinor?: number;
  currency?: string;
  authorizedAt?: Date;
  placedAt?: Date;
  authorizationExpiresAt?: Date;
  acceptBy?: Date;
  capturedAt?: Date;
  stockRestoredAt?: Date;
  refundId?: string;
  /** Refundable amount of each unit, built once from this order's snapshot (see refundAllocation.ts). */
  refundAllocation?: RefundAllocationV1;
  /** The one unresolved delivered-item refund request, if any. */
  activeRefundRequestId?: mongoose.Types.ObjectId;
  refundedAmountMinor?: number;
  refundReservedAmountMinor?: number;
  refundedShippingMinor?: number;
  refundReservedShippingMinor?: number;
  /** Units that are reserved by an unresolved request or already refunded; they cannot be requested again. */
  refundUnitsTaken?: Array<{ lineId: string; ordinal: number }>;
  paymentError?: { code: string; message: string; at: Date };
  createdAt: Date;
  updatedAt: Date;
}

export const PAYMENT_STATUSES = [
  'awaiting_authorization', 'authorized', 'capture_pending', 'captured',
  'release_pending', 'released', 'refund_pending', 'refunded', 'partially_refunded', 'failed', 'not_required',
] as const;
export type PaymentStatus = typeof PAYMENT_STATUSES[number];

const CartItemSchema = new Schema<ICartItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantId: { type: String },
  selectedAttributes: { type: Map, of: String },
  productName: {
    type: String,
    required: true
  },
  productPrice: {
    type: Number,
    required: true
  },
  productImage: {
    type: String,
    required: true
  },
  variantImages: { type: [String], default: undefined },
  variantSku: { type: String },
  discountPercent: { type: Number, min: 0, max: 100 },
  variantDiscount: { type: Number },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
});

const AddressSchema = new Schema<IAddress>({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, default: 'PH' }
});

const PaymentMethodSchema = new Schema<IPaymentMethod>({
  type: {
    type: String,
    enum: ['credit-card', 'debit-card', 'paypal', 'cash-on-delivery'],
    required: true
  },
  last4: String,
  cardHolder: String
});

const RefundAllocationSchema = new Schema({
  version: { type: Number, required: true },
  currency: { type: String, required: true },
  capturedAmountMinor: { type: Number, required: true },
  shippingMinor: { type: Number, required: true },
  units: [new Schema({
    lineId: { type: String, required: true },
    ordinal: { type: Number, required: true },
    merchandiseMinor: { type: Number, required: true },
    taxMinor: { type: Number, required: true },
  }, { _id: false })],
}, { _id: false });

const OrderSchema = new Schema<IOrder>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: {
    type: [CartItemSchema],
    required: true,
    validate: {
      validator: function(items: ICartItem[]) {
        return items.length > 0;
      },
      message: 'Order must have at least one item'
    }
  },
  shippingAddress: {
    type: AddressSchema,
    required: true
  },
  sellerMessages: {
    type: Map,
    of: String,
    default: {}
  },
  deliverySelections: {
    type: Map,
    of: String,
    default: {}
  },
  selectedDeliveryOption: { type: String },
  sellerId: { type: Schema.Types.ObjectId, ref: 'User' },
  checkoutSessionId: { type: String },
  paymentFlowVersion: {
    type: String,
    enum: ['legacy', 'manual_capture'],
    default: 'legacy',
  },
  paymentStatus: { type: String, enum: PAYMENT_STATUSES },
  amountMinor: { type: Number, min: 0 },
  currency: { type: String, uppercase: true },
  authorizedAt: Date,
  placedAt: Date,
  authorizationExpiresAt: Date,
  acceptBy: Date,
  capturedAt: Date,
  stockRestoredAt: Date,
  refundId: { type: String },
  refundAllocation: { type: RefundAllocationSchema },
  activeRefundRequestId: { type: Schema.Types.ObjectId },
  refundedAmountMinor: { type: Number, min: 0 },
  refundReservedAmountMinor: { type: Number, min: 0 },
  refundedShippingMinor: { type: Number, min: 0 },
  refundReservedShippingMinor: { type: Number, min: 0 },
  refundUnitsTaken: {
    type: [new Schema({ lineId: { type: String, required: true }, ordinal: { type: Number, required: true } }, { _id: false })],
    default: undefined,
  },
  paymentError: {
    code: String,
    message: String,
    at: Date,
  },
  paymentMethod: {
    type: PaymentMethodSchema,
    required: true
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  productDiscount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  couponCode: { type: String },
  paymentIntentId: { type: String, index: true, unique: true, sparse: true },
  tax: {
    type: Number,
    required: true,
    min: 0
  },
  shipping: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['awaiting_payment', 'pending', 'preparing', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  estimatedDelivery: Date,
  shippedAt: Date,
  deliveredAt: Date,
  refundRequestDeadlineAt: Date,
  refundRequestedAt: Date,
  cancelReason: { type: String },
  cancelledByRole: { type: String, enum: CANCELLED_BY_ROLES },
  cancelledById: { type: Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: Date
}, {
  timestamps: true
});

// Index for user order history
OrderSchema.index({ userId: 1, createdAt: -1 });

// Index for the acceptance-deadline scan
OrderSchema.index({ status: 1, acceptBy: 1 });

export default mongoose.model<IOrder>('Order', OrderSchema);
