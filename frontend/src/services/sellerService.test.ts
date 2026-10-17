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
