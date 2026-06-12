import type { Product, ProductFilters, SortOption } from '../types/product';
import { mockProducts } from '../data/mockProducts';
import { filterProducts, sortProducts } from '../utils/helpers';

class ProductService {
  private products: Product[] = mockProducts;

  async getProducts(filters?: ProductFilters, sortBy?: SortOption): Promise<Product[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    let result = [...this.products];

    // Apply filters if provided
    if (filters) {
      result = filterProducts(result, filters);
    }

    // Apply sorting if provided
    if (sortBy) {
      result = sortProducts(result, sortBy);
    }

    return result;
  }

  async getProductById(id: string): Promise<Product | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const product = this.products.find(p => p.id === id);
    return product || null;
  }

  async searchProducts(query: string): Promise<Product[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 250));

    const lowercaseQuery = query.toLowerCase();
    return this.products.filter(p =>
      p.name.toLowerCase().includes(lowercaseQuery) ||
      p.description.toLowerCase().includes(lowercaseQuery) ||
      p.category.toLowerCase().includes(lowercaseQuery) ||
      p.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  getCategories(): string[] {
    const categories = new Set(this.products.map(p => p.category));
    return ['All', ...Array.from(categories).sort()];
  }

  getFeaturedProducts(count: number = 8): Product[] {
    // Return top-rated products
    return [...this.products]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, count);
  }

  getRelatedProducts(productId: string, count: number = 4): Product[] {
    const product = this.products.find(p => p.id === productId);
    if (!product) return [];

    // Return products from the same category, excluding the current product
    return this.products
      .filter(p => p.category === product.category && p.id !== productId)
      .slice(0, count);
  }

  checkStock(productId: string, quantity: number): boolean {
    const product = this.products.find(p => p.id === productId);
    if (!product) return false;
    return product.stock >= quantity;
  }
}

export default new ProductService();
