import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { formatCurrency } from '../utils/formatters';
import type { CheckoutData, PaymentMethod } from '../types/order';
import orderService from '../services/orderService';
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
} from 'lucide-react';

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orderPlaced = useRef(false);

  const [shippingData, setShippingData] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || 'United States',
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

    if (!shippingData.street.trim()) errors.street = 'Street address is required';
    if (!shippingData.city.trim()) errors.city = 'City is required';
    if (!shippingData.state.trim()) errors.state = 'State is required';
    if (!shippingData.zipCode.trim()) errors.zipCode = 'ZIP code is required';
    if (!shippingData.country.trim()) errors.country = 'Country is required';
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

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePayment()) {
      setStep('review');
      window.scrollTo(0, 0);
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

      const order = await orderService.createOrder(checkoutData, cart, user.id);
      orderPlaced.current = true;
      clearCart();
      navigate(`/orders?success=${order.id}`);
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
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CreditCard className="w-6 h-6" />
                Payment Information
              </h2>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    name="type"
                    value={paymentData.type}
                    onChange={handlePaymentChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Month <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="expiryMonth"
                      value={paymentData.expiryMonth}
                      onChange={handlePaymentChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="expiryYear"
                      value={paymentData.expiryYear}
                      onChange={handlePaymentChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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

                <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
                  <Lock className="w-5 h-5 text-gray-600" />
                  <p className="text-sm text-gray-700">
                    Your payment information is secure and encrypted
                  </p>
                </div>

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
            </Card>
          )}

          {/* Order Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <Card padding="lg">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Order Review</h2>

                {/* Items */}
                <div className="space-y-4 mb-6">
                  {cart.items.map(({ product, quantity }) => (
                    <div key={product.id} className="flex gap-4 pb-4 border-b border-gray-200">
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-600">Quantity: {quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {formatCurrency(product.price * quantity)}
                        </p>
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
                  <p className="text-gray-700 capitalize">
                    {paymentData.type.replace('-', ' ')}
                  </p>
                  <p className="text-gray-700">•••• •••• •••• {paymentData.cardNumber.slice(-4)}</p>
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
                <span>Tax</span>
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
