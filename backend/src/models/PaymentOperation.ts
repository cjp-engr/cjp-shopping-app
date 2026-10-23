import mongoose, { Schema, Document } from 'mongoose';

export const PAYMENT_OPERATION_ACTIONS = ['create_intent', 'capture', 'release', 'refund'] as const;
export type PaymentOperationAction = typeof PAYMENT_OPERATION_ACTIONS[number];

export const PAYMENT_OPERATION_STATUSES = [
  'pending', 'in_progress', 'succeeded', 'failed', 'ambiguous', 'needs_support',
] as const;
export type PaymentOperationStatus = typeof PAYMENT_OPERATION_STATUSES[number];

/** Refunds without a purpose are the older cancelled-order refunds (resumeLegacyRefund). */
export const REFUND_PURPOSES = ['delivered_items'] as const;
export type RefundPurpose = typeof REFUND_PURPOSES[number];

export interface IPaymentOperation extends Document {
  action: PaymentOperationAction;
  orderId?: mongoose.Types.ObjectId;
  checkoutSessionId?: string;
  generation: number;
  idempotencyKey: string;
  status: PaymentOperationStatus;
  leaseOwner?: string;
  leaseExpiresAt?: Date;
  attempts: number;
  nextAttemptAt?: Date;
  paymentIntentId?: string;
  stripeObjectId?: string;
  /** Delivered-item refunds only: what the refund is for, the request it settles, and its immutable amount. */
  refundPurpose?: RefundPurpose;
  refundRequestId?: mongoose.Types.ObjectId;
  amountMinor?: number;
  currency?: string;
  completedAt?: Date;
  lastError?: { code: string; message: string; at: Date };
  createdAt: Date;
  updatedAt: Date;
}

const PaymentOperationSchema = new Schema<IPaymentOperation>({
  action: { type: String, enum: PAYMENT_OPERATION_ACTIONS, required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  checkoutSessionId: { type: String },
  generation: { type: Number, required: true, default: 1, min: 1 },
  idempotencyKey: { type: String, required: true, unique: true },
  status: { type: String, enum: PAYMENT_OPERATION_STATUSES, required: true, default: 'pending' },
  leaseOwner: { type: String },
  leaseExpiresAt: { type: Date },
  attempts: { type: Number, required: true, default: 0, min: 0 },
  nextAttemptAt: { type: Date },
  paymentIntentId: { type: String },
  stripeObjectId: { type: String },
  refundPurpose: { type: String, enum: REFUND_PURPOSES },
  refundRequestId: { type: Schema.Types.ObjectId, ref: 'RefundRequest' },
  amountMinor: { type: Number, min: 1 },
  currency: { type: String, lowercase: true },
  completedAt: { type: Date },
  lastError: {
    code: String,
    message: String,
    at: Date,
  },
}, { timestamps: true });

PaymentOperationSchema.index({ status: 1, nextAttemptAt: 1 });
PaymentOperationSchema.index({ orderId: 1, action: 1, generation: 1 });

export default mongoose.model<IPaymentOperation>('PaymentOperation', PaymentOperationSchema);
