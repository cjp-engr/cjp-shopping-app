import type { Product } from '../types/product';
import type { Order } from '../types/order';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { resolveSelectedDeliveryOption } from '../utils/orderUtils';

function parseTags(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    if (raw.length === 1 && typeof raw[0] === 'string' && raw[0].startsWith('[')) {
      try { const p = JSON.parse(raw[0]); if (Array.isArray(p)) return p.map(String); } catch {}
    }
    return raw.map(String);
  }
  if (typeof raw === 'string' && raw.startsWith('[')) {
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.map(String); } catch {}
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

const adaptProduct = (p: any): Product => ({
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
    ? p.variants.map((v: any) => ({
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

const adaptOrder = (order: any): Order & { buyer?: { id: string; firstName: string; lastName: string; email: string } } => ({
  id: order._id || order.id,
  userId: order.userId?._id || order.userId,
  buyer: order.userId?.firstName ? {
    id: order.userId._id || order.userId.id || '',
    firstName: order.userId.firstName,
    lastName: order.userId.lastName,
    email: order.userId.email,
  } : undefined,
  items: order.items.map((item: any) => {
    const variantId: string | undefined = item.variantId;
    const discountPercent: number =
      item.discountPercent ?? item.variantDiscount ?? 0;
    const rawAttrs = item.selectedAttributes;
    let selectedVariant: import('../types/cart').SelectedVariant | undefined;
    if (variantId && rawAttrs && typeof rawAttrs === 'object') {
      const attributes: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawAttrs)) {
        attributes[k] = String(v);
      }
      const variantPrice: number = item.productPrice ?? item.product?.price ?? 0;
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
      product: item.product?._id ? {
        id: item.product._id,
        name: item.productName || item.product.name,
        description: item.product.description || '',
        price: item.productPrice || item.product.price,
        category: item.product.category || '',
        image: item.productImage || item.product.image,
        stock: item.product.stock ?? 0,
        rating: item.product.rating ?? 0,
        reviews: item.product.reviews ?? 0,
        discount: variantId ? undefined : discountPercent,
        createdAt: item.product.createdAt || new Date().toISOString(),
      } : {
        id: item.product?.toString() || '',
        name: item.productName,
        description: '',
        price: item.productPrice,
        category: '',
        image: item.productImage,
        stock: 0,
        rating: 0,
        reviews: 0,
        discount: variantId ? undefined : discountPercent,
        createdAt: new Date().toISOString(),
      },
      quantity: item.quantity,
      selectedVariant,
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
  createdAt: order.createdAt,
  estimatedDelivery: order.estimatedDelivery,
  selectedDeliveryOption: resolveSelectedDeliveryOption(order),
});

// Auth headers without Content-Type (browser sets it for multipart)
const getAuthHeadersNoContentType = (): Record<string, string> => {
  const token = localStorage.getItem('shopping_app_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

class SellerService {
  async getProducts(): Promise<Product[]> {
    const res = await fetch(API_ENDPOINTS.SELLER_PRODUCTS, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch products');
    const data = await res.json();
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
    const data = await res.json();
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
    const data = await res.json();
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

  async getOrders(): Promise<ReturnType<typeof adaptOrder>[]> {
    const res = await fetch(API_ENDPOINTS.SELLER_ORDERS, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch orders');
    const data = await res.json();
    return data.orders.map(adaptOrder);
  }

  async updateOrderStatus(orderId: string, status: 'preparing' | 'processing' | 'shipped' | 'delivered' | 'cancelled', cancelReason?: string): Promise<void> {
    const res = await fetch(API_ENDPOINTS.SELLER_ORDER_STATUS(orderId), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, ...(cancelReason ? { cancelReason } : {}) }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Failed to update status'); }
  }
}

export default new SellerService();
