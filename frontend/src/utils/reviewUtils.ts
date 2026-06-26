import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

export interface ReviewData {
  reviewId: string;
  rating: number;
  comment: string;
}

/** Batch-check review status for a list of product IDs. Returns a Map of productId → ReviewData. */
export async function fetchReviewStatuses(productIds: string[]): Promise<Map<string, ReviewData>> {
  const unique = [...new Set(productIds)];
  const results = await Promise.allSettled(
    unique.map(async pid => {
      const res = await fetch(API_ENDPOINTS.CHECK_REVIEW(pid), { headers: getAuthHeaders() });
      const data = await res.json();
      return { pid, data };
    })
  );
  const map = new Map<string, ReviewData>();
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.data.hasReviewed && r.value.data.review) {
      const rev = r.value.data.review;
      map.set(r.value.pid, { reviewId: rev._id, rating: rev.rating, comment: rev.comment });
    }
  }
  return map;
}

/** Re-fetch review status for a single product and return its ReviewData (or null). */
export async function fetchSingleReview(productId: string): Promise<ReviewData | null> {
  const res = await fetch(API_ENDPOINTS.CHECK_REVIEW(productId), { headers: getAuthHeaders() });
  const data = await res.json();
  if (data.hasReviewed && data.review) {
    const rev = data.review;
    return { reviewId: rev._id, rating: rev.rating, comment: rev.comment };
  }
  return null;
}
