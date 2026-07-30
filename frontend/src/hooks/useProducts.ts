import { useState, useEffect, useRef } from 'react';
import type { Product, ProductFilters, SortOption } from '../types/product';
import productService from '../services/productService';

/**
 * Fetches products whenever filters or sortBy change.
 * Accepts filters/sortBy as reactive arguments — callers own the filter state.
 */
export function useProducts(filters?: ProductFilters, sortBy?: SortOption) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable references so the effect dep-array doesn't fire on every object literal
  const filtersRef = useRef(filters);
  const sortByRef = useRef(sortBy);
  filtersRef.current = filters;
  sortByRef.current = sortBy;

  // Serialize to a stable string so the effect only fires when values change
  const filtersKey = JSON.stringify(filters);
  const sortKey = sortBy ?? 'newest';

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await productService.getProducts(filtersRef.current, sortByRef.current);
        if (!cancelled) setProducts(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProducts();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, sortKey]);

  return { products, loading, error };
}
