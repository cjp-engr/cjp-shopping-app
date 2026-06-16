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
import { ShoppingCart, Star, Zap, ShieldCheck, BadgePercent, ArrowRight } from 'lucide-react';

export const Home: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToCart } = useCart();

  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        setLoading(true);
        const products = await productService.getFeaturedProductsAsync(8);
        setFeaturedProducts(products);
      } catch (error) {
        console.error('Failed to load featured products:', error);
      } finally {
        setLoading(false);
      }
    };
    loadFeaturedProducts();
  }, []);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white rounded-2xl p-8 md:p-14">
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute top-8 right-48 w-24 h-24 bg-white/5 rounded-full hidden md:block" />

        <div className="relative max-w-2xl">
          <span className="inline-block bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-5 tracking-wide uppercase">
            Free shipping over $50
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-5 leading-tight tracking-tight">
            Discover Amazing<br />Products at TokoMart
          </h1>
          <p className="text-base md:text-lg mb-8 text-primary-100 leading-relaxed max-w-lg">
            Shop the latest trends with unbeatable prices. Quality products delivered fast, right to your door.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="!bg-white !text-primary-700 hover:!bg-gray-50 shadow-lg font-semibold"
              onClick={() => navigate('/products')}
            >
              Shop Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/60 text-white hover:bg-white/10 backdrop-blur-sm"
              onClick={() => navigate('/products')}
            >
              Browse Categories
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            icon: Zap,
            color: 'bg-amber-100 text-amber-600',
            title: 'Fast Delivery',
            desc: 'Get your orders delivered within 2–5 business days nationwide.',
          },
          {
            icon: ShieldCheck,
            color: 'bg-emerald-100 text-emerald-600',
            title: 'Quality Guaranteed',
            desc: 'Every product is carefully curated and quality-checked before shipping.',
          },
          {
            icon: BadgePercent,
            color: 'bg-primary-100 text-primary-600',
            title: 'Best Prices',
            desc: 'Competitive prices and exclusive member deals every single week.',
          },
        ].map(({ icon: Icon, color, title, desc }) => (
          <Card key={title} padding="lg" className="flex gap-4 items-start">
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          </Card>
        ))}
      </section>

      {/* Featured Products Section */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
            <p className="text-sm text-gray-500 mt-1">Handpicked products just for you</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/products')} size="sm">
            View All
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[320px]">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredProducts.map((product) => (
              <Card
                key={product.id}
                hover
                padding="none"
                className="flex flex-col overflow-hidden"
                onClick={() => navigate(`/products/${product.id}`)}
              >
                <div className="aspect-square overflow-hidden bg-gray-50">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                  />
                </div>

                <div className="flex flex-col flex-1 p-4">
                  <Badge variant="primary" size="sm" className="self-start mb-2">
                    {product.category}
                  </Badge>
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-sm leading-snug flex-1">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-1 mb-3">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium text-gray-700">{product.rating}</span>
                    <span className="text-xs text-gray-400">({product.reviews})</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-lg font-bold text-primary-600">
                      {formatCurrency(product.price)}
                    </p>
                    {product.stock < 5 && product.stock > 0 && (
                      <span className="text-xs text-orange-600 font-medium">Only {product.stock} left</span>
                    )}
                  </div>

                  <Button
                    size="sm"
                    fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product, 1);
                    }}
                    disabled={product.stock === 0}
                  >
                    <ShoppingCart className="w-4 h-4 mr-1.5" />
                    {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* CTA / Newsletter Section */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 md:p-12 text-center text-white">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Stay in the Loop
        </h2>
        <p className="text-gray-300 mb-8 max-w-md mx-auto text-sm leading-relaxed">
          Subscribe to our newsletter for exclusive deals, new arrivals, and member-only discounts.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Enter your email address"
            className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
          />
          <Button size="md" className="bg-primary-500 hover:bg-primary-400 font-semibold whitespace-nowrap">
            Subscribe
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-4">No spam. Unsubscribe at any time.</p>
      </section>
    </div>
  );
};
