import mongoose, { Schema, Document } from 'mongoose';

export interface IVariantAttribute {
  name: string;
  values: string[];
}

export interface IProductVariant {
  attributes: Map<string, string>;
  price: number;
  stock: number;
  sku?: string;
  images: string[];
  discount?: number;
}

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  images?: string[];
  stock: number;
  rating: number;
  reviews: number;
  soldCount: number;
  tags?: string[];
  specifications?: Map<string, string>;
  sellerId?: mongoose.Types.ObjectId;
  brand?: string;
  condition?: 'new' | 'used';
  sku?: string;
  discount?: number;
  shippingOptions?: string[];
  shippingFee?: string;
  shippingFeeAmounts?: Record<string, number>;
  variantAttributes?: IVariantAttribute[];
  variants?: IProductVariant[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, maxlength: 200 },
  price: { type: Number, required: true, min: 0 },
  category: {
    type: String,
    required: true,
    enum: ['Electronics', 'Clothing', 'Home & Garden', 'Books', 'Sports & Outdoors']
  },
  image: { type: String, default: '' },
  images: [{ type: String }],
  stock: { type: Number, required: true, min: 0, default: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviews: { type: Number, default: 0, min: 0 },
  soldCount: { type: Number, default: 0, min: 0 },
  tags: [{ type: String }],
  specifications: { type: Map, of: String },
  sellerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  brand: { type: String, trim: true },
  condition: { type: String, enum: ['new', 'used'], default: 'new' },
  sku: { type: String, trim: true },
  discount: { type: Number, min: 0, max: 100 },
  shippingOptions: [{ type: String }],
  shippingFee: { type: String, enum: ['free', 'buyer_pays'] },
  shippingFeeAmounts: { type: Map, of: Number, default: {} },
  variantAttributes: [{
    name: { type: String, required: true, trim: true },
    values: [{ type: String, trim: true }],
  }],
  variants: [{
    attributes: { type: Map, of: String, default: {} },
    price: { type: Number, min: 0, default: 0 },
    stock: { type: Number, min: 0, default: 0 },
    sku: { type: String, trim: true },
    images: { type: [String], default: [] },
    discount: { type: Number, min: 0, max: 100 },
  }],
}, { timestamps: true });

ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ category: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ rating: -1 });

export default mongoose.model<IProduct>('Product', ProductSchema);
