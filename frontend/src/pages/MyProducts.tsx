import React, { useEffect, useMemo, useState } from 'react';
import type { Product } from '../types/product';
import sellerService from '../services/sellerService';
import { Card } from '../components/common/Card';
import { ProductCard } from '../components/common/ProductCard';
import { Spinner } from '../components/common/Spinner';
import { Pagination } from '../components/common/Pagination';
import { useGridColumns, PAGE_SIZE_BY_COLUMNS } from '../hooks/useGridColumns';
import { Store, Package } from 'lucide-react';

export const MyProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);

  const columns = useGridColumns();
  const pageSize = PAGE_SIZE_BY_COLUMNS[columns];

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

  // Reset page when category or column count changes
  useEffect(() => { setPage(1); }, [selectedCategory, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  return (
    <div className="space-y-6" data-testid="my-products-page">
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
        <div className="flex justify-center py-16" data-testid="my-products-loading" aria-busy={loading}><Spinner size="lg" /></div>
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
                  data-testid={`my-products-category-filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}
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
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginated.map(product => (
                  <ProductCard key={product.id} product={product} variant="seller" />
                ))}
              </div>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};
