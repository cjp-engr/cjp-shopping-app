import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Order, OrderStatus } from '../types/order';
import orderService from '../services/orderService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Spinner } from '../components/common/Spinner';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  MapPin,
  CreditCard,
  ArrowLeft,
} from 'lucide-react';

type TabKey = 'all' | 'pending' | 'to-ship' | 'to-receive' | 'complete' | 'cancelled';

const TABS: { key: TabKey; label: string; statuses: OrderStatus[] }[] = [
  { key: 'all',        label: 'All',        statuses: [] },
  { key: 'pending',    label: 'Pending',    statuses: ['pending'] },
  { key: 'to-ship',    label: 'To Ship',    statuses: ['processing'] },
  { key: 'to-receive', label: 'To Receive', statuses: ['shipped'] },
  { key: 'complete',   label: 'Complete',   statuses: ['delivered'] },
  { key: 'cancelled',  label: 'Cancelled',  statuses: ['cancelled'] },
];

export const OrderHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const userOrders = await orderService.getOrders(user.id);
        setOrders(userOrders);

        // Check for success parameter in URL
        const successId = searchParams.get('success');
        if (successId) {
          setSuccessOrderId(successId);
          setExpandedOrders(new Set([successId]));
          setTimeout(() => setSuccessOrderId(null), 5000);
        }
      } catch (error) {
        console.error('Failed to load orders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [user, searchParams]);

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!user) return;

    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        await orderService.cancelOrder(orderId, user.id);
        const updatedOrders = await orderService.getOrders(user.id);
        setOrders(updatedOrders);
      } catch (error) {
        console.error('Failed to cancel order:', error);
      }
    }
  };

  const filteredOrders = activeTab === 'all'
    ? orders
    : orders.filter(o => TABS.find(t => t.key === activeTab)!.statuses.includes(o.status));

  const tabCount = (tab: typeof TABS[number]) =>
    tab.key === 'all' ? orders.length : orders.filter(o => tab.statuses.includes(o.status)).length;

  const getStatusConfig = (
    status: OrderStatus
  ): { icon: React.ElementType; variant: 'primary' | 'success' | 'warning' | 'danger' | 'gray'; label: string } => {
    switch (status) {
      case 'pending':
        return { icon: Clock, variant: 'warning', label: 'Pending' };
      case 'processing':
        return { icon: Package, variant: 'primary', label: 'Processing' };
      case 'shipped':
        return { icon: Truck, variant: 'primary', label: 'Shipped' };
      case 'delivered':
        return { icon: CheckCircle, variant: 'success', label: 'Delivered' };
      case 'cancelled':
        return { icon: XCircle, variant: 'danger', label: 'Cancelled' };
      default:
        return { icon: Package, variant: 'gray', label: status };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-600 mt-1">
            View and manage your orders
          </p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center text-primary-600 hover:text-primary-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </button>
      </div>

      {/* Success Message */}
      {successOrderId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-800">Order Placed Successfully!</h3>
            <p className="text-sm text-green-700 mt-1">
              Your order has been received and is being processed. Order ID: {successOrderId}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const count = tabCount(tab);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span
                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Package className="w-24 h-24 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {activeTab === 'all' ? 'No Orders Yet' : `No ${TABS.find(t => t.key === activeTab)!.label} Orders`}
          </h3>
          <p className="text-gray-600 mb-6">
            {activeTab === 'all'
              ? "You haven't placed any orders yet. Start shopping to see your orders here."
              : `You have no ${TABS.find(t => t.key === activeTab)!.label.toLowerCase()} orders.`}
          </p>
          {activeTab === 'all' && (
            <Button size="lg" onClick={() => navigate('/products')}>
              Start Shopping
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const isExpanded = expandedOrders.has(order.id);
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={order.id} padding="lg" className={successOrderId === order.id ? 'ring-2 ring-green-500' : ''}>
                {/* Order Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </h3>
                      <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                        <StatusIcon className="w-4 h-4" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>Placed: {formatDate(order.createdAt)}</span>
                      <span>•</span>
                      <span>{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</span>
                      <span>•</span>
                      <span className="font-semibold text-gray-900">
                        Total: {formatCurrency(order.total)}
                      </span>
                    </div>
                    {order.estimatedDelivery && order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <p className="text-sm text-gray-600 mt-2">
                        <Truck className="w-4 h-4 inline mr-1" />
                        Estimated delivery: {formatDate(order.estimatedDelivery)}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => toggleOrderExpansion(order.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>

                {/* Order Items Preview */}
                <div className="flex gap-2 mb-4 overflow-x-auto">
                  {order.items.slice(0, 4).map(({ product }) => (
                    <div
                      key={product.id}
                      className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {order.items.length > 4 && (
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>

                {/* Expanded Order Details */}
                {isExpanded && (
                  <div className="pt-4 border-t border-gray-200 space-y-4">
                    {/* Order Items */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                      <div className="space-y-3">
                        {order.items.map(({ product, quantity }) => (
                          <div
                            key={product.id}
                            className="flex gap-4 p-3 bg-gray-50 rounded-lg"
                          >
                            <div
                              className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white cursor-pointer"
                              onClick={() => navigate(`/products/${product.id}`)}
                            >
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{product.name}</h5>
                              <p className="text-sm text-gray-600">
                                Quantity: {quantity} × {formatCurrency(product.price)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                {formatCurrency(product.price * quantity)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Shipping Address */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Shipping Address
                        </h4>
                        <p className="text-sm text-gray-700">{order.shippingAddress.street}</p>
                        <p className="text-sm text-gray-700">
                          {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                          {order.shippingAddress.zipCode}
                        </p>
                        <p className="text-sm text-gray-700">{order.shippingAddress.country}</p>
                      </div>

                      {/* Payment & Totals */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Payment Method
                        </h4>
                        <p className="text-sm text-gray-700 capitalize mb-3">
                          {order.paymentMethod.type.replace('-', ' ')}
                        </p>

                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Shipping</span>
                            <span className="text-gray-900">
                              {order.shipping === 0 ? 'FREE' : formatCurrency(order.shipping)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tax</span>
                            <span className="text-gray-900">{formatCurrency(order.tax)}</span>
                          </div>
                          <div className="flex justify-between font-semibold pt-2 border-t border-gray-300">
                            <span className="text-gray-900">Total</span>
                            <span className="text-primary-600">{formatCurrency(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      {order.status === 'pending' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleCancelOrder(order.id)}
                        >
                          Cancel Order
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/products')}
                      >
                        Order Again
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State for No Orders */}
      {filteredOrders.length > 0 && (
        <Card className="bg-gray-50">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Need something else?
            </h3>
            <p className="text-gray-600 mb-4">
              Continue browsing our collection
            </p>
            <Button variant="outline" onClick={() => navigate('/products')}>
              Browse Products
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
