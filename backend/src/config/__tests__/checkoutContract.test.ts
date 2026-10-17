import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import ts from 'typescript';
import type { Request, Response } from 'express';
import { swaggerSpec } from '../swagger.js';

vi.mock('../../services/checkoutService.js', async () => ({
  ...(await vi.importActual<typeof import('../../services/checkoutService.js')>('../../services/checkoutService.js')),
  createCheckoutSession: vi.fn(),
  getCheckoutSessionForBuyer: vi.fn(),
  sellerDisplayNames: vi.fn(async () => new Map<string, string>()),
}));

vi.mock('../../services/checkoutAuthorization.js', async () => ({
  ...(await vi.importActual<typeof import('../../services/checkoutAuthorization.js')>('../../services/checkoutAuthorization.js')),
  assertSavedCardOwned: vi.fn(),
  authorizeCheckoutSession: vi.fn(),
  ownerClientSecrets: vi.fn(async () => new Map<string, string>()),
}));

vi.mock('../../services/checkoutFinalization.js', async () => ({
  ...(await vi.importActual<typeof import('../../services/checkoutFinalization.js')>('../../services/checkoutFinalization.js')),
  finalizeCheckoutSession: vi.fn(),
}));

import { CheckoutError, createCheckoutSession, getCheckoutSessionForBuyer } from '../../services/checkoutService.js';
import { assertSavedCardOwned, authorizeCheckoutSession, ownerClientSecrets } from '../../services/checkoutAuthorization.js';
import { FinalizationError, finalizeCheckoutSession } from '../../services/checkoutFinalization.js';
import { confirmSession, createSession, getSession } from '../../controllers/checkoutController.js';
import { rejectLegacyCardIntent, rejectLegacyCardOrder } from '../../middleware/checkoutFlowGuard.js';

const spec = swaggerSpec as any;
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addFormat('binary', true);

const CREATE = ['/checkout/sessions', 'post'] as const;
const GET = ['/checkout/sessions/{id}', 'get'] as const;
const CONFIRM = ['/checkout/sessions/{id}/confirm', 'post'] as const;
const checkoutOperations = [CREATE, GET, CONFIRM];

// 401 and 429 come from shared middleware and keep the generic envelopes.
const SHARED_STATUSES = new Set(['401', '429', '500']);

function accepts(schema: object, value: unknown) {
  const validate = ajv.compile({ ...schema, components: spec.components });
  return { valid: validate(value), errors: validate.errors };
}
function expectValid(schema: object, value: unknown) {
  const result = accepts(schema, value);
  expect(result.valid, JSON.stringify(result.errors)).toBe(true);
}
function responseSchema(path: string, method: string, status: number) {
  let response = spec.paths[path][method].responses[status];
  if (response.$ref) response = spec.components.responses[response.$ref.split('/').pop()];
  return response.content['application/json'].schema;
}
function operation([path, method]: readonly [string, string]) {
  return spec.paths[path][method];
}
function documentedStatuses([path, method]: readonly [string, string]) {
  return Object.keys(operation([path, method]).responses).sort();
}
function capture() {
  let status = 200;
  let payload: unknown;
  const res = {
    status(code: number) { status = code; return res; },
    json(value: unknown) { payload = JSON.parse(JSON.stringify(value)); return res; },
  } as unknown as Response;
  return { res, result: () => ({ status, payload }) };
}

const id = '507f1f77bcf86cd799439011';
const sellerId = '507f1f77bcf86cd799439012';
const draftId = '507f1f77bcf86cd799439013';
const validBody = {
  items: [{ productId: id, quantity: 1 }],
  shippingAddress: { street: '1 Main St', city: 'Taipei', state: 'Taipei', zipCode: '100', country: 'TW' },
  paymentMethod: { type: 'credit-card' },
};
const idempotencyKey = 'key-contract-1';

function session(status: 'open' | 'placed') {
  return {
    _id: { toString: () => id },
    status,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    placedAt: status === 'placed' ? new Date() : undefined,
    sellers: [{
      sellerId: { toString: () => sellerId },
      draftOrderId: { toString: () => draftId },
      amountMinor: 3159,
      currency: 'usd',
      status: status === 'placed' ? 'authorized' : 'awaiting_authorization',
    }],
  } as any;
}

function request(body: unknown, headers: Record<string, string> = {}, params: Record<string, string> = {}) {
  return { user: { id: 'buyer-1' }, header: (name: string) => headers[name], body, params } as unknown as Request;
}

// Walks the TypeScript AST so the scan follows the code rather than a hand-kept list.
function source(relative: string) {
  const filename = fileURLToPath(new URL(relative, import.meta.url));
  return ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
}
function emittedCodes(): string[] {
  const files = [
    '../../services/checkoutService.ts',
    '../../services/checkoutAuthorization.ts',
    '../../services/checkoutFinalization.ts',
    '../../services/checkoutCompensation.ts',
    '../../controllers/checkoutController.ts',
  ];
  const pairs = new Set<string>();
  for (const file of files) {
    const visit = (node: ts.Node) => {
      if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.arguments) {
        const [first, second] = node.arguments;
        if (node.expression.text === 'CheckoutError' && first && second && ts.isNumericLiteral(first) && ts.isStringLiteral(second)) {
          pairs.add(`${first.text} ${second.text}`);
        }
        // FinalizationError always responds 409; its code is the first argument.
        if (node.expression.text === 'FinalizationError' && first && ts.isStringLiteral(first)) {
          pairs.add(`409 ${first.text}`);
        }
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'sendError') {
        const [, status, code] = node.arguments;
        if (status && code && ts.isNumericLiteral(status) && ts.isStringLiteral(code)) pairs.add(`${status.text} ${code.text}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source(file));
  }
  return [...pairs].sort();
}

describe('checkout OpenAPI contract', () => {
  const originalFlow = process.env.CHECKOUT_FLOW;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CHECKOUT_FLOW = 'manual_capture';
  });

  afterEach(() => {
    if (originalFlow === undefined) delete process.env.CHECKOUT_FLOW;
    else process.env.CHECKOUT_FLOW = originalFlow;
  });

  it('documents exactly the status codes each checkout handler can return', () => {
    expect(documentedStatuses(CREATE)).toEqual(['200', '201', '400', '401', '402', '403', '409', '429', '500']);
    expect(documentedStatuses(GET)).toEqual(['200', '401', '404', '429', '500']);
    expect(documentedStatuses(CONFIRM)).toEqual(['200', '401', '404', '409', '429', '500']);
  });

  it('uses the structured error envelope for every documented 4xx except 401 and 429', () => {
    for (const item of checkoutOperations) {
      const op = operation(item);
      const checkoutStatuses = Object.keys(op.responses).filter(s => s.startsWith('4') && !SHARED_STATUSES.has(s));
      expect(checkoutStatuses.length, `${item.join(' ')} has checkout errors`).toBeGreaterThan(0);
      for (const status of checkoutStatuses) {
        expect(op.responses[status].content['application/json'].schema, `${item.join(' ')} ${status}`).toEqual({ $ref: '#/components/schemas/StructuredError' });
      }
      expect(Object.keys(op['x-error-codes']).sort(), `${item.join(' ')} documents codes per status`).toEqual(checkoutStatuses.sort());
    }
  });

  it('lists exactly the machine-readable codes the checkout code can emit', () => {
    const documented = checkoutOperations
      .flatMap(item => Object.entries(operation(item)['x-error-codes'] as Record<string, string[]>)
        .flatMap(([status, codes]) => codes.map(code => `${status} ${code}`)))
      .sort();
    expect([...new Set(documented)].sort()).toEqual(emittedCodes());
  });

  it('publishes the structured 426 envelope on the legacy card endpoints, matching the guard', () => {
    const next = vi.fn();
    const response = capture();
    rejectLegacyCardIntent(request({}), response.res, next);
    expect(response.result().status).toBe(426);
    expectValid(responseSchema('/payments/create-intent', 'post', 426), response.result().payload);

    const orderResponse = capture();
    rejectLegacyCardOrder(request({ paymentMethod: { type: 'credit-card' } }), orderResponse.res, next);
    expect(orderResponse.result().status).toBe(426);
    expectValid(responseSchema('/orders', 'post', 426), orderResponse.result().payload);
    expect(accepts(responseSchema('/orders', 'post', 426), { success: false, message: 'Update the app' }).valid).toBe(false);
  });
});

describe('checkout handler responses match the documented envelopes', () => {
  const originalFlow = process.env.CHECKOUT_FLOW;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CHECKOUT_FLOW = 'manual_capture';
  });

  afterEach(() => {
    if (originalFlow === undefined) delete process.env.CHECKOUT_FLOW;
    else process.env.CHECKOUT_FLOW = originalFlow;
  });

  it('returns a structured 409 when card checkout is disabled', async () => {
    process.env.CHECKOUT_FLOW = 'legacy';
    const response = capture();
    await createSession(request(validBody, { 'Idempotency-Key': idempotencyKey }), response.res, vi.fn());
    expect(response.result().status).toBe(409);
    expectValid(responseSchema(...CREATE, 409), response.result().payload);
    expect(accepts(responseSchema(...CREATE, 409), { success: false, message: 'disabled' }).valid).toBe(false);
  });

  it('returns a structured 400 for a missing Idempotency-Key', async () => {
    const response = capture();
    await createSession(request(validBody), response.res, vi.fn());
    expect(response.result().status).toBe(400);
    expectValid(responseSchema(...CREATE, 400), response.result().payload);
  });

  it('returns a structured 400 invalid_request for an invalid body', async () => {
    const response = capture();
    const next = vi.fn();
    await createSession(request({}, { 'Idempotency-Key': idempotencyKey }), response.res, next);
    expect(next).not.toHaveBeenCalled();
    expect(response.result().status).toBe(400);
    expectValid(responseSchema(...CREATE, 400), response.result().payload);
  });

  it('returns a structured 403 when the saved card belongs to someone else', async () => {
    vi.mocked(assertSavedCardOwned).mockRejectedValue(new CheckoutError(403, 'saved_card_not_owned', 'The selected card does not belong to this buyer'));
    const response = capture();
    await createSession(request({ ...validBody, savedPaymentMethodId: 'pm_123' }, { 'Idempotency-Key': idempotencyKey }), response.res, vi.fn());
    expect(response.result().status).toBe(403);
    expectValid(responseSchema(...CREATE, 403), response.result().payload);
  });

  it('returns a structured 402 when a seller payment is rejected', async () => {
    vi.mocked(createCheckoutSession).mockResolvedValue({ session: session('open'), replayed: false } as any);
    vi.mocked(authorizeCheckoutSession).mockRejectedValue(new CheckoutError(402, 'authorization_rejected', 'Payment could not be authorized for a seller', { sellerId }));
    const response = capture();
    await createSession(request(validBody, { 'Idempotency-Key': idempotencyKey }), response.res, vi.fn());
    expect(response.result().status).toBe(402);
    expectValid(responseSchema(...CREATE, 402), response.result().payload);
  });

  it('returns 201 with each seller client secret for a new checkout', async () => {
    vi.mocked(createCheckoutSession).mockResolvedValue({ session: session('open'), replayed: false } as any);
    vi.mocked(authorizeCheckoutSession).mockResolvedValue([{ sellerId, paymentIntentId: 'pi_1', clientSecret: 'pi_1_secret' }] as any);
    const response = capture();
    await createSession(request(validBody, { 'Idempotency-Key': idempotencyKey }), response.res, vi.fn());
    const { status, payload } = response.result();
    expect(status).toBe(201);
    expect(JSON.stringify(payload)).toContain('pi_1_secret');
    expectValid(responseSchema(...CREATE, 201), payload);
  });

  it('replays a placed checkout without re-authorizing or returning client secrets', async () => {
    vi.mocked(createCheckoutSession).mockResolvedValue({ session: session('placed'), replayed: true } as any);
    const response = capture();
    await createSession(request(validBody, { 'Idempotency-Key': idempotencyKey }), response.res, vi.fn());
    const { status, payload } = response.result();
    expect(authorizeCheckoutSession).not.toHaveBeenCalled();
    expect(status).toBe(200);
    expect(JSON.stringify(payload)).not.toContain('clientSecret');
    expectValid(responseSchema(...CREATE, 200), payload);
  });

  it('returns the owner session view for GET, with a 200 that matches the schema', async () => {
    vi.mocked(getCheckoutSessionForBuyer).mockResolvedValue(session('open'));
    vi.mocked(ownerClientSecrets).mockResolvedValue(new Map([[sellerId, 'pi_1_secret']]));
    const response = capture();
    await getSession(request(undefined, {}, { id }), response.res, vi.fn());
    expect(response.result().status).toBe(200);
    expectValid(responseSchema(...GET, 200), response.result().payload);
  });

  it('returns a structured 404 for another buyer’s or an unknown session', async () => {
    vi.mocked(getCheckoutSessionForBuyer).mockRejectedValue(new CheckoutError(404, 'session_not_found', 'Checkout session not found'));
    const response = capture();
    await getSession(request(undefined, {}, { id }), response.res, vi.fn());
    expect(response.result().status).toBe(404);
    expectValid(responseSchema(...GET, 404), response.result().payload);
  });

  it('returns the placed orders on confirm with a 200 that matches the schema', async () => {
    const placedAt = new Date();
    const acceptBy = new Date(placedAt.getTime() + 3 * 24 * 60 * 60 * 1000);
    vi.mocked(finalizeCheckoutSession).mockResolvedValue({
      session: session('placed'),
      orders: [{
        _id: { toString: () => draftId },
        sellerId: { toString: () => sellerId },
        status: 'pending',
        paymentStatus: 'authorized',
        total: 31.59,
        placedAt,
        acceptBy,
        authorizationExpiresAt: new Date(acceptBy.getTime() + 24 * 60 * 60 * 1000),
      }],
    } as any);
    const response = capture();
    await confirmSession(request(undefined, {}, { id }), response.res, vi.fn());
    expect(response.result().status).toBe(200);
    expectValid(responseSchema(...CONFIRM, 200), response.result().payload);
  });

  it('returns a structured 409 while the buyer has not finished payment', async () => {
    vi.mocked(finalizeCheckoutSession).mockRejectedValue(
      new FinalizationError('authorization_not_ready', 'Payment is not ready for this seller yet', { sellerId }, true, false),
    );
    const response = capture();
    await confirmSession(request(undefined, {}, { id }), response.res, vi.fn());
    expect(response.result().status).toBe(409);
    expectValid(responseSchema(...CONFIRM, 409), response.result().payload);
  });

  it('returns a structured 404 when confirming an unknown session', async () => {
    vi.mocked(finalizeCheckoutSession).mockRejectedValue(new CheckoutError(404, 'session_not_found', 'Checkout session not found'));
    const response = capture();
    await confirmSession(request(undefined, {}, { id }), response.res, vi.fn());
    expect(response.result().status).toBe(404);
    expectValid(responseSchema(...CONFIRM, 404), response.result().payload);
  });
});
