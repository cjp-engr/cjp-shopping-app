import type { Product } from '../types/product';
import type { Order } from '../types/order';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
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
  tags: p.tags,
  specifications: p.specifications ?? undefined,
  createdAt: p.createdAt,
});

const adaptOrder = (order: any): Order & { buyer?: { firstName: string; lastName: string; email: string } } => ({
  id: order._id || order.id,
  userId: order.userId?._id || order.userId,
  buyer: order.userId?.firstName ? {
    firstName: order.userId.firstName,
    lastName: order.userId.lastName,
    email: order.userId.email,
  } : undefined,
  items: order.items.map((item: any) => ({
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
      createdAt: new Date().toISOString(),
    },
    quantity: item.quantity,
  })),
  shippingAddress: order.shippingAddress,
  paymentMethod: order.paymentMethod,
  subtotal: order.subtotal,
  tax: order.tax,
  shipping: order.shipping,
  total: order.total,
  status: order.status,
  createdAt: order.createdAt,
  estimatedDelivery: order.estimatedDelivery,
});

// Auth headers without Content-Type (browser sets it for multipart)
const getAuthHeadersNoContentType = () => {
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

  async updateOrderStatus(orderId: string, status: 'processing' | 'shipped' | 'delivered' | 'cancelled'): Promise<void> {
    const res = await fetch(API_ENDPOINTS.SELLER_ORDER_STATUS(orderId), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Failed to update status'); }
  }
}

export default new SellerService();
