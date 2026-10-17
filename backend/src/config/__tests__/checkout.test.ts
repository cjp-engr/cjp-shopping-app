import { afterEach, describe, expect, it } from 'vitest';
import {
  acceptanceScanIntervalMs,
  checkoutFlow,
  operationWorkerIntervalMs,
  sellerSeesManualCapture,
} from '../checkout.js';

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe('checkout config', () => {
  it('defaults to the legacy flow', () => {
    delete process.env.CHECKOUT_FLOW;
    expect(checkoutFlow()).toBe('legacy');
  });

  it('accepts manual_capture', () => {
    process.env.CHECKOUT_FLOW = 'manual_capture';
    expect(checkoutFlow()).toBe('manual_capture');
  });

  it('rejects unknown flow values', () => {
    process.env.CHECKOUT_FLOW = 'auto';
    expect(() => checkoutFlow()).toThrow("CHECKOUT_FLOW must be");
  });

  it('keeps manual-capture orders hidden from sellers unless explicitly enabled', () => {
    delete process.env.SELLER_SEES_MANUAL_CAPTURE;
    expect(sellerSeesManualCapture()).toBe(false);
    process.env.SELLER_SEES_MANUAL_CAPTURE = 'true';
    expect(sellerSeesManualCapture()).toBe(true);
  });

  describe.each([
    ['ACCEPTANCE_SCAN_INTERVAL_MS', acceptanceScanIntervalMs, 60000],
    ['OPERATION_WORKER_INTERVAL_MS', operationWorkerIntervalMs, 15000],
  ])('%s', (name, read, fallback) => {
    it('uses the default when unset', () => {
      delete process.env[name];
      expect(read()).toBe(fallback);
    });

    it('reads a positive integer', () => {
      process.env[name] = '2500';
      expect(read()).toBe(2500);
    });

    it.each(['0', '-5', '1.5', 'abc', ''])('falls back to the default for %j', (value) => {
      process.env[name] = value;
      expect(read()).toBe(fallback);
    });
  });
});
