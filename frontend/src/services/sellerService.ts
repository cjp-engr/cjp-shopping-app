import type { Product } from '../types/product';
import type { Order, SellerPaymentOperation } from '../types/order';
import type { SelectedVariant } from '../types/cart';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { resolveSelectedDeliveryOption } from '../utils/orderUtils';

function parseTags(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    if (raw.length === 1 && typeof raw[0] === 'string' && raw[0].startsWith('[')) {
      try { const p = JSON.parse(raw[0]); if (Array.isArray(p)) return p.map(String); } catch { /* not JSON; fall back to raw values */ }
    }
    return raw.map(String);
  }
  if (typeof raw === 'string' && raw.startsWith('[')) {
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.map(String); } catch { /* not JSON; no tags */ }
  }
  return [];
}

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  brand?: string;
  condition?: 'new' | 'used';
  sku?: string;
  discount?: number;
  tags?: string[];
  shippingOptions?: Array<'standard' | 'express' | 'pickup'>;
  shippingFee?: 'free' | 'buyer_pays';
  shippingFeeAmounts?: Record<string, number>;
  variantAttributes?: Array<{ name: string; values: string[] }>;
  variants?: Array<{
    attributes: Record<string, string>;
    price: number;
    stock: number;
    sku?: string;
    images?: string[];
    discount?: number;
  }>;
}

interface RawVariant {
  _id?: string;
  attributes?: Map<string, string> | Record<string, string>;
  price?: number;
  stock?: number;
  sku?: string;
  images?: string[];
  image?: string;
  discount?: number;
}

interface RawProduct extends Omit<Product, 'id' | 'sellerId' | 'variants' | 'tags'> {
  _id: string;
  variants?: RawVariant[];
  tags?: unknown;
}

interface RawUser {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface RawItemProduct {
  _id?: string;
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  image?: string;
  stock?: number;
  rating?: number;
  reviews?: number;
  createdAt?: string;
}

interface RawItem {
  _id?: string;
  product?: RawItemProduct | string;
  productName?: string;
  productImage?: string;
  productPrice?: number;
  variantId?: string;
  variantSku?: string;
  variantDiscount?: number;
  discountPercent?: number;
  selectedAttributes?: Record<string, unknown>;
  quantity: number;
}

interface RawOrder extends Omit<Order, 'id' | 'userId' | 'items'> {
  paymentError?: { code?: string };
  _id?: string;
  id?: string;
  userId?: string | RawUser;
  items: RawItem[];
  deliverySelections?: unknown;
}

const adaptProduct = (p: RawProduct): Product => ({
  id: p._id,
  name: p.name,
  description: p.description,
  price: p.price,
  category: p.category,
  image: p.image,
  images: p.images,
  stock: p.stock,
  rating: p.rating ?? 0,
  reviews: p.reviews ?? 0,
  tags: parseTags(p.tags),
  specifications: p.specifications ?? undefined,
  createdAt: p.createdAt,
  brand: p.brand,
  condition: p.condition,
  sku: p.sku,
  discount: p.discount,
  shippingOptions: p.shippingOptions,
  shippingFee: p.shippingFee,
  shippingFeeAmounts: p.shippingFeeAmounts,
  variantAttributes: p.variantAttributes,
  variants: Array.isArray(p.variants)
    ? p.variants.map((v) => ({
        _id: v._id?.toString(),
        attributes: v.attributes instanceof Map
          ? Object.fromEntries(v.attributes)
          : (v.attributes && typeof v.attributes === 'object' ? { ...v.attributes } : {}),
        price: v.price ?? 0,
        stock: v.stock ?? 0,
        sku: v.sku,
        images: Array.isArray(v.images) ? v.images : (v.image ? [v.image] : []),
        discount: v.discount,
      }))
    : undefined,
});

type AdaptedOrder = Order & { buyer?: { id: string; firstName: string; lastName: string; email: string } };

const adaptOrder = (order: RawOrder): AdaptedOrder => {
  const buyer = typeof order.userId === 'object' ? order.userId : undefined;
  return {
    id: order._id || order.id || '',
    userId: buyer?._id || (typeof order.userId === 'string' ? order.userId : ''),
    buyer: buyer?.firstName ? {
      id: buyer._id || buyer.id || '',
      firstName: buyer.firstName,
      lastName: buyer.lastName ?? '',
      email: buyer.email ?? '',
    } : undefined,
    items: order.items.map((item) => {
      const variantId = item.variantId;
      const discountPercent: number = item.discountPercent ?? item.variantDiscount ?? 0;
      const rawAttrs = item.selectedAttributes;
      const itemProduct = typeof item.product === 'object' ? item.product : undefined;
      let selectedVariant: SelectedVariant | undefined;
      if (variantId && rawAttrs && typeof rawAttrs === 'object') {
        const attributes: Record<string, string> = {};
        for (const [k, v] of Object.entries(rawAttrs)) {
          attributes[k] = String(v);
        }
        const variantPrice: number = item.productPrice ?? itemProduct?.price ?? 0;
        selectedVariant = {
          _id: variantId,
          attributes,
          price: variantPrice,
          stock: 0,
          sku: item.variantSku,
          discount: discountPercent,
          key: Object.entries(attributes).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join('|'),
        };
      }

      return {
        product: itemProduct?._id ? {
          id: itemProduct._id,
          name: item.productName || itemProduct.name || '',
          description: itemProduct.description || '',
          price: item.productPrice || itemProduct.price || 0,
          category: itemProduct.category || '',
          image: item.productImage || itemProduct.image || '',
          stock: itemProduct.stock ?? 0,
          rating: itemProduct.rating ?? 0,
          reviews: itemProduct.reviews ?? 0,
          discount: variantId ? undefined : discountPercent,
          createdAt: itemProduct.createdAt || new Date().toISOString(),
        } : {
          id: typeof item.product === 'string' ? item.product : '',
          name: item.productName || '',
          description: '',
          price: item.productPrice || 0,
          category: '',
          image: item.productImage || '',
          stock: 0,
          rating: 0,
          reviews: 0,
          discount: variantId ? undefined : discountPercent,
          createdAt: new Date().toISOString(),
        },
        lineId: item._id,
        quantity: item.quantity,
        selectedVariant,
        isSelected: false,
      };
    }),
    shippingAddress: order.shippingAddress,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal,
    productDiscount: order.productDiscount ?? 0,
    discount: order.discount ?? 0,
    tax: order.tax,
    shipping: order.shipping,
    total: order.total,
    status: order.status,
    cancelReason: order.cancelReason,
    createdAt: order.createdAt,
    estimatedDelivery: order.estimatedDelivery,
    selectedDeliveryOption: resolveSelectedDeliveryOption(order),
    paymentFlowVersion: order.paymentFlowVersion,
    paymentStatus: order.paymentStatus,
    paymentErrorCode: order.paymentError?.code,
    placedAt: order.placedAt,
    acceptBy: order.acceptBy,
    authorizationExpiresAt: order.authorizationExpiresAt,
    cancelledByRole: order.cancelledByRole,
    cancelledAt: order.cancelledAt,
    deliveredAt: order.deliveredAt,
    refundRequestDeadlineAt: order.refundRequestDeadlineAt,
    refundedItems: order.refundedItems,
    refundedAmountMinor: order.refundedAmountMinor,
    refundReservedAmountMinor: order.refundReservedAmountMinor,
    currency: order.currency,
    canSellerCancelPending: order.canSellerCancelPending,
  };
};

// Auth headers without Content-Type (browser sets it for multipart)
const getAuthHeadersNoContentType = (): Record<string, string> => {
  const token = localStorage.getItem('shopping_app_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** A failed seller order request. `code` is the backend's machine-readable reason (for example `capture_failed`). */
export class SellerOrderError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'SellerOrderError';
    this.code = code;
  }
}

class SellerService {
  async getProducts(): Promise<Product[]> {
    const res = await fetch(API_ENDPOINTS.SELLER_PRODUCTS, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch products');
    const data: { products: RawProduct[] } = await res.json();
    return data.products.map(adaptProduct);
  }

  async createProduct(form: ProductFormData, imageFiles?: File[]): Promise<Product> {
    let body: FormData | string;
    let headers: Record<string, string>;

    if (imageFiles && imageFiles.length > 0) {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('price', String(form.price));
      fd.append('category', form.category);
      fd.append('stock', String(form.stock));
      if (form.brand)         fd.append('brand', form.brand);
      if (form.condition)     fd.append('condition', form.condition);
      if (form.sku)           fd.append('sku', form.sku);
      if (form.discount != null) fd.append('discount', String(form.discount));
      form.tags?.forEach(t => fd.append('tags', t));
      if (form.shippingOptions?.length) fd.append('shippingOptions', JSON.stringify(form.shippingOptions));
      if (form.shippingFee)        fd.append('shippingFee', form.shippingFee);
      if (form.shippingFeeAmounts && Object.keys(form.shippingFeeAmounts).length > 0) fd.append('shippingFeeAmounts', JSON.stringify(form.shippingFeeAmounts));
      if (form.variantAttributes?.length) fd.append('variantAttributes', JSON.stringify(form.variantAttributes));
      if (form.variants?.length) fd.append('variants', JSON.stringify(form.variants));
      imageFiles.forEach(f => fd.append('images', f));
      body = fd;
      headers = getAuthHeadersNoContentType();
    } else {
      body = JSON.stringify(form);
      headers = getAuthHeaders();
    }

    const res = await fetch(API_ENDPOINTS.SELLER_PRODUCTS, {
      method: 'POST',
      headers,
      body,
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Failed to create product'); }
    const data: { product: RawProduct } = await res.json();
    return adaptProduct(data.product);
  }

  async updateProduct(id: string, form: Partial<ProductFormData>, imageFiles?: File[]): Promise<Product> {
    let body: FormData | string;
    let headers: Record<string, string>;

    if (imageFiles && imageFiles.length > 0) {
      const fd = new FormData();
      if (form.name)        fd.append('name', form.name);
      if (form.description) fd.append('description', form.description);
      if (form.price !== undefined) fd.append('price', String(form.price));
      if (form.category)    fd.append('category', form.category);
      if (form.stock !== undefined) fd.append('stock', String(form.stock));
      if (form.brand)         fd.append('brand', form.brand);
      if (form.condition)     fd.append('condition', form.condition);
      if (form.sku)           fd.append('sku', form.sku);
      if (form.discount != null) fd.append('discount', String(form.discount));
      form.tags?.forEach(t => fd.append('tags', t));
      if (form.shippingOptions?.length) fd.append('shippingOptions', JSON.stringify(form.shippingOptions));
      if (form.shippingFee)        fd.append('shippingFee', form.shippingFee);
      if (form.shippingFeeAmounts && Object.keys(form.shippingFeeAmounts).length > 0) fd.append('shippingFeeAmounts', JSON.stringify(form.shippingFeeAmounts));
      if (form.variantAttributes?.length) fd.append('variantAttributes', JSON.stringify(form.variantAttributes));
      if (form.variants?.length) fd.append('variants', JSON.stringify(form.variants));
      imageFiles.forEach(f => fd.append('images', f));
      body = fd;
      headers = getAuthHeadersNoContentType();
    } else {
      body = JSON.stringify(form);
      headers = getAuthHeaders();
    }

    const res = await fetch(API_ENDPOINTS.SELLER_PRODUCT(id), {
      method: 'PUT',
      headers,
      body,
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Failed to update product'); }
    const data: { product: RawProduct } = await res.json();
    return adaptProduct(data.product);
  }

  async uploadVariantImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(API_ENDPOINTS.VARIANT_IMAGE_UPLOAD, {
      method: 'POST',
      headers: getAuthHeadersNoContentType(),
      body: fd,
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Upload failed'); }
    const data = await res.json();
    return data.url as string;
  }

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(API_ENDPOINTS.SELLER_PRODUCT(id), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Failed to delete product'); }
  }

  async getOrders(): Promise<AdaptedOrder[]> {
    const res = await fetch(API_ENDPOINTS.SELLER_ORDERS, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch orders');
    const data: { orders: RawOrder[] } = await res.json();
    return data.orders.map(adaptOrder);
  }

  /** HTTP 202 means the payment capture is still resolving; the order is not preparing yet. */
  async updateOrderStatus(orderId: string, status: 'preparing' | 'processing' | 'shipped' | 'delivered' | 'cancelled', cancelReason?: string): Promise<{ outcome: 'completed' | 'resolving'; paymentOperation?: SellerPaymentOperation }> {
    const reason = cancelReason?.trim();
    const res = await fetch(API_ENDPOINTS.SELLER_ORDER_STATUS(orderId), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, ...(reason ? { cancelReason: reason } : {}) }),
    });
    if (!res.ok) {
      const e: { message?: string; code?: string } = await res.json().catch(() => ({}));
      throw new SellerOrderError(e.message || 'Failed to update status', e.code);
    }
    if (res.status === 202) return { outcome: 'resolving' };
    // A cancelled card order says where the hold release stands; other responses carry no payment outcome.
    const body: { paymentOperation?: SellerPaymentOperation } = await res.json().catch(() => ({}));
    return { outcome: 'completed', ...(body.paymentOperation ? { paymentOperation: body.paymentOperation } : {}) };
  }
}

export default new SellerService();
