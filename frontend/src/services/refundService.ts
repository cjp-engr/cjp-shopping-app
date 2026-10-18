import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import type { RefundEligibility, RefundInput, RefundRequest, SellerRefundPage } from '../types/refund';
export class RefundApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  constructor(status: number, code: string | undefined, message: string) { super(message); this.status = status; this.code = code; }
}
async function request<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: getAuthHeaders(), ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new RefundApiError(res.status, data?.code, data?.message || 'Could not complete the refund request. Please refresh and try again.');
  if (!data) throw new RefundApiError(502, undefined, 'Could not read the refund response. Please refresh before retrying.');
  return data;
}
const sellerUrl = API_ENDPOINTS.SELLER_ORDERS.replace(/\/orders$/, '/refund-requests');
export const refundService = {
  async completed(page = 1): Promise<SellerRefundPage> { return request<SellerRefundPage>(`${API_ENDPOINTS.ORDERS}/refund-requests/completed?page=${page}&limit=20`); },
  async eligibility(id: string): Promise<RefundEligibility> { return (await request<{ eligibility: RefundEligibility }>(`${API_ENDPOINTS.ORDERS}/${id}/refund-eligibility`)).eligibility; },
  async history(id: string): Promise<RefundRequest[]> { return (await request<{ requests: RefundRequest[] }>(`${API_ENDPOINTS.ORDERS}/${id}/refund-requests`)).requests; },
  async submit(id: string, body: RefundInput): Promise<RefundRequest> { return (await request<{ request: RefundRequest }>(`${API_ENDPOINTS.ORDERS}/${id}/refund-requests`, 'POST', body)).request; },
  async sellerList(page = 1): Promise<SellerRefundPage> { return request<SellerRefundPage>(`${sellerUrl}?page=${page}&limit=20`); },
  async decide(id: string, decision: 'approve' | 'reject', rejectionReason?: string): Promise<RefundRequest> {
    return (await request<{ request: RefundRequest }>(`${sellerUrl}/${id}/decision`, 'PUT', { decision, ...(decision === 'reject' ? { rejectionReason } : {}) })).request;
  },
};
