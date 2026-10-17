import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

vi.mock('../../models/Order.js', () => ({ default: { findById: vi.fn() } }));
vi.mock('../../models/Product.js', () => ({
  default: { find: vi.fn(), findByIdAndUpdate: vi.fn() },
}));
vi.mock('../orderAcceptance.js', () => ({ acceptOrder: vi.fn() }));

import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import { acceptOrder } from '../orderAcceptance.js';
import { AppError } from '../../middleware/errorHandler.js';
import { VALID_TRANSITIONS, updateSellerOrderStatus } from '../sellerService.js';

const sellerId = '507f1f77bcf86cd799439012';
const productId = '507f1f77bcf86cd799439021';

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    _id: '507f1f77bcf86cd799439011',
    status: 'pending',
    paymentFlowVersion: 'legacy',
    items: [{ product: productId, quantity: 1 }],
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

function stubOrder(order: unknown) {
  vi.mocked(Order.findById).mockResolvedValue(order as any);
}

describe('seller order transitions', () => {
  const original = process.env.SELLER_SEES_MANUAL_CAPTURE;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
    vi.mocked(Product.find).mockReturnValue({ distinct: vi.fn().mockResolvedValue([productId]) } as any);
  });

  afterEach(() => {
    if (original === undefined) delete process.env.SELLER_SEES_MANUAL_CAPTURE;
    else process.env.SELLER_SEES_MANUAL_CAPTURE = original;
  });

  it('allows seller cancellation only before shipping', () => {
    expect(VALID_TRANSITIONS.pending).toContain('cancelled');
    expect(VALID_TRANSITIONS.preparing).toContain('cancelled');
    expect(VALID_TRANSITIONS.processing).toContain('cancelled');
  });

  it('does not allow cancelling a shipped order', () => {
    expect(VALID_TRANSITIONS.shipped).toEqual(['delivered']);
    expect(VALID_TRANSITIONS.shipped).not.toContain('cancelled');
  });

  describe('pending -> preparing', () => {
    it('goes through acceptOrder and reports a completed acceptance', async () => {
      const order = makeOrder();
      const accepted = makeOrder({ status: 'preparing' });
      stubOrder(order);
      vi.mocked(acceptOrder).mockResolvedValue({ kind: 'completed', order: accepted });

      const result = await updateSellerOrderStatus(order._id, sellerId, 'preparing');

      expect(acceptOrder).toHaveBeenCalledWith({ orderId: order._id, sellerId });
      expect(result).toEqual({ order: accepted, outcome: 'completed' });
    });

    it('reports a resolving acceptance without mutating the order itself', async () => {
      const order = makeOrder({ paymentFlowVersion: 'manual_capture', paymentStatus: 'capture_pending' });
      const resolving = makeOrder({ paymentFlowVersion: 'manual_capture', paymentStatus: 'capture_pending' });
      stubOrder(order);
      vi.mocked(acceptOrder).mockResolvedValue({ kind: 'resolving', order: resolving });

      const result = await updateSellerOrderStatus(order._id, sellerId, 'preparing');

      expect(result).toEqual({ order: resolving, outcome: 'resolving' });
      expect(order.status).toBe('pending');
      expect(order.save).not.toHaveBeenCalled();
    });

    it('leaves the ownership check to acceptOrder instead of the product pre-check', async () => {
      stubOrder(makeOrder());
      vi.mocked(acceptOrder).mockResolvedValue({ kind: 'completed', order: makeOrder({ status: 'preparing' }) });

      await updateSellerOrderStatus('507f1f77bcf86cd799439011', sellerId, 'preparing');

      expect(Product.find).not.toHaveBeenCalled();
    });

    it('lets acceptOrder errors reach the caller with their code', async () => {
      stubOrder(makeOrder());
      vi.mocked(acceptOrder).mockRejectedValue(new AppError(409, 'late', 'acceptance_deadline_passed'));

      await expect(updateSellerOrderStatus('507f1f77bcf86cd799439011', sellerId, 'preparing'))
        .rejects.toMatchObject({ statusCode: 409, code: 'acceptance_deadline_passed' });
    });

    it('never saves the order through the old read-then-save path', async () => {
      const order = makeOrder();
      stubOrder(order);
      vi.mocked(acceptOrder).mockResolvedValue({ kind: 'completed', order: makeOrder({ status: 'preparing' }) });

      await updateSellerOrderStatus(order._id, sellerId, 'preparing');

      expect(order.save).not.toHaveBeenCalled();
    });

    it('still reports 404 order_not_found for a missing order without calling acceptOrder', async () => {
      stubOrder(null);

      await expect(updateSellerOrderStatus('507f1f77bcf86cd799439011', sellerId, 'preparing'))
        .rejects.toMatchObject({ statusCode: 404, code: 'order_not_found' });
      expect(acceptOrder).not.toHaveBeenCalled();
    });
  });

  describe('other transitions keep their behavior', () => {
    it('moves processing -> shipped, stamps shippedAt and saves', async () => {
      const order = makeOrder({ status: 'processing' });
      stubOrder(order);

      const result = await updateSellerOrderStatus(order._id, sellerId, 'shipped');

      expect(acceptOrder).not.toHaveBeenCalled();
      expect(order.status).toBe('shipped');
      expect(order.shippedAt).toBeInstanceOf(Date);
      expect(order.save).toHaveBeenCalledOnce();
      expect(result).toEqual({ order, outcome: 'completed' });
    });

    it('moves preparing -> processing without acceptOrder', async () => {
      const order = makeOrder({ status: 'preparing' });
      stubOrder(order);

      await updateSellerOrderStatus(order._id, sellerId, 'processing');

      expect(acceptOrder).not.toHaveBeenCalled();
      expect(order.status).toBe('processing');
    });

    it('rejects shipped -> cancelled as an invalid transition', async () => {
      const order = makeOrder({ status: 'shipped' });
      stubOrder(order);

      await expect(updateSellerOrderStatus(order._id, sellerId, 'cancelled'))
        .rejects.toMatchObject({ statusCode: 400 });
      expect(order.save).not.toHaveBeenCalled();
    });

    it('rejects a seller who owns none of the ordered products on a later transition', async () => {
      vi.mocked(Product.find).mockReturnValue({ distinct: vi.fn().mockResolvedValue([]) } as any);
      const order = makeOrder({ status: 'processing' });
      stubOrder(order);

      await expect(updateSellerOrderStatus(order._id, sellerId, 'shipped'))
        .rejects.toMatchObject({ statusCode: 403, code: 'not_order_seller' });
    });

    it('keeps cancelling a manual-capture order unavailable', async () => {
      const order = makeOrder({ paymentFlowVersion: 'manual_capture' });
      stubOrder(order);

      await expect(updateSellerOrderStatus(order._id, sellerId, 'cancelled'))
        .rejects.toMatchObject({ statusCode: 409, code: 'cancellation_unavailable' });
      expect(order.save).not.toHaveBeenCalled();
    });

    it('restores stock when cancelling a legacy order', async () => {
      const order = makeOrder();
      stubOrder(order);

      await updateSellerOrderStatus(order._id, sellerId, 'cancelled', 'out of stock');

      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(productId, { $inc: { stock: 1 } });
      expect(order.status).toBe('cancelled');
      expect(order.cancelReason).toBe('out of stock');
    });
  });
});
