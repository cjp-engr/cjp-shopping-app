import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { formatCurrency } from '../../utils/formatters';
import type { Product } from '../../types/product';

const LOW_STOCK_THRESHOLD = 10;

interface ProductCardProps {
  product: Product;
  /** When provided the card shows an Add-to-Cart button; omit for seller view */
  onAddToCart?: (product: Product) => void;
  /** Hide the Add-to-Cart button and show a colored stock badge instead */
  variant?: 'buyer' | 'seller';
  /** ID of the authenticated user — used to disable "your own product" */
  currentUserId?: string;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  onAddToCart,
  variant = 'buyer',
  currentUserId,
}) => {
  const navigate = useNavigate();
  const isOwnProduct = !!currentUserId && product.sellerId === currentUserId;

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
      className="flex flex-col overflow-hidden"
      onClick={() => navigate(`/products/${product.id}`)}
    >
      <div className="aspect-square overflow-hidden bg-gray-50 dark:bg-gray-700">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
      </div>

      <div className="flex flex-col flex-1 p-4">
        <Badge variant="primary" size="sm" className="self-start mb-2">
          {product.category}
        </Badge>

        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 text-sm leading-snug flex-1">
          {product.name}
        </h3>

        <div className="flex items-center gap-1 mb-3">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {product.rating.toFixed(1)}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">({product.reviews})</span>
        </div>

        {variant === 'seller' ? (
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-primary-600">{formatCurrency(product.price)}</p>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${stockBadgeClass}`}>
              {product.stock === 0 ? 'Out of stock' : `Stock: ${product.stock}`}
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-lg font-bold text-primary-600">{formatCurrency(product.price)}</p>
              {product.stock > 0 && product.stock < LOW_STOCK_THRESHOLD && (
                <span className="text-xs text-orange-600 font-medium">Only {product.stock} left</span>
              )}
            </div>

            <Button
              size="sm"
              fullWidth
              onClick={e => {
                e.stopPropagation();
                onAddToCart?.(product);
              }}
              disabled={product.stock === 0 || isOwnProduct}
            >
              <ShoppingCart className="w-4 h-4 mr-1.5" />
              {product.stock === 0
                ? 'Out of Stock'
                : isOwnProduct
                ? 'Your Product'
                : 'Add to Cart'}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';
