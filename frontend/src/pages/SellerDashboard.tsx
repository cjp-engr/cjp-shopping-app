import React, { useEffect, useRef, useState } from 'react';
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
  Upload, ImageOff, DollarSign, X,
} from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

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
    case 'shipped':    return { icon: Truck,        variant: 'gray'    as const, label: 'To Receive' };
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
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('upload');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string>(''); // URL mode only
  const formRef = useRef<HTMLDivElement>(null);

  // Orders state
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; productId: string | null; loading: boolean }>({ open: false, productId: null, loading: false });

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
  const scrollToForm = () => setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

  const openCreate = () => {
    setEditingProduct(null); setForm(EMPTY_FORM); setFormError(null);
    setImageMode('upload'); setImageFiles([]); setImagePreviews([]);
    setExistingImageUrls([]); setImagePreview(''); setShowForm(true);
    scrollToForm();
  };
  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({ name: p.name, description: p.description, price: p.price, category: p.category, image: p.image, stock: p.stock });
    setFormError(null);
    setImageMode('upload');
    setImageFiles([]); setImagePreviews([]);
    const imgs = p.images?.length ? p.images : p.image ? [p.image] : [];
    setExistingImageUrls(imgs);
    setImagePreview('');
    setShowForm(true);
    scrollToForm();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    const merged = [...imageFiles, ...picked].slice(0, 10);
    setImageFiles(merged);
    setImagePreviews(merged.map(f => URL.createObjectURL(f)));
    setForm(prev => ({ ...prev, image: merged[0]?.name ?? prev.image }));
    e.target.value = '';
  };

  const removeNewImage = (index: number) => {
    const next = imageFiles.filter((_, i) => i !== index);
    setImageFiles(next);
    setImagePreviews(next.map(f => URL.createObjectURL(f)));
    if (next.length === 0) setForm(prev => ({ ...prev, image: existingImageUrls[0] ?? '' }));
  };

  const closeForm = () => {
    setShowForm(false); setEditingProduct(null);
    setImageFiles([]); setImagePreviews([]); setExistingImageUrls([]); setImagePreview('');
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'price' || name === 'stock' ? Number(value) : value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const hasImage = imageMode === 'url'
      ? !!form.image
      : imageFiles.length > 0 || existingImageUrls.length > 0;
    if (!form.name || !form.description || !form.price || !form.category || !hasImage) {
      setFormError('Please fill in all required fields including at least one product image.');
      return;
    }
    try {
      setFormLoading(true);
      if (editingProduct) {
        await sellerService.updateProduct(editingProduct.id, form, imageFiles.length > 0 ? imageFiles : undefined);
      } else {
        await sellerService.createProduct(form, imageFiles.length > 0 ? imageFiles : undefined);
      }
      await loadProducts();
      closeForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setFormLoading(false);
    }
  };

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

  // ── Order status ──────────────────────────────────────────
  const handleStatusUpdate = async (orderId: string, status: 'processing' | 'shipped' | 'delivered' | 'cancelled') => {
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
        const actionableCount = orders.filter(o => ['pending', 'processing', 'shipped'].includes(o.status)).length;
        return (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex gap-1">
              {([
                { key: 'products', label: 'My Products', Icon: ShoppingBag, badge: null },
                { key: 'orders',   label: 'Orders',      Icon: Package,     badge: actionableCount || null },
              ] as const).map(({ key, label, Icon, badge }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
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
          <div className="flex justify-end">
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>

          {/* Product Form */}
          {showForm && (
            <Card padding="lg" className="border-2 border-primary-200 dark:border-primary-800" ref={formRef}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
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
                  <Input label="Product Name" name="name" value={form.name} onChange={handleFormChange} fullWidth required />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      required
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description <span className="text-red-500">*</span></label>
                    <span className={`text-xs ${form.description.length >= 200 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                      {form.description.length}/200
                    </span>
                  </div>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    rows={3}
                    maxLength={200}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Price ($)" name="price" type="number" value={form.price} onChange={handleFormChange} fullWidth required />
                  <Input label="Stock" name="stock" type="number" value={form.stock} onChange={handleFormChange} fullWidth required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Images <span className="text-red-500">*</span></label>
                  <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 w-fit mb-3">
                    <button type="button" onClick={() => setImageMode('url')}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${imageMode === 'url' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                      Image URL
                    </button>
                    <button type="button" onClick={() => setImageMode('upload')}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${imageMode === 'upload' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                      Upload Files
                    </button>
                  </div>

                  {imageMode === 'url' ? (
                    <>
                      <Input
                        name="image"
                        placeholder="https://example.com/image.jpg"
                        value={form.image}
                        onChange={e => {
                          handleFormChange(e);
                          setImagePreview(e.target.value);
                          setImageFiles([]);
                        }}
                        fullWidth
                      />
                      {imagePreview && (
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 mt-2">
                          <ImgWithFallback src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      {/* Existing images (editing, no new files yet) */}
                      {existingImageUrls.length > 0 && imageFiles.length === 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">Current images — add new files below to replace them</p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {existingImageUrls.map((url, i) => (
                              <div key={i} className="relative flex-shrink-0">
                                <ImgWithFallback
                                  src={url}
                                  alt={`Image ${i + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* New image thumbnails */}
                      {imagePreviews.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {imagePreviews.map((src, i) => (
                            <div key={i} className="relative flex-shrink-0">
                              <img
                                src={src}
                                alt={`New ${i + 1}`}
                                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => removeNewImage(i)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                aria-label="Remove image"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add photos dropzone */}
                      {imageFiles.length < 10 && (
                        <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors w-full">
                          <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div>
                            <span className="text-sm text-gray-600 font-medium">
                              {imageFiles.length === 0 ? 'Click to add photos' : 'Add more photos'}
                            </span>
                            <span className="block text-xs text-gray-400">
                              PNG, JPG, WEBP · up to {10 - imageFiles.length} more
                            </span>
                          </div>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                        </label>
                      )}

                      {imageFiles.length > 0 && editingProduct && (
                        <p className="text-xs text-amber-600">New photos will replace the current images when saved.</p>
                      )}
                    </div>
                  )}
                </div>

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
                <Card key={product.id} padding="none" className="flex flex-col overflow-hidden">
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
                    <ImgWithFallback src={product.image} alt={product.name} className="w-full h-full object-cover" />
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

          {/* Status filter tabs */}
          {!loadingOrders && orders.length > 0 && (() => {
            const statusTabs = [
              { key: 'all',        label: 'All',        icon: ShoppingBag },
              { key: 'pending',    label: 'Pending',    icon: Clock },
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
                <p className="text-gray-600 dark:text-gray-400">No {statusConfig(orderStatusFilter).label.toLowerCase()} orders.</p>
              </Card>
            );
            return filtered.map(order => {
              const cfg = statusConfig(order.status);
              const StatusIcon = cfg.icon;
              const canToShip    = order.status === 'pending';
              const canToReceive = order.status === 'processing';
              const canCancel    = order.status === 'pending' || order.status === 'processing' || order.status === 'shipped';

              return (
                <Card key={order.id} padding="none" className="overflow-hidden">
                  {/* Order header */}
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-200">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <Badge variant={cfg.variant} size="sm" className="flex items-center gap-1">
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(order.createdAt)}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(order.total)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-5">
                    <div className="flex-1 min-w-0">
                      {/* Buyer */}
                      {order.buyer && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          <span className="font-medium text-gray-700 dark:text-gray-200">
                            {order.buyer.firstName} {order.buyer.lastName}
                          </span>
                          {' · '}{order.buyer.email}
                        </p>
                      )}

                      {/* Items */}
                      <div className="space-y-2">
                        {order.items.map(({ product, quantity }) => (
                          <div key={product.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white dark:bg-gray-700 flex-shrink-0 border border-gray-100 dark:border-gray-600">
                              <ImgWithFallback src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Qty {quantity} × {formatCurrency(product.price)}</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-shrink-0 tabular-nums">
                              {formatCurrency(product.price * quantity)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    {(canToShip || canToReceive || canCancel) && (
                      <div className="flex sm:flex-col gap-2 sm:min-w-[148px]">
                        {canToShip && (
                          <Button size="sm" fullWidth onClick={() => handleStatusUpdate(order.id, 'processing')}>
                            <Package className="w-4 h-4 mr-1" /> Mark to Ship
                          </Button>
                        )}
                        {canToReceive && (
                          <Button size="sm" fullWidth onClick={() => handleStatusUpdate(order.id, 'shipped')}>
                            <Truck className="w-4 h-4 mr-1" /> Mark Shipped
                          </Button>
                        )}
                        {canCancel && (
                          <Button size="sm" fullWidth variant="danger" onClick={() => handleStatusUpdate(order.id, 'cancelled')}>
                            <XCircle className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            });
          })()}
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
    </div>
  );
};
