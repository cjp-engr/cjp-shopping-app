import React, { useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SelectVoucherModal } from '../components/voucher/SelectVoucherModal';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { formatCurrency } from '../utils/formatters';
import type { CheckoutData, PaymentMethod } from '../types/order';
import type { SavedCard, SavedAddress } from '../types/user';
import orderService from '../services/orderService';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import {
  CreditCard,
  Lock,
  MapPin,
  Mail,
  Phone,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Package,
  Home,
  PlusCircle,
  Trash2,
  Tag,
  ChevronRight,
  Truck,
  Zap,
} from 'lucide-react';

type PaymentMode = 'saved' | 'new';

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orderPlaced = useRef(false);

  const savedAddresses: SavedAddress[] = user?.savedAddresses ?? [];
  const defaultAddr = savedAddresses.find(a => a.isDefault) ?? savedAddresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    defaultAddr?._id ?? 'new'
  );

  const [shippingData, setShippingData] = useState({
    street: defaultAddr?.street || '',
    city: defaultAddr?.city || '',
    state: defaultAddr?.state || '',
    zipCode: defaultAddr?.zipCode || '',
    country: defaultAddr?.country || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [paymentData, setPaymentData] = useState({
    type: 'credit-card' as PaymentMethod['type'],
    cardNumber: '',
    cardHolder: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });

  const [shippingErrors, setShippingErrors] = useState<Record<string, string>>({});
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});

  // Saved cards
  const savedCards: SavedCard[] = user?.savedCards ?? [];
  const hasCards = savedCards.length > 0;
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(hasCards ? 'saved' : 'new');
  const [selectedCardId, setSelectedCardId] = useState<string>(
    savedCards.find(c => c.isDefault)?._id ?? savedCards[0]?._id ?? ''
  );
  const [saveCard, setSaveCard] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  // Inherit selections passed from Cart page
  const cartState = location.state as { deliverySelections?: Record<string, string>; voucherSelections?: Record<string, { code: string; discountAmount: number }> } | null;

  // Per-seller voucher state: { sellerId -> { code, discountAmount } }
  const [voucherSelections, setVoucherSelections] = useState<Record<string, { code: string; discountAmount: number }>>(
    cartState?.voucherSelections ?? {}
  );
  const [voucherModalSellerId, setVoucherModalSellerId] = useState<string | null>(null);

  // Per-seller delivery option selection: { sellerId -> 'standard' | 'express' | 'pickup' }
  const [deliverySelections, setDeliverySelections] = useState<Record<string, string>>(
    cartState?.deliverySelections ?? {}
  );

  const FREE_SHIPPING_THRESHOLD = 50;

  const effectivePrice = (product: typeof cart.items[0]['product']) =>
    product.discount && product.discount > 0
      ? product.price * (1 - product.discount / 100)
      : product.price;

  // Group cart items by seller for the Order Review and per-seller shipping display
  const sellerGroups = useMemo(() => {
    const map = new Map<string, {
      sellerId: string; sellerName: string; items: typeof cart.items;
      grossSubtotal: number; productDiscount: number; voucherDiscount: number;
      subtotal: number; shipping: number; tax: number; storeTotal: number;
      shippingOptions: string[]; shippingFee: string | undefined; shippingFeeAmounts: Record<string, number>;
      selectedDelivery: string | undefined;
    }>();
    for (const cartItem of cart.items) {
      const key = cartItem.product.sellerId ?? '__unknown__';
      if (!map.has(key)) {
        map.set(key, {
          sellerId: key, sellerName: cartItem.product.sellerName ?? 'Seller', items: [],
          grossSubtotal: 0, productDiscount: 0, voucherDiscount: 0,
          subtotal: 0, shipping: 0, tax: 0, storeTotal: 0,
          shippingOptions: [], shippingFee: undefined, shippingFeeAmounts: {},
          selectedDelivery: undefined,
        });
      }
      const group = map.get(key)!;
      group.items.push(cartItem);
      const sv = cartItem.selectedVariant;
      const variantPrice = sv?.price;
      const variantEffPrice = sv
        ? (sv.discount ? sv.price * (1 - sv.discount / 100) : sv.price)
        : null;
      const effPrice = variantEffPrice != null ? variantEffPrice : effectivePrice(cartItem.product);
      const basePrice = variantPrice != null ? variantPrice : cartItem.product.price;
      group.grossSubtotal += basePrice * cartItem.quantity;
      group.subtotal += effPrice * cartItem.quantity;
      if (sv && sv.discount && sv.discount > 0) {
        group.productDiscount += (sv.price - effPrice) * cartItem.quantity;
      } else if (variantPrice == null && cartItem.product.discount && cartItem.product.discount > 0) {
        group.productDiscount += (cartItem.product.price - effPrice) * cartItem.quantity;
      }
      for (const opt of (cartItem.product.shippingOptions ?? [])) {
        if (!group.shippingOptions.includes(opt)) group.shippingOptions.push(opt);
      }
      if (group.shippingFee === undefined && cartItem.product.shippingFee) {
        group.shippingFee = cartItem.product.shippingFee;
        group.shippingFeeAmounts = (cartItem.product.shippingFeeAmounts as Record<string, number>) ?? {};
      }
    }
    for (const [key, group] of map.entries()) {
      group.voucherDiscount = voucherSelections[key]?.discountAmount ?? 0;
      const netSubtotal = Math.max(0, group.subtotal - group.voucherDiscount);
      const selectedOpt = deliverySelections[key] ?? group.shippingOptions[0];
      group.selectedDelivery = selectedOpt;
      if (group.shippingFee === 'free') {
        group.shipping = 0;
      } else if (group.shippingFee === 'buyer_pays') {
        group.shipping = (selectedOpt && group.shippingFeeAmounts[selectedOpt]) ?? Object.values(group.shippingFeeAmounts)[0] ?? 0;
      } else {
        group.shipping = netSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 9.99;
      }
      group.tax = netSubtotal * 0.08;
      group.storeTotal = netSubtotal + group.shipping + group.tax;
    }
    return Array.from(map.values());
  }, [cart.items, voucherSelections, deliverySelections]);

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setShippingData((prev) => ({ ...prev, [name]: value }));
    if (shippingErrors[name]) {
      setShippingErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPaymentData((prev) => ({ ...prev, [name]: value }));
    if (paymentErrors[name]) {
      setPaymentErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateShipping = (): boolean => {
    const errors: Record<string, string> = {};

    // Only validate address fields when entering a new address
    if (selectedAddressId === 'new') {
      if (!shippingData.street.trim()) errors.street = 'Street address is required';
      if (!shippingData.city.trim()) errors.city = 'City is required';
      if (!shippingData.state.trim()) errors.state = 'State is required';
      if (!shippingData.zipCode.trim()) errors.zipCode = 'ZIP code is required';
    }

    if (!shippingData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingData.email)) {
      errors.email = 'Invalid email address';
    }
    if (!shippingData.phone.trim()) errors.phone = 'Phone number is required';

    setShippingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePayment = (): boolean => {
    const errors: Record<string, string> = {};

    if (!paymentData.cardNumber.trim()) {
      errors.cardNumber = 'Card number is required';
    } else if (!/^\d{16}$/.test(paymentData.cardNumber.replace(/\s/g, ''))) {
      errors.cardNumber = 'Card number must be 16 digits';
    }

    if (!paymentData.cardHolder.trim()) {
      errors.cardHolder = 'Cardholder name is required';
    }

    if (!paymentData.expiryMonth) {
      errors.expiryMonth = 'Month is required';
    }

    if (!paymentData.expiryYear) {
      errors.expiryYear = 'Year is required';
    }

    if (!paymentData.cvv.trim()) {
      errors.cvv = 'CVV is required';
    } else if (!/^\d{3,4}$/.test(paymentData.cvv)) {
      errors.cvv = 'CVV must be 3-4 digits';
    }

    setPaymentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateShipping()) {
      setStep('payment');
      window.scrollTo(0, 0);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMode === 'saved' && selectedCardId) {
      setStep('review');
      window.scrollTo(0, 0);
      return;
    }
    if (!validatePayment()) return;

    if (saveCard) {
      try {
        await fetch(API_ENDPOINTS.PAYMENT_METHODS, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            type: paymentData.type,
            last4: paymentData.cardNumber.slice(-4),
            cardHolder: paymentData.cardHolder,
            expiryMonth: paymentData.expiryMonth,
            expiryYear: paymentData.expiryYear,
            setAsDefault: savedCards.length === 0,
          }),
        });
      } catch {
        // Non-critical: proceed even if save fails
      }
    }
    setStep('review');
    window.scrollTo(0, 0);
  };

  const handleDeleteCard = async (cardId: string) => {
    setDeletingCardId(cardId);
    try {
      await fetch(API_ENDPOINTS.PAYMENT_METHOD(cardId), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      // If the deleted card was selected, reset selection
      if (selectedCardId === cardId) {
        const remaining = savedCards.filter(c => c._id !== cardId);
        setSelectedCardId(remaining[0]?._id ?? '');
        if (remaining.length === 0) setPaymentMode('new');
      }
    } catch {
      // best-effort
    } finally {
      setDeletingCardId(null);
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const checkoutData: CheckoutData = {
        shippingAddress: {
          street: shippingData.street,
          city: shippingData.city,
          state: shippingData.state,
          zipCode: shippingData.zipCode,
          country: shippingData.country || 'PH',
        },
        paymentMethod: {
          type: paymentData.type,
          last4: paymentData.cardNumber.slice(-4),
          cardHolder: paymentData.cardHolder,
        },
        contactEmail: shippingData.email,
        contactPhone: shippingData.phone,
      };

      const couponCodes: Record<string, string> = {};
      for (const [sellerId, v] of Object.entries(voucherSelections)) {
        if (v.code) couponCodes[sellerId] = v.code;
      }
      const orders = await orderService.createOrder(checkoutData, cart, user.id, couponCodes, deliverySelections);
      orderPlaced.current = true;
      clearCart();
      navigate(`/orders?success=${orders[0]?.id ?? ''}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (cart.items.length === 0 && !orderPlaced.current) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-1">Complete your purchase</p>
        </div>
        <button
          onClick={() => navigate('/cart')}
          className="flex items-center text-primary-600 hover:text-primary-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </button>
      </div>

      {/* Progress Steps */}
      <Card padding="lg">
        <div className="flex items-center justify-between">
          {[
            { key: 'shipping', label: 'Shipping', icon: MapPin },
            { key: 'payment', label: 'Payment', icon: CreditCard },
            { key: 'review', label: 'Review', icon: CheckCircle },
          ].map(({ key, label, icon: Icon }, index) => (
            <React.Fragment key={key}>
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    step === key
                      ? 'bg-primary-600 text-white'
                      : index < ['shipping', 'payment', 'review'].indexOf(step)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`font-medium ${
                    step === key ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < 2 && (
                <div
                  className={`flex-1 h-1 mx-4 rounded ${
                    index < ['shipping', 'payment', 'review'].indexOf(step)
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Order Failed</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Shipping Information */}
          {step === 'shipping' && (
            <Card padding="lg">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <MapPin className="w-6 h-6" />
                Shipping Information
              </h2>

              <form onSubmit={handleShippingSubmit} className="space-y-4">
                {/* ── Address selector ── */}
                <div className="space-y-2 mb-2">
                  {savedAddresses.map(addr => (
                    <button key={addr._id} type="button"
                      onClick={() => {
                        setSelectedAddressId(addr._id);
                        setShippingData(prev => ({ ...prev, street: addr.street, city: addr.city, state: addr.state, zipCode: addr.zipCode, country: addr.country }));
                        setShippingErrors({});
                      }}
                      className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${selectedAddressId === addr._id ? 'border-primary-500 bg-primary-50 dark:bg-primary-800/30' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedAddressId === addr._id ? 'border-primary-500' : 'border-gray-400'}`}>
                        {selectedAddressId === addr._id && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Home className="w-4 h-4 text-primary-600 flex-shrink-0" />
                          <span className="text-sm font-semibold">{addr.label}{addr.isDefault && <span className="ml-2 text-xs font-normal text-primary-500">Default</span>}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{[addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ')}</p>
                      </div>
                    </button>
                  ))}
                  {/* New address option */}
                  <button type="button"
                    onClick={() => {
                      setSelectedAddressId('new');
                      setShippingData(prev => ({ ...prev, street: '', city: '', state: '', zipCode: '', country: '' }));
                      setShippingErrors({});
                    }}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${selectedAddressId === 'new' ? 'border-primary-500 bg-primary-50 dark:bg-primary-800/30' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
                  >
                    <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedAddressId === 'new' ? 'border-primary-500' : 'border-gray-400'}`}>
                      {selectedAddressId === 'new' && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <PlusCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />
                        <span className="text-sm font-semibold">New Address</span>
                      </div>
                      <p className="text-xs text-gray-500">Enter a different delivery address</p>
                    </div>
                  </button>
                </div>

                {/* ── Address fields (only when 'new') ── */}
                {selectedAddressId === 'new' && (
                  <>
                    <Input
                      label="Street Address"
                      name="street"
                      value={shippingData.street}
                      onChange={handleShippingChange}
                      error={shippingErrors.street}
                      placeholder="123 Main St"
                      fullWidth
                      required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="City"
                        name="city"
                        value={shippingData.city}
                        onChange={handleShippingChange}
                        error={shippingErrors.city}
                        placeholder="New York"
                        fullWidth
                        required
                      />
                      <Input
                        label="State/Province"
                        name="state"
                        value={shippingData.state}
                        onChange={handleShippingChange}
                        error={shippingErrors.state}
                        placeholder="NY"
                        fullWidth
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="ZIP/Postal Code"
                        name="zipCode"
                        value={shippingData.zipCode}
                        onChange={handleShippingChange}
                        error={shippingErrors.zipCode}
                        placeholder="10001"
                        fullWidth
                        required
                      />
                    </div>
                  </>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Email"
                      type="email"
                      name="email"
                      value={shippingData.email}
                      onChange={handleShippingChange}
                      error={shippingErrors.email}
                      placeholder="you@example.com"
                      fullWidth
                      required
                    />
                    <Input
                      label="Phone"
                      type="tel"
                      name="phone"
                      value={shippingData.phone}
                      onChange={handleShippingChange}
                      error={shippingErrors.phone}
                      placeholder="+1 (555) 123-4567"
                      fullWidth
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" size="lg">
                    Continue to Payment
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Payment Information */}
          {step === 'payment' && (
            <Card padding="lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <CreditCard className="w-6 h-6" />
                Payment Information
              </h2>

              {/* ── Saved card / New card selector ── */}
              {hasCards && (
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('saved')}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                      paymentMode === 'saved'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-800/30'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      paymentMode === 'saved' ? 'border-primary-500' : 'border-gray-400 dark:border-gray-500'
                    }`}>
                      {paymentMode === 'saved' && <span className="w-2 h-2 rounded-full bg-primary-500" />}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${paymentMode === 'saved' ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-gray-200'}`}>Saved Card</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Use a saved card</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('new')}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                      paymentMode === 'new'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-800/30'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      paymentMode === 'new' ? 'border-primary-500' : 'border-gray-400 dark:border-gray-500'
                    }`}>
                      {paymentMode === 'new' && <span className="w-2 h-2 rounded-full bg-primary-500" />}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold flex items-center gap-1 ${paymentMode === 'new' ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-gray-200'}`}>
                        <PlusCircle className="w-3.5 h-3.5" /> New Card
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Enter a different card</p>
                    </div>
                  </button>
                </div>
              )}

              {/* ── Saved cards list ── */}
              {paymentMode === 'saved' && hasCards && (
                <div className="space-y-3 mb-5">
                  {savedCards.map(card => (
                    <div
                      key={card._id}
                      onClick={() => setSelectedCardId(card._id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                        selectedCardId === card._id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-800/30'
                          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        selectedCardId === card._id ? 'border-primary-500' : 'border-gray-400 dark:border-gray-500'
                      }`}>
                        {selectedCardId === card._id && <span className="w-2 h-2 rounded-full bg-primary-500" />}
                      </span>
                      <CreditCard className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                          {card.type.replace('-', ' ')} •••• {card.last4}
                          {card.isDefault && <span className="ml-2 text-xs text-primary-600 dark:text-primary-400 font-normal">Default</span>}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {card.cardHolder} · Expires {card.expiryMonth}/{card.expiryYear}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleDeleteCard(card._id); }}
                        disabled={deletingCardId === card._id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── New card form ── */}
              {(paymentMode === 'new' || !hasCards) && (
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Method
                  </label>
                  <select
                    name="type"
                    value={paymentData.type}
                    onChange={handlePaymentChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="credit-card">Credit Card</option>
                    <option value="debit-card">Debit Card</option>
                    <option value="paypal">PayPal</option>
                    <option value="cash-on-delivery">Cash on Delivery</option>
                  </select>
                </div>

                {paymentData.type !== 'cash-on-delivery' && (<>
                <Input
                  label="Card Number"
                  name="cardNumber"
                  value={paymentData.cardNumber}
                  onChange={handlePaymentChange}
                  error={paymentErrors.cardNumber}
                  placeholder="1234 5678 9012 3456"
                  maxLength={16}
                  fullWidth
                  required
                />

                <Input
                  label="Cardholder Name"
                  name="cardHolder"
                  value={paymentData.cardHolder}
                  onChange={handlePaymentChange}
                  error={paymentErrors.cardHolder}
                  placeholder="John Doe"
                  fullWidth
                  required
                />

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expiry Month <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="expiryMonth"
                      value={paymentData.expiryMonth}
                      onChange={handlePaymentChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="">MM</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <option key={month} value={month.toString().padStart(2, '0')}>
                          {month.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    {paymentErrors.expiryMonth && (
                      <p className="mt-1 text-sm text-red-500">{paymentErrors.expiryMonth}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expiry Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="expiryYear"
                      value={paymentData.expiryYear}
                      onChange={handlePaymentChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="">YYYY</option>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(
                        (year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        )
                      )}
                    </select>
                    {paymentErrors.expiryYear && (
                      <p className="mt-1 text-sm text-red-500">{paymentErrors.expiryYear}</p>
                    )}
                  </div>

                  <Input
                    label="CVV"
                    name="cvv"
                    value={paymentData.cvv}
                    onChange={handlePaymentChange}
                    error={paymentErrors.cvv}
                    placeholder="123"
                    maxLength={4}
                    fullWidth
                    required
                  />
                </div>

                </>)}

                {paymentData.type !== 'cash-on-delivery' && (
                <div className="flex items-center gap-2 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                  <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Your payment information is secure and encrypted
                  </p>
                </div>
                )}

                {/* Save card checkbox */}
                {paymentData.type !== 'cash-on-delivery' && (
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300 mt-2">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={e => setSaveCard(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Save this card for future purchases
                </label>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('shipping')}
                  >
                    Back
                  </Button>
                  <Button type="submit" size="lg">
                    Review Order
                  </Button>
                </div>
              </form>
              )}

              {/* ── Saved card mode: Back + Continue buttons ── */}
              {paymentMode === 'saved' && hasCards && (
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep('shipping')}>Back</Button>
                  <Button
                    size="lg"
                    disabled={!selectedCardId}
                    onClick={() => { setStep('review'); window.scrollTo(0, 0); }}
                  >
                    Review Order
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Order Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <Card padding="lg">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Order Review</h2>

                {/* Items grouped by seller */}
                <div className="space-y-6 mb-6">
                  {sellerGroups.map((group) => {
                    const voucher = voucherSelections[group.sellerId];
                    return (
                    <div key={group.sellerId}>
                      {/* Seller header */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          🏪 {group.sellerName}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          group.shipping === 0
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        }`}>
                          {group.shipping === 0 ? 'Free Shipping' : `Shipping: ${formatCurrency(group.shipping)}`}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {group.items.map(({ product, quantity, selectedVariant }) => {
                          const itemKey = selectedVariant?.key ?? product.id;
                          const effPrice = selectedVariant
                            ? (selectedVariant.discount && selectedVariant.discount > 0
                                ? selectedVariant.price * (1 - selectedVariant.discount / 100)
                                : selectedVariant.price)
                            : effectivePrice(product);
                          return (
                          <div key={itemKey} className="flex gap-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                            <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                              <img
                                src={selectedVariant?.image || product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 dark:text-white">{product.name}</h3>
                              {selectedVariant && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {Object.entries(selectedVariant.attributes).map(([k, v]) => `${k}: ${v}`).join(' / ')}
                                </p>
                              )}
                              <p className="text-sm text-gray-500 dark:text-gray-400">{product.category}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Qty: {quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900 dark:text-white">
                                {formatCurrency(effPrice * quantity)}
                              </p>
                              {selectedVariant?.discount && selectedVariant.discount > 0 ? (
                                <>
                                  <p className="text-xs text-gray-400 line-through">{formatCurrency(selectedVariant.price)} each</p>
                                  <span className="text-xs font-semibold text-emerald-500">-{selectedVariant.discount}%</span>
                                </>
                              ) : selectedVariant ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(effPrice)} each</p>
                              ) : product.discount && product.discount > 0 ? (
                                <p className="text-xs text-gray-400 line-through">{formatCurrency(product.price * quantity)}</p>
                              ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(product.price)} each</p>
                              )}
                            </div>
                          </div>
                          );
                        })}
                      </div>

                      {/* Delivery option picker */}
                      {group.shippingOptions.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5" /> Delivery Method
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {group.shippingOptions.map((opt) => {
                              const label = opt === 'standard' ? 'Standard' : opt === 'express' ? 'Express' : 'Pickup';
                              const Icon = opt === 'express' ? Zap : opt === 'pickup' ? Package : Truck;
                              const selected = (deliverySelections[group.sellerId] ?? group.shippingOptions[0]) === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setDeliverySelections(prev => ({ ...prev, [group.sellerId]: opt }))}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                                    selected
                                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-800/30 text-primary-700 dark:text-primary-300'
                                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  {label}
                                  {group.shippingFee === 'buyer_pays' && group.shippingFeeAmounts[opt] != null && (
                                    <span className="ml-0.5 text-xs opacity-75">({formatCurrency(group.shippingFeeAmounts[opt])})</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Voucher button */}
                      <button
                        type="button"
                        onClick={() => setVoucherModalSellerId(group.sellerId)}
                        className={`w-full mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                          voucher
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-800/30 dark:border-primary-500 text-primary-700 dark:text-primary-100'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-orange-300 hover:text-orange-600 dark:hover:text-orange-400'
                        }`}
                      >
                        <Tag className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 text-left font-medium">
                          {voucher ? `Voucher applied: ${voucher.code}` : 'Select voucher'}
                        </span>
                        {voucher && (
                          <>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              -{formatCurrency(voucher.discountAmount)}
                            </span>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                          </>
                        )}
                        <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                      </button>

                      {/* Per-seller cost breakdown */}
                      <div className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 px-4 py-3 space-y-1.5 text-sm">
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>Order Amount</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(group.grossSubtotal)}</span>
                        </div>
                        {group.productDiscount > 0 && (
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                            <span>Product Discount</span>
                            <span className="font-medium">-{formatCurrency(group.productDiscount)}</span>
                          </div>
                        )}
                        {group.voucherDiscount > 0 && (
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                            <span>Voucher Discount</span>
                            <span className="font-medium">-{formatCurrency(group.voucherDiscount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>
                            Shipping
                            {group.selectedDelivery && group.shippingFee === 'buyer_pays' && (
                              <span className="ml-1 text-xs capitalize opacity-60">({group.selectedDelivery})</span>
                            )}
                          </span>
                          <span className={`font-medium ${group.shipping === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}>
                            {group.shipping === 0 ? 'FREE' : formatCurrency(group.shipping)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>Tax (8%)</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(group.tax)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1.5 font-semibold">
                          <span className="text-gray-800 dark:text-gray-200">Store Total</span>
                          <span className="text-primary-600 dark:text-primary-400">{formatCurrency(group.storeTotal)}</span>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>

                {/* Shipping Address */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Shipping Address
                  </h3>
                  <p className="text-gray-700">{shippingData.street}</p>
                  <p className="text-gray-700">
                    {shippingData.city}, {shippingData.state} {shippingData.zipCode}
                  </p>
                  <p className="text-gray-700">{shippingData.country}</p>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      <Mail className="w-4 h-4 inline mr-1" />
                      {shippingData.email}
                    </p>
                    <p className="text-sm text-gray-600">
                      <Phone className="w-4 h-4 inline mr-1" />
                      {shippingData.phone}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setStep('shipping')}
                  >
                    Edit
                  </Button>
                </div>

                {/* Payment Method */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Method
                  </h3>
                  {paymentMode === 'saved' && selectedCardId ? (() => {
                    const card = savedCards.find(c => c._id === selectedCardId);
                    return card ? (
                      <>
                        <p className="text-gray-700 dark:text-gray-300 capitalize">{card.type.replace('-', ' ')}</p>
                        <p className="text-gray-700 dark:text-gray-300">•••• •••• •••• {card.last4}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{card.cardHolder} · {card.expiryMonth}/{card.expiryYear}</p>
                      </>
                    ) : null;
                  })() : (
                    <>
                      <p className="text-gray-700 dark:text-gray-300 capitalize">{paymentData.type.replace('-', ' ')}</p>
                      <p className="text-gray-700 dark:text-gray-300">•••• •••• •••• {paymentData.cardNumber.slice(-4)}</p>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setStep('payment')}
                  >
                    Edit
                  </Button>
                </div>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('payment')}>
                  Back
                </Button>
                <Button size="lg" onClick={handlePlaceOrder} loading={loading}>
                  <Package className="w-5 h-5 mr-2" />
                  Place Order
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card padding="lg" className="sticky top-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

            {sellerGroups.map((group) => (
              <div key={group.sellerId} className="space-y-1.5 mb-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">🏪 {group.sellerName}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Order Amount</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(group.grossSubtotal)}</span>
                  </div>
                  {group.productDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Product Discount</span>
                      <span className="font-medium">-{formatCurrency(group.productDiscount)}</span>
                    </div>
                  )}
                  {group.voucherDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Voucher</span>
                      <span className="font-medium">-{formatCurrency(group.voucherDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>
                      Shipping
                      {group.selectedDelivery && group.shippingFee === 'buyer_pays' && (
                        <span className="ml-1 text-xs capitalize opacity-60">({group.selectedDelivery})</span>
                      )}
                    </span>
                    <span className={`font-medium ${group.shipping === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}>
                      {group.shipping === 0 ? 'FREE' : formatCurrency(group.shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Tax (8%)</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(group.tax)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-800 dark:text-gray-200 pt-0.5">
                    <span>Store Total</span>
                    <span className="text-primary-600 dark:text-primary-400">{formatCurrency(group.storeTotal)}</span>
                  </div>
                </div>
              </div>
            ))}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-1.5 mb-6">
              {sellerGroups.reduce((s, g) => s + g.productDiscount + g.voucherDiscount, 0) > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Total Savings</span>
                  <span>-{formatCurrency(sellerGroups.reduce((s, g) => s + g.productDiscount + g.voucherDiscount, 0))}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                <span>Total ({cart.totalItems} items)</span>
                <span className="text-primary-600">{formatCurrency(sellerGroups.reduce((s, g) => s + g.storeTotal, 0))}</span>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Secure 256-bit SSL encrypted checkout</span>
              </div>
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Estimated delivery: 3-5 business days</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Voucher modal */}
      {sellerGroups.find(g => g.sellerId === voucherModalSellerId) && (
        <SelectVoucherModal
          isOpen={voucherModalSellerId !== null}
          onClose={() => setVoucherModalSellerId(null)}
          sellerId={voucherModalSellerId!}
          sellerName={sellerGroups.find(g => g.sellerId === voucherModalSellerId)!.sellerName}
          orderAmount={sellerGroups.find(g => g.sellerId === voucherModalSellerId)!.subtotal}
          selectedCode={voucherSelections[voucherModalSellerId!]?.code ?? null}
          onApply={(code, discountAmount) =>
            setVoucherSelections(prev => ({ ...prev, [voucherModalSellerId!]: { code, discountAmount } }))
          }
          onRemove={() =>
            setVoucherSelections(prev => {
              const next = { ...prev };
              delete next[voucherModalSellerId!];
              return next;
            })
          }
        />
      )}
    </div>
  );
};
