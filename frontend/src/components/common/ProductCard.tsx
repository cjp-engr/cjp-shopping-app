import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';
import { formatCurrency } from '../../utils/formatters';
import type { Product } from '../../types/product';

const LOW_STOCK_THRESHOLD = 10;

interface ProductCardProps {
  product: Product;
  /** @deprecated No longer used — button removed from card */
  onAddToCart?: (product: Product) => void;
  /** Show colored stock badge instead of price+discount (seller view) */
  variant?: 'buyer' | 'seller';
  currentUserId?: string;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  variant = 'buyer',
}) => {
  const navigate = useNavigate();

  const effectivePrice = product.discount && product.discount > 0
    ? product.price * (1 - product.discount / 100)
    : product.price;
  const hasDiscount = !!(product.discount && product.discount > 0);

  const stockBadgeClass =
    product.stock === 0
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : product.stock <= 5
      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

  return (
    <Card
      hover
      padding="none"
      className="flex flex-col overflow-hidden group"
      onClick={() => navigate(`/products/${product.id}`)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-gray-700">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {hasDiscount && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-md">
            -{product.discount}%
          </span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-xs font-bold text-white bg-black/60 px-2 py-1 rounded-md">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3">
        <Badge variant="primary" size="sm" className="self-start mb-1.5">
          {product.category}
        </Badge>

        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 text-sm leading-snug flex-1">
          {product.name}
        </h3>

        {product.rating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {product.rating.toFixed(1)}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">({product.reviews})</span>
          </div>
        )}

        {variant === 'seller' ? (
          <div className="flex items-center justify-between mt-auto pt-1">
            <p className="text-base font-bold text-primary-600">{formatCurrency(product.price)}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stockBadgeClass}`}>
              {product.stock === 0 ? 'Out of stock' : `Stock: ${product.stock}`}
            </span>
          </div>
        ) : (
          <div className="flex items-end justify-between mt-auto pt-1">
            <div>
              <p className="text-base font-bold text-primary-600">{formatCurrency(effectivePrice)}</p>
              {hasDiscount && (
                <p className="text-xs text-gray-400 line-through leading-none">{formatCurrency(product.price)}</p>
              )}
            </div>
            {product.stock > 0 && product.stock < LOW_STOCK_THRESHOLD && (
              <span className="text-xs text-orange-500 dark:text-orange-400 font-medium">
                {product.stock} left
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';
