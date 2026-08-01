import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Order } from '../types/order';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getStatusConfig } from '../utils/orderUtils';
import sellerService from '../services/sellerService';
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  User,
  ClipboardList,
  Truck,
  XCircle,
  ImageOff,
  DollarSign,
} from 'lucide-react';

type SellerOrder = Order & {
  buyer?: { id: string; firstName: string; lastName: string; email: string };
};

const PAYMENT_LABEL: Record<string, string> = {
  'credit-card': 'Credit Card',
  'debit-card':  'Debit Card',
  'paypal':      'PayPal',
};

const ImgWithFallback: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${className ?? ''}`}>
        <ImageOff className="w-5 h-5 text-gray-300" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
};

export const SellerOrderDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const order = (location.state as { order?: SellerOrder } | null)?.order ?? null;

  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; reason: string; loading: boolean }>({
    open: false, reason: '', loading: false,
  });
  const [currentStatus, setCurrentStatus] = useState(order?.status ?? '');

  if (!order) {
    return (
      <div className="text-center py-24">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Order not found</h2>
        <Button variant="outline" size="sm" onClick={() => navigate('/seller?tab=orders')}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(currentStatus);
  const StatusIcon = statusConfig.icon;
  const isCancelled = currentStatus === 'cancelled';

  const canAccept    = currentStatus === 'pending';
  const canToShip    = currentStatus === 'preparing';
  const canToReceive = currentStatus === 'processing';
  const canCancel    = ['pending', 'preparing', 'processing', 'shipped'].includes(currentStatus);

  const handleStatusUpdate = async (status: 'preparing' | 'processing' | 'shipped' | 'delivered' | 'cancelled', cancelReason?: string) => {
    setStatusError(null);
    setStatusLoading(true);
    try {
      await sellerService.updateOrderStatus(order.id, status, cancelReason);
      setCurrentStatus(status);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const confirmCancel = async () => {
    setCancelDialog(d => ({ ...d, loading: true }));
    try {
      await handleStatusUpdate('cancelled', cancelDialog.reason || undefined);
      setCancelDialog({ open: false, reason: '', loading: false });
    } catch {
      setCancelDialog(d => ({ ...d, loading: false }));
    }
  };

  const addr = order.shippingAddress;
  const pay  = order.paymentMethod;
  const buyerName = order.buyer ? `${order.buyer.firstName} ${order.buyer.lastName}` : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => navigate('/seller?tab=orders')}
        className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </button>

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

      {/* Status error */}
      {statusError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {statusError}
        </div>
      )}

      {/* Buyer */}
      {order.buyer && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Buyer</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-sm font-bold flex-shrink-0 uppercase">
              {order.buyer.firstName[0]}{order.buyer.lastName[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{buyerName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{order.buyer.email}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Items */}
      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-700">
          <Package className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Items Ordered</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {order.items.map(({ product, quantity, selectedVariant }) => {
            const rawPrice = selectedVariant?.price ?? product.price;
            const discountPercent =
              selectedVariant?.discount ?? product.discount ?? 0;
            const salePrice =
              discountPercent > 0
                ? rawPrice * (1 - discountPercent / 100)
                : rawPrice;
            const itemKey = selectedVariant?.key ?? product.id;
            return (
              <button
                key={itemKey}
                type="button"
                onClick={() => navigate(`/products/${product.id}`)}
                className="w-full flex gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left group"
              >
                <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <ImgWithFallback src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {product.name}
                  </p>
                  {selectedVariant && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {Object.entries(selectedVariant.attributes).map(([k, v]) => `${k}: ${v}`).join(' / ')}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">x{quantity}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                    {formatCurrency(salePrice * quantity)}
                  </p>
                  {discountPercent > 0 ? (
                    <div className="mt-1 flex items-center justify-end gap-1.5 text-xs">
                      <span className="text-gray-400 dark:text-gray-500 line-through">
                        {formatCurrency(rawPrice)}
                      </span>
                      <span className="font-semibold text-primary-600 dark:text-primary-400">
                        {formatCurrency(salePrice)} each
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatCurrency(rawPrice)} each
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Order summary */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Order Summary</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Order Amount</span>
            <span className="tabular-nums">{formatCurrency(order.subtotal)}</span>
          </div>
          {order.productDiscount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Product Discount</span>
              <span className="tabular-nums">-{formatCurrency(order.productDiscount)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Voucher</span>
              <span className="tabular-nums">-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Shipping</span>
            <span className="tabular-nums">
              {order.shipping === 0
                ? <span className="text-green-600 dark:text-green-400 font-medium">Free</span>
                : formatCurrency(order.shipping)}
            </span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Tax</span>
            <span className="tabular-nums">{formatCurrency(order.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-100 dark:border-gray-700">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </Card>

      {/* Shipping address */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Shipping Address</h2>
        </div>
        {addr ? (
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
            <p>{addr.street}</p>
            <p>{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.zipCode}</p>
            <p>{addr.country}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No address on record</p>
        )}
      </Card>

      {/* Payment */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Payment</h2>
        </div>
        {pay ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {PAYMENT_LABEL[pay.type] ?? pay.type}
                {pay.last4 && <span className="ml-2 font-mono text-gray-500 dark:text-gray-400">•••• {pay.last4}</span>}
              </p>
              {pay.cardHolder && (
                <p className="text-xs text-gray-400 dark:text-gray-500">{pay.cardHolder}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No payment info</p>
        )}
      </Card>

      {/* Cancellation reason */}
      {isCancelled && order.cancelReason && (
        <div className="flex items-start gap-2 px-5 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">This order has been cancelled</p>
            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">Reason: {order.cancelReason}</p>
          </div>
        </div>
      )}

      {isCancelled && !order.cancelReason && (
        <div className="flex items-center gap-2 px-5 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm font-medium text-red-600 dark:text-red-400">This order has been cancelled</p>
        </div>
      )}

      {/* Actions */}
      {(canAccept || canToShip || canToReceive || canCancel) && (
        <div className="flex flex-wrap gap-3 pb-8">
          {canAccept && (
            <Button loading={statusLoading} onClick={() => handleStatusUpdate('preparing')}>
              <ClipboardList className="w-4 h-4 mr-1.5" /> Prepare
            </Button>
          )}
          {canToShip && (
            <Button loading={statusLoading} onClick={() => handleStatusUpdate('processing')}>
              <Package className="w-4 h-4 mr-1.5" /> Mark to Ship
            </Button>
          )}
          {canToReceive && (
            <Button loading={statusLoading} onClick={() => handleStatusUpdate('shipped')}>
              <Truck className="w-4 h-4 mr-1.5" /> Mark Shipped
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              onClick={() => setCancelDialog({ open: true, reason: '', loading: false })}
              className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <XCircle className="w-4 h-4 mr-1.5" /> Cancel Order
            </Button>
          )}
        </div>
      )}

      {/* Cancel dialog */}
      {cancelDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Cancel Order</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Provide a reason for cancellation (optional).
            </p>
            <textarea
              value={cancelDialog.reason}
              onChange={e => setCancelDialog(d => ({ ...d, reason: e.target.value }))}
              placeholder="e.g. Out of stock, unable to fulfil..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelDialog({ open: false, reason: '', loading: false })}
                disabled={cancelDialog.loading}
              >
                Keep Order
              </Button>
              <Button variant="danger" size="sm" loading={cancelDialog.loading} onClick={confirmCancel}>
                <XCircle className="w-4 h-4 mr-1" /> Confirm Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
