import mongoose, { Schema, Document } from 'mongoose';

export type DiscountType = 'percentage' | 'fixed';

export interface ICoupon extends Document {
  code: string;
  sellerId: mongoose.Types.ObjectId;
  discountType: DiscountType;
  discountValue: number;      // % for percentage, absolute amount for fixed
  maxDiscount?: number;        // cap for percentage discounts
  minOrderAmount: number;
  expiresAt?: Date;
  usageLimit?: number;         // null = unlimited
  usedCount: number;
  isActive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    minOrderAmount: { type: Number, required: true, default: 0, min: 0 },
    expiresAt: { type: Date },
    usageLimit: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

CouponSchema.index({ sellerId: 1 });
CouponSchema.index({ code: 1 });

export default mongoose.model<ICoupon>('Coupon', CouponSchema);
