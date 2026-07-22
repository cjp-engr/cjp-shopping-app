import type { Product, ProductFilters, SortOption } from '../types/product';
import { API_ENDPOINTS, getHeaders } from '../config/api';

class ProductService {
  async getProducts(filters?: ProductFilters, sortBy?: SortOption, minReviews?: number): Promise<Product[]> {
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

    params.append('limit', '100');

    const url = `${API_ENDPOINTS.PRODUCTS}?${params}`;
    const response = await fetch(url, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }

    const data = await response.json();

    // Adapt backend response to frontend format
    return data.products.map((p: any) => ({
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
      tags: p.tags,
      specifications: p.specifications,
      createdAt: p.createdAt,
      sellerId: p.sellerId?._id ?? p.sellerId ?? undefined,
      sellerName: p.sellerId?.firstName
        ? `${p.sellerId.firstName} ${p.sellerId.lastName ?? ''}`.trim()
        : undefined,
    }));
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

      return {
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
        tags: p.tags,
        specifications: p.specifications,
        createdAt: p.createdAt,
        sellerId: p.sellerId?._id ?? p.sellerId ?? undefined,
        sellerName: p.sellerId?.firstName
          ? `${p.sellerId.firstName} ${p.sellerId.lastName ?? ''}`.trim()
          : undefined,
      };
    } catch (error) {
      return null;
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    return this.getProducts({ searchQuery: query });
  }

  getCategories(): string[] {
    // Return static categories for now
    return ['All', 'Electronics', 'Clothing', 'Home & Garden', 'Books', 'Sports & Outdoors'];
  }

  getFeaturedProducts(_count: number = 8): Product[] {
    // This is synchronous, so we'll need to fetch products first
    // For now, return empty array - components should use async version
    return [];
  }

  async getFeaturedProductsAsync(count: number = 8): Promise<Product[]> {
    // minReviews=1 is enforced server-side so sellers cannot game the
    // Featured section by listing new products with zero reviews.
    const products = await this.getProducts(undefined, 'rating', 1);
    return products.slice(0, count);
  }

  getRelatedProducts(_productId: string, _count: number = 4): Product[] {
    // This is synchronous, so we'll need to fetch products first
    // For now, return empty array - components should use async version
    return [];
  }

  async getRelatedProductsAsync(productId: string, count: number = 4): Promise<Product[]> {
    const product = await this.getProductById(productId);
    if (!product) return [];

    const products = await this.getProducts({ category: product.category });
    return products.filter(p => p.id !== productId).slice(0, count);
  }

  async checkStock(productId: string, quantity: number): Promise<boolean> {
    const product = await this.getProductById(productId);
    if (!product) return false;
    return product.stock >= quantity;
  }
}

export default new ProductService();
