import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import ts from 'typescript';
import type { Request, Response } from 'express';
import { swaggerSpec } from '../swagger.js';

const id = '507f1f77bcf86cd799439011';
const user = { id, email: 'buyer@example.com', firstName: 'Jane', lastName: 'Doe', role: 'buyer', savedCards: [], savedAddresses: [], createdAt: '2026-10-12T00:00:00.000Z' };
vi.mock('../../services/authService.js', () => ({ loginUser: vi.fn(), getUserById: vi.fn() }));
vi.mock('../../services/orderService.js', () => ({ createOrders: vi.fn() }));
vi.mock('../../services/paymentService.js', () => ({ default: { createPaymentIntent: vi.fn() }, PaymentError: class extends Error { constructor(public statusCode: number, message: string) { super(message); } } }));
vi.mock('../../services/stripeService.js', () => ({ constructWebhookEvent: vi.fn(), StripeError: class extends Error {} }));
vi.mock('../../models/Cart.js', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../../models/StripeEventInbox.js', () => ({ default: { findOneAndUpdate: vi.fn().mockResolvedValue({ _id: 'inbox-1', status: 'received' }), updateOne: vi.fn().mockResolvedValue({}) } }));

import * as authService from '../../services/authService.js';
import * as orderService from '../../services/orderService.js';
import paymentService, { PaymentError } from '../../services/paymentService.js';
import { constructWebhookEvent } from '../../services/stripeService.js';
import Cart from '../../models/Cart.js';
import Product from '../../models/Product.js';
import Order, { PAYMENT_STATUSES } from '../../models/Order.js';
import Review from '../../models/Review.js';
import Coupon from '../../models/Coupon.js';
import User from '../../models/User.js';
import { login, getMe } from '../../controllers/authController.js';
import { createOrder } from '../../controllers/orderController.js';
import { getCart } from '../../controllers/cartController.js';
import { createIntent, handleWebhook } from '../../controllers/paymentController.js';
import { getProducts } from '../../controllers/productController.js';
import { getProductReviews } from '../../controllers/reviewController.js';
import { getSellerCoupons } from '../../controllers/couponController.js';
import { createOrderRules } from '../../validators/orderValidators.js';
import { signupRules } from '../../validators/authValidators.js';
import { validate } from '../../validators/validate.js';
import { protect } from '../../middleware/auth.js';
import { requireSeller } from '../../middleware/seller.js';

// OpenAPI references stay rooted at components; Ajv supports OpenAPI nullable.
const spec = swaggerSpec as any;
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addFormat('binary', true);
function accepts(schema: object, value: unknown) {
  const validate = ajv.compile({ ...schema, components: spec.components });
  return { valid: validate(value), errors: validate.errors };
}
function requestSchema(path: string, method: string, media = 'application/json') {
  return spec.paths[path][method].requestBody.content[media].schema;
}
function responseSchema(path: string, method: string, status: number) {
  let response = spec.paths[path][method].responses[status];
  if (response.$ref) response = spec.components.responses[response.$ref.split('/').pop()];
  return response.content['application/json'].schema;
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

const methods = ['get', 'post', 'put', 'patch', 'delete'];
function source(relative: string) {
  const filename = fileURLToPath(new URL(relative, import.meta.url));
  return ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
}
function calls(node: ts.Node): ts.CallExpression[] {
  const result: ts.CallExpression[] = [];
  const visit = (n: ts.Node) => { if (ts.isCallExpression(n)) result.push(n); ts.forEachChild(n, visit); };
  visit(node);
  return result;
}
// Read registrations rather than maintaining a second hand-written route list.
function registeredRoutes() {
  const server = source('../../server.ts');
  const imports = new Map<string, string>();
  for (const statement of server.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && statement.importClause?.name)
      imports.set(statement.importClause.name.text, statement.moduleSpecifier.text);
  }
  const routes: { method: string; path: string; protected: boolean; seller: boolean; limited: boolean }[] = [];
  for (const call of calls(server)) {
    if (!ts.isPropertyAccessExpression(call.expression) || call.expression.expression.getText(server) !== 'app' || call.expression.name.text !== 'use') continue;
    const [base, ...args] = call.arguments;
    if (!base || !ts.isStringLiteral(base) || !base.text.startsWith('/api/')) continue;
    const routerName = args.find(arg => ts.isIdentifier(arg) && imports.get(arg.text)?.startsWith('./routes/'));
    if (!routerName || !ts.isIdentifier(routerName)) continue;
    const routeSource = source(`../../${imports.get(routerName.text)!.replace('./', '').replace(/\.js$/, '.ts')}`);
    let protectedRouter = false;
    let sellerRouter = false;
    for (const statement of routeSource.statements) {
      for (const registration of calls(statement)) {
        if (!ts.isPropertyAccessExpression(registration.expression)) continue;
        const method = registration.expression.name.text;
        const receiver = registration.expression.expression;
        const argsText = registration.arguments.map(arg => arg.getText(routeSource));
        if (method === 'use' && receiver.getText(routeSource) === 'router') {
          protectedRouter ||= argsText.includes('protect');
          sellerRouter ||= argsText.includes('requireSeller');
          continue;
        }
        if (!methods.includes(method)) continue;
        let routePath: string | undefined;
        if (receiver.getText(routeSource) === 'router' && ts.isStringLiteral(registration.arguments[0])) routePath = (registration.arguments[0] as ts.StringLiteral).text;
        else {
          for (const nested of calls(receiver)) {
            if (ts.isPropertyAccessExpression(nested.expression) && nested.expression.name.text === 'route' && ts.isStringLiteral(nested.arguments[0])) routePath = (nested.arguments[0] as ts.StringLiteral).text;
          }
        }
        if (routePath === undefined) continue;
        routes.push({ method, path: (base.text.slice(4) + (routePath === '/' ? '' : routePath)).replace(/:([\w]+)/g, '{$1}'), protected: protectedRouter || argsText.includes('protect'), seller: sellerRouter || argsText.includes('requireSeller'), limited: args.some(arg => /^(authLimiter|apiLimiter)$/.test(arg.getText(server))) });
      }
    }
  }
  return routes;
}

describe('OpenAPI contract', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is a valid OpenAPI document with resolvable references', async () => {
    await expect(SwaggerParser.validate(JSON.parse(JSON.stringify(spec)))).resolves.toBeDefined();
  });

  it('compiles every request and response schema for payload validation', () => {
    for (const name of Object.keys(spec.components.schemas)) expect(() => ajv.compile({ $ref: `#/components/schemas/${name}`, components: spec.components }), name).not.toThrow();
  });

  it('provides unique stable operation IDs for generated clients and deep links', () => {
    const operations = Object.values(spec.paths).flatMap((item: any) => methods.filter(method => item[method]).map(method => item[method]));
    const ids = operations.map(op => op.operationId);
    for (const id of ids) expect(id).toMatch(/^[a-zA-Z][a-zA-Z0-9]*$/);
    expect(new Set(ids).size).toBe(ids.length);
    expect(spec.paths['/auth/me'].get.operationId).toBe('getAuthMe');
    expect(spec.paths['/payments/webhook'].post.operationId).toBe('postPaymentsWebhook');
  });

  it('validates every published request example against its endpoint schema', () => {
    let examples = 0;
    for (const [path, item] of Object.entries(spec.paths) as [string, any][]) for (const method of methods) {
      for (const media of Object.values(item[method]?.requestBody?.content ?? {}) as any[]) {
        if (media.example === undefined) continue;
        examples++;
        expect(accepts(media.schema, media.example), `${method} ${path}`).toMatchObject({ valid: true });
      }
    }
    expect(examples).toBeGreaterThan(0);
  });

  it('resolves the health URL at the server root', () => {
    const path = spec.paths['/health'];
    const base = (path.get.servers ?? path.servers ?? spec.servers)[0].url;
    expect(base.replace(/\/$/, '') + '/health').toBe('/health');
  });

  it('covers every registered API method and its authentication, role and rate limit', () => {
    const routes = registeredRoutes();
    const documented = Object.entries(spec.paths).flatMap(([path, item]: [string, any]) => methods.filter(method => item[method]).map(method => `${method} ${path}`)).filter(key => key !== 'get /health');
    expect(documented.sort()).toEqual(routes.map(r => `${r.method} ${r.path}`).sort());
    for (const route of routes) {
      const op = spec.paths[route.path][route.method];
      expect(!!op.security?.length, `${route.method} ${route.path} authentication`).toBe(route.protected);
      if (route.seller) expect(op.responses['403']).toBeDefined();
      expect(!!op.responses['429'], `${route.method} ${route.path} limiter`).toBe(route.limited);
    }
  });

  it.each([
    ['/orders', 'post', { items: [{ productId: id, quantity: 1 }], shippingAddress: { street: '1 Main St', city: 'Taipei', state: 'Taipei', zipCode: '100', country: 'TW' }, paymentMethod: { type: 'cash-on-delivery' } }, { items: [], shippingAddress: {}, paymentMethod: {} }],
    ['/cart', 'put', { items: [{ productId: id, quantity: 2, isSelected: true }] }, { items: [{ quantity: 'two' }] }],
    ['/reviews', 'post', { productId: id, orderId: id, rating: 5, comment: 'Great' }, { productId: id, orderId: id, rating: 6, comment: 'Great' }],
    ['/coupons/validate', 'post', { code: 'SAVE10', sellerId: id, orderAmount: 100 }, { code: 'SAVE10' }],
    ['/coupons/seller', 'post', { code: 'SAVE10', discountType: 'percentage', discountValue: 10 }, { code: 'SAVE10', discountType: 'invalid', discountValue: -1 }],
    ['/auth/profile', 'put', { firstName: 'Jane', role: 'seller' }, { firstName: '' }],
    ['/auth/saved-addresses', 'post', { street: '1 Main St', city: 'Taipei', setAsDefault: true }, { street: '1 Main St' }],
  ])('validates usable %s %s requests and rejects invalid payloads', (path, method, valid, invalid) => {
    expect(accepts(requestSchema(path, method), valid)).toMatchObject({ valid: true });
    expect(accepts(requestSchema(path, method), invalid).valid).toBe(false);
  });

  it('documents all product filters and numeric pagination', () => {
    const parameters = spec.paths['/products'].get.parameters;
    expect(parameters.map((p: any) => p.name).sort()).toEqual(['category', 'search', 'minPrice', 'maxPrice', 'rating', 'minReviews', 'excludeSellerId', 'sort', 'page', 'limit'].sort());
    expect(parameters.find((p: any) => p.name === 'page').schema).toMatchObject({ type: 'integer', default: 1 });
  });

  it('documents seller multipart fields and the actual file count limit', () => {
    const schema = requestSchema('/seller/products', 'post', 'multipart/form-data');
    const resolved = schema.$ref ? spec.components.schemas[schema.$ref.split('/').pop()] : schema;
    expect(resolved.properties.images).toMatchObject({ type: 'array', maxItems: 10, items: { type: 'string', format: 'binary' } });
    expect(accepts(schema, { name: 'Book', description: 'A book', price: 10, category: 'Books', images: ['file-bytes'], shippingOptions: '["standard"]', shippingFee: 'free' }).valid).toBe(true);
    expect(accepts(schema, { name: 'Book' }).valid).toBe(false);
  });

  it('requires the Stripe signature and documents raw JSON events', () => {
    const op = spec.paths['/payments/webhook'].post;
    expect(op.parameters).toContainEqual(expect.objectContaining({ name: 'stripe-signature', in: 'header', required: true }));
    expect(accepts(requestSchema('/payments/webhook', 'post'), { id: 'evt_test', type: 'payment_intent.succeeded', data: { object: { id: 'pi_test' } } }).valid).toBe(true);
  });

  it('validates real auth, checkout, cart and payment controller response envelopes', async () => {
    vi.mocked(authService.loginUser).mockResolvedValue({ token: 'jwt', user } as any);
    vi.mocked(authService.getUserById).mockResolvedValue(user as any);
    const product = new Product({ _id: id, name: 'Book', description: 'A book', category: 'Books', price: 10, stock: 5 });
    const order = new Order({ userId: id, items: [{ product: id, productName: 'Book', productPrice: 10, productImage: 'book.jpg', quantity: 1 }], shippingAddress: { street: 'Main St', city: 'Taipei', state: 'Taipei', zipCode: '100' }, paymentMethod: { type: 'cash-on-delivery' }, subtotal: 10, tax: 0.8, shipping: 0, total: 10.8 });
    vi.mocked(orderService.createOrders).mockResolvedValue([order]);
    vi.mocked(Cart.findOne).mockReturnValue({ populate: async () => ({ sellers: [{ sellerId: id, items: [{ product, price: 10, quantity: 1, isSelected: true }] }] }) } as any);
    vi.mocked(paymentService.createPaymentIntent).mockResolvedValue({ clientSecret: 'pi_test_secret', paymentIntentId: 'pi_test' });
    for (const [path, method, controller, req] of [
      ['/auth/login', 'post', login, { body: { email: user.email, password: 'password123' } }],
      ['/auth/me', 'get', getMe, { user: { id } }],
      ['/orders', 'post', createOrder, { user: { id }, body: {} }],
      ['/cart', 'get', getCart, { user: { id } }],
      ['/payments/create-intent', 'post', createIntent, { user: { id }, body: { amountInCents: 1500 } }],
    ] as const) {
      const response = capture();
      const next = vi.fn();
      await controller(req as any, response.res, next);
      expect(next).not.toHaveBeenCalled();
      const { status, payload } = response.result();
      expect(accepts(responseSchema(path, method, status), payload), path).toMatchObject({ valid: true });
      expect(accepts(responseSchema(path, method, status), { success: true, data: { unrelated: true } }).valid, `${path} rejects incorrect envelope`).toBe(false);
    }
  });

  it('validates the webhook controller acknowledgment and signature error', async () => {
    vi.mocked(constructWebhookEvent).mockReturnValue({ type: 'ignored.event', data: { object: { id: 'pi_test' } } } as any);
    let response = capture();
    const req = { headers: { 'stripe-signature': 'signature' }, body: Buffer.from('{}') } as unknown as Request;
    await handleWebhook(req, response.res);
    expect(accepts(responseSchema('/payments/webhook', 'post', 200), response.result().payload).valid).toBe(true);
    vi.mocked(constructWebhookEvent).mockImplementation(() => { throw new Error('Invalid signature'); });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      response = capture();
      await handleWebhook(req, response.res);
      expect(accepts(responseSchema('/payments/webhook', 'post', 400), response.result().payload).valid).toBe(true);
    } finally { log.mockRestore(); }
  });

  it('validates catalog, review and coupon responses containing real model documents', async () => {
    const product = new Product({ _id: id, name: 'Book', description: 'A book', category: 'Books', price: 10, stock: 5, sellerId: id, variants: [{ attributes: { Size: 'M' }, price: 10, stock: 5 }] });
    const review = new Review({ userId: id, productId: id, orderId: id, rating: 4.5, comment: 'Good' });
    const coupon = new Coupon({ code: 'SAVE10', sellerId: id, discountType: 'percentage', discountValue: 10 });
    for (const document of [product, review, coupon]) expect(document.validateSync()).toBeUndefined();
    vi.spyOn(Product, 'find').mockReturnValue({ sort: () => ({ skip: () => ({ limit: () => ({ populate: async () => [product] }) }) }) } as any);
    vi.spyOn(Product, 'countDocuments').mockResolvedValue(1);
    vi.spyOn(Review, 'find').mockReturnValue({ populate: () => ({ sort: () => ({ skip: () => ({ limit: async () => [review] }) }) }) } as any);
    vi.spyOn(Review, 'countDocuments').mockResolvedValue(1);
    vi.spyOn(Coupon, 'find').mockReturnValue({ sort: async () => [coupon] } as any);
    for (const [path, controller, request] of [
      ['/products', getProducts, { query: {} }],
      ['/reviews/product/{productId}', getProductReviews, { query: {}, params: { productId: id } }],
      ['/coupons/seller', getSellerCoupons, { user: { id } }],
    ] as const) {
      const response = capture();
      await controller(request as any, response.res);
      expect(accepts(responseSchema(path, 'get', 200), response.result().payload), path).toMatchObject({ valid: true });
    }
  });

  it('accepts populated references, deleted references, saved cards and addresses', () => {
    const summary = { _id: id, firstName: 'Jane', lastName: 'Doe' };
    const product = JSON.parse(JSON.stringify(new Product({ name: 'Book', description: 'Book', price: 10, category: 'Books', sellerId: id })));
    for (const sellerId of [id, summary, null]) expect(accepts({ $ref: '#/components/schemas/Product' }, { ...product, sellerId }).valid).toBe(true);
    for (const productValue of [product, null]) expect(accepts(responseSchema('/cart', 'get', 200), { success: true, sellers: [{ sellerId: null, items: [{ product: productValue, price: 10, quantity: 1, isSelected: true }] }] }).valid).toBe(true);
    const account = new User({ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', password: 'password123', savedCards: [{ type: 'credit-card', last4: '4242', expiryMonth: '12', expiryYear: '2030' }], savedAddresses: [{ street: 'Main St', city: 'Taipei' }] });
    expect(accepts(responseSchema('/auth/payment-methods', 'get', 200), JSON.parse(JSON.stringify({ success: true, data: { paymentMethods: account.savedCards } }))).valid).toBe(true);
    expect(accepts(responseSchema('/auth/saved-addresses', 'get', 200), JSON.parse(JSON.stringify({ success: true, savedAddresses: account.savedAddresses }))).valid).toBe(true);
  });

  it('validates actual authentication, role, validation and payment failures', async () => {
    let response = capture();
    await protect({ headers: {} } as any, response.res, vi.fn());
    expect(response.result().status).toBe(401);
    expect(accepts(responseSchema('/payments/create-intent', 'post', 401), response.result().payload).valid).toBe(true);
    vi.spyOn(User, 'findById').mockResolvedValue({ role: 'buyer' } as any);
    response = capture();
    await requireSeller({ user: { id } } as any, response.res, vi.fn());
    expect(response.result().status).toBe(403);
    expect(accepts(responseSchema('/seller/products', 'post', 403), response.result().payload).valid).toBe(true);
    for (const [rules, path, payload] of [
      [signupRules, '/auth/signup', { name: 'Jane', email: 'jane@example.com', password: 'password123' }],
      [createOrderRules, '/orders', { items: [{ productId: id, quantity: 0 }] }],
    ] as const) {
      const request = { body: payload } as Request;
      for (const rule of rules) await rule.run(request);
      response = capture();
      validate(request, response.res, vi.fn());
      expect(response.result().status).toBe(400);
      expect(accepts(responseSchema(path, 'post', 400), response.result().payload).valid).toBe(true);
    }
    vi.mocked(paymentService.createPaymentIntent).mockRejectedValue(new PaymentError(400, 'Invalid amount'));
    response = capture();
    await createIntent({ user: { id }, body: { amountInCents: 0 } } as any, response.res, vi.fn());
    expect(response.result().status).toBe(400);
    expect(accepts(responseSchema('/payments/create-intent', 'post', 400), response.result().payload).valid).toBe(true);
    expect(accepts(responseSchema('/payments/create-intent', 'post', 400), { success: false, error: { code: 'PAYMENT_FAILED', message: 'Invalid amount' } }).valid).toBe(false);
    expect(accepts(responseSchema('/orders', 'post', 400), { success: false, message: 'Invalid quantity', errors: [{ unexpected: true }] }).valid).toBe(false);
  });
});

describe('seller status contract', () => {
  const STATUS = ['/seller/orders/{id}/status', 'put'] as const;
  const operation = () => spec.paths[STATUS[0]][STATUS[1]];
  const documentedPairs = () => Object.entries(operation()['x-error-codes'] as Record<string, string[]>)
    .flatMap(([code, names]) => names.map(name => `${code} ${name}`)).sort();

  // Scans every literal `new AppError(status, message, 'code')` on the acceptance and status paths.
  function emittedSellerCodes(): string[] {
    const pairs = new Set<string>();
    for (const file of ['../../services/sellerService.ts', '../../services/orderAcceptance.ts', '../../services/orderCapture.ts']) {
      const visit = (node: ts.Node) => {
        if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'AppError' && node.arguments) {
          const [status, , code] = node.arguments;
          if (status && code && ts.isNumericLiteral(status) && ts.isStringLiteral(code)) pairs.add(`${status.text} ${code.text}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source(file));
    }
    return [...pairs].sort();
  }

  it('documents the 202 resolving response with the order and operation status', () => {
    expect(operation().responses['202']).toBeDefined();
    const schema = responseSchema(STATUS[0], STATUS[1], 202);
    const order = { _id: id, userId: id, items: [], shippingAddress: { street: '1 Main St', city: 'Taipei', state: 'Taipei', zipCode: '100' }, paymentMethod: { type: 'credit-card' }, subtotal: 10, productDiscount: 0, discount: 0, tax: 0.8, shipping: 0, total: 10.8, status: 'pending', paymentFlowVersion: 'manual_capture', paymentStatus: 'capture_pending' };
    expect(accepts(schema, { success: true, order, operation: { status: 'resolving' } }).valid).toBe(true);
    expect(accepts(schema, { success: true, order }).valid).toBe(false);
    expect(accepts(schema, { success: true, order, operation: { status: 'done' } }).valid).toBe(false);
  });

  it('documents each acceptance error code under its status', () => {
    expect(operation()['x-error-codes']).toMatchObject({
      '403': ['not_order_seller'],
      '404': ['order_not_found'],
      '409': expect.arrayContaining(['acceptance_deadline_passed', 'order_not_pending', 'payment_reference_missing', 'capture_failed', 'authorization_expired', 'cancellation_unavailable']),
    });
    expect(Object.keys(operation().responses)).toEqual(expect.arrayContaining(['200', '202', '403', '404', '409']));
  });

  it('lists exactly the machine-readable codes the seller status path can emit', () => {
    expect(documentedPairs()).toEqual(emittedSellerCodes());
  });

  it('keeps the seller error envelope with an optional code', () => {
    const schema = responseSchema(STATUS[0], STATUS[1], 409);
    expect(accepts(schema, { success: false, message: 'Late', code: 'acceptance_deadline_passed' }).valid).toBe(true);
    expect(accepts(schema, { success: false, error: { code: 'acceptance_deadline_passed', message: 'Late', retryable: false } }).valid).toBe(false);
  });

  it('describes the payment fields on the Order schema', () => {
    const order = spec.components.schemas.Order.properties;
    expect(Object.keys(order)).toEqual(expect.arrayContaining(['paymentFlowVersion', 'paymentStatus', 'acceptBy', 'authorizationExpiresAt', 'capturedAt']));
    expect(order.paymentFlowVersion.enum).toEqual(['legacy', 'manual_capture']);
    expect(order.paymentStatus.enum).toEqual([...PAYMENT_STATUSES]);
  });
});
