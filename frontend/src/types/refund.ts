export type RefundReason = 'damaged' | 'wrong_item' | 'missing_items' | 'not_as_described' | 'other';
export interface RefundLine { lineId: string; productName: string; productImage?: string; quantityOrdered: number; quantityAvailable: number; availableUnitAmountsMinor: number[] }
export interface RefundEligibility { orderId: string; eligible: boolean; reason?: string; currency?: string; deliveredAt?: string; deadlineAt?: string; lines: RefundLine[]; requestsEnabled?: boolean; shippingRefundableMinor?: number }
export interface RefundRequest {
  id: string; orderId: string; units: Array<{ lineId: string; ordinal: number; merchandiseMinor: number; taxMinor: number; productName?: string; productImage?: string }>;
  amountMinor: number; shippingMinor?: number; currency: string; state: 'requested' | 'rejected' | 'processing' | 'refunded' | 'needs_review';
  reasonCode: RefundReason; description: string; submittedAt: string; completedAt?: string; decidedAt?: string; rejectionReason?: string; errorCode?: string; canDecide?: boolean;
  /** Only on the buyer Return/Refund list: the store's display name (null if the account is gone) and when the order was placed. */
  sellerName?: string | null; orderPlacedAt?: string; orderPaymentStatus?: string | null;
  /** Only on the seller refund list: the buyer's display name (null if the account is gone). */
  buyerName?: string | null;
}
export interface RefundInput { items: Array<{ lineId: string; quantity: number }>; reasonCode: RefundReason; description: string; idempotencyKey: string }
/** What the seller has done with a request: not decided yet, approved (processing or refunded), or rejected. */
export type SellerRefundGroup = 'in_progress' | 'approved' | 'rejected';
export interface SellerRefundPage { requests: RefundRequest[]; page: number; pages: number; total: number; counts?: Record<SellerRefundGroup, number> }
