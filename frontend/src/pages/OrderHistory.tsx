import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Order, OrderStatus } from '../types/order';
import orderService from '../services/orderService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Spinner } from '../components/common/Spinner';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getStatusConfig } from '../utils/orderUtils';
import { fetchReviewStatuses, fetchSingleReview } from '../utils/reviewUtils';
import type { ReviewData } from '../utils/reviewUtils';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Store,
  Star,
  Pencil,
} from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ReviewModal } from '../components/common/ReviewModal';

type TabKey = 'all' | 'pending' | 'to-ship' | 'to-receive' | 'complete' | 'cancelled';

const TABS: { key: TabKey; label: string; statuses: OrderStatus[] }[] = [
  { key: 'all',        label: 'All',        statuses: [] },
  { key: 'pending',    label: 'Pending',    statuses: ['pending'] },
  { key: 'to-ship',    label: 'To Ship',    statuses: ['processing'] },
  { key: 'to-receive', label: 'To Receive', statuses: ['shipped'] },
  { key: 'complete',   label: 'Complete',   statuses: ['delivered'] },
  { key: 'cancelled',  label: 'Cancelled',  statuses: ['cancelled'] },
];

type ReviewModalState = {
  productId: string;
  orderId: string;
  productName: string;
  productImage: string;
  reviewId?: string;
  initialRating?: number;
  initialComment?: string;
};

export const OrderHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; orderId: string | null; loading: boolean }>({
    open: false, orderId: null, loading: false,
  });
  const [reviewModal, setReviewModal] = useState<ReviewModalState | null>(null);
  const [reviewMap, setReviewMap] = useState<Map<string, ReviewData>>(new Map());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const userOrders = await orderService.getOrders(user.id);
        if (cancelled) return;
        setOrders(userOrders);

        const deliveredProductIds = userOrders
          .filter(o => o.status === 'delivered')
          .flatMap(o => o.items.map(i => i.product.id));
        const map = await fetchReviewStatuses(deliveredProductIds);
        if (!cancelled) setReviewMap(map);

        const successId = searchParams.get('success');
        if (successId) {
          setSuccessOrderId(successId);
          setTimeout(() => setSuccessOrderId(null), 5000);
        }
      } catch (error) {
        console.error('Failed to load orders:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, searchParams]);

  const handleCancelOrder = (orderId: string) => {
    setCancelDialog({ open: true, orderId, loading: false });
  };

  const confirmCancelOrder = async () => {
    if (!user || !cancelDialog.orderId) return;
    setCancelDialog(d => ({ ...d, loading: true }));
    try {
      await orderService.cancelOrder(cancelDialog.orderId, user.id);
      const updatedOrders = await orderService.getOrders(user.id);
      setOrders(updatedOrders);
      setCancelDialog({ open: false, orderId: null, loading: false });
    } catch (error) {
      console.error('Failed to cancel order:', error);
      setCancelDialog(d => ({ ...d, loading: false }));
    }
  };

  const handleConfirmReceived = async (orderId: string) => {
    setConfirmingIds(prev => new Set(prev).add(orderId));
    try {
      await orderService.confirmReceived(orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'delivered' } : o));
    } catch (e) {
      console.error(e);
    } finally {
      setConfirmingIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
    }
  };

  const filteredOrders = activeTab === 'all'
    ? orders
    : orders.filter(o => TABS.find(t => t.key === activeTab)!.statuses.includes(o.status));

  const tabCount = (tab: typeof TABS[number]) =>
    tab.key === 'all' ? orders.length : orders.filter(o => tab.statuses.includes(o.status)).length;

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
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} total
          </p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
        >
          Back to Profile
        </button>
      </div>

      {/* Success banner */}
      {successOrderId && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Order Placed Successfully!</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              Your order has been received and is being processed.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-0 overflow-x-auto scrollbar-none" aria-label="Order status tabs">
          {TABS.map((tab) => {
            const count = tabCount(tab);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                aria-selected={isActive}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span
                  className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <Card className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {activeTab === 'all' ? 'No Orders Yet' : `No ${TABS.find(t => t.key === activeTab)!.label} Orders`}
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
            {activeTab === 'all'
              ? "You haven't placed any orders yet. Start shopping to see your orders here."
              : `You have no ${TABS.find(t => t.key === activeTab)!.label.toLowerCase()} orders right now.`}
          </p>
          {activeTab === 'all' && (
            <Button size="md" onClick={() => navigate('/products')}>
              Start Shopping
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.flatMap((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;
            const isCancelled = order.status === 'cancelled';

            const groups = new Map<string, typeof order.items>();
            order.items.forEach(item => {
              const key = item.sellerId ?? '__unknown__';
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(item);
            });

            return [...groups.entries()].map(([sellerKey, sellerItems]) => {
              const sellerName = sellerItems[0].sellerName ?? 'Store';
              const groupTotal = sellerItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
              const itemCount = sellerItems.reduce((s, i) => s + i.quantity, 0);
              const cardKey = `${order.id}-${sellerKey}`;

              return (
                <Card key={cardKey} padding="none" className={`overflow-hidden ${successOrderId === order.id ? 'ring-2 ring-green-500' : ''}`}>
                  {/* Seller header — navigates to order detail */}
                  <Link
                    to={`/orders/${order.id}`}
                    className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{sellerName}</span>
                    </div>
                    <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig.label}
                    </Badge>
                  </Link>

                  {/* Order meta — navigates to order detail */}
                  <Link
                    to={`/orders/${order.id}`}
                    className="flex flex-wrap gap-x-4 gap-y-0.5 px-5 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <span>Order #{order.id.slice(0, 8).toUpperCase()}</span>
                    <span>·</span>
                    <span>{formatDate(order.createdAt)}</span>
                  </Link>

                  {/* Items */}
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {sellerItems.map(({ product, quantity }) => {
                      const existingReview = reviewMap.get(product.id);
                      return (
                        <div key={product.id} className="px-5 py-4">
                          <Link
                            to={`/products/${product.id}`}
                            className="flex gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors -mx-2 px-2"
                          >
                            <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">x{quantity}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-semibold text-primary-600">
                                {formatCurrency(product.price * quantity)}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {formatCurrency(product.price)} each
                              </p>
                            </div>
                          </Link>

                          {order.status === 'delivered' && (
                            <div className="mt-2 flex items-center justify-between gap-3">
                              {existingReview ? (
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <Star
                                        key={s}
                                        className={`w-3 h-3 ${s <= existingReview.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                                      />
                                    ))}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 flex-1">
                                    {existingReview.comment}
                                  </p>
                                  <button
                                    onClick={() => setReviewModal({
                                      productId: product.id,
                                      orderId: order.id,
                                      productName: product.name,
                                      productImage: product.image,
                                      reviewId: existingReview.reviewId,
                                      initialRating: existingReview.rating,
                                      initialComment: existingReview.comment,
                                    })}
                                    className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    Edit
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setReviewModal({
                                    productId: product.id,
                                    orderId: order.id,
                                    productName: product.name,
                                    productImage: product.image,
                                  })}
                                  className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                                >
                                  <Star className="w-3.5 h-3.5" />
                                  Write a Review
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Seller subtotal */}
                  <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(groupTotal)}
                    </span>
                  </div>

                  {/* Delivery / cancelled banners */}
                  {!isCancelled && order.estimatedDelivery && (
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-100 dark:border-emerald-800">
                      <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex-1">
                        Expected delivery: {formatDate(order.estimatedDelivery)}
                      </span>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">
                        This order has been cancelled
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-700">
                    {order.status === 'pending' && (
                      <Button variant="danger" size="sm" onClick={() => handleCancelOrder(order.id)}>
                        Cancel Order
                      </Button>
                    )}
                    {order.status === 'shipped' && (
                      <Button
                        variant="success"
                        size="sm"
                        loading={confirmingIds.has(order.id)}
                        onClick={() => handleConfirmReceived(order.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Order Received
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => navigate('/products')}>
                      Order Again
                    </Button>
                  </div>
                </Card>
              );
            });
          })}
        </div>
      )}

      {filteredOrders.length > 0 && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Need to shop for something new?</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/products')}>
            Browse Products
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={cancelDialog.open}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmLabel="Yes, Cancel Order"
        cancelLabel="Keep Order"
        variant="danger"
        loading={cancelDialog.loading}
        onConfirm={confirmCancelOrder}
        onCancel={() => setCancelDialog({ open: false, orderId: null, loading: false })}
      />

      {reviewModal && (
        <ReviewModal
          productId={reviewModal.productId}
          orderId={reviewModal.orderId}
          productName={reviewModal.productName}
          productImage={reviewModal.productImage}
          reviewId={reviewModal.reviewId}
          initialRating={reviewModal.initialRating}
          initialComment={reviewModal.initialComment}
          onClose={() => setReviewModal(null)}
          onSubmitted={async () => {
            const pid = reviewModal.productId; // capture before any await
            const updated = await fetchSingleReview(pid);
            if (updated) {
              setReviewMap(prev => new Map(prev).set(pid, updated));
            }
          }}
        />
      )}
    </div>
  );
};
