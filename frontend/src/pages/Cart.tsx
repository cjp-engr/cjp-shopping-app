import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { formatCurrency } from '../utils/formatters';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ShoppingBag } from 'lucide-react';

export const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity } = useCart();
  const { isAuthenticated } = useAuth();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
    } else {
      navigate('/checkout');
    }
  };

  const handleIncrement = (productId: string, currentQuantity: number, stock: number) => {
    if (currentQuantity < stock) {
      updateQuantity(productId, currentQuantity + 1);
    }
  };

  const handleDecrement = (productId: string, currentQuantity: number) => {
    if (currentQuantity > 1) {
      updateQuantity(productId, currentQuantity - 1);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="text-center max-w-md">
          <div className="text-gray-400 mb-4">
            <ShoppingCart className="w-24 h-24 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Your Cart is Empty
          </h2>
          <p className="text-gray-600 mb-6">
            Looks like you haven't added any items to your cart yet.
          </p>
          <Button size="lg" onClick={() => navigate('/products')}>
            <ShoppingBag className="w-5 h-5 mr-2" />
            Start Shopping
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-gray-600 mt-1">
            {cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>
        <button
          onClick={() => navigate('/products')}
          className="flex items-center text-primary-600 hover:text-primary-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Continue Shopping
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map(({ product, quantity }) => (
            <Card key={product.id} padding="lg">
              <div className="flex gap-4">
                {/* Product Image */}
                <div
                  className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold text-gray-900 mb-1 cursor-pointer hover:text-primary-600 line-clamp-2"
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{product.category}</p>
                  <p className="text-lg font-bold text-primary-600">
                    {formatCurrency(product.price)}
                  </p>
                  {product.stock < 10 && product.stock > 0 && (
                    <p className="text-sm text-orange-600 mt-1">
                      Only {product.stock} left in stock
                    </p>
                  )}
                  {product.stock === 0 && (
                    <p className="text-sm text-red-600 mt-1">Out of stock</p>
                  )}
                </div>

                {/* Quantity Controls */}
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="text-red-600 hover:text-red-700 p-2"
                    title="Remove from cart"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => handleDecrement(product.id, quantity)}
                      disabled={quantity <= 1}
                      className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 font-medium min-w-[3rem] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleIncrement(product.id, quantity, product.stock)}
                      disabled={quantity >= product.stock}
                      className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-500">Subtotal</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(product.price * quantity)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card padding="lg" className="sticky top-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Order Summary
            </h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
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

              {cart.shipping > 0 && (
                <p className="text-sm text-gray-600">
                  Add {formatCurrency(50 - cart.subtotal)} more for free shipping
                </p>
              )}

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

            <Button
              fullWidth
              size="lg"
              onClick={handleCheckout}
              className="mb-3"
            >
              Proceed to Checkout
            </Button>

            {!isAuthenticated && (
              <p className="text-sm text-gray-600 text-center">
                You'll need to sign in to complete your purchase
              </p>
            )}

            {/* Security Notice */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Secure checkout with 256-bit SSL encryption
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Continue Shopping Section */}
      <Card className="bg-gray-50">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Need something else?
          </h3>
          <p className="text-gray-600 mb-4">
            Continue browsing our collection
          </p>
          <Button variant="outline" onClick={() => navigate('/products')}>
            Browse Products
          </Button>
        </div>
      </Card>
    </div>
  );
};
