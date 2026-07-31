import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProductFilters, SortOption } from '../types/product';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ProductCard } from '../components/common/ProductCard';
import { Spinner } from '../components/common/Spinner';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useProducts';
import { useDebounce } from '../hooks/useDebounce';
import { Search, SlidersHorizontal, X, Star } from 'lucide-react';

export const Products: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const { addToCart } = useCart();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) setSelectedCategory(categoryParam);
  }, [searchParams]);

  const filters: ProductFilters = {
    searchQuery: debouncedSearch || undefined,
    category: selectedCategory !== 'All' ? selectedCategory : undefined,
    rating: minRating || undefined,
  };

  const { products, loading } = useProducts(filters, sortBy);

  const visibleProducts = products.filter(p => p.sellerId !== user?.id);

  const categories = ['All', 'Electronics', 'Clothing', 'Home & Garden', 'Books', 'Sports & Outdoors'];

  const handleResetFilters = () => {
    setSearchInput('');
    setSelectedCategory('All');
    setMinRating(0);
    setSortBy('rating');
  };

  const activeFiltersCount = [selectedCategory !== 'All', minRating > 0, searchInput !== ''].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${visibleProducts.length} products found`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden"
          >
            <SlidersHorizontal className="w-4 h-4 mr-1.5" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-1.5 w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                {activeFiltersCount}
              </span>
            )}
          </Button>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="rating">Highest Rated</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="newest">Newest First</option>
            <option value="name">Name: A to Z</option>
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search products by name, category…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters Sidebar */}
        <aside className={`${showFilters ? 'block' : 'hidden'} md:block w-full md:w-56 flex-shrink-0 space-y-5`}>
          <Card padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                Filters
              </h3>
              {activeFiltersCount > 0 && (
                <button onClick={handleResetFilters} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>

            {/* Categories */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Category</p>
              <div className="space-y-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === cat
                        ? 'bg-primary-100 dark:bg-primary-800/40 text-primary-700 dark:text-primary-300 font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating Filter */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Min. Rating</p>
              <div className="space-y-1">
                {[4, 3, 2, 0].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setMinRating(rating)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                      minRating === rating
                        ? 'bg-primary-100 dark:bg-primary-800/40 text-primary-700 dark:text-primary-300 font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white'
                    }`}
                  >
                    {rating === 0 ? (
                      'All Ratings'
                    ) : (
                      <>
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {rating}+ Stars
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Spinner size="lg" />
            </div>
          ) : visibleProducts.length === 0 ? (
            <Card className="text-center py-16">
              <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-sm text-gray-500 mb-5">Try adjusting your filters or search query</p>
              <Button size="sm" onClick={handleResetFilters}>Reset Filters</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleProducts
                .map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    currentUserId={user?.id}
                    onAddToCart={p => addToCart(p, 1)}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
