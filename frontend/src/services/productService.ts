import type { Product, ProductFilters, SortOption } from '../types/product';
import { API_ENDPOINTS, getHeaders } from '../config/api';

function parseTags(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    // Legacy: array with a single JSON-stringified element e.g. ['["a","b"]']
    if (raw.length === 1 && typeof raw[0] === 'string' && raw[0].startsWith('[')) {
      try { const p = JSON.parse(raw[0]); if (Array.isArray(p)) return p.map(String); } catch {}
    }
    return raw.map(String);
  }
  if (typeof raw === 'string' && raw.startsWith('[')) {
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.map(String); } catch {}
  }
  return [];
}

const adaptProduct = (p: any): Product => ({
  id: p._id,
  name: p.name,
  description: p.description,
  price: p.price,
  category: p.category,
  image: p.image,
  images: p.images,
  stock: p.stock,
  rating: p.rating,
  reviews: p.reviews,
  tags: parseTags(p.tags),
  specifications: p.specifications,
  createdAt: p.createdAt,
  sellerId: p.sellerId?._id ?? p.sellerId ?? undefined,
  sellerName: p.sellerId?.firstName
    ? `${p.sellerId.firstName} ${p.sellerId.lastName ?? ''}`.trim()
    : undefined,
  brand: p.brand,
  condition: p.condition,
  sku: p.sku,
  discount: p.discount,
  shippingOptions: p.shippingOptions,
  shippingFee: p.shippingFee,
  shippingFeeAmounts: p.shippingFeeAmounts,
  variantAttributes: p.variantAttributes,
  variants: Array.isArray(p.variants)
    ? p.variants.map((v: any) => ({
        _id: v._id?.toString(),
        attributes: v.attributes instanceof Map
          ? Object.fromEntries(v.attributes)
          : (v.attributes && typeof v.attributes === 'object' ? { ...v.attributes } : {}),
        price: v.price ?? 0,
        stock: v.stock ?? 0,
        sku: v.sku,
        images: Array.isArray(v.images)
          ? v.images
          : (v.image ? [v.image] : []),
        discount: v.discount,
      }))
    : undefined,
});

class ProductService {
  async getProducts(
    filters?: ProductFilters,
    sortBy?: SortOption,
    minReviews?: number,
    page = 1,
    limit = 20,
  ): Promise<{ products: Product[]; pages: number; total: number }> {
    const params = new URLSearchParams();

    if (filters?.category && filters.category !== 'All') {
      params.append('category', filters.category);
    }

    if (filters?.priceRange) {
      params.append('minPrice', filters.priceRange.min.toString());
      params.append('maxPrice', filters.priceRange.max.toString());
    }

    if (filters?.rating) {
      params.append('rating', filters.rating.toString());
    }

    if (filters?.searchQuery) {
      params.append('search', filters.searchQuery);
    }

    if (sortBy) {
      params.append('sort', sortBy);
    }

    if (minReviews !== undefined) {
      params.append('minReviews', minReviews.toString());
    }

    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const url = `${API_ENDPOINTS.PRODUCTS}?${params}`;
    const response = await fetch(url, { headers: getHeaders() });

    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }

    const data = await response.json();

    return {
      products: data.products.map((p: any) => adaptProduct(p)),
      pages: data.pages ?? 1,
      total: data.total ?? 0,
    };
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      const response = await fetch(API_ENDPOINTS.PRODUCT(id), {
        headers: getHeaders()
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const p = data.product;

      return adaptProduct(p);
    } catch (error) {
      return null;
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    return (await this.getProducts({ searchQuery: query })).products;
  }

  getCategories(): string[] {
    // Return static categories for now
    return ['All', 'Electronics', 'Clothing', 'Home & Garden', 'Books', 'Sports & Outdoors'];
  }

  async getFeaturedProductsAsync(count: number = 8): Promise<Product[]> {
    // minReviews=1 is enforced server-side so sellers cannot game the
    // Featured section by listing new products with zero reviews.
    const { products } = await this.getProducts(undefined, 'rating', 1, 1, count);
    return products;
  }

  async getRelatedProductsAsync(productId: string, count: number = 4): Promise<Product[]> {
    const product = await this.getProductById(productId);
    if (!product) return [];

    const { products } = await this.getProducts({ category: product.category }, undefined, undefined, 1, count + 1);
    return products.filter(p => p.id !== productId).slice(0, count);
  }

  async checkStock(productId: string, quantity: number): Promise<boolean> {
    const product = await this.getProductById(productId);
    if (!product) return false;
    return product.stock >= quantity;
  }
}

export default new ProductService();
