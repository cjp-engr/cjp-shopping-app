import React, { useState } from 'react';
import { Star, X, Send, Pencil } from 'lucide-react';
import { Button } from './Button';
import { API_ENDPOINTS, getAuthHeaders } from '../../config/api';

interface ReviewModalProps {
  productId: string;
  orderId: string;
  productName: string;
  productImage: string;
  onClose: () => void;
  onSubmitted: () => void | Promise<void>;
  // Edit mode — pass existing review data to pre-fill
  reviewId?: string;
  initialRating?: number;
  initialComment?: string;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  productId, orderId, productName, productImage, onClose, onSubmitted,
  reviewId, initialRating = 0, initialComment = '',
}) => {
  const isEditing = !!reviewId;
  const [rating, setRating] = useState(initialRating);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError('Please select a star rating.'); return; }
    if (comment.trim().length < 5) { setError('Comment must be at least 5 characters.'); return; }

    setLoading(true);
    setError(null);
    try {
      const res = isEditing
        ? await fetch(API_ENDPOINTS.REVIEW(reviewId!), {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ rating, comment: comment.trim() }),
          })
        : await fetch(API_ENDPOINTS.REVIEWS, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ productId, orderId, rating, comment: comment.trim() }),
          });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit review');
      await onSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const starLabel = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  const active = hovered || rating;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Review' : 'Write a Review'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Product */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
              <img src={productImage} alt={productName} className="w-full h-full object-cover" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{productName}</p>
          </div>

          {/* Star rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= active ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
              {active > 0 && (
                <span className="ml-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                  {starLabel[active]}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Review
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Share your experience with this product..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{comment.length}/1000</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={loading}>
              {isEditing
                ? <><Pencil className="w-4 h-4 mr-2" />Update Review</>
                : <><Send className="w-4 h-4 mr-2" />Submit Review</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
