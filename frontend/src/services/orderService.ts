import type { Order, CheckoutData, OrderStatus } from '../types/order';
import type { Cart } from '../types/cart';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

class OrderService {
  async createOrder(checkoutData: CheckoutData, cart: Cart, _userId: string): Promise<Order> {
    const items = cart.items.map(item => ({
      productId: item.product.id,
      quantity: item.quantity
    }));

    const response = await fetch(API_ENDPOINTS.ORDERS, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        items,
        shippingAddress: checkoutData.shippingAddress,
        paymentMethod: checkoutData.paymentMethod
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create order');
    }

    const data = await response.json();
    return this.adaptOrder(data.order);
  }

  async getOrders(_userId: string): Promise<Order[]> {
    const response = await fetch(API_ENDPOINTS.ORDERS, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }

    const data = await response.json();
    return data.orders.map((order: any) => this.adaptOrder(order));
  }

  async getOrderById(orderId: string, _userId: string): Promise<Order | null> {
    try {
      const response = await fetch(API_ENDPOINTS.ORDER(orderId), {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return this.adaptOrder(data.order);
    } catch (error) {
      return null;
    }
  }

  async updateOrderStatus(orderId: string, _userId: string, status: OrderStatus): Promise<Order> {
    const response = await fetch(API_ENDPOINTS.ORDER_STATUS(orderId), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update order status');
    }

    const data = await response.json();
    return this.adaptOrder(data.order);
  }

  async cancelOrder(orderId: string, userId: string): Promise<Order> {
    return this.updateOrderStatus(orderId, userId, 'cancelled');
  }

  getOrderSummary(_userId: string): { totalOrders: number; totalSpent: number } {
    // This will need to be implemented with async/await
    // For now, return defaults
    return {
      totalOrders: 0,
      totalSpent: 0
    };
  }

  async getOrderSummaryAsync(userId: string): Promise<{ totalOrders: number; totalSpent: number }> {
    const orders = await this.getOrders(userId);
    const completedOrders = orders.filter(o => o.status !== 'cancelled');

    return {
      totalOrders: completedOrders.length,
      totalSpent: completedOrders.reduce((sum, order) => sum + order.total, 0)
    };
  }

  // Helper method to adapt backend order format to frontend format
  private adaptOrder(order: any): Order {
    return {
      id: order._id || order.id,
      userId: order.userId,
      items: order.items.map((item: any) => ({
        product: item.product._id ? {
          id: item.product._id,
          name: item.productName || item.product.name,
          description: item.product.description || '',
          price: item.productPrice || item.product.price,
          category: item.product.category || '',
          image: item.productImage || item.product.image,
          images: item.product.images,
          stock: item.product.stock || 0,
          rating: item.product.rating || 0,
          reviews: item.product.reviews || 0,
          tags: item.product.tags,
          specifications: item.product.specifications ?? undefined,
          createdAt: item.product.createdAt || new Date().toISOString()
        } : {
          id: item.product.toString(),
          name: item.productName,
          description: '',
          price: item.productPrice,
          category: '',
          image: item.productImage,
          stock: 0,
          rating: 0,
          reviews: 0,
          createdAt: new Date().toISOString()
        },
        quantity: item.quantity
      })),
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
      estimatedDelivery: order.estimatedDelivery
    };
  }
}

export default new OrderService();
