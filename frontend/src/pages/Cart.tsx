import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { formatCurrency } from '../utils/formatters';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Lock, Tag, Ticket } from 'lucide-react';
import { TAX_RATE, FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from '../utils/constants';
import { SelectVoucherModal } from '../components/voucher/SelectVoucherModal';

export const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, validateCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [removedCount, setRemovedCount] = useState(0);

  // On mount, verify all cart items still exist in the DB and remove stale ones
  useEffect(() => {
    validateCart().then(n => { if (n > 0) setRemovedCount(n); });
  }, [validateCart]);

  // Per-seller delivery option selection (for buyer_pays sellers)
  const [deliverySelections, setDeliverySelections] = useState<Record<string, string>>({});
  // Per-seller voucher state
  const [voucherSelections, setVoucherSelections] = useState<Record<string, { code: string; discountAmount: number }>>({});
  const [voucherModalKey, setVoucherModalKey] = useState<string | null>(null);

  const handleCheckout = () => {
    const couponCodes: Record<string, string> = {};
    for (const [k, v] of Object.entries(voucherSelections)) {
      if (v.code) couponCodes[k] = v.code;
    }
    navigate(isAuthenticated ? '/checkout' : '/login?redirect=/checkout', {
      state: { deliverySelections, voucherSelections },
    });
  };

  const handleIncrement = (productId: string, currentQuantity: number, stock: number) => {
    if (currentQuantity < stock) updateQuantity(productId, currentQuantity + 1);
  };

  const handleDecrement = (productId: string, currentQuantity: number) => {
    if (currentQuantity > 1) updateQuantity(productId, currentQuantity - 1);
  };

  // Effective price after product-level % discount
  const effectivePrice = (product: typeof cart.items[0]['product']) =>
    product.discount && product.discount > 0
      ? product.price * (1 - product.discount / 100)
      : product.price;

  // Group items by seller for rendering
  const sellerGroups = useMemo(() => {
    const map = new Map<string, {
      sellerName: string; items: typeof cart.items; subtotal: number; discount: number;
      voucherDiscount: number;
      shippingMode: 'free' | 'buyer_pays' | 'threshold';
      shippingOptions: string[];
      shipping: number; tax: number; storeTotal: number;
    }>();
    for (const cartItem of cart.items) {
      const key = cartItem.product.sellerId ?? '__unknown__';
      if (!map.has(key)) {
        map.set(key, {
          sellerName: cartItem.product.sellerName ?? 'Seller',
          items: [], subtotal: 0, discount: 0, voucherDiscount: 0,
          shippingMode: 'threshold', shippingOptions: [],
          shipping: 0, tax: 0, storeTotal: 0,
        });
      }
      const group = map.get(key)!;
      group.items.push(cartItem);
      const effPrice = effectivePrice(cartItem.product);
      group.subtotal += effPrice * cartItem.quantity;
      // Product-level discount savings
      if (cartItem.product.discount && cartItem.product.discount > 0) {
        group.discount += (cartItem.product.price - effPrice) * cartItem.quantity;
      }
      // Voucher discount (overrides each loop but same seller so idempotent)
      group.voucherDiscount = voucherSelections[key]?.discountAmount ?? 0;
      // Capture seller's shippingFee config from first product that has it
      if (group.shippingMode === 'threshold' && cartItem.product.shippingFee) {
        group.shippingMode = cartItem.product.shippingFee === 'free' ? 'free' : 'buyer_pays';
      }
      // Collect all delivery options across this seller's products
      for (const opt of cartItem.product.shippingOptions ?? []) {
        if (!group.shippingOptions.includes(opt)) group.shippingOptions.push(opt);
      }
    }
    for (const [key, group] of map.entries()) {
      const netSubtotal = Math.max(0, group.subtotal - group.voucherDiscount);
      if (group.shippingMode === 'free') {
        group.shipping = 0;
      } else if (group.shippingMode === 'buyer_pays') {
        const selectedOpt = deliverySelections[key] ?? group.shippingOptions[0];
        const fee = selectedOpt ? group.items[0]?.product.shippingFeeAmounts?.[selectedOpt] : undefined;
        group.shipping = fee ?? -1;
      } else {
        group.shipping = netSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
      }
      group.tax = netSubtotal * TAX_RATE;
      group.storeTotal = netSubtotal + Math.max(0, group.shipping) + group.tax;
    }
    return Array.from(map.entries()).map(([key, group]) => ({ ...group, key }));
  }, [cart.items, deliverySelections, voucherSelections]);

  const hasUnknownShipping = sellerGroups.some(g => g.shipping === -1);
  const allFreeShipping = sellerGroups.length > 0 && sellerGroups.every(g => g.shippingMode === 'free' || (g.shippingMode === 'threshold' && g.shipping === 0));
  const anySellerNeedsMore = sellerGroups.some(g => g.shippingMode === 'threshold' && g.subtotal < FREE_SHIPPING_THRESHOLD);
  const totalDiscount = sellerGroups.reduce((s, g) => s + g.discount + g.voucherDiscount, 0);
  const summarySubtotal = sellerGroups.reduce((s, g) => s + g.subtotal + g.discount, 0);
  const summaryShipping = sellerGroups.reduce((s, g) => s + Math.max(0, g.shipping), 0);
  const summaryTax = sellerGroups.reduce((s, g) => s + g.tax, 0);
  const summaryTotal = sellerGroups.reduce((s, g) => s + g.storeTotal, 0);

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

  const modalGroup = voucherModalKey ? sellerGroups.find(g => g.key === voucherModalKey) ?? null : null;

  return (
    <>
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
            Add more items per seller to unlock free shipping for that seller (min. {formatCurrency(FREE_SHIPPING_THRESHOLD)}).
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
          {sellerGroups.map((group) => {
            const activeVoucher = voucherSelections[group.key];
            return (
            <div key={group.key} className="space-y-3">
              {/* Seller header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  🏪 {group.sellerName}
                </span>
                {group.shippingMode === 'free' && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Free Shipping
                  </span>
                )}
                {group.shippingMode === 'threshold' && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    group.subtotal >= FREE_SHIPPING_THRESHOLD
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {group.subtotal >= FREE_SHIPPING_THRESHOLD ? 'Free Shipping' : `+${formatCurrency(FREE_SHIPPING_THRESHOLD - group.subtotal)} for free shipping`}
                  </span>
                )}
              </div>

              {group.items.map(({ product, quantity }) => {
                const effPrice = effectivePrice(product);
                const hasDiscount = product.discount && product.discount > 0;
                return (
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
                        <div className="flex items-baseline gap-2">
                          <p className="text-base font-bold text-primary-600">{formatCurrency(effPrice)}</p>
                          {hasDiscount && (
                            <>
                              <p className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</p>
                              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                                -{product.discount}%
                              </span>
                            </>
                          )}
                        </div>
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

                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(effPrice * quantity)}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Delivery option selector for buyer_pays sellers */}
              {group.shippingMode === 'buyer_pays' && group.shippingOptions.length > 0 && (
                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/40 px-4 py-3">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12h12l1-12" />
                    </svg>
                    Delivery Option
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.shippingOptions.map(opt => {
                      const fee = group.items[0]?.product.shippingFeeAmounts?.[opt];
                      const currentSel = deliverySelections[group.key] ?? group.shippingOptions[0];
                      const isSelected = currentSel === opt;
                      const label = opt === 'standard' ? 'Standard' : opt === 'express' ? 'Express' : 'Pickup';
                      return (
                        <button
                          key={opt}
                          onClick={() => setDeliverySelections(prev => ({ ...prev, [group.key]: opt }))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            isSelected
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary-400'
                          }`}
                        >
                          {label}
                          {fee !== undefined && (
                            <span className={isSelected ? 'text-primary-100' : 'text-gray-400 dark:text-gray-500'}>
                              {fee === 0 ? 'FREE' : formatCurrency(fee)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shop voucher row */}
              <button
                onClick={() => setVoucherModalKey(group.key)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-dashed border-primary-300 dark:border-primary-700 bg-primary-50/40 dark:bg-primary-900/10 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              >
                <span className="flex items-center gap-2 text-xs font-medium text-primary-600 dark:text-primary-400">
                  <Ticket className="w-3.5 h-3.5" />
                  {activeVoucher ? `Voucher: ${activeVoucher.code}` : 'Apply Shop Voucher'}
                </span>
                {activeVoucher ? (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    -{formatCurrency(activeVoucher.discountAmount)}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Select →</span>
                )}
              </button>

              {/* Per-seller cost breakdown */}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 px-4 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Order Amount</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(group.subtotal + group.discount)}</span>
                </div>
                {group.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Product Discount</span>
                    <span className="font-medium">-{formatCurrency(group.discount)}</span>
                  </div>
                )}
                {group.voucherDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Voucher</span>
                    <span className="font-medium">-{formatCurrency(group.voucherDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Shipping</span>
                  {group.shipping === -1 ? (
                    <span className="font-medium text-gray-400 dark:text-gray-500 italic text-xs self-center">Select option above</span>
                  ) : (
                    <span className={`font-medium ${group.shipping === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}>
                      {group.shipping === 0 ? 'FREE' : formatCurrency(group.shipping)}
                    </span>
                  )}
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax (8%)</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(group.tax)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1.5 font-semibold">
                  <span className="text-gray-800 dark:text-gray-200">
                    {group.shipping === -1 ? 'Subtotal + Tax' : 'Store Total'}
                  </span>
                  <span className="text-primary-600 dark:text-primary-400">{formatCurrency(group.storeTotal)}</span>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card padding="lg" className="sticky top-20">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Order Summary</h2>

            <div className="space-y-3 text-sm mb-5">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal ({cart.totalItems} items)</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(summarySubtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount</span>
                  <span className="font-medium">-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Shipping</span>
                {hasUnknownShipping ? (
                  <span className="font-medium text-gray-400 italic text-xs self-center">Pending selection</span>
                ) : (
                  <span className={`font-medium ${summaryShipping === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                    {summaryShipping === 0 ? 'FREE' : formatCurrency(summaryShipping)}
                  </span>
                )}
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Tax</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(summaryTax)}</span>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between font-bold text-base">
                <span className="text-gray-900 dark:text-white">{hasUnknownShipping ? 'Est. Total*' : 'Total'}</span>
                <span className="text-primary-600">{formatCurrency(summaryTotal)}</span>
              </div>
              {hasUnknownShipping && (
                <p className="text-xs text-gray-400 italic">* Excludes pending shipping fees</p>
              )}
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

    {modalGroup && (
      <SelectVoucherModal
        isOpen
        onClose={() => setVoucherModalKey(null)}
        sellerId={modalGroup.key}
        sellerName={modalGroup.sellerName}
        orderAmount={modalGroup.subtotal}
        selectedCode={voucherSelections[modalGroup.key]?.code ?? null}
        onApply={(code, discountAmount) => {
          setVoucherSelections(prev => ({ ...prev, [modalGroup.key]: { code, discountAmount } }));
          setVoucherModalKey(null);
        }}
        onRemove={() => {
          setVoucherSelections(prev => {
            const next = { ...prev };
            delete next[modalGroup.key];
            return next;
          });
          setVoucherModalKey(null);
        }}
      />
    )}
    </>
  );
};
