import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buyerVisibleOrderFilter,
  isBuyerVisibleOrder,
  isSellerVisibleOrder,
  sellerVisibleOrderFilter,
} from '../orderVisibility.js';

const draft = { status: 'awaiting_payment', paymentFlowVersion: 'manual_capture' };
const manualPending = { status: 'pending', paymentFlowVersion: 'manual_capture' };
const legacyPending = { status: 'pending', paymentFlowVersion: 'legacy' };
const legacyMissingFlag = { status: 'pending' };

describe('order visibility', () => {
  const original = process.env.SELLER_SEES_MANUAL_CAPTURE;

  beforeEach(() => {
    delete process.env.SELLER_SEES_MANUAL_CAPTURE;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.SELLER_SEES_MANUAL_CAPTURE;
    else process.env.SELLER_SEES_MANUAL_CAPTURE = original;
  });

  describe('buyer', () => {
    it('hides drafts and shows placed orders', () => {
      expect(isBuyerVisibleOrder(draft)).toBe(false);
      expect(isBuyerVisibleOrder(manualPending)).toBe(true);
      expect(isBuyerVisibleOrder(legacyPending)).toBe(true);
    });

    it('filters drafts out of the query regardless of the seller flag', () => {
      expect(buyerVisibleOrderFilter()).toEqual({ status: { $ne: 'awaiting_payment' } });
      process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
      expect(buyerVisibleOrderFilter()).toEqual({ status: { $ne: 'awaiting_payment' } });
    });
  });

  describe('seller with SELLER_SEES_MANUAL_CAPTURE off (default)', () => {
    it('hides drafts and manual-capture orders', () => {
      expect(isSellerVisibleOrder(draft)).toBe(false);
      expect(isSellerVisibleOrder(manualPending)).toBe(false);
    });

    it('shows legacy orders, including documents written before the flag existed', () => {
      expect(isSellerVisibleOrder(legacyPending)).toBe(true);
      expect(isSellerVisibleOrder(legacyMissingFlag)).toBe(true);
    });

    it('filters both exclusions out of the query', () => {
      expect(sellerVisibleOrderFilter()).toEqual({
        status: { $ne: 'awaiting_payment' },
        paymentFlowVersion: { $ne: 'manual_capture' },
      });
    });

    it('treats any value other than "true" as off', () => {
      process.env.SELLER_SEES_MANUAL_CAPTURE = 'yes';
      expect(isSellerVisibleOrder(manualPending)).toBe(false);
    });
  });

  describe('seller with SELLER_SEES_MANUAL_CAPTURE=true', () => {
    beforeEach(() => {
      process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
    });

    it('shows manual-capture orders but still hides drafts', () => {
      expect(isSellerVisibleOrder(manualPending)).toBe(true);
      expect(isSellerVisibleOrder(legacyPending)).toBe(true);
      expect(isSellerVisibleOrder(draft)).toBe(false);
    });

    it('only excludes drafts from the query', () => {
      expect(sellerVisibleOrderFilter()).toEqual({ status: { $ne: 'awaiting_payment' } });
    });
  });
});
