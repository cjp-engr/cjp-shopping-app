import mongoose, { Schema, Document } from 'mongoose';

export const STRIPE_EVENT_STATUSES = ['received', 'processing', 'processed', 'failed'] as const;
export type StripeEventStatus = typeof STRIPE_EVENT_STATUSES[number];

export interface IStripeEventInbox extends Document {
  eventId: string;
  type: string;
  status: StripeEventStatus;
  attempts: number;
  receivedAt: Date;
  processedAt?: Date;
  eventObject?: Record<string, unknown>;
  leaseOwner?: string;
  leaseExpiresAt?: Date;
  nextAttemptAt?: Date;
  lastError?: { code: string; message: string; at: Date };
}

const StripeEventInboxSchema = new Schema<IStripeEventInbox>({
  eventId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  status: { type: String, enum: STRIPE_EVENT_STATUSES, required: true, default: 'received' },
  attempts: { type: Number, required: true, default: 0, min: 0 },
  receivedAt: { type: Date, required: true, default: () => new Date() },
  processedAt: { type: Date },
  eventObject: { type: Schema.Types.Mixed },
  leaseOwner: String,
  leaseExpiresAt: Date,
  nextAttemptAt: Date,
  lastError: {
    code: String,
    message: String,
    at: Date,
  },
});

StripeEventInboxSchema.index({ status: 1, receivedAt: 1 });

export default mongoose.model<IStripeEventInbox>('StripeEventInbox', StripeEventInboxSchema);
