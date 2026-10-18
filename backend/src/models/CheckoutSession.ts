import mongoose, { Schema, Document } from 'mongoose';

export const CHECKOUT_SESSION_STATUSES = ['open', 'finalizing', 'placed', 'expired', 'failed'] as const;
export type CheckoutSessionStatus = typeof CHECKOUT_SESSION_STATUSES[number];

export const SELLER_DRAFT_STATUSES = ['awaiting_authorization', 'authorized', 'released', 'failed'] as const;
export type SellerDraftStatus = typeof SELLER_DRAFT_STATUSES[number];

export interface ISellerDraft {
  sellerId: mongoose.Types.ObjectId;
  draftOrderId: mongoose.Types.ObjectId;
  amountMinor: number;
  currency: string;
  paymentIntentId?: string;
  status: SellerDraftStatus;
}

export interface IStockReservation {
  productId: mongoose.Types.ObjectId;
  variantId?: string;
  quantity: number;
  restoredAt?: Date;
}

export interface ICheckoutSession extends Document {
  buyerId: mongoose.Types.ObjectId;
  idempotencyKey: string;
  requestHash: string;
  status: CheckoutSessionStatus;
  expiresAt: Date;
  sellers: ISellerDraft[];
  stockReservations: IStockReservation[];
  couponReservations: Array<{ couponId: mongoose.Types.ObjectId; sellerId: mongoose.Types.ObjectId }>;
  placedAt?: Date;
  stockRestoredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SellerDraftSchema = new Schema<ISellerDraft>({
  sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  draftOrderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  amountMinor: { type: Number, required: true, min: 1 },
  currency: { type: String, required: true, lowercase: true },
  paymentIntentId: { type: String },
  status: { type: String, enum: SELLER_DRAFT_STATUSES, required: true, default: 'awaiting_authorization' },
}, { _id: false });

const StockReservationSchema = new Schema<IStockReservation>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  restoredAt: { type: Date },
}, { _id: false });

const CheckoutSessionSchema = new Schema<ICheckoutSession>({
  buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  idempotencyKey: { type: String, required: true },
  requestHash: { type: String, required: true },
  status: { type: String, enum: CHECKOUT_SESSION_STATUSES, required: true, default: 'open' },
  expiresAt: { type: Date, required: true },
  sellers: { type: [SellerDraftSchema], default: [] },
  stockReservations: { type: [StockReservationSchema], default: [] },
  couponReservations: {
    type: [new Schema({
      couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true },
      sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    }, { _id: false })],
    default: [],
  },
  placedAt: { type: Date },
  stockRestoredAt: { type: Date },
}, { timestamps: true });

CheckoutSessionSchema.index({ buyerId: 1, idempotencyKey: 1 }, { unique: true });
CheckoutSessionSchema.index({ status: 1, expiresAt: 1 });

export default mongoose.model<ICheckoutSession>('CheckoutSession', CheckoutSessionSchema);
