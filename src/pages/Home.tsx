import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../types/product';
import productService from '../services/productService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Spinner } from '../components/common/Spinner';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/formatters';
import { ShoppingCart, Star, TrendingUp, Zap } from 'lucide-react';

export const Home: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToCart } = useCart();

  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        setLoading(true);
        const products = productService.getFeaturedProducts(8);
        setFeaturedProducts(products);
      } catch (error) {
        console.error('Failed to load featured products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedProducts();
  }, []);

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-2xl p-8 md:p-12">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome to ShopHub
          </h1>
          <p className="text-lg md:text-xl mb-6 text-primary-100">
            Discover amazing products at unbeatable prices. Shop the latest trends and enjoy fast, free shipping on orders over $50.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              className="bg-white text-primary-600 hover:bg-gray-100"
              onClick={() => navigate('/products')}
            >
              Shop Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              onClick={() => navigate('/products')}
            >
              Browse Categories
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary-100 rounded-full">
              <Zap className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Fast Delivery</h3>
          <p className="text-gray-600">Get your orders delivered within 2-5 business days</p>
        </Card>

        <Card className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Star className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Top Quality</h3>
          <p className="text-gray-600">All products are carefully curated for quality</p>
        </Card>

        <Card className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-yellow-100 rounded-full">
              <TrendingUp className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Best Prices</h3>
          <p className="text-gray-600">Competitive prices and regular special offers</p>
        </Card>
      </section>

      {/* Featured Products Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
          <Button
            variant="outline"
            onClick={() => navigate('/products')}
          >
            View All
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <Card
              key={product.id}
              hover
              className="flex flex-col cursor-pointer"
              onClick={() => navigate(`/products/${product.id}`)}
            >
              <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1">
                <Badge variant="primary" size="sm" className="mb-2">
                  {product.category}
                </Badge>
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                  {product.name}
                </h3>
                <div className="flex items-center gap-1 mb-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{product.rating}</span>
                  <span className="text-sm text-gray-500">({product.reviews})</span>
                </div>
                <p className="text-xl font-bold text-primary-600 mb-3">
                  {formatCurrency(product.price)}
                </p>
              </div>

              <Button
                fullWidth
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart(product);
                }}
                disabled={product.stock === 0}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-100 rounded-2xl p-8 md:p-12 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Join Our Newsletter
        </h2>
        <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
          Subscribe to get special offers, free giveaways, and exclusive deals.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button size="lg">Subscribe</Button>
        </div>
      </section>
    </div>
  );
};
