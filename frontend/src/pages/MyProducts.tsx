import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../types/product';
import sellerService from '../services/sellerService';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Spinner } from '../components/common/Spinner';
import { formatCurrency } from '../utils/formatters';
import { Star, Store, Package } from 'lucide-react';

export const MyProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    sellerService.getProducts()
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category)));
    return ['All', ...cats];
  }, [products]);

  const filtered = useMemo(() =>
    selectedCategory === 'All' ? products : products.filter(p => p.category === selectedCategory),
    [products, selectedCategory]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Store className="w-6 h-6 text-primary-600" />
          My Products
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          How your products appear to buyers
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : products.length === 0 ? (
        <Card className="text-center py-16">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            You have no products listed yet.
          </p>
        </Card>
      ) : (
        <>
          {/* Category filter chips */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => {
              const count = cat === 'All' ? products.length : products.filter(p => p.category === cat).length;
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    active
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                >
                  {cat}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <Card className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No products in this category.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(product => (
                <Card
                  key={product.id}
                  hover
                  padding="none"
                  className="flex flex-col overflow-hidden"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <div className="aspect-square overflow-hidden bg-gray-50 dark:bg-gray-700">
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
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 text-sm leading-snug flex-1">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-1 mb-3">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{product.rating.toFixed(1)}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">({product.reviews})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-primary-600">{formatCurrency(product.price)}</p>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        product.stock === 0
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : product.stock <= 5
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {product.stock === 0 ? 'Out of stock' : `Stock: ${product.stock}`}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
