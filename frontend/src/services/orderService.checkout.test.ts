import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import orderService from './orderService';
import { CheckoutApiError } from './checkoutApiError';
import { buildCheckoutSessionPayload } from '../utils/checkoutSession';
import type { Cart } from '../types/cart';
import type { Product } from '../types/product';
import type { CheckoutSession } from '../types/checkout';

const address = { street: '1 Main St', city: 'Taipei', state: 'Taipei', zipCode: '100', country: 'TW' };
const session: CheckoutSession = { id: 'sess-1', status: 'open', expiresAt: '2026-10-14T00:15:00.000Z', sellers: [] };
const idempotencyKey = 'key-12345678';

const product = { id: 'p1', name: 'Book', price: 100, discount: 10 } as unknown as Product;
const cart = {
  items: [{
    product,
    quantity: 2,
    isSelected: true,
    selectedVariant: { _id: 'v1', attributes: { Size: 'M' }, price: 100, stock: 3, key: 'Size:M' },
  }],
  totalItems: 2,
  subtotal: 200,
  tax: 16,
  shipping: 0,
  total: 216,
} as unknown as Cart;

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function sentBody(fetchMock: ReturnType<typeof vi.fn>): unknown {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return JSON.parse(init.body as string);
}

// Keys that would mean the client priced the order itself.
const MONEY_KEYS = ['subtotal', 'tax', 'shipping', 'total', 'price', 'discount', 'productPrice', 'productDiscount', 'amount', 'amountInCents', 'amountMinor'];
function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach(item => collectKeys(item, keys));
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

describe('orderService checkout session methods', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => 'jwt-token' });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a session with the Idempotency-Key header and reports a new session', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { success: true, data: session }));
    const payload = buildCheckoutSessionPayload({ cart, shippingAddress: address, paymentMethod: { type: 'credit-card' } });

    const result = await orderService.createCheckoutSession(payload, idempotencyKey);

    expect(result).toEqual({ session, replayed: false });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/checkout\/sessions$/);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Idempotency-Key': idempotencyKey, Authorization: 'Bearer jwt-token' });
  });

  it('reports a replayed session when the server answers 200', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: session }));
    const payload = buildCheckoutSessionPayload({ cart, shippingAddress: address, paymentMethod: { type: 'credit-card' } });

    await expect(orderService.createCheckoutSession(payload, idempotencyKey)).resolves.toEqual({ session, replayed: true });
  });

  it('sends identifiers, quantities and choices only, never client-computed totals', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { success: true, data: session }));
    const payload = buildCheckoutSessionPayload({
      cart,
      shippingAddress: address,
      paymentMethod: { type: 'debit-card', last4: '4242' },
      couponCodes: { seller1: 'SAVE10' },
    });

    await orderService.createCheckoutSession(payload, idempotencyKey);

    const body = sentBody(fetchMock);
    const keys = collectKeys(body);
    expect(MONEY_KEYS.filter(key => keys.has(key))).toEqual([]);
    expect(body).toEqual({
      items: [{ productId: 'p1', variantId: 'v1', selectedAttributes: { Size: 'M' }, quantity: 2 }],
      shippingAddress: address,
      paymentMethod: { type: 'debit-card', last4: '4242' },
      couponCodes: { seller1: 'SAVE10' },
    });
  });

  it('surfaces the machine-readable code and retryable flag from a structured error', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, {
      success: false,
      error: { code: 'authorization_in_progress', message: 'Payment authorization is already in progress', retryable: true },
    }));
    const payload = buildCheckoutSessionPayload({ cart, shippingAddress: address, paymentMethod: { type: 'credit-card' } });

    const error = await orderService.createCheckoutSession(payload, idempotencyKey).catch(e => e);

    expect(error).toBeInstanceOf(CheckoutApiError);
    expect(error).toMatchObject({ status: 409, code: 'authorization_in_progress', retryable: true });
  });

  it('falls back to unknown_error for the shared error envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { success: false, message: 'Server Error' }));

    const error = await orderService.getCheckoutSession('sess-1').catch(e => e);

    expect(error).toMatchObject({ status: 500, code: 'unknown_error', retryable: false, message: 'Server Error' });
  });

  it('handles a failure body that is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));

    const error = await orderService.confirmCheckoutSession('sess-1').catch(e => e);

    expect(error).toMatchObject({ status: 502, code: 'unknown_error', message: 'Checkout request failed' });
  });

  it('rejects a success response that has no data', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true }));

    const error = await orderService.getCheckoutSession('sess-1').catch(e => e);

    expect(error).toMatchObject({ code: 'invalid_response' });
  });

  it('reads one session by id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: session }));

    await expect(orderService.getCheckoutSession('sess-1')).resolves.toEqual(session);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/checkout\/sessions\/sess-1$/);
    expect(init.method ?? 'GET').toBe('GET');
  });

  it('confirms a session and returns the placed orders', async () => {
    const placed: CheckoutSession = {
      ...session,
      status: 'placed',
      placedAt: '2026-10-14T00:05:00.000Z',
      sellers: [{ sellerId: 's1', sellerName: 'Seller', draftOrderId: 'o1', amountMinor: 21600, currency: 'usd', status: 'authorized' }],
      orders: [{
        id: 'o1', sellerId: 's1', status: 'pending', paymentStatus: 'authorized', total: 216,
        placedAt: '2026-10-14T00:05:00.000Z', acceptBy: '2026-10-17T00:05:00.000Z',
        authorizationExpiresAt: '2026-10-21T00:05:00.000Z', shortAuthorization: false,
      }],
    };
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: placed }));

    await expect(orderService.confirmCheckoutSession('sess-1')).resolves.toEqual(placed);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/checkout\/sessions\/sess-1\/confirm$/);
    expect(init.method).toBe('POST');
  });
});
