import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { buildCheckoutSessionView } from '../checkoutSessionView.js';

const sellerId = new mongoose.Types.ObjectId();
const sessionId = new mongoose.Types.ObjectId();

function session(overrides: Record<string, unknown> = {}) {
  return {
    _id: sessionId,
    status: 'open',
    expiresAt: new Date('2026-10-14T01:00:00Z'),
    sellers: [{
      sellerId,
      draftOrderId: new mongoose.Types.ObjectId(),
      amountMinor: 3159,
      currency: 'usd',
      status: 'awaiting_authorization',
      paymentIntentId: 'pi_secret_internal',
    }],
    ...overrides,
  } as any;
}

const names = new Map([[sellerId.toString(), 'Seller One']]);

describe('buildCheckoutSessionView', () => {
  it('includes the client secret and seller name for an open session', () => {
    const view = buildCheckoutSessionView(session(), {
      now: new Date('2026-10-14T00:30:00Z'),
      clientSecrets: new Map([[sellerId.toString(), 'pi_1_secret_abc']]),
      sellerNames: names,
    });
    expect(view.status).toBe('open');
    expect(view.sellers[0]).toMatchObject({
      sellerName: 'Seller One',
      amountMinor: 3159,
      currency: 'usd',
      clientSecret: 'pi_1_secret_abc',
    });
  });

  it('never exposes intent IDs, card data or payment-method fields', () => {
    const view = buildCheckoutSessionView(session(), {
      now: new Date('2026-10-14T00:30:00Z'),
      clientSecrets: new Map([[sellerId.toString(), 'pi_1_secret_abc']]),
      sellerNames: names,
    });
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain('pi_secret_internal');
    expect(serialized).not.toMatch(/last4|stripePaymentMethodId|card|paymentIntentId/);
  });

  it('reads as expired after expiresAt and drops any client secret', () => {
    const view = buildCheckoutSessionView(session(), {
      now: new Date('2026-10-14T02:00:00Z'),
      clientSecrets: new Map([[sellerId.toString(), 'pi_1_secret_abc']]),
      sellerNames: names,
    });
    expect(view.status).toBe('expired');
    expect(view.sellers[0].clientSecret).toBeUndefined();
  });

  it('reports a null seller name when the seller is unknown', () => {
    const view = buildCheckoutSessionView(session(), {
      now: new Date('2026-10-14T00:30:00Z'),
      clientSecrets: new Map(),
      sellerNames: new Map(),
    });
    expect(view.sellers[0].sellerName).toBeNull();
  });
});
