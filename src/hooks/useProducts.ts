import { useState, useEffect } from 'react';
import type { Product, ProductFilters, SortOption } from '../types/product';
import productService from '../services/productService';

export function useProducts(initialFilters?: ProductFilters, initialSortBy?: SortOption) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters || {});
  const [sortBy, setSortBy] = useState<SortOption>(initialSortBy || 'newest');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await productService.getProducts(filters, sortBy);
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters, sortBy]);

  return {
    products,
    loading,
    error,
    filters,
    setFilters,
    sortBy,
    setSortBy
  };
}
