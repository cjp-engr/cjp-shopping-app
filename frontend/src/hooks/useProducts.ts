import { useState, useEffect } from 'react';
import type { Product, ProductFilters, SortOption } from '../types/product';
import productService from '../services/productService';

export function useProducts(filters?: ProductFilters, sortBy?: SortOption, page = 1, limit = 20) {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(filters);
  const sortKey = sortBy ?? 'newest';

  useEffect(() => {
    let cancelled = false;
    const currentFilters = filters;
    const currentSortBy = sortBy;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await productService.getProducts(currentFilters, currentSortBy, undefined, page, limit);
        if (!cancelled) {
          setProducts(result.products);
          setTotalPages(result.pages);
          setTotal(result.total);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProducts();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, sortKey, page, limit]);

  return { products, loading, error, totalPages, total };
}
