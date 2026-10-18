import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sellerService, { SellerOrderError } from './sellerService';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('sellerService.updateOrderStatus', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('localStorage', { getItem: () => 'jwt-token' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports completed on 200 and sends the status', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, order: { id: 'o1' } }));

    await expect(sellerService.updateOrderStatus('o1', 'preparing')).resolves.toEqual({ outcome: 'completed' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/seller/orders/o1/status');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ status: 'preparing' });
  });

  it('reports resolving on 202', async () => {
    fetchMock.mockResolvedValue(jsonResponse(202, { success: true, order: { id: 'o1' }, operation: { status: 'resolving' } }));

    await expect(sellerService.updateOrderStatus('o1', 'preparing')).resolves.toEqual({ outcome: 'resolving' });
  });

  it('sends the cancel reason when given', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true }));

    await sellerService.updateOrderStatus('o1', 'cancelled', 'Out of stock');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ status: 'cancelled', cancelReason: 'Out of stock' });
  });

  it('throws SellerOrderError with the code and message on a failure body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { success: false, message: 'Capture failed', code: 'capture_failed' }));

    const error = await sellerService.updateOrderStatus('o1', 'preparing').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SellerOrderError);
    expect(error).toBeInstanceOf(Error);
    expect((error as SellerOrderError).code).toBe('capture_failed');
    expect((error as SellerOrderError).message).toBe('Capture failed');
  });

  it('throws SellerOrderError without a code when the body has none', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { success: false, message: 'Boom' }));

    const error = await sellerService.updateOrderStatus('o1', 'shipped').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SellerOrderError);
    expect((error as SellerOrderError).code).toBeUndefined();
    expect((error as SellerOrderError).message).toBe('Boom');
  });

  it('still throws SellerOrderError when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));

    const error = await sellerService.updateOrderStatus('o1', 'preparing').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SellerOrderError);
    expect((error as SellerOrderError).code).toBeUndefined();
    expect((error as SellerOrderError).message).toBe('Failed to update status');
  });
});

describe('sellerService cancellation and order list', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('localStorage', { getItem: () => 'jwt-token' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the trimmed cancellation reason', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, order: { id: 'o1' } }));

    await sellerService.updateOrderStatus('o1', 'cancelled', '  Out of stock  ');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ status: 'cancelled', cancelReason: 'Out of stock' });
  });

  it.each(['pending', 'completed', 'needs_review'] as const)('returns the payment outcome %s of a cancellation', async state => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, order: { id: 'o1' }, paymentOperation: { status: state } }));

    await expect(sellerService.updateOrderStatus('o1', 'cancelled', 'x'))
      .resolves.toEqual({ outcome: 'completed', paymentOperation: { status: state } });
  });

  it('does not mistake the capture operation of an acceptance for a payment outcome', async () => {
    fetchMock.mockResolvedValue(jsonResponse(202, { success: true, order: { id: 'o1' }, operation: { status: 'resolving' } }));

    const result = await sellerService.updateOrderStatus('o1', 'preparing');

    expect(result).toEqual({ outcome: 'resolving' });
    expect(result).not.toHaveProperty('paymentOperation');
  });

  it('throws SellerOrderError with the code when the cancellation loses a race', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { success: false, message: 'Order accepted', code: 'cancellation_conflict' }));

    const error = await sellerService.updateOrderStatus('o1', 'cancelled', 'x').catch(e => e);

    expect(error).toBeInstanceOf(SellerOrderError);
    expect(error.code).toBe('cancellation_conflict');
  });

  it('keeps the payment, deadline and cancellation fields when it lists orders', async () => {
    const raw = {
      _id: 'o1',
      userId: { _id: 'u1', firstName: 'Bea', lastName: 'Buyer', email: 'b@example.com' },
      items: [],
      shippingAddress: { street: '1 Main St', city: 'Taipei', state: 'Taipei', zipCode: '100', country: 'TW' },
      paymentMethod: { type: 'credit-card', last4: '4242' },
      subtotal: 10, productDiscount: 0, discount: 0, tax: 0.8, shipping: 0, total: 10.8,
      status: 'cancelled',
      createdAt: '2026-10-18T00:00:00.000Z',
      cancelReason: 'Out of stock',
      paymentFlowVersion: 'manual_capture',
      paymentStatus: 'release_pending',
      paymentError: { code: 'refund_review' },
      placedAt: '2026-10-18T00:01:00.000Z',
      acceptBy: '2026-10-19T00:01:00.000Z',
      authorizationExpiresAt: '2026-10-25T00:00:00.000Z',
      cancelledByRole: 'seller',
      cancelledAt: '2026-10-18T01:00:00.000Z',
      canSellerCancelPending: false,
    };
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, orders: [raw] }));

    const [order] = await sellerService.getOrders();

    expect(order).toMatchObject({
      id: 'o1',
      cancelReason: 'Out of stock',
      paymentFlowVersion: 'manual_capture',
      paymentStatus: 'release_pending',
      paymentErrorCode: 'refund_review',
      placedAt: raw.placedAt,
      acceptBy: raw.acceptBy,
      authorizationExpiresAt: raw.authorizationExpiresAt,
      cancelledByRole: 'seller',
      cancelledAt: raw.cancelledAt,
      canSellerCancelPending: false,
    });
  });

  it('lists an order whose product was deleted from its snapshot items', async () => {
    const raw = {
      _id: 'o2', userId: 'u1',
      items: [{ product: null, productName: 'Gone item', productPrice: 20, productImage: 'i.png', quantity: 2 }],
      shippingAddress: { street: '1 Main St', city: 'Taipei', state: 'Taipei', zipCode: '100', country: 'TW' },
      paymentMethod: { type: 'cash-on-delivery' },
      subtotal: 40, tax: 0, shipping: 0, total: 40, status: 'pending', createdAt: '2026-10-18T00:00:00.000Z',
      canSellerCancelPending: true,
    };
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, orders: [raw] }));

    const [order] = await sellerService.getOrders();

    expect(order.items[0].product.name).toBe('Gone item');
    expect(order.items[0].quantity).toBe(2);
    expect(order.canSellerCancelPending).toBe(true);
  });
});
