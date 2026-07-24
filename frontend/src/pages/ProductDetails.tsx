import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Product } from '../types/product';
import productService from '../services/productService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Spinner } from '../components/common/Spinner';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
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
  Edit,
  Eye,
  EyeOff,
  User,
  ChevronDown,
  UserPlus,
  UserMinus,
  Store,
} from 'lucide-react';
import type { PublicUser } from '../types/user';

interface Review {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  userId: { firstName: string; lastName: string; avatar?: string };
}

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, getItemQuantity } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [sellerProfile, setSellerProfile] = useState<PublicUser | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

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

  const fetchSellerProfile = useCallback(async (sellerId: string) => {
    try {
      const res = await fetch(API_ENDPOINTS.USER_PROFILE(sellerId), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) setSellerProfile(data.user);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (product?.sellerId && user) {
      fetchSellerProfile(product.sellerId);
    }
  }, [product?.sellerId, user, fetchSellerProfile]);

  useEffect(() => {
    if (!id) return;
    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const res = await fetch(`${API_ENDPOINTS.PRODUCT_REVIEWS(id)}?page=${reviewPage}&limit=5`);
        const data = await res.json();
        if (data.success) {
          setReviews(prev => reviewPage === 1 ? data.data : [...prev, ...data.data]);
          setReviewTotal(data.total);
        }
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [id, reviewPage]);

  const handleAddToCart = () => {
    if (product && product.sellerId !== user?.id) {
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
  const isOwnProduct = !!user?.id && user.id === product.sellerId;
  const showBuyerUI = !isOwnProduct || previewMode;

  return (
    <div className="space-y-8">
      {/* Breadcrumb + preview toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </button>

        {isOwnProduct && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode(v => !v)}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                previewMode
                  ? 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {previewMode ? 'Exit Preview' : 'Preview as Buyer'}
            </button>
            {!previewMode && (
              <Button size="sm" onClick={() => navigate('/seller')}>
                <Edit className="w-4 h-4 mr-1.5" />
                Edit in Dashboard
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <Card padding="sm">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </Card>

          {images.length > 1 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === index
                      ? 'border-primary-600'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {product.name}
            </h1>

            {/* Rating */}
            {showBuyerUI && (
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
                <span className="text-gray-500 dark:text-gray-400">({product.reviews} reviews)</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-bold text-primary-600">
                {formatCurrency(product.price)}
              </span>
            </div>

            {/* Description */}
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              {product.description}
            </p>

            {/* Stock Status */}
            <div className="mb-6">
              {product.stock > 0 ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Package className="w-5 h-5" />
                  <span className="font-medium">
                    {product.stock > 10
                      ? 'In Stock'
                      : `Only ${product.stock} left in stock`}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <Package className="w-5 h-5" />
                  <span className="font-medium">Out of Stock</span>
                </div>
              )}

              {cartQuantity > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {cartQuantity} in your cart
                </p>
              )}
            </div>
          </div>

          {/* Quantity + Add to Cart */}
          {showBuyerUI && product.stock > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                  <button
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="w-11 h-11 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-5 py-2 font-semibold text-base min-w-[3rem] text-center bg-gray-50 dark:bg-gray-700 dark:text-white select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={incrementQuantity}
                    disabled={quantity >= product.stock}
                    className="w-11 h-11 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <Button size="lg" fullWidth onClick={handleAddToCart} className="flex-1">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Truck, label: 'Free Shipping', sub: 'On orders over $50' },
              { icon: RotateCcw, label: 'Easy Returns', sub: '30-day return policy' },
              { icon: Shield, label: 'Secure Payment', sub: '100% secure checkout' },
              { icon: Package, label: 'Quality Assured', sub: 'Premium products only' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Specifications
              </h3>
              <dl className="space-y-2">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                  >
                    <dt className="font-medium text-gray-700 dark:text-gray-300">{key}</dt>
                    <dd className="text-gray-600 dark:text-gray-400">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>
      </div>

      {/* Reviews */}
      {showBuyerUI && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Customer Reviews
              {reviewTotal > 0 && (
                <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">({reviewTotal})</span>
              )}
            </h2>
            {/* Rating summary */}
            {product.rating > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{product.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {reviewsLoading && reviews.length === 0 ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : reviews.length === 0 ? (
            <Card className="text-center py-10">
              <Star className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No reviews yet. Be the first to review this product!</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map(review => (
                <Card key={review._id} padding="md">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
                      {review.userId.avatar ? (
                        <img src={review.userId.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {review.userId.firstName} {review.userId.lastName}
                        </p>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(review.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-0.5 my-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
                        ))}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{review.comment}</p>
                    </div>
                  </div>
                </Card>
              ))}

              {reviews.length < reviewTotal && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReviewPage(p => p + 1)}
                    loading={reviewsLoading}
                  >
                    <ChevronDown className="w-4 h-4 mr-1.5" />
                    Load More Reviews
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Seller card */}
      {sellerProfile && !isOwnProduct && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-4">
          <Link to={`/users/${sellerProfile.id}`} className="flex items-center gap-4 flex-1 min-w-0">
            {sellerProfile.avatar ? (
              <img
                src={sellerProfile.avatar}
                alt={`${sellerProfile.firstName} ${sellerProfile.lastName}`}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0 ring-2 ring-primary-100 dark:ring-primary-900"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center flex-shrink-0 ring-2 ring-primary-100 dark:ring-primary-900">
                <span className="text-base font-bold text-primary-600">
                  {sellerProfile.firstName[0]}{sellerProfile.lastName[0]}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                  {sellerProfile.firstName} {sellerProfile.lastName}
                </p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex-shrink-0">
                  <Store className="w-3 h-3" />
                  Seller
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {sellerProfile.followersCount} followers
              </p>
            </div>
          </Link>
          <button
            onClick={async () => {
              if (followLoading) return;
              setFollowLoading(true);
              try {
                const method = sellerProfile.isFollowing ? 'DELETE' : 'POST';
                const res = await fetch(API_ENDPOINTS.USER_FOLLOW(sellerProfile.id), {
                  method,
                  headers: getAuthHeaders(),
                });
                const data = await res.json();
                if (data.success) {
                  setSellerProfile(prev =>
                    prev
                      ? { ...prev, isFollowing: data.isFollowing, followersCount: data.followersCount }
                      : prev
                  );
                }
              } finally {
                setFollowLoading(false);
              }
            }}
            disabled={followLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
              sellerProfile.isFollowing
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            } disabled:opacity-50`}
          >
            {followLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : sellerProfile.isFollowing ? (
              <UserMinus className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {sellerProfile.isFollowing ? 'Unfollow' : 'Follow'}
          </button>
        </div>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">You Might Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedProducts.map(rp => (
              <Card
                key={rp.id}
                hover
                padding="none"
                className="flex flex-col overflow-hidden"
                onClick={() => navigate(`/products/${rp.id}`)}
              >
                <div className="aspect-square overflow-hidden bg-gray-50 dark:bg-gray-700">
                  <img src={rp.image} alt={rp.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" loading="lazy" />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 leading-snug">{rp.name}</h3>
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{rp.rating}</span>
                  </div>
                  <p className="text-base font-bold text-primary-600">{formatCurrency(rp.price)}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
