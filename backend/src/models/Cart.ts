import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
}

export interface ICartSeller {
  sellerId: mongoose.Types.ObjectId | null;
  items: ICartItem[];
}

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  sellers: ICartSeller[];
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
}, { _id: false });

const CartSellerSchema = new Schema<ICartSeller>({
  sellerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  items: [CartItemSchema],
}, { _id: false });

const CartSchema = new Schema<ICart>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  sellers: [CartSellerSchema],
}, { timestamps: true });

export default mongoose.model<ICart>('Cart', CartSchema);
