import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Order } from '../types/order';
import orderService from '../services/orderService';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { ReviewModal } from '../components/common/ReviewModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getStatusConfig } from '../utils/orderUtils';
import { fetchReviewStatuses, fetchSingleReview } from '../utils/reviewUtils';
import type { ReviewData } from '../utils/reviewUtils';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Store,
  MapPin,
  CreditCard,
  Star,
  Pencil,
} from 'lucide-react';

type ReviewModalState = {
  productId: string;
  orderId: string;
  productName: string;
  productImage: string;
  reviewId?: string;
  initialRating?: number;
  initialComment?: string;
};

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [reviewMap, setReviewMap] = useState<Map<string, ReviewData>>(new Map());
  const [reviewModal, setReviewModal] = useState<ReviewModalState | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const o = await orderService.getOrderById(id, user.id);
        if (cancelled) return;
        setOrder(o);

        if (o?.status === 'delivered') {
          const productIds = o.items.map(i => i.product.id);
          const map = await fetchReviewStatuses(productIds);
          if (!cancelled) setReviewMap(map);
        }
      } catch {
        // order stays null → renders "not found" state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, id]);

  const handleConfirmReceived = async () => {
    if (!order) return;
    setConfirmingReceipt(true);
    try {
      await orderService.confirmReceived(order.id);
      setOrder(prev => prev ? { ...prev, status: 'delivered' } : prev);
    } catch (e) {
      console.error(e);
    } finally {
      setConfirmingReceipt(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-24">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Order not found</h2>
        <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';

  const groups = new Map<string, typeof order.items>();
  order.items.forEach(item => {
    const key = item.sellerId ?? '__unknown__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        My Orders
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
        </div>
        <Badge variant={statusConfig.variant} className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <StatusIcon className="w-4 h-4" />
          {statusConfig.label}
        </Badge>
      </div>

      {/* Seller groups */}
      {[...groups.entries()].map(([sellerKey, sellerItems]) => {
        const sellerName = sellerItems[0].sellerName ?? 'Store';
        return (
          <Card key={sellerKey} padding="none" className="overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-700">
              <Store className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{sellerName}</span>
            </div>

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
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{product.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">x{quantity}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-primary-600">{formatCurrency(product.price * quantity)}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatCurrency(product.price)} each</p>
                      </div>
                    </Link>

                    {/* Review row */}
                    {isDelivered && (
                      <div className="mt-3">
                        {existingReview ? (
                          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Your Review</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`w-3 h-3 ${s <= existingReview.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
                                  ))}
                                </div>
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
                                  className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
                                >
                                  <Pencil className="w-3 h-3" />
                                  Edit
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{existingReview.comment}</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReviewModal({
                              productId: product.id,
                              orderId: order.id,
                              productName: product.name,
                              productImage: product.image,
                            })}
                            className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors"
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
          </Card>
        );
      })}

      {/* Order summary */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Order Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Shipping</span>
            <span>{order.shipping === 0 ? 'Free' : formatCurrency(order.shipping)}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Tax</span>
            <span>{formatCurrency(order.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-100 dark:border-gray-700">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </Card>

      {/* Shipping address */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Shipping Address</h2>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
          <p className="font-medium text-gray-800 dark:text-gray-200">
            {order.shippingAddress.firstName} {order.shippingAddress.lastName}
          </p>
          <p>{order.shippingAddress.street}</p>
          <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
          <p>{order.shippingAddress.country}</p>
        </div>
      </Card>

      {/* Payment */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Payment</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
          {order.paymentMethod.type.replace('-', ' ')}
          {order.paymentMethod.last4 ? ` ending in ${order.paymentMethod.last4}` : ''}
        </p>
      </Card>

      {/* Delivery banner */}
      {!isCancelled && order.status !== 'delivered' && order.estimatedDelivery && (
        <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
          <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Expected delivery: {formatDate(order.estimatedDelivery)}
          </span>
        </div>
      )}

      {/* Buyer confirm receipt */}
      {order.status === 'shipped' && (
        <div className="flex items-start gap-4 px-5 py-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Your order is on the way!</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              Once you receive your order, tap the button to confirm receipt and complete the order.
            </p>
          </div>
          <Button
            size="sm"
            variant="success"
            loading={confirmingReceipt}
            onClick={handleConfirmReceived}
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Order Received
          </Button>
        </div>
      )}

      {isCancelled && (
        <div className="flex items-center gap-2 px-5 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm font-medium text-red-600 dark:text-red-400">This order has been cancelled</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pb-8">
        <Button variant="outline" size="sm" onClick={() => navigate('/products')}>Order Again</Button>
      </div>

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
            const pid = reviewModal.productId; // capture before await
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
