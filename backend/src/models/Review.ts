import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    orderId:   { type: Schema.Types.ObjectId, ref: 'Order',   required: true },
    rating:    { type: Number, required: true, min: 1, max: 5 },
    comment:   { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// One review per user per product
ReviewSchema.index({ userId: 1, productId: 1 }, { unique: true });
ReviewSchema.index({ productId: 1, createdAt: -1 });

export default mongoose.model<IReview>('Review', ReviewSchema);
