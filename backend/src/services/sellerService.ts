import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { AppError } from '../middleware/errorHandler.js';

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:    ['preparing', 'cancelled'],
  preparing:  ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped:    ['delivered', 'cancelled'],
  delivered:  [],
  cancelled:  [],
};

export async function getSellerProducts(sellerId: string) {
  return Product.find({ sellerId }).sort({ createdAt: -1 });
}

export async function createSellerProduct(
  sellerId: string,
  data: { name: string; description: string; price: number; category: string; stock?: number; tags?: string[]; brand?: string; condition?: string; sku?: string; discount?: number; shippingOption?: string; shippingFee?: string; image?: string },
  imageUrls: string[],
) {
  return Product.create({
    ...data,
    image: imageUrls[0] ?? data.image ?? '',
    images: imageUrls,
    sellerId,
  });
}

export async function updateSellerProduct(
  productId: string,
  sellerId: string,
  updates: { name?: string; description?: string; price?: number; category?: string; stock?: number; tags?: string[]; brand?: string; condition?: string; sku?: string; discount?: number; shippingOption?: string; shippingFee?: string; image?: string },
  imageUrls?: string[],
) {
  const product = await Product.findById(productId);
  if (!product) throw new AppError(404, 'Product not found');
  if (product.sellerId?.toString() !== sellerId) throw new AppError(403, 'Not authorized to update this product');

  const { image: imageUrl, ...rest } = updates;
  Object.assign(product, rest);
  if (imageUrls && imageUrls.length > 0) {
    product.image = imageUrls[0];
    product.images = imageUrls;
  } else if (imageUrl !== undefined) {
    product.image = imageUrl;
  }

  return product.save();
}

export async function deleteSellerProduct(productId: string, sellerId: string) {
  const product = await Product.findById(productId);
  if (!product) throw new AppError(404, 'Product not found');
  if (product.sellerId?.toString() !== sellerId) throw new AppError(403, 'Not authorized to delete this product');
  await product.deleteOne();
}

export async function getSellerOrders(sellerId: string) {
  const sellerProductIds = await Product.find({ sellerId }).distinct('_id');

  const orders = await Order.find({ 'items.product': { $in: sellerProductIds } })
    .populate('items.product')
    .populate('userId', 'firstName lastName email')
    .sort({ createdAt: -1 });

  // Filter each order's items to only this seller's products.
  // After populate, item.product is a Document — extract _id to compare.
  const sellerIdSet = new Set(sellerProductIds.map(id => id.toString()));
  return orders.map(order => {
    const filteredItems = order.items.filter(item => {
      const productId =
        item.product != null && typeof item.product === 'object' && '_id' in (item.product as object)
          ? (item.product as any)._id?.toString()
          : item.product?.toString();
      return productId ? sellerIdSet.has(productId) : false;
    });
    return { ...order.toObject(), items: filteredItems };
  });
}

export async function updateSellerOrderStatus(
  orderId: string,
  sellerId: string,
  status: string,
  cancelReason?: string,
) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError(404, 'Order not found');

  const sellerProductIds = await Product.find({ sellerId }).distinct('_id');
  const sellerIdSet = new Set(sellerProductIds.map(id => id.toString()));

  const hasSellersProduct = order.items.some(item => {
    const productId =
      item.product != null && typeof item.product === 'object' && '_id' in (item.product as object)
        ? (item.product as any)._id?.toString()
        : item.product?.toString();
    return productId ? sellerIdSet.has(productId) : false;
  });
  if (!hasSellersProduct) throw new AppError(403, 'Not authorized to update this order');

  const allowed = VALID_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(status)) {
    throw new AppError(400, `Cannot transition order from '${order.status}' to '${status}'`);
  }

  if (status === 'cancelled') {
    // Restore stock in parallel
    await Promise.all(
      order.items.map(item =>
        Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } }),
      ),
    );
    if (cancelReason) order.cancelReason = cancelReason;
  }

  if (status === 'shipped' && !order.shippedAt) {
    order.shippedAt = new Date();
  }

  order.status = status;
  await order.save();
  return order;
}
