import mongoose, { Schema, Document } from 'mongoose';
import { IAddress } from './User.js';

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface ICartItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  productPrice: number;
  productImage: string;
  quantity: number;
}

export interface IPaymentMethod {
  type: 'credit-card' | 'debit-card' | 'paypal';
  last4?: string;
  cardHolder?: string;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  shippingAddress: IAddress;
  paymentMethod: IPaymentMethod;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  estimatedDelivery?: Date;
  shippedAt?: Date;
  refundRequestedAt?: Date;
  sellerMessages?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
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
    enum: ['credit-card', 'debit-card', 'paypal'],
    required: true
  },
  last4: String,
  cardHolder: String
});

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
  paymentMethod: {
    type: PaymentMethodSchema,
    required: true
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
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
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  estimatedDelivery: Date,
  shippedAt: Date,
  refundRequestedAt: Date
}, {
  timestamps: true
});

// Index for user order history
OrderSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IOrder>('Order', OrderSchema);
