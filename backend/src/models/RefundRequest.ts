import mongoose, { Schema, Document } from 'mongoose';

export const REFUND_REASON_CODES = ['damaged', 'wrong_item', 'missing_items', 'not_as_described', 'other'] as const;
export type RefundReasonCode = typeof REFUND_REASON_CODES[number];

/**
 * requested -> rejected, or requested -> processing -> refunded | needs_review.
 * `processing` means the seller's approval is committed and a durable refund operation exists,
 * not that the bank has returned the money.
 */
export const REFUND_REQUEST_STATES = ['requested', 'rejected', 'processing', 'refunded', 'needs_review'] as const;
export type RefundRequestState = typeof REFUND_REQUEST_STATES[number];

export interface IRefundRequestUnit {
  productImage?: string;
  productName?: string;
  lineId: string;
  ordinal: number;
  merchandiseMinor: number;
  taxMinor: number;
}

export interface IRefundRequest extends Document {
  orderId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  /** The exact units selected, with the amounts quoted at submission (immutable). */
  units: IRefundRequestUnit[];
  amountMinor: number;
  /** Absent on older quotes, whose original shipping-excluded amount must be honored. */
  shippingMinor?: number;
  currency: string;
  allocationVersion: number;
  reasonCode: RefundReasonCode;
  description: string;
  /** Buyer-scoped idempotency key and a fingerprint of the submitted payload. */
  idempotencyKey: string;
  payloadHash: string;
  state: RefundRequestState;
  submittedAt: Date;
  decidedAt?: Date;
  decidedBySellerId?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  paymentOperationKey?: string;
  providerRefundId?: string;
  /** Safe, non-secret error details for the review states. */
  errorCode?: string;
  nextReconcileAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UnitSchema = new Schema<IRefundRequestUnit>({
  productImage: String,
  productName: String,
  lineId: { type: String, required: true },
  ordinal: { type: Number, required: true, min: 1 },
  merchandiseMinor: { type: Number, required: true, min: 0 },
  taxMinor: { type: Number, required: true, min: 0 },
}, { _id: false });

const RefundRequestSchema = new Schema<IRefundRequest>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  units: { type: [UnitSchema], required: true, validate: { validator: (units: unknown[]) => units.length > 0, message: 'A refund request needs at least one unit' } },
  amountMinor: { type: Number, required: true, min: 1 },
  shippingMinor: { type: Number, min: 0 },
  currency: { type: String, required: true, lowercase: true },
  allocationVersion: { type: Number, required: true },
  reasonCode: { type: String, enum: REFUND_REASON_CODES, required: true },
  description: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 },
  idempotencyKey: { type: String, required: true, maxlength: 128 },
  payloadHash: { type: String, required: true },
  state: { type: String, enum: REFUND_REQUEST_STATES, required: true, default: 'requested' },
  submittedAt: { type: Date, required: true },
  decidedAt: Date,
  decidedBySellerId: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String, trim: true, maxlength: 1000 },
  paymentOperationKey: String,
  providerRefundId: String,
  errorCode: String,
  nextReconcileAt: Date,
}, { timestamps: true });

// Same buyer and key can only ever create one request.
RefundRequestSchema.index({ buyerId: 1, idempotencyKey: 1 }, { unique: true });
// At most one unresolved request per order, enforced by the database as well as by the order claim.
RefundRequestSchema.index(
  { orderId: 1 },
  { name: 'one_active_refund_per_order', unique: true, partialFilterExpression: { state: { $in: ['requested', 'processing', 'needs_review'] } } },
);
RefundRequestSchema.index({ sellerId: 1, submittedAt: -1 });
RefundRequestSchema.index({ state: 1, nextReconcileAt: 1, _id: 1 });

export default mongoose.model<IRefundRequest>('RefundRequest', RefundRequestSchema);
