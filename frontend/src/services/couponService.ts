import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

export interface Coupon {
  id: string;
  code: string;
  sellerId: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount: number;
  expiresAt?: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
}

export interface ValidateResult {
  coupon: Pick<Coupon, 'id' | 'code' | 'discountType' | 'discountValue' | 'maxDiscount' | 'description'>;
  discountAmount: number;
}

const adapt = (c: any): Coupon => ({
  id: c._id ?? c.id,
  code: c.code,
  sellerId: c.sellerId?._id ?? c.sellerId ?? '',
  discountType: c.discountType,
  discountValue: c.discountValue,
  maxDiscount: c.maxDiscount,
  minOrderAmount: c.minOrderAmount ?? 0,
  expiresAt: c.expiresAt,
  usageLimit: c.usageLimit,
  usedCount: c.usedCount ?? 0,
  isActive: c.isActive ?? true,
  description: c.description,
  createdAt: c.createdAt ?? new Date().toISOString(),
});

class CouponService {
  // Buyer: get available coupons for a seller
  async getAvailable(sellerId: string, orderAmount?: number): Promise<Coupon[]> {
    const params = new URLSearchParams({ sellerId });
    if (orderAmount != null) params.set('orderAmount', String(orderAmount));
    const res = await fetch(`${API_ENDPOINTS.COUPONS}?${params}`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.coupons ?? []).map(adapt);
  }

  // Buyer: validate a code
  async validate(code: string, sellerId: string, orderAmount: number): Promise<ValidateResult> {
    const res = await fetch(API_ENDPOINTS.COUPONS_VALIDATE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ code, sellerId, orderAmount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? 'Invalid voucher');
    return { coupon: { ...data.coupon, id: data.coupon._id ?? data.coupon.id }, discountAmount: data.discountAmount };
  }

  // Seller: list own coupons
  async listMine(): Promise<Coupon[]> {
    const res = await fetch(API_ENDPOINTS.SELLER_COUPONS, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.coupons ?? []).map(adapt);
  }

  // Seller: create
  async create(payload: Partial<Coupon>): Promise<Coupon> {
    const res = await fetch(API_ENDPOINTS.SELLER_COUPONS, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? 'Failed to create coupon');
    return adapt(data.coupon);
  }

  // Seller: update
  async update(id: string, payload: Partial<Coupon>): Promise<Coupon> {
    const res = await fetch(API_ENDPOINTS.SELLER_COUPON(id), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? 'Failed to update coupon');
    return adapt(data.coupon);
  }

  // Seller: delete
  async delete(id: string): Promise<void> {
    const res = await fetch(API_ENDPOINTS.SELLER_COUPON(id), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message ?? 'Failed to delete coupon');
    }
  }
}

export default new CouponService();
