import Product from '../models/Product.js';
import Order, { OrderStatus, type IOrder } from '../models/Order.js';
import { AppError } from '../middleware/errorHandler.js';
import { isSellerVisibleOrder, sellerVisibleOrderFilter } from './orderVisibility.js';
import { acceptOrder } from './orderAcceptance.js';

export const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:    ['preparing', 'cancelled'],
  preparing:  ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped:    ['delivered'],
  delivered:  [],
  cancelled:  [],
};

function inferDeliveryFromShipping(
  shipping: number,
  shippingFee: string | undefined,
  shippingFeeAmounts: Record<string, number>,
): string | undefined {
  if (shippingFee !== 'buyer_pays' || shipping <= 0) return undefined;
  const match = Object.entries(shippingFeeAmounts).find(
    ([, fee]) => Math.abs(Number(fee) - shipping) < 0.01,
  );
  return match?.[0];
}

function resolveStoredDeliveryOption(
  doc: {
    selectedDeliveryOption?: string;
    deliverySelections?: Record<string, string>;
    shipping?: number;
  },
  product: { shippingFee?: string; shippingFeeAmounts?: Record<string, number> } | undefined,
): string | undefined {
  const mapValues = doc.deliverySelections
    ? Object.values(doc.deliverySelections).filter(v => typeof v === 'string' && v.length > 0)
    : [];
  if (mapValues.length > 0) return mapValues[0];

  const feeAmounts = product?.shippingFeeAmounts ?? {};
  const inferred = inferDeliveryFromShipping(Number(doc.shipping ?? 0), product?.shippingFee, feeAmounts);
  if (inferred) return inferred;

  return doc.selectedDeliveryOption;
}

export async function getSellerProducts(sellerId: string) {
  return Product.find({ sellerId }).sort({ createdAt: -1 });
}

export async function createSellerProduct(
  sellerId: string,
  data: { name: string; description: string; price: number; category: string; stock?: number; tags?: string[]; brand?: string; condition?: string; sku?: string; discount?: number; shippingOptions?: string[]; shippingFee?: string; shippingFeeAmounts?: Record<string, number>; image?: string; variantAttributes?: any[]; variants?: any[] },
  imageUrls: string[],
) {
  const normalizedVariants = (data.variants ?? []).map((v: any) => ({
    ...v,
    images: Array.isArray(v.images) ? v.images : (v.image ? [v.image] : []),
  }));
  return Product.create({
    ...data,
    variants: normalizedVariants,
    image: imageUrls[0] ?? data.image ?? '',
    images: imageUrls,
    sellerId,
  });
}

export async function updateSellerProduct(
  productId: string,
  sellerId: string,
  updates: { name?: string; description?: string; price?: number; category?: string; stock?: number; tags?: string[]; brand?: string; condition?: string; sku?: string; discount?: number; shippingOptions?: string[]; shippingFee?: string; shippingFeeAmounts?: Record<string, number>; image?: string; variantAttributes?: any[]; variants?: any[] },
  imageUrls?: string[],
) {
  const product = await Product.findById(productId);
  if (!product) throw new AppError(404, 'Product not found');
  if (product.sellerId?.toString() !== sellerId) throw new AppError(403, 'Not authorized to update this product');

  const { image: imageUrl, variants: rawVariants, ...rest } = updates;
  const defined = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
  if (rawVariants !== undefined) {
    defined.variants = rawVariants.map((v: any) => ({
      ...v,
      images: Array.isArray(v.images) ? v.images : (v.image ? [v.image] : []),
    }));
  }
  Object.assign(product, defined);
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

  const orders = await Order.find({ 'items.product': { $in: sellerProductIds }, ...sellerVisibleOrderFilter() })
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
    const doc = order.toObject({ flattenMaps: true }) as unknown as Record<string, unknown> & {
      deliverySelections?: Record<string, string>;
      selectedDeliveryOption?: string;
      shipping?: number;
    };
    const firstProduct = filteredItems[0]?.product as
      | { shippingFee?: string; shippingFeeAmounts?: Record<string, number> }
      | undefined;
    const feeAmounts = firstProduct?.shippingFeeAmounts ?? {};
    if (firstProduct?.shippingFeeAmounts && typeof (firstProduct.shippingFeeAmounts as any).toJSON === 'function') {
      Object.assign(feeAmounts, (firstProduct.shippingFeeAmounts as any).toJSON());
    }
    doc.selectedDeliveryOption = resolveStoredDeliveryOption(
      {
        selectedDeliveryOption: doc.selectedDeliveryOption,
        deliverySelections: doc.deliverySelections,
        shipping: doc.shipping,
      },
      firstProduct ? { shippingFee: firstProduct.shippingFee, shippingFeeAmounts: feeAmounts } : undefined,
    );
    return { ...doc, items: filteredItems };
  });
}

/** `resolving` means the seller's acceptance started a capture that is still settling; the order is not yet `preparing`. */
export type SellerStatusOutcome = 'completed' | 'resolving';

export async function updateSellerOrderStatus(
  orderId: string,
  sellerId: string,
  status: OrderStatus,
  cancelReason?: string,
): Promise<{ order: IOrder; outcome: SellerStatusOutcome }> {
  const order = await Order.findById(orderId);
  if (!order || !isSellerVisibleOrder(order)) throw new AppError(404, 'Order not found', 'order_not_found');

  // Acceptance owns the seller-ownership check, the deadline and any card capture.
  if (status === 'preparing' && order.status === 'pending') {
    const accepted = await acceptOrder({ orderId, sellerId });
    return { order: accepted.order, outcome: accepted.kind };
  }

  const sellerProductIds = await Product.find({ sellerId }).distinct('_id');
  const sellerIdSet = new Set(sellerProductIds.map(id => id.toString()));

  const hasSellersProduct = order.items.some(item => {
    const productId =
      item.product != null && typeof item.product === 'object' && '_id' in (item.product as object)
        ? (item.product as any)._id?.toString()
        : item.product?.toString();
    return productId ? sellerIdSet.has(productId) : false;
  });
  if (!hasSellersProduct) throw new AppError(403, 'Not authorized to update this order', 'not_order_seller');

  const allowed = VALID_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(status)) {
    throw new AppError(400, `Cannot transition order from '${order.status}' to '${status}'`);
  }

  // Cancelling would restore stock but leave the card authorization open; the release path lands in phase 4.
  if (status === 'cancelled' && order.paymentFlowVersion === 'manual_capture') {
    throw new AppError(409, 'Manual-capture orders cannot be cancelled yet', 'cancellation_unavailable');
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
  return { order, outcome: 'completed' };
}
