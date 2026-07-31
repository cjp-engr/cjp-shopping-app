import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Product } from '../types/product';
import type { Order } from '../types/order';
import sellerService from '../services/sellerService';
import couponService, { type Coupon } from '../services/couponService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Spinner } from '../components/common/Spinner';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Package, Plus, Edit, Trash2, Truck, CheckCircle,
  XCircle, Clock, AlertCircle, ShoppingBag, Store,
  ImageOff, DollarSign, Tag, ChevronRight, ClipboardList,
  Eye,
} from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { getStatusConfig } from '../utils/orderUtils';
import { ProductWizard } from '../components/seller/ProductWizard';

const ImgWithFallback: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className ?? ''}`}>
        <ImageOff className="w-8 h-8 text-gray-300" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
};

const ORDER_STATUS_STEPS = ['pending', 'preparing', 'processing', 'shipped', 'delivered'] as const;
const ORDER_STEP_LABELS  = ['Pending', 'Preparing', 'Processing', 'Shipped', 'Delivered'];

const STATUS_BORDER_CLASS: Record<string, string> = {
  pending:    'border-l-amber-400',
  preparing:  'border-l-blue-400',
  processing: 'border-l-indigo-400',
  shipped:    'border-l-orange-400',
  delivered:  'border-l-green-500',
  cancelled:  'border-l-red-400',
};

type Tab = 'products' | 'orders' | 'vouchers';

type SellerOrder = Order & { buyer?: { id: string; firstName: string; lastName: string; email: string } };


export const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    return (t === 'orders' || t === 'vouchers') ? t : 'products';
  });

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Orders state
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; productId: string | null; loading: boolean }>({ open: false, productId: null, loading: false });
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; orderId: string | null; reason: string; loading: boolean }>({ open: false, orderId: null, reason: '', loading: false });

  // Vouchers state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [couponForm, setCouponForm] = useState<Partial<Coupon>>({ discountType: 'percentage', discountValue: 10, minOrderAmount: 0, isActive: true });
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponFormError, setCouponFormError] = useState<string | null>(null);
  const [couponFormLoading, setCouponFormLoading] = useState(false);
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, []);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      setProducts(await sellerService.getProducts());
    } catch { /* silent */ }
    finally { setLoadingProducts(false); }
  };

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      setOrders(await sellerService.getOrders() as SellerOrder[]);
    } catch { /* silent */ }
    finally { setLoadingOrders(false); }
  };

  // ── Product form ──────────────────────────────────────────
  const openCreate = () => { setEditingProduct(null); setShowForm(true); };
  const openEdit   = (p: Product) => { setEditingProduct(p); setShowForm(true); };
  const closeForm  = () => { setShowForm(false); setEditingProduct(null); };
  const handleSaved = async () => { await loadProducts(); closeForm(); };

  const handleDelete = (id: string) => {
    setDeleteDialog({ open: true, productId: id, loading: false });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.productId) return;
    setDeleteDialog(d => ({ ...d, loading: true }));
    try {
      await sellerService.deleteProduct(deleteDialog.productId);
      setProducts(prev => prev.filter(p => p.id !== deleteDialog.productId));
      setDeleteDialog({ open: false, productId: null, loading: false });
    } catch (err) {
      console.error(err instanceof Error ? err.message : 'Failed to delete');
      setDeleteDialog(d => ({ ...d, loading: false }));
    }
  };

  const loadCoupons = async () => {
    setLoadingCoupons(true);
    setCoupons(await couponService.listMine());
    setLoadingCoupons(false);
  };

  const openCreateCoupon = () => {
    setEditingCoupon(null);
    setCouponForm({ discountType: 'percentage', discountValue: 10, minOrderAmount: 0, isActive: true });
    setCouponFormError(null);
    setShowCouponForm(true);
  };

  const openEditCoupon = (c: Coupon) => {
    setEditingCoupon(c);
    setCouponForm({ ...c });
    setCouponFormError(null);
    setShowCouponForm(true);
  };

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponFormError(null);
    if (!couponForm.code && !editingCoupon) {
      setCouponFormError('Coupon code is required');
      return;
    }
    try {
      setCouponFormLoading(true);
      if (editingCoupon) {
        const updated = await couponService.update(editingCoupon.id, couponForm);
        setCoupons(prev => prev.map(c => c.id === updated.id ? updated : c));
      } else {
        const created = await couponService.create(couponForm);
        setCoupons(prev => [created, ...prev]);
      }
      setShowCouponForm(false);
      setEditingCoupon(null);
    } catch (err) {
      setCouponFormError(err instanceof Error ? err.message : 'Failed to save coupon');
    } finally {
      setCouponFormLoading(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    setDeletingCouponId(id);
    try {
      await couponService.delete(id);
      setCoupons(prev => prev.filter(c => c.id !== id));
    } catch {
      // silent
    } finally {
      setDeletingCouponId(null);
    }
  };

  // ── Order status ──────────────────────────────────────────
  const handleStatusUpdate = async (orderId: string, status: 'preparing' | 'processing' | 'shipped' | 'delivered' | 'cancelled', cancelReason?: string) => {
    setStatusError(null);
    try {
      await sellerService.updateOrderStatus(orderId, status, cancelReason);
      await loadOrders();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const openCancelDialog = (orderId: string) => {
    setCancelDialog({ open: true, orderId, reason: '', loading: false });
  };

  const confirmCancelOrder = async () => {
    if (!cancelDialog.orderId) return;
    setCancelDialog(d => ({ ...d, loading: true }));
    try {
      await handleStatusUpdate(cancelDialog.orderId, 'cancelled', cancelDialog.reason || undefined);
      setCancelDialog({ open: false, orderId: null, reason: '', loading: false });
    } catch {
      setCancelDialog(d => ({ ...d, loading: false }));
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Store className="w-8 h-8 text-primary-600" />
            Seller Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your products and orders</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/profile')}>
          Back to Profile
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="lg" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Products</p>
          </div>
        </Card>
        <Card padding="lg" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Active Orders</p>
          </div>
        </Card>
        <Card padding="lg" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
            <Truck className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {orders.filter(o => o.status === 'pending').length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">To Ship</p>
          </div>
        </Card>
        <Card padding="lg" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0))}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Revenue</p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      {(() => {
        const actionableCount = orders.filter(o => ['pending', 'preparing', 'processing', 'shipped'].includes(o.status)).length;
        return (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex gap-1">
              {([
                { key: 'products', label: 'My Products', Icon: ShoppingBag, badge: null },
                { key: 'orders',   label: 'Orders',      Icon: Package,     badge: actionableCount || null },
                { key: 'vouchers', label: 'Vouchers',    Icon: Tag,         badge: null },
              ] as const).map(({ key, label, Icon, badge }) => (
                <button
                  key={key}
                  onClick={() => { setTab(key); if (key === 'vouchers' && coupons.length === 0) loadCoupons(); }}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tab === key
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {badge !== null && (
                    <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-primary-600 text-white">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        );
      })()}

      {/* ── Products Tab ── */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Category filter chips */}
            {!loadingProducts && products.length > 0 && (() => {
              const usedCategories = Array.from(new Set(products.map(p => p.category)));
              const tabs = [{ key: 'all', label: 'All' }, ...usedCategories.map(c => ({ key: c, label: c }))];
              return (
                <div className="flex flex-wrap gap-2">
                  {tabs.map(({ key, label }) => {
                    const count = key === 'all' ? products.length : products.filter(p => p.category === key).length;
                    const active = productCategoryFilter === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setProductCategoryFilter(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                          active
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400'
                        }`}
                      >
                        {label}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          active ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>

          {/* Product Wizard Modal */}
          {showForm && (
            <ProductWizard
              product={editingProduct}
              onClose={closeForm}
              onSaved={handleSaved}
            />
          )}

          {/* Products List */}
          {loadingProducts ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : products.length === 0 ? (
            <Card className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No products yet. Add your first product!</p>
            </Card>
          ) : (() => {
            const filtered = productCategoryFilter === 'all'
              ? products
              : products.filter(p => p.category === productCategoryFilter);
            if (filtered.length === 0) return (
              <Card className="text-center py-12">
                <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No products in this category.</p>
              </Card>
            );
            return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(product => (
                <Card key={product.id} padding="none" className="flex flex-col overflow-hidden">
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                    <ImgWithFallback src={product.image} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
                    <span className={`absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded-full ${
                      product.stock === 0
                        ? 'bg-red-100 text-red-700'
                        : product.stock <= 5
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {product.stock === 0 ? 'Out of stock' : `Stock: ${product.stock}`}
                    </span>
                  </div>
                  <div className="flex flex-col flex-1 p-4">
                    <Badge variant="gray" size="sm" className="mb-2 w-fit">{product.category}</Badge>
                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 mb-1">{product.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">{product.description}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(product.price)}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openEdit(product)}
                          className="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          aria-label="Edit product"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          aria-label="Delete product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            );
          })()}
        </div>
      )}

      {/* ── Orders Tab ── */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {statusError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-700">{statusError}</p>
            </div>
          )}

          {/* Status filter tabs */}
          {!loadingOrders && orders.length > 0 && (() => {
            const statusTabs = [
              { key: 'all',        label: 'All',        icon: ShoppingBag },
              { key: 'pending',    label: 'Pending',    icon: Clock },
              { key: 'preparing',  label: 'Preparing',  icon: ClipboardList },
              { key: 'processing', label: 'To Ship',    icon: Package },
              { key: 'shipped',    label: 'To Receive', icon: Truck },
              { key: 'delivered',  label: 'Delivered',  icon: CheckCircle },
              { key: 'cancelled',  label: 'Cancelled',  icon: XCircle },
            ].filter(t => t.key === 'all' || orders.some(o => o.status === t.key));

            return (
              <div className="flex flex-wrap gap-2">
                {statusTabs.map(({ key, label, icon: Icon }) => {
                  const count = key === 'all' ? orders.length : orders.filter(o => o.status === key).length;
                  const active = orderStatusFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setOrderStatusFilter(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                        active
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                      <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                        active ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {loadingOrders ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : orders.length === 0 ? (
            <Card className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No orders yet for your products.</p>
            </Card>
          ) : (() => {
            const filtered = orderStatusFilter === 'all' ? orders : orders.filter(o => o.status === orderStatusFilter);
            if (filtered.length === 0) return (
              <Card className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No {getStatusConfig(orderStatusFilter).label.toLowerCase()} orders.</p>
              </Card>
            );
            return filtered.map(order => {
              const cfg = getStatusConfig(order.status);
              const StatusIcon = cfg.icon;
              const canAccept    = order.status === 'pending';
              const canToShip    = order.status === 'preparing';
              const canToReceive = order.status === 'processing';
              const canCancel    = ['pending', 'preparing', 'processing', 'shipped'].includes(order.status);
              const isCancelled  = order.status === 'cancelled';
              const stepIndex    = ORDER_STATUS_STEPS.indexOf(order.status as typeof ORDER_STATUS_STEPS[number]);
              const borderClass  = STATUS_BORDER_CLASS[order.status] ?? 'border-l-gray-300';

              // Buyer initials for avatar
              const buyerInitial = order.buyer
                ? (order.buyer.firstName[0] ?? '') + (order.buyer.lastName[0] ?? '')
                : '?';

              return (
                <Card key={order.id} padding="none" className={`overflow-hidden border-l-4 ${borderClass}`}>
                  {/* ── Header ── */}
                  <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700/60">
                    <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-100 tracking-wide">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <Badge variant={cfg.variant} size="sm" className="flex items-center gap-1">
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </Badge>
                    <div className="flex-1" />
                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{formatDate(order.createdAt)}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(order.total)}</span>
                  </div>

                  {/* ── Progress bar (All tab only) ── */}
                  {!isCancelled && orderStatusFilter === 'all' && (
                    <div className="px-5 pt-3 pb-1">
                      <div className="flex items-center gap-0">
                        {ORDER_STATUS_STEPS.map((step, i) => {
                          const done    = i <= stepIndex;
                          const current = i === stepIndex;
                          return (
                            <React.Fragment key={step}>
                              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                <div className={`w-2.5 h-2.5 rounded-full border-2 transition-colors ${
                                  done
                                    ? current
                                      ? 'border-primary-600 bg-primary-600 ring-2 ring-primary-200 dark:ring-primary-800'
                                      : 'border-primary-600 bg-primary-600'
                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                }`} />
                                <span className={`text-[10px] leading-none whitespace-nowrap ${
                                  current
                                    ? 'text-primary-600 dark:text-primary-400 font-semibold'
                                    : done
                                    ? 'text-gray-500 dark:text-gray-400'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}>
                                  {ORDER_STEP_LABELS[i]}
                                </span>
                              </div>
                              {i < ORDER_STATUS_STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 -translate-y-2 mx-0.5 ${
                                  i < stepIndex ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                                }`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="px-5 py-4 space-y-4">
                    {/* ── Buyer ── */}
                    {order.buyer && (
                      <button
                        type="button"
                        onClick={() => navigate(`/users/${order.buyer!.id}`)}
                        className="flex items-center gap-2.5 w-full text-left group"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold flex-shrink-0 uppercase">
                          {buyerInitial}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {order.buyer.firstName} {order.buyer.lastName}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1.5">{order.buyer.email}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 ml-auto flex-shrink-0 group-hover:text-primary-500 transition-colors" />
                      </button>
                    )}

                    {/* ── Items ── */}
                    <div className="space-y-1.5">
                      {order.items.map(({ product, quantity }) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => navigate(`/products/${product.id}`)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left group"
                        >
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-white dark:bg-gray-700 flex-shrink-0 border border-gray-100 dark:border-gray-600 shadow-sm">
                            <ImgWithFallback src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
                              {product.name}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              Qty {quantity} × {formatCurrency(product.price)}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 flex-shrink-0 tabular-nums">
                            {formatCurrency(product.price * quantity)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Action footer ── */}
                  <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/30">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/seller/orders/${order.id}`, { state: { order } })} className="flex-shrink-0">
                      <Eye className="w-4 h-4 mr-1.5" /> View Details
                    </Button>
                    <div className="flex-1" />
                    {canAccept && (
                      <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'preparing')}>
                        <ClipboardList className="w-4 h-4 mr-1.5" /> Prepare
                      </Button>
                    )}
                    {canToShip && (
                      <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'processing')}>
                        <Package className="w-4 h-4 mr-1.5" /> Mark to Ship
                      </Button>
                    )}
                    {canToReceive && (
                      <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'shipped')}>
                        <Truck className="w-4 h-4 mr-1.5" /> Mark Shipped
                      </Button>
                    )}
                    {canCancel && (
                      <Button size="sm" variant="outline" onClick={() => openCancelDialog(order.id)}
                        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" /> Cancel
                      </Button>
                    )}
                  </div>
                </Card>
              );
            });
          })()}
        </div>
      )}

      {/* ── Vouchers Tab ── */}
      {tab === 'vouchers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">My Vouchers</h2>
            <Button onClick={openCreateCoupon}>
              <Plus className="w-4 h-4 mr-2" /> Create Voucher
            </Button>
          </div>

          {/* Coupon form */}
          {showCouponForm && (
            <Card padding="lg" className="border-2 border-primary-200 dark:border-primary-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                {editingCoupon ? 'Edit Voucher' : 'Create Voucher'}
              </h3>
              {couponFormError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-red-700">{couponFormError}</p>
                </div>
              )}
              <form onSubmit={handleCouponSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {!editingCoupon && (
                    <Input
                      label="Voucher Code"
                      value={couponForm.code ?? ''}
                      onChange={e => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. SAVE10"
                      fullWidth
                      required
                    />
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount Type</label>
                    <select
                      value={couponForm.discountType ?? 'percentage'}
                      onChange={e => setCouponForm(p => ({ ...p, discountType: e.target.value as 'percentage' | 'fixed' }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <Input
                    label={couponForm.discountType === 'percentage' ? 'Discount (%)' : 'Discount Amount ($)'}
                    type="number"
                    value={couponForm.discountValue ?? ''}
                    onChange={e => setCouponForm(p => ({ ...p, discountValue: Number(e.target.value) }))}
                    fullWidth
                    required
                  />
                  {couponForm.discountType === 'percentage' && (
                    <Input
                      label="Max Discount Cap ($, optional)"
                      type="number"
                      value={couponForm.maxDiscount ?? ''}
                      onChange={e => setCouponForm(p => ({ ...p, maxDiscount: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="Leave blank for no cap"
                      fullWidth
                    />
                  )}
                  <Input
                    label="Min. Order Amount ($)"
                    type="number"
                    value={couponForm.minOrderAmount ?? 0}
                    onChange={e => setCouponForm(p => ({ ...p, minOrderAmount: Number(e.target.value) }))}
                    fullWidth
                  />
                  <Input
                    label="Usage Limit (optional)"
                    type="number"
                    value={couponForm.usageLimit ?? ''}
                    onChange={e => setCouponForm(p => ({ ...p, usageLimit: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="Leave blank for unlimited"
                    fullWidth
                  />
                  <Input
                    label="Expires At (optional)"
                    type="date"
                    value={couponForm.expiresAt ? couponForm.expiresAt.slice(0, 10) : ''}
                    onChange={e => setCouponForm(p => ({ ...p, expiresAt: e.target.value || undefined }))}
                    fullWidth
                  />
                </div>
                <Input
                  label="Description (optional)"
                  value={couponForm.description ?? ''}
                  onChange={e => setCouponForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. 10% off for all products"
                  fullWidth
                />
                {editingCoupon && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={couponForm.isActive ?? true}
                      onChange={e => setCouponForm(p => ({ ...p, isActive: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                    Active
                  </label>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowCouponForm(false)} disabled={couponFormLoading}>Cancel</Button>
                  <Button type="submit" loading={couponFormLoading}>{editingCoupon ? 'Save Changes' : 'Create Voucher'}</Button>
                </div>
              </form>
            </Card>
          )}

          {/* Coupon list */}
          {loadingCoupons ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : coupons.length === 0 ? (
            <Card className="text-center py-12">
              <Tag className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">No vouchers yet. Create your first one!</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {coupons.map(c => {
                const expiresIn = c.expiresAt
                  ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / 86_400_000)
                  : null;
                const isExpired = expiresIn != null && expiresIn <= 0;
                return (
                  <Card key={c.id} padding="none" className={`flex items-stretch overflow-hidden ${!c.isActive || isExpired ? 'opacity-60' : ''}`}>
                    <div className={`w-2 flex-shrink-0 ${c.isActive && !isExpired ? 'bg-orange-400' : 'bg-gray-300'}`} />
                    <div className={`flex items-center justify-center px-4 py-4 ${c.isActive && !isExpired ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                      <Tag className={`w-7 h-7 ${c.isActive && !isExpired ? 'text-orange-500' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1 px-4 py-3 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">{c.code}</span>
                        {!c.isActive && <Badge variant="gray" size="sm">Inactive</Badge>}
                        {isExpired && <Badge variant="danger" size="sm">Expired</Badge>}
                        {c.isActive && !isExpired && <Badge variant="success" size="sm">Active</Badge>}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {c.discountType === 'percentage'
                          ? `${c.discountValue}% off${c.maxDiscount ? ` (max ${formatCurrency(c.maxDiscount)})` : ''}`
                          : `${formatCurrency(c.discountValue)} off`}
                      </p>
                      {c.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.description}</p>}
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {c.minOrderAmount > 0 && <span>Min. {formatCurrency(c.minOrderAmount)}</span>}
                        {c.usageLimit != null && <span>Used {c.usedCount}/{c.usageLimit}</span>}
                        {expiresIn != null && !isExpired && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{expiresIn} day{expiresIn !== 1 ? 's' : ''} left</span>}
                        {isExpired && <span className="text-red-400">Expired</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-3">
                      <button
                        onClick={() => openEditCoupon(c)}
                        className="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        aria-label="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(c.id)}
                        disabled={deletingCouponId === c.id}
                        className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        aria-label="Delete"
                      >
                        {deletingCouponId === c.id ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete Product"
        cancelLabel="Keep Product"
        variant="danger"
        loading={deleteDialog.loading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ open: false, productId: null, loading: false })}
      />

      {/* Cancel Order Dialog */}
      {cancelDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Cancel Order</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Provide a reason for cancellation (optional).</p>
            <textarea
              value={cancelDialog.reason}
              onChange={e => setCancelDialog(d => ({ ...d, reason: e.target.value }))}
              placeholder="e.g. Out of stock, unable to fulfil..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setCancelDialog({ open: false, orderId: null, reason: '', loading: false })} disabled={cancelDialog.loading}>
                Keep Order
              </Button>
              <Button variant="danger" size="sm" loading={cancelDialog.loading} onClick={confirmCancelOrder}>
                <XCircle className="w-4 h-4 mr-1" /> Confirm Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

