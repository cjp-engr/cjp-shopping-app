import type { Order, CheckoutData, OrderStatus } from '../types/order';
import type { Cart } from '../types/cart';
import { STORAGE_KEYS } from '../utils/constants';
import storageService from './storageService';
import { generateId, calculateEstimatedDelivery } from '../utils/helpers';

class OrderService {
  private getOrdersKey(userId: string): string {
    return `${STORAGE_KEYS.ORDERS_PREFIX}${userId}`;
  }

  async createOrder(checkoutData: CheckoutData, cart: Cart, userId: string): Promise<Order> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 700));

    const order: Order = {
      id: generateId('order'),
      userId,
      items: cart.items,
      shippingAddress: checkoutData.shippingAddress,
      paymentMethod: checkoutData.paymentMethod,
      subtotal: cart.subtotal,
      tax: cart.tax,
      shipping: cart.shipping,
      total: cart.total,
      status: 'pending',
      createdAt: new Date().toISOString(),
      estimatedDelivery: calculateEstimatedDelivery()
    };

    // Save order to localStorage
    const existingOrders = await this.getOrders(userId);
    const updatedOrders = [order, ...existingOrders];
    storageService.set(this.getOrdersKey(userId), updatedOrders);

    // Simulate processing after a delay
    setTimeout(() => {
      this.updateOrderStatus(order.id, userId, 'processing');
    }, 2000);

    return order;
  }

  async getOrders(userId: string): Promise<Order[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const orders = storageService.get<Order[]>(this.getOrdersKey(userId));
    return orders || [];
  }

  async getOrderById(orderId: string, userId: string): Promise<Order | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const orders = await this.getOrders(userId);
    return orders.find(o => o.id === orderId) || null;
  }

  async updateOrderStatus(orderId: string, userId: string, status: OrderStatus): Promise<Order> {
    const orders = await this.getOrders(userId);
    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      throw new Error('Order not found');
    }

    orders[orderIndex] = {
      ...orders[orderIndex],
      status
    };

    storageService.set(this.getOrdersKey(userId), orders);
    return orders[orderIndex];
  }

  async cancelOrder(orderId: string, userId: string): Promise<Order> {
    return this.updateOrderStatus(orderId, userId, 'cancelled');
  }

  getOrderSummary(userId: string): { totalOrders: number; totalSpent: number } {
    const orders = storageService.get<Order[]>(this.getOrdersKey(userId)) || [];
    const completedOrders = orders.filter(o => o.status !== 'cancelled');

    return {
      totalOrders: completedOrders.length,
      totalSpent: completedOrders.reduce((sum, order) => sum + order.total, 0)
    };
  }
}

export default new OrderService();
