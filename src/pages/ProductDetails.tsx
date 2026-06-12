import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Product } from '../types/product';
import productService from '../services/productService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Spinner } from '../components/common/Spinner';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/formatters';
import {
  ShoppingCart,
  Star,
  Minus,
  Plus,
  ArrowLeft,
  Package,
  Truck,
  Shield,
  RotateCcw,
} from 'lucide-react';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, getItemQuantity } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);
        const productData = await productService.getProductById(id);

        if (!productData) {
          setError('Product not found');
          return;
        }

        setProduct(productData);
        setSelectedImage(0);

        // Load related products
        const related = await productService.getRelatedProductsAsync(id, 4);
        setRelatedProducts(related);
      } catch (err) {
        setError('Failed to load product details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      setQuantity(1);
    }
  };

  const incrementQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Product Not Found'}
          </h2>
          <p className="text-gray-600 mb-6">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/products')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </Card>
      </div>
    );
  }

  const images = product.images || [product.image];
  const cartQuantity = getItemQuantity(product.id);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/products')}
        className="flex items-center text-primary-600 hover:text-primary-700 font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Products
      </button>

      {/* Product Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <Card padding="sm">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </Card>

          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === index
                      ? 'border-primary-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <Badge variant="primary" className="mb-3">
              {product.category}
            </Badge>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(product.rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="font-medium">{product.rating}</span>
              <span className="text-gray-500">({product.reviews} reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-bold text-primary-600">
                {formatCurrency(product.price)}
              </span>
            </div>

            {/* Description */}
            <p className="text-gray-700 leading-relaxed mb-6">
              {product.description}
            </p>

            {/* Stock Status */}
            <div className="mb-6">
              {product.stock > 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Package className="w-5 h-5" />
                  <span className="font-medium">
                    {product.stock > 10
                      ? 'In Stock'
                      : `Only ${product.stock} left in stock`}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <Package className="w-5 h-5" />
                  <span className="font-medium">Out of Stock</span>
                </div>
              )}

              {cartQuantity > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {cartQuantity} in your cart
                </p>
              )}
            </div>
          </div>

          {/* Quantity Selector */}
          {product.stock > 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-6 py-2 font-medium">{quantity}</span>
                    <button
                      onClick={incrementQuantity}
                      disabled={quantity >= product.stock}
                      className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <Button
                    size="lg"
                    fullWidth
                    onClick={handleAddToCart}
                    className="flex-1"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          <Card padding="lg" className="bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-primary-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Free Shipping</h4>
                  <p className="text-sm text-gray-600">On orders over $50</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RotateCcw className="w-5 h-5 text-primary-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Easy Returns</h4>
                  <p className="text-sm text-gray-600">30-day return policy</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Secure Payment</h4>
                  <p className="text-sm text-gray-600">100% secure checkout</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-primary-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Quality Assured</h4>
                  <p className="text-sm text-gray-600">Premium products only</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Specifications
              </h3>
              <dl className="space-y-2">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between py-2 border-b border-gray-200 last:border-0"
                  >
                    <dt className="font-medium text-gray-700">{key}</dt>
                    <dd className="text-gray-600">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Related Products
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((relatedProduct) => (
              <Card
                key={relatedProduct.id}
                hover
                className="flex flex-col cursor-pointer"
                onClick={() => navigate(`/products/${relatedProduct.id}`)}
              >
                <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={relatedProduct.image}
                    alt={relatedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {relatedProduct.name}
                </h3>
                <div className="flex items-center gap-1 mb-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">
                    {relatedProduct.rating}
                  </span>
                </div>
                <p className="text-lg font-bold text-primary-600">
                  {formatCurrency(relatedProduct.price)}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
