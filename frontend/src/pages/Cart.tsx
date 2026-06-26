import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { formatCurrency } from '../utils/formatters';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Lock, Tag } from 'lucide-react';

export const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, validateCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [removedCount, setRemovedCount] = useState(0);

  // On mount, verify all cart items still exist in the DB and remove stale ones
  useEffect(() => {
    validateCart().then(n => { if (n > 0) setRemovedCount(n); });
  }, [validateCart]);

  const handleCheckout = () => {
    navigate(isAuthenticated ? '/checkout' : '/login?redirect=/checkout');
  };

  const handleIncrement = (productId: string, currentQuantity: number, stock: number) => {
    if (currentQuantity < stock) updateQuantity(productId, currentQuantity + 1);
  };

  const handleDecrement = (productId: string, currentQuantity: number) => {
    if (currentQuantity > 1) updateQuantity(productId, currentQuantity - 1);
  };

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
          <ShoppingCart className="w-12 h-12 text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8 max-w-sm text-sm">
          Looks like you haven't added anything yet. Explore our products and find something you love!
        </p>
        <Button size="lg" onClick={() => navigate('/products')}>
          <ShoppingBag className="w-5 h-5 mr-2" />
          Start Shopping
        </Button>
      </div>
    );
  }

  const freeShippingThreshold = 50;

  // Group items by seller for rendering
  const sellerGroups = useMemo(() => {
    const map = new Map<string, { sellerName: string; items: typeof cart.items; subtotal: number }>();
    for (const cartItem of cart.items) {
      const key = cartItem.product.sellerId ?? '__unknown__';
      if (!map.has(key)) {
        map.set(key, {
          sellerName: cartItem.product.sellerName ?? 'Seller',
          items: [],
          subtotal: 0,
        });
      }
      const group = map.get(key)!;
      group.items.push(cartItem);
      group.subtotal += cartItem.product.price * cartItem.quantity;
    }
    return Array.from(map.values());
  }, [cart.items]);

  const allFreeShipping = cart.shipping === 0 && cart.items.length > 0;
  const anySellerNeedsMore = sellerGroups.some(g => g.subtotal < freeShippingThreshold);

  return (
    <div className="space-y-6">
      {/* Stale-item notice */}
      {removedCount > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
          <span>
            {removedCount} {removedCount === 1 ? 'item was' : 'items were'} removed from your cart because {removedCount === 1 ? 'it is' : 'they are'} no longer available.
          </span>
          <button onClick={() => setRemovedCount(0)} className="flex-shrink-0 font-semibold hover:underline">Dismiss</button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shopping Cart</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'}
          </p>
        </div>
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Continue Shopping
        </button>
      </div>

      {/* Per-seller shipping banners */}
      {anySellerNeedsMore && !allFreeShipping && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
          <Tag className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Add more items per seller to unlock free shipping for that seller (min. {formatCurrency(freeShippingThreshold)}).
          </p>
        </div>
      )}
      {allFreeShipping && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-3">
          <Tag className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">You've unlocked <span className="font-bold">free shipping!</span></p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items grouped by seller */}
        <div className="lg:col-span-2 space-y-6">
          {sellerGroups.map((group) => (
            <div key={group.sellerName} className="space-y-3">
              {/* Seller header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  🏪 {group.sellerName}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  group.subtotal >= freeShippingThreshold
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {group.subtotal >= freeShippingThreshold ? 'Free Shipping' : `+${formatCurrency(freeShippingThreshold - group.subtotal)} for free shipping`}
                </span>
              </div>
              {group.items.map(({ product, quantity }) => (
            <Card key={product.id} padding="none">
              <div className="flex gap-4 p-4">
                {/* Image */}
                <div
                  className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold text-gray-900 text-sm mb-0.5 cursor-pointer hover:text-primary-600 line-clamp-2 leading-snug"
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-400 mb-1">{product.category}</p>
                  <p className="text-base font-bold text-primary-600">{formatCurrency(product.price)}</p>
                  {product.stock < 10 && product.stock > 0 && (
                    <p className="text-xs text-orange-600 mt-0.5">Only {product.stock} left in stock</p>
                  )}
                </div>

                {/* Controls */}
                <div className="flex flex-col items-end justify-between gap-2">
                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                    <button
                      onClick={() => handleDecrement(product.id, quantity)}
                      disabled={quantity <= 1}
                      className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 py-2 text-sm font-semibold min-w-[2.5rem] text-center bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleIncrement(product.id, quantity, product.stock)}
                      disabled={quantity >= product.stock}
                      className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-sm font-bold text-gray-900">{formatCurrency(product.price * quantity)}</p>
                </div>
              </div>
            </Card>
              ))}
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card padding="lg" className="sticky top-20">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Order Summary</h2>

            <div className="space-y-3 text-sm mb-5">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cart.totalItems} items)</span>
                <span className="font-medium text-gray-900">{formatCurrency(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className={`font-medium ${cart.shipping === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {cart.shipping === 0 ? 'FREE' : formatCurrency(cart.shipping)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span className="font-medium text-gray-900">{formatCurrency(cart.tax)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-base">
                <span className="text-gray-900">Total</span>
                <span className="text-primary-600">{formatCurrency(cart.total)}</span>
              </div>
            </div>

            <Button fullWidth size="lg" onClick={handleCheckout}>
              Proceed to Checkout
            </Button>

            {!isAuthenticated && (
              <p className="text-xs text-gray-500 text-center mt-3">
                You'll need to sign in to complete your purchase
              </p>
            )}

            <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
              <Lock className="w-3.5 h-3.5" />
              Secured with 256-bit SSL encryption
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
