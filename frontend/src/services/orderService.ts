import type { Order, CheckoutData, OrderStatus } from '../types/order';
import type { Cart, CartItem, SelectedVariant } from '../types/cart';
import type { Product } from '../types/product';
import type { CheckoutSession, CheckoutSessionCreateInput } from '../types/checkout';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { resolveSelectedDeliveryOption } from '../utils/orderUtils';
import { CheckoutApiError } from './checkoutApiError';

interface RawSeller {
  _id?: string;
  id?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
}

type RawSellerRef = string | RawSeller | null;

interface RawItemProduct {
  _id?: string;
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  image?: string;
  images?: string[];
  stock?: number;
  rating?: number;
  reviews?: number;
  tags?: string[];
  specifications?: Record<string, string>;
  createdAt?: string;
  sellerId?: RawSellerRef;
  seller?: RawSellerRef;
  createdBy?: RawSellerRef;
}

interface RawItem {
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

interface RawOrder extends Omit<Order, 'id' | 'items'> {
  _id?: string;
  id?: string;
  items: RawItem[];
  deliverySelections?: unknown;
}

interface PaymentMethodLike {
  id: string;
  card?: { brand?: string; last4?: string; exp_month?: number; exp_year?: number } | null;
}

interface CheckoutEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: { code?: string; message?: string; retryable?: boolean; details?: unknown };
}

/** Checkout endpoints answer with `{ data }` on success and `{ error: { code } }` on failure. */
async function readCheckoutResponse<T>(response: Response): Promise<T> {
  const body: CheckoutEnvelope<T> | null = await response.json().catch(() => null);
  if (!response.ok) {
    throw new CheckoutApiError(
      response.status,
      body?.error?.code ?? 'unknown_error',
      body?.error?.message ?? body?.message ?? 'Checkout request failed',
      body?.error?.retryable ?? false,
      body?.error?.details,
    );
  }
  if (!body?.data) {
    throw new CheckoutApiError(response.status, 'invalid_response', 'Unexpected checkout response', false);
  }
  return body.data;
}

class OrderService {
  /** Legacy card flow only (CHECKOUT_FLOW=legacy). Manual-capture checkout uses createCheckoutSession. */
  async createPaymentIntent(amountInCents: number): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const response = await fetch(API_ENDPOINTS.PAYMENT_INTENT, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amountInCents }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to initialise payment');
    }
    const json = await response.json();
    const data = json.data ?? json;
    return {
      clientSecret: data.clientSecret,
      paymentIntentId: data.paymentIntentId,
    };
  }

  /**
   * Creates the checkout session, or resumes it when the same Idempotency-Key and body
   * were already used (the server then answers 200 and `replayed` is true).
   */
  async createCheckoutSession(
    payload: CheckoutSessionCreateInput,
    idempotencyKey: string,
  ): Promise<{ session: CheckoutSession; replayed: boolean }> {
    const response = await fetch(API_ENDPOINTS.CHECKOUT_SESSIONS, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    });
    const session = await readCheckoutResponse<CheckoutSession>(response);
    return { session, replayed: response.status === 200 };
  }

  async getCheckoutSession(sessionId: string): Promise<CheckoutSession> {
    const response = await fetch(API_ENDPOINTS.CHECKOUT_SESSION(sessionId), {
      headers: getAuthHeaders(),
    });
    return readCheckoutResponse<CheckoutSession>(response);
  }

  /** Verifies every seller's payment hold and places the orders. Returns the session with its orders. */
  async confirmCheckoutSession(sessionId: string): Promise<CheckoutSession> {
    const response = await fetch(API_ENDPOINTS.CHECKOUT_SESSION_CONFIRM(sessionId), {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return readCheckoutResponse<CheckoutSession>(response);
  }

  async createOrder(checkoutData: CheckoutData, cart: Cart, couponCodes?: Record<string, string>, deliverySelections?: Record<string, string>): Promise<Order[]> {
    const items = cart.items.map(item => ({
      productId: item.product.id,
      variantId: item.selectedVariant?._id,
      selectedAttributes: item.selectedVariant?.attributes,
      quantity: item.quantity,
    }));

    const response = await fetch(API_ENDPOINTS.ORDERS, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        items,
        shippingAddress: checkoutData.shippingAddress,
        paymentMethod: checkoutData.paymentMethod,
        paymentIntentId: checkoutData.paymentIntentId,
        ...(couponCodes && Object.keys(couponCodes).length > 0 ? { couponCodes } : {}),
        ...(deliverySelections && Object.keys(deliverySelections).length > 0 ? { deliverySelections } : {}),
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create order');
    }

    const data: { orders?: RawOrder[]; order?: RawOrder } = await response.json();
    // Backend now returns { orders: [...] } — one per seller
    const raw: RawOrder[] = data.orders ?? (data.order ? [data.order] : []);
    return raw.map((o) => this.adaptOrder(o));
  }

  async getOrders(): Promise<Order[]> {
    const response = await fetch(API_ENDPOINTS.ORDERS, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }

    const data: { orders: RawOrder[] } = await response.json();
    return data.orders.map((order) => this.adaptOrder(order));
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const response = await fetch(API_ENDPOINTS.ORDER(orderId), {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        return null;
      }

      const data: { order: RawOrder } = await response.json();
      return this.adaptOrder(data.order);
    } catch {
      return null;
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, cancelReason?: string): Promise<Order> {
    const response = await fetch(API_ENDPOINTS.ORDER_STATUS(orderId), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, ...(cancelReason ? { cancelReason } : {}) })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update order status');
    }

    const data: { order: RawOrder } = await response.json();
    return this.adaptOrder(data.order);
  }

  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    return this.updateOrderStatus(orderId, 'cancelled', reason);
  }

  async confirmReceived(orderId: string): Promise<Order> {
    const response = await fetch(API_ENDPOINTS.ORDER_CONFIRM_RECEIVED(orderId), {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to confirm receipt');
    }
    const data: { order: RawOrder } = await response.json();
    return this.adaptOrder(data.order);
  }

  async getOrderSummaryAsync(): Promise<{ totalOrders: number; totalSpent: number }> {
    const orders = await this.getOrders();
    const completedOrders = orders.filter(o => o.status !== 'cancelled');

    return {
      totalOrders: completedOrders.length,
      totalSpent: completedOrders.reduce((sum, order) => sum + order.total, 0)
    };
  }

  async savePaymentMethod(
    paymentMethod: PaymentMethodLike,
    user: { firstName?: string; lastName?: string } | null,
    isDefault: boolean,
  ): Promise<void> {
    const cardData = paymentMethod.card;
    const response = await fetch(API_ENDPOINTS.PAYMENT_METHODS, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        type: 'credit-card',
        brand: cardData?.brand ?? '',
        last4: cardData?.last4 ?? '',
        cardHolder: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
        expiryMonth: cardData?.exp_month?.toString() ?? '',
        expiryYear: cardData?.exp_year?.toString() ?? '',
        setAsDefault: isDefault,
        stripePaymentMethodId: paymentMethod.id,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save payment method');
    }
  }

  // Helper method to adapt backend order format to frontend format
  private adaptOrder(order: RawOrder): Order {
    return {
      id: order._id || order.id || '',
      userId: order.userId,
      items: order.items.map((item): CartItem => {
        const itemProduct = typeof item.product === 'object' ? item.product : undefined;
        const rawSeller = itemProduct?.sellerId ?? itemProduct?.seller ?? itemProduct?.createdBy;
        const seller = rawSeller && typeof rawSeller === 'object' ? rawSeller : null;
        const sellerId: string | undefined = seller
          ? seller._id ?? seller.id
          : typeof rawSeller === 'string' ? rawSeller : undefined;
        let sellerName: string | undefined;
        if (seller) {
          const full = seller.fullName?.trim();
          if (full) {
            sellerName = full;
          } else {
            const combined = `${seller.firstName ?? ''} ${seller.lastName ?? ''}`.trim();
            if (combined) sellerName = combined;
          }
        }

        const variantId = item.variantId;
        const discountPercent: number =
          item.discountPercent ?? item.variantDiscount ?? 0;
        const rawAttrs = item.selectedAttributes;
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

        const product: Product = itemProduct?._id ? {
          id: itemProduct._id,
          name: item.productName || itemProduct.name || '',
          description: itemProduct.description || '',
          price: item.productPrice || itemProduct.price || 0,
          category: itemProduct.category || '',
          image: item.productImage || itemProduct.image || '',
          images: itemProduct.images,
          stock: itemProduct.stock || 0,
          rating: itemProduct.rating || 0,
          reviews: itemProduct.reviews || 0,
          tags: itemProduct.tags,
          discount: variantId ? undefined : discountPercent,
          specifications: itemProduct.specifications ?? undefined,
          createdAt: itemProduct.createdAt || new Date().toISOString(),
          sellerId,
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
        };

        return {
          product,
          quantity: item.quantity,
          sellerId,
          sellerName,
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
      placedAt: order.placedAt,
      acceptBy: order.acceptBy,
      authorizationExpiresAt: order.authorizationExpiresAt,
    };
  }
}

export default new OrderService();
