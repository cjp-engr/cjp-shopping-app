export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  images?: string[];
  stock: number;
  rating: number;
  reviews: number;
  tags?: string[];
  specifications?: Record<string, string>;
  createdAt: string;
  sellerId?: string;
  sellerName?: string;
}

export interface ProductFilters {
  category?: string;
  priceRange?: { min: number; max: number };
  rating?: number;
  searchQuery?: string;
  tags?: string[];
}

export type SortOption = 'price-asc' | 'price-desc' | 'rating' | 'newest' | 'name';
