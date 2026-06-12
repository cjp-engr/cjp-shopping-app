import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Product } from '../types/product';
import type { Order } from '../types/order';
import sellerService from '../services/sellerService';
import type { ProductFormData } from '../services/sellerService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Spinner } from '../components/common/Spinner';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Package, Plus, Edit, Trash2, Truck, CheckCircle,
  XCircle, Clock, AlertCircle, ShoppingBag, Store,
} from 'lucide-react';

const CATEGORIES = ['Electronics', 'Clothing', 'Home & Garden', 'Books', 'Sports & Outdoors'];

const EMPTY_FORM: ProductFormData = {
  name: '', description: '', price: 0, category: CATEGORIES[0], image: '', stock: 0,
};

type Tab = 'products' | 'orders';

type SellerOrder = Order & { buyer?: { firstName: string; lastName: string; email: string } };

const statusConfig = (status: string) => {
  switch (status) {
    case 'pending':    return { icon: Clock,        variant: 'warning' as const, label: 'Pending' };
    case 'processing': return { icon: Package,      variant: 'primary' as const, label: 'To Ship' };
    case 'shipped':    return { icon: Truck,        variant: 'primary' as const, label: 'To Receive' };
    case 'delivered':  return { icon: CheckCircle,  variant: 'success' as const, label: 'Delivered' };
    case 'cancelled':  return { icon: XCircle,      variant: 'danger'  as const, label: 'Cancelled' };
    default:           return { icon: Package,      variant: 'gray'    as const, label: status };
  }
};

export const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('products');

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

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
  const openCreate = () => { setEditingProduct(null); setForm(EMPTY_FORM); setFormError(null); setShowForm(true); };
  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({ name: p.name, description: p.description, price: p.price, category: p.category, image: p.image, stock: p.stock });
    setFormError(null);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingProduct(null); };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'price' || name === 'stock' ? Number(value) : value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name || !form.description || !form.price || !form.category || !form.image) {
      setFormError('Please fill in all required fields.');
      return;
    }
    try {
      setFormLoading(true);
      if (editingProduct) {
        await sellerService.updateProduct(editingProduct.id, form);
      } else {
        await sellerService.createProduct(form);
      }
      await loadProducts();
      closeForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await sellerService.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  // ── Order status ──────────────────────────────────────────
  const handleStatusUpdate = async (orderId: string, status: 'processing' | 'shipped' | 'cancelled') => {
    setStatusError(null);
    try {
      await sellerService.updateOrderStatus(orderId, status);
      await loadOrders();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="w-8 h-8 text-primary-600" />
            Seller Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Manage your products and orders</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/profile')}>
          Back to Profile
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="lg" className="text-center">
          <p className="text-3xl font-bold text-primary-600">{products.length}</p>
          <p className="text-gray-600 mt-1">Products Listed</p>
        </Card>
        <Card padding="lg" className="text-center">
          <p className="text-3xl font-bold text-primary-600">{orders.length}</p>
          <p className="text-gray-600 mt-1">Total Orders</p>
        </Card>
        <Card padding="lg" className="text-center">
          <p className="text-3xl font-bold text-primary-600">
            {orders.filter(o => o.status === 'pending').length}
          </p>
          <p className="text-gray-600 mt-1">Pending Orders</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1">
          {([['products', 'My Products', ShoppingBag], ['orders', 'Orders', Package]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Products Tab ── */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>

          {/* Product Form Modal */}
          {showForm && (
            <Card padding="lg" className="border-2 border-primary-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Product Name *" name="name" value={form.name} onChange={handleFormChange} fullWidth required />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input label="Price ($) *" name="price" type="number" value={form.price} onChange={handleFormChange} fullWidth required />
                  <Input label="Stock *" name="stock" type="number" value={form.stock} onChange={handleFormChange} fullWidth required />
                  <Input label="Image URL *" name="image" value={form.image} onChange={handleFormChange} fullWidth required />
                </div>

                {form.image && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                    <img src={form.image} alt="preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={closeForm} disabled={formLoading}>Cancel</Button>
                  <Button type="submit" loading={formLoading}>
                    {editingProduct ? 'Save Changes' : 'Add Product'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Products List */}
          {loadingProducts ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : products.length === 0 ? (
            <Card className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No products yet. Add your first product!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(product => (
                <Card key={product.id} padding="lg" className="flex flex-col">
                  <div className="aspect-video mb-3 rounded-lg overflow-hidden bg-gray-100">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <Badge variant="primary" size="sm" className="mb-1">{product.category}</Badge>
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-primary-600">{formatCurrency(product.price)}</span>
                      <span className={`text-sm font-medium ${product.stock === 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {product.stock === 0 ? 'Out of stock' : `Stock: ${product.stock}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                    <Button variant="outline" size="sm" fullWidth onClick={() => openEdit(product)}>
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button variant="danger" size="sm" fullWidth onClick={() => handleDelete(product.id)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
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

          {loadingOrders ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : orders.length === 0 ? (
            <Card className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No orders yet for your products.</p>
            </Card>
          ) : (
            orders.map(order => {
              const cfg = statusConfig(order.status);
              const StatusIcon = cfg.icon;
              const canToShip   = order.status === 'pending';
              const canToReceive = order.status === 'processing';
              const canCancel   = order.status === 'pending' || order.status === 'processing';

              return (
                <Card key={order.id} padding="lg">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      {/* Order meta */}
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </h3>
                        <Badge variant={cfg.variant} className="flex items-center gap-1">
                          <StatusIcon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </Badge>
                      </div>

                      <div className="text-sm text-gray-500 space-y-0.5 mb-3">
                        <p>Placed: {formatDate(order.createdAt)}</p>
                        {order.buyer && (
                          <p>Buyer: {order.buyer.firstName} {order.buyer.lastName} ({order.buyer.email})</p>
                        )}
                        <p className="font-medium text-gray-900">Total: {formatCurrency(order.total)}</p>
                      </div>

                      {/* Items */}
                      <div className="space-y-2">
                        {order.items.map(({ product, quantity }) => (
                          <div key={product.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 rounded overflow-hidden bg-white flex-shrink-0">
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                              <p className="text-xs text-gray-500">Qty: {quantity} × {formatCurrency(product.price)}</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                              {formatCurrency(product.price * quantity)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    {(canToShip || canToReceive || canCancel) && (
                      <div className="flex flex-col gap-2 sm:min-w-[140px]">
                        {canToShip && (
                          <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'processing')}>
                            <Truck className="w-4 h-4 mr-1" /> Mark To Ship
                          </Button>
                        )}
                        {canToReceive && (
                          <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'shipped')}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Mark Shipped
                          </Button>
                        )}
                        {canCancel && (
                          <Button size="sm" variant="danger" onClick={() => handleStatusUpdate(order.id, 'cancelled')}>
                            <XCircle className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
