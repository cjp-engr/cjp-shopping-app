import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { formatCurrency } from '../utils/formatters';
import type { CheckoutData, PaymentMethod } from '../types/order';
import type { SavedCard } from '../types/user';
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
} from 'lucide-react';

type AddressMode = 'saved' | 'new';
type PaymentMode = 'saved' | 'new';

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orderPlaced = useRef(false);

  const hasSavedAddress = !!(
    user?.address?.street && user?.address?.city
  );
  const [addressMode, setAddressMode] = useState<AddressMode>(
    hasSavedAddress ? 'saved' : 'new'
  );

  const savedAddressFields = {
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || 'United States',
  };

  const [shippingData, setShippingData] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || 'United States',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const handleAddressModeChange = (mode: AddressMode) => {
    setAddressMode(mode);
    if (mode === 'saved') {
      setShippingData(prev => ({ ...prev, ...savedAddressFields }));
    } else {
      setShippingData(prev => ({
        ...prev,
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States',
      }));
    }
    setShippingErrors({});
  };

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

  const FREE_SHIPPING_THRESHOLD = 50;

  // Group cart items by seller for the Order Review and per-seller shipping display
  const sellerGroups = useMemo(() => {
    const map = new Map<string, { sellerName: string; items: typeof cart.items; subtotal: number }>();
    for (const cartItem of cart.items) {
      const key = cartItem.product.sellerId ?? '__unknown__';
      if (!map.has(key)) {
        map.set(key, { sellerName: cartItem.product.sellerName ?? 'Seller', items: [], subtotal: 0 });
      }
      const group = map.get(key)!;
      group.items.push(cartItem);
      group.subtotal += cartItem.product.price * cartItem.quantity;
    }
    return Array.from(map.values());
  }, [cart.items]);

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
    if (addressMode === 'new') {
      if (!shippingData.street.trim()) errors.street = 'Street address is required';
      if (!shippingData.city.trim()) errors.city = 'City is required';
      if (!shippingData.state.trim()) errors.state = 'State is required';
      if (!shippingData.zipCode.trim()) errors.zipCode = 'ZIP code is required';
      if (!shippingData.country.trim()) errors.country = 'Country is required';
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
          country: shippingData.country,
        },
        paymentMethod: {
          type: paymentData.type,
          last4: paymentData.cardNumber.slice(-4),
          cardHolder: paymentData.cardHolder,
        },
        contactEmail: shippingData.email,
        contactPhone: shippingData.phone,
      };

      const orders = await orderService.createOrder(checkoutData, cart, user.id);
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
                {/* ── Address mode selector ─────────────────────────────── */}
                {hasSavedAddress && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                    {/* Saved address card */}
                    <button
                      type="button"
                      onClick={() => handleAddressModeChange('saved')}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        addressMode === 'saved'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        addressMode === 'saved' ? 'border-primary-500' : 'border-gray-400'
                      }`}>
                        {addressMode === 'saved' && (
                          <div className="w-2 h-2 rounded-full bg-primary-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Home className="w-4 h-4 text-primary-600 flex-shrink-0" />
                          <span className={`text-sm font-semibold ${
                            addressMode === 'saved' ? 'text-primary-700' : 'text-gray-800'
                          }`}>
                            Saved Address
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed truncate">
                          {[
                            user?.address?.street,
                            user?.address?.city,
                            user?.address?.state,
                            user?.address?.zipCode,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </button>

                    {/* New address card */}
                    <button
                      type="button"
                      onClick={() => handleAddressModeChange('new')}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        addressMode === 'new'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        addressMode === 'new' ? 'border-primary-500' : 'border-gray-400'
                      }`}>
                        {addressMode === 'new' && (
                          <div className="w-2 h-2 rounded-full bg-primary-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <PlusCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />
                          <span className={`text-sm font-semibold ${
                            addressMode === 'new' ? 'text-primary-700' : 'text-gray-800'
                          }`}>
                            New Address
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Enter a different delivery address</p>
                      </div>
                    </button>
                  </div>
                )}

                {/* ── Address fields (hidden when saved address is selected) ── */}
                {addressMode === 'new' && (
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
                      <Input
                        label="Country"
                        name="country"
                        value={shippingData.country}
                        onChange={handleShippingChange}
                        error={shippingErrors.country}
                        placeholder="United States"
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
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      paymentMode === 'saved' ? 'border-primary-500' : 'border-gray-400'
                    }`}>
                      {paymentMode === 'saved' && <span className="w-2 h-2 rounded-full bg-primary-500" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Saved Card</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Use a saved card</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('new')}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                      paymentMode === 'new'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      paymentMode === 'new' ? 'border-primary-500' : 'border-gray-400'
                    }`}>
                      {paymentMode === 'new' && <span className="w-2 h-2 rounded-full bg-primary-500" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
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
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        selectedCardId === card._id ? 'border-primary-500' : 'border-gray-400'
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
                  </select>
                </div>

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

                <div className="flex items-center gap-2 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                  <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Your payment information is secure and encrypted
                  </p>
                </div>

                {/* Save card checkbox */}
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300 mt-2">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={e => setSaveCard(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Save this card for future purchases
                </label>

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
                  {sellerGroups.map((group) => (
                    <div key={group.sellerName}>
                      {/* Seller header */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          🏪 {group.sellerName}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          group.subtotal >= FREE_SHIPPING_THRESHOLD
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        }`}>
                          {group.subtotal >= FREE_SHIPPING_THRESHOLD ? 'Free Shipping' : 'Shipping: $9.99'}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {group.items.map(({ product, quantity }) => (
                          <div key={product.id} className="flex gap-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                            <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 dark:text-white">{product.name}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{product.category}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Qty: {quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900 dark:text-white">
                                {formatCurrency(product.price * quantity)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(product.price)} each</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Seller subtotal */}
                      <div className="flex justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>Seller subtotal</span>
                        <span className="font-medium">{formatCurrency(group.subtotal)}</span>
                      </div>
                    </div>
                  ))}
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

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal ({cart.totalItems} items)</span>
                <span className="font-medium">{formatCurrency(cart.subtotal)}</span>
              </div>

              <div className="flex justify-between text-gray-700">
                <span>Shipping</span>
                <span className="font-medium">
                  {cart.shipping === 0 ? (
                    <span className="text-green-600">FREE</span>
                  ) : (
                    formatCurrency(cart.shipping)
                  )}
                </span>
              </div>

              <div className="flex justify-between text-gray-700">
                <span>Tax (8%)</span>
                <span className="font-medium">{formatCurrency(cart.tax)}</span>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-primary-600">{formatCurrency(cart.total)}</span>
                </div>
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
    </div>
  );
};
