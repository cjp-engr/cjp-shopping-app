# Stripe Payment Integration — Backend + Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock card payment fields with real Stripe Payment Intents so card orders are charged before an order is created.

**Architecture:** Backend creates a PaymentIntent and returns a `clientSecret`; the frontend collects card details via Stripe's `CardElement` and calls `confirmCardPayment` client-side; the backend verifies the intent status before saving the order; a webhook handler keeps order status in sync with Stripe events.

**Tech Stack:** Node/Express/TypeScript (backend), React/Vite/TypeScript (frontend), `stripe` npm package, `@stripe/stripe-js`, `@stripe/react-stripe-js`, Playwright (tests).

## Global Constraints

- Backend uses ESM — all local imports must end in `.js` (e.g. `import ... from '../services/stripeService.js'`)
- Stripe test mode only — keys are `sk_test_…` / `pk_test_…` / `whsec_…`
- COD (`cash-on-delivery`) orders bypass ALL Stripe logic entirely — never call Stripe for COD
- The webhook route at `POST /api/payments/webhook` must be registered BEFORE `express.json()` in `server.ts`
- Backend recalculates cart total server-side for PaymentIntent amount — never trust the frontend amount
- No order is saved until `retrievePaymentIntent` returns `status === 'succeeded'`
- Duplicate `paymentIntentId` on order creation returns HTTP 409
- Unverified PaymentIntent on order creation returns HTTP 402

---

### Task 1: Install dependencies and scaffold env vars

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`
- Modify: `backend/.env` (add placeholder keys)
- Modify: `frontend/.env` (add placeholder key)

**Interfaces:**
- Produces: `stripe` package available in backend; `@stripe/stripe-js` and `@stripe/react-stripe-js` available in frontend

- [ ] **Step 1: Install backend Stripe SDK**

```bash
cd backend
npm install stripe
npm install --save-dev @types/stripe
```

- [ ] **Step 2: Install frontend Stripe packages**

```bash
cd frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

- [ ] **Step 3: Add env var placeholders to backend `.env`**

Add these lines (do not commit real keys):
```
STRIPE_SECRET_KEY=sk_test_REPLACE_ME
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME
```

- [ ] **Step 4: Add env var placeholder to frontend `.env`**

Add this line:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_ME
```

- [ ] **Step 5: Verify TypeScript still compiles**

```bash
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json
git commit -m "chore: install stripe and @stripe/react-stripe-js dependencies"
```

---

### Task 2: stripeService.ts — Stripe SDK wrapper

**Files:**
- Create: `backend/src/services/stripeService.ts`

**Interfaces:**
- Produces:
  - `createPaymentIntent(amountInCents: number, currency: string, metadata: Record<string, string>): Promise<{ id: string; clientSecret: string }>`
  - `constructWebhookEvent(rawBody: Buffer, signature: string, secret: string): Stripe.Event`
  - `retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent>`

- [ ] **Step 1: Write the failing import test**

Create `backend/src/services/__tests__/stripeService.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the stripe module before importing the service
vi.mock('stripe', () => {
  const mockPaymentIntents = {
    create: vi.fn(),
    retrieve: vi.fn(),
  };
  const mockWebhooks = {
    constructEvent: vi.fn(),
  };
  return {
    default: vi.fn().mockImplementation(() => ({
      paymentIntents: mockPaymentIntents,
      webhooks: mockWebhooks,
    })),
  };
});

describe('stripeService', () => {
  it('createPaymentIntent returns id and clientSecret', async () => {
    const { createPaymentIntent } = await import('../stripeService.js');
    // will fail until stripeService.ts exists
    expect(createPaymentIntent).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd backend && npx vitest run src/services/__tests__/stripeService.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `backend/src/services/stripeService.ts`**

```ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-06-20',
});

export async function createPaymentIntent(
  amountInCents: number,
  currency: string,
  metadata: Record<string, string>,
): Promise<{ id: string; clientSecret: string }> {
  const intent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency,
    metadata,
    automatic_payment_methods: { enabled: true },
  });
  return { id: intent.id, clientSecret: intent.client_secret! };
}

export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string,
  secret: string,
): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

export async function retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.retrieve(id);
}
```

- [ ] **Step 4: Expand test to cover all three exports**

Replace the test file content:
```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('stripe', () => {
  const mockCreate = vi.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret_test' });
  const mockRetrieve = vi.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded' });
  const mockConstructEvent = vi.fn().mockReturnValue({ type: 'payment_intent.succeeded' });
  return {
    default: vi.fn().mockImplementation(() => ({
      paymentIntents: { create: mockCreate, retrieve: mockRetrieve },
      webhooks: { constructEvent: mockConstructEvent },
    })),
  };
});

describe('stripeService', () => {
  it('createPaymentIntent returns id and clientSecret', async () => {
    const { createPaymentIntent } = await import('../stripeService.js');
    const result = await createPaymentIntent(1000, 'usd', { userId: 'u1' });
    expect(result).toEqual({ id: 'pi_test', clientSecret: 'secret_test' });
  });

  it('retrievePaymentIntent returns the payment intent', async () => {
    const { retrievePaymentIntent } = await import('../stripeService.js');
    const intent = await retrievePaymentIntent('pi_test');
    expect(intent.id).toBe('pi_test');
    expect(intent.status).toBe('succeeded');
  });

  it('constructWebhookEvent returns parsed event', async () => {
    const { constructWebhookEvent } = await import('../stripeService.js');
    const event = constructWebhookEvent(Buffer.from('{}'), 'sig', 'whsec_test');
    expect(event.type).toBe('payment_intent.succeeded');
  });
});
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd backend && npx vitest run src/services/__tests__/stripeService.test.ts
```
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/stripeService.ts backend/src/services/__tests__/stripeService.test.ts
git commit -m "feat: add stripeService wrapper (createPaymentIntent, retrievePaymentIntent, constructWebhookEvent)"
```

---

### Task 3: paymentController.ts + paymentRoutes.ts

**Files:**
- Create: `backend/src/controllers/paymentController.ts`
- Create: `backend/src/routes/paymentRoutes.ts`

**Interfaces:**
- Consumes:
  - `createPaymentIntent(amountInCents, currency, metadata)` from `stripeService.js`
  - `constructWebhookEvent(rawBody, signature, secret)` from `stripeService.js`
  - `Cart` model from `../models/Cart.js`
  - `Order` model from `../models/Order.js`
  - `protect` middleware from `../middleware/auth.js`
  - `AuthRequest` type from `../middleware/auth.js`
- Produces:
  - `POST /api/payments/create-intent` → `{ clientSecret: string, paymentIntentId: string }`
  - `POST /api/payments/webhook` → `200 OK`

- [ ] **Step 1: Create `backend/src/controllers/paymentController.ts`**

```ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import {
  createPaymentIntent,
  constructWebhookEvent,
} from '../services/stripeService.js';

export const createIntent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Recalculate total server-side — never trust frontend amount
    const cart = await Cart.findOne({ userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      res.status(400).json({ error: 'Cart is empty' });
      return;
    }

    const totalCents = Math.round(
      cart.items.reduce((sum: number, item: any) => {
        const price: number = item.product?.price ?? 0;
        return sum + price * item.quantity * 100;
      }, 0),
    );

    const { id, clientSecret } = await createPaymentIntent(totalCents, 'usd', {
      userId,
    });

    res.status(200).json({ clientSecret, paymentIntentId: id });
  } catch (err) {
    next(err);
  }
};

export const handleWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const signature = req.headers['stripe-signature'] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  let event;
  try {
    event = constructWebhookEvent(req.body as Buffer, signature, secret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  const intentId: string =
    (event.data.object as { id: string }).id;

  try {
    if (event.type === 'payment_intent.succeeded') {
      await Order.findOneAndUpdate(
        { paymentIntentId: intentId },
        { status: 'processing' },
      );
    } else if (event.type === 'payment_intent.payment_failed') {
      await Order.findOneAndUpdate(
        { paymentIntentId: intentId },
        { status: 'cancelled' },
      );
    }
  } catch (err) {
    // Log but always return 200 — Stripe retries on non-200
    console.error('Webhook handler error:', err);
  }

  res.status(200).json({ received: true });
};
```

- [ ] **Step 2: Create `backend/src/routes/paymentRoutes.ts`**

```ts
import express from 'express';
import { protect } from '../middleware/auth.js';
import { createIntent, handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

// Webhook: no auth, raw body (registered in server.ts before express.json())
router.post('/webhook', handleWebhook);

// Create PaymentIntent: requires auth
router.post('/create-intent', protect, createIntent);

export default router;
```

- [ ] **Step 3: Write API tests for the webhook handler**

Create `backend/src/controllers/__tests__/paymentController.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

vi.mock('../../services/stripeService.js', () => ({
  constructWebhookEvent: vi.fn(),
  createPaymentIntent: vi.fn(),
  retrievePaymentIntent: vi.fn(),
}));

vi.mock('../../models/Order.js', () => ({
  default: {
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../../models/Cart.js', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

import { constructWebhookEvent } from '../../services/stripeService.js';
import Order from '../../models/Order.js';
import { handleWebhook } from '../paymentController.js';

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
  (res.status as any).mockReturnValue(res);
  return res;
}

describe('handleWebhook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 on invalid signature', async () => {
    (constructWebhookEvent as any).mockImplementation(() => {
      throw new Error('bad sig');
    });
    const req = { headers: { 'stripe-signature': 'bad' }, body: Buffer.from('{}') } as unknown as Request;
    const res = makeRes();
    await handleWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('updates order to processing on payment_intent.succeeded', async () => {
    (constructWebhookEvent as any).mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } },
    });
    const req = { headers: { 'stripe-signature': 'sig' }, body: Buffer.from('{}') } as unknown as Request;
    const res = makeRes();
    await handleWebhook(req, res);
    expect(Order.findOneAndUpdate).toHaveBeenCalledWith(
      { paymentIntentId: 'pi_123' },
      { status: 'processing' },
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('updates order to cancelled on payment_intent.payment_failed', async () => {
    (constructWebhookEvent as any).mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_456' } },
    });
    const req = { headers: { 'stripe-signature': 'sig' }, body: Buffer.from('{}') } as unknown as Request;
    const res = makeRes();
    await handleWebhook(req, res);
    expect(Order.findOneAndUpdate).toHaveBeenCalledWith(
      { paymentIntentId: 'pi_456' },
      { status: 'cancelled' },
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && npx vitest run src/controllers/__tests__/paymentController.test.ts
```
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/paymentController.ts backend/src/routes/paymentRoutes.ts backend/src/controllers/__tests__/paymentController.test.ts
git commit -m "feat: add paymentController (createIntent, handleWebhook) and paymentRoutes"
```

---

### Task 4: Wire routes into server.ts + add paymentIntentId to Order model

**Files:**
- Modify: `backend/src/server.ts`
- Modify: `backend/src/models/Order.ts`

**Interfaces:**
- Consumes: `paymentRoutes` from `./routes/paymentRoutes.js`
- Produces:
  - `POST /api/payments/webhook` live with raw body
  - `POST /api/payments/create-intent` live with auth
  - `Order.paymentIntentId?: string` field available for save + query

- [ ] **Step 1: Add `paymentIntentId` to Order model**

In `backend/src/models/Order.ts`, add to the `IOrder` interface:
```ts
paymentIntentId?: string;
```

In the Mongoose `OrderSchema`, add the field (place it after the existing `couponCode` field):
```ts
paymentIntentId: { type: String, index: true },
```

- [ ] **Step 2: Register payment routes in server.ts**

Open `backend/src/server.ts`. Find the block where other routes are imported (around line 10–18). Add:
```ts
import paymentRoutes from './routes/paymentRoutes.js';
```

Then find where `app.use(express.json())` is called. The webhook route MUST come BEFORE it. Add these two lines immediately before `app.use(express.json())`:

```ts
// Webhook needs raw body — must be before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, _res, next) => { next(); });
```

Then after `app.use(express.json())` where the other routes are registered, add:
```ts
app.use('/api/payments', paymentRoutes);
```

- [ ] **Step 3: Verify server starts without error**

```bash
cd backend && npm run dev
```
Expected: server starts, no import or middleware errors. Hit `Ctrl+C` after confirming.

- [ ] **Step 4: Smoke-test the create-intent endpoint**

With the server running and a valid auth token:
```bash
curl -X POST http://localhost:5000/api/payments/create-intent \
  -H "Authorization: Bearer YOUR_TEST_TOKEN" \
  -H "Content-Type: application/json"
```
Expected: `{ clientSecret: "pi_test_..._secret_...", paymentIntentId: "pi_test_..." }` (only works with real `sk_test_` key).

- [ ] **Step 5: Commit**

```bash
git add backend/src/server.ts backend/src/models/Order.ts
git commit -m "feat: register payment routes in server, add paymentIntentId to Order model"
```

---

### Task 5: Verify PaymentIntent before saving order

**Files:**
- Modify: `backend/src/controllers/orderController.ts`
- Modify: `backend/src/services/orderService.ts`

**Interfaces:**
- Consumes:
  - `retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent>` from `stripeService.js`
  - `paymentIntentId?: string` in request body (passed by frontend on "Place Order")
- Produces:
  - `createOrder` rejects with 402 if PaymentIntent status is not `succeeded`
  - `createOrder` rejects with 409 if `paymentIntentId` already used
  - Saved order includes `paymentIntentId` field

- [ ] **Step 1: Update `orderController.ts` to extract and pass paymentIntentId**

In `backend/src/controllers/orderController.ts`, update `createOrder`:
```ts
export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      items,
      shippingAddress,
      paymentMethod,
      sellerMessages,
      couponCodes,
      deliverySelections,
      paymentIntentId,      // ← add this
    } = req.body;

    const orders = await orderService.createOrders({
      userId: req.user!.id,
      items,
      shippingAddress,
      paymentMethod,
      sellerMessages,
      couponCodes,
      deliverySelections,
      paymentIntentId,      // ← pass through
    });
    res.status(201).json({ success: true, orders });
  } catch (err) { next(err); }
};
```

- [ ] **Step 2: Update `CreateOrderParams` interface in orderService.ts**

Add `paymentIntentId?: string` to the `CreateOrderParams` interface at the top of `backend/src/services/orderService.ts`:
```ts
interface CreateOrderParams {
  userId: string;
  items: OrderItem[];
  shippingAddress: object;
  paymentMethod: { type: string; [key: string]: unknown };
  sellerMessages?: Record<string, string>;
  couponCodes?: Record<string, string>;
  deliverySelections?: Record<string, string>;
  paymentIntentId?: string;   // ← add this
}
```

- [ ] **Step 3: Add Stripe verification logic to `createOrders` in orderService.ts**

At the top of `createOrders`, after destructuring params, add this block **before** any DB writes:

```ts
const isCardPayment =
  (paymentMethod as any).type === 'credit-card' ||
  (paymentMethod as any).type === 'debit-card';

if (isCardPayment) {
  if (!paymentIntentId) {
    throw new AppError('paymentIntentId is required for card payments', 402);
  }

  // Reject duplicate — one intent per order
  const existing = await Order.findOne({ paymentIntentId });
  if (existing) {
    throw new AppError('This payment has already been used for an order', 409);
  }

  // Verify with Stripe that the payment actually succeeded
  const { retrievePaymentIntent } = await import('./stripeService.js');
  const intent = await retrievePaymentIntent(paymentIntentId);
  if (intent.status !== 'succeeded') {
    throw new AppError('Payment not confirmed. Please complete payment before placing your order.', 402);
  }
}
```

Import `retrievePaymentIntent` is done inline with `await import()` to avoid circular dependency issues. Add `paymentIntentId` to the destructuring at the top of `createOrders`:
```ts
const { userId, items, shippingAddress, paymentMethod, sellerMessages = {}, couponCodes = {}, deliverySelections = {}, paymentIntentId } = params;
```

- [ ] **Step 4: Attach paymentIntentId when saving each sub-order**

In `createOrders`, find where `new Order({ ... })` is called for each seller group. Add `paymentIntentId` to the object:
```ts
const order = new Order({
  // ... existing fields ...
  paymentIntentId: isCardPayment ? paymentIntentId : undefined,
});
```

- [ ] **Step 5: Write API-level tests**

Create `backend/src/services/__tests__/orderService.stripe.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../stripeService.js', () => ({
  retrievePaymentIntent: vi.fn(),
}));

vi.mock('../../models/Order.js', () => ({
  default: {
    findOne: vi.fn(),
    // minimal mock — full order creation tested elsewhere
  },
}));

import { retrievePaymentIntent } from '../stripeService.js';
import Order from '../../models/Order.js';

describe('createOrders — Stripe verification', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 402 when paymentIntentId is missing for card payment', async () => {
    const { createOrders } = await import('../orderService.js');
    await expect(
      createOrders({
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 1 }],
        shippingAddress: {},
        paymentMethod: { type: 'credit-card' },
      }),
    ).rejects.toMatchObject({ statusCode: 402 });
  });

  it('throws 409 when paymentIntentId already used', async () => {
    (Order.findOne as any).mockResolvedValue({ _id: 'existing-order' });
    const { createOrders } = await import('../orderService.js');
    await expect(
      createOrders({
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 1 }],
        shippingAddress: {},
        paymentMethod: { type: 'credit-card' },
        paymentIntentId: 'pi_already_used',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws 402 when PaymentIntent status is not succeeded', async () => {
    (Order.findOne as any).mockResolvedValue(null);
    (retrievePaymentIntent as any).mockResolvedValue({ status: 'requires_payment_method' });
    const { createOrders } = await import('../orderService.js');
    await expect(
      createOrders({
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 1 }],
        shippingAddress: {},
        paymentMethod: { type: 'credit-card' },
        paymentIntentId: 'pi_pending',
      }),
    ).rejects.toMatchObject({ statusCode: 402 });
  });
});
```

- [ ] **Step 6: Run tests**

```bash
cd backend && npx vitest run src/services/__tests__/orderService.stripe.test.ts
```
Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/controllers/orderController.ts backend/src/services/orderService.ts backend/src/services/__tests__/orderService.stripe.test.ts
git commit -m "feat: verify PaymentIntent before saving order, attach paymentIntentId to order"
```

---

### Task 6: Frontend — stripe.ts singleton + orderService.createPaymentIntent

**Files:**
- Create: `frontend/src/lib/stripe.ts`
- Modify: `frontend/src/services/orderService.ts`
- Modify: `frontend/src/config/api.ts` (add endpoint constant)

**Interfaces:**
- Produces:
  - `stripePromise` — singleton `Promise<Stripe | null>` for use in `<Elements>`
  - `orderService.createPaymentIntent(amountInCents: number): Promise<{ clientSecret: string; paymentIntentId: string }>`
  - `orderService.createOrder(...)` accepts optional `paymentIntentId` in payload

- [ ] **Step 1: Create `frontend/src/lib/stripe.ts`**

```ts
import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '',
);
```

- [ ] **Step 2: Add the API endpoint constant**

Open `frontend/src/config/api.ts`. In the `API_ENDPOINTS` object, add:
```ts
PAYMENT_INTENT: `${API_BASE}/payments/create-intent`,
```

- [ ] **Step 3: Add `createPaymentIntent` to orderService**

In `frontend/src/services/orderService.ts`, add this method to the `OrderService` class:
```ts
async createPaymentIntent(amountInCents: number): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const response = await fetch(API_ENDPOINTS.PAYMENT_INTENT, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ amountInCents }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to initialise payment');
  }
  return response.json();
}
```

- [ ] **Step 4: Update `createOrder` to pass `paymentIntentId`**

In the existing `createOrder` method, update the `body: JSON.stringify(...)` call to include `paymentIntentId`:
```ts
body: JSON.stringify({
  items,
  shippingAddress: checkoutData.shippingAddress,
  paymentMethod: checkoutData.paymentMethod,
  paymentIntentId: checkoutData.paymentIntentId,   // ← add this
  ...(couponCodes && Object.keys(couponCodes).length > 0 ? { couponCodes } : {}),
  ...(deliverySelections && Object.keys(deliverySelections).length > 0 ? { deliverySelections } : {}),
})
```

- [ ] **Step 5: Update `CheckoutData` type to include `paymentIntentId`**

Open `frontend/src/types/order.ts`. In the `CheckoutData` interface, add:
```ts
paymentIntentId?: string;
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/stripe.ts frontend/src/services/orderService.ts frontend/src/config/api.ts frontend/src/types/order.ts
git commit -m "feat: add stripePromise singleton and orderService.createPaymentIntent"
```

---

### Task 7: Frontend — CardElement in Checkout.tsx

**Files:**
- Modify: `frontend/src/pages/Checkout.tsx`

**Interfaces:**
- Consumes:
  - `stripePromise` from `../lib/stripe.js`
  - `orderService.createPaymentIntent(amountInCents)` → `{ clientSecret, paymentIntentId }`
  - `stripe.confirmCardPayment(clientSecret, { payment_method: { card } })` from `@stripe/react-stripe-js`
  - `checkoutData.paymentIntentId` passed through to `orderService.createOrder`
- Produces: Real card payment flow — CardElement on payment step, confirmCardPayment on "Continue to Review", paymentIntentId on "Place Order"

- [ ] **Step 1: Add Stripe imports to Checkout.tsx**

At the top of `frontend/src/pages/Checkout.tsx`, add:
```ts
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '../lib/stripe';
```

- [ ] **Step 2: Add Stripe state to the checkout component**

Inside the `Checkout` component, add these state variables alongside the existing ones:
```ts
const stripe = useStripe();
const elements = useElements();
const [clientSecret, setClientSecret] = useState<string | null>(null);
const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
const [stripeError, setStripeError] = useState<string | null>(null);
```

- [ ] **Step 3: Fetch PaymentIntent when card payment type is selected**

Add a `useEffect` that triggers when `paymentData.type` changes to a card type:
```ts
useEffect(() => {
  const isCard =
    paymentData.type === 'credit-card' || paymentData.type === 'debit-card';
  if (!isCard || clientSecret) return;

  const totalCents = Math.round(orderTotal * 100); // orderTotal already calculated in component
  orderService
    .createPaymentIntent(totalCents)
    .then(({ clientSecret: cs, paymentIntentId: pid }) => {
      setClientSecret(cs);
      setPaymentIntentId(pid);
    })
    .catch(() => setError('Could not initialise payment. Please try again.'));
}, [paymentData.type]);
```

- [ ] **Step 4: Replace mock card fields with CardElement**

Find the section in the payment step that renders mock card inputs (fields for `cardNumber`, `cardHolder`, `expiryMonth`, `expiryYear`, `cvv`). Replace those fields with:

```tsx
{(paymentData.type === 'credit-card' || paymentData.type === 'debit-card') && (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">
      Card Details
    </label>
    <div className="border border-gray-300 rounded-lg p-3 bg-white">
      <CardElement
        options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#374151',
              '::placeholder': { color: '#9CA3AF' },
            },
          },
        }}
      />
    </div>
    {stripeError && (
      <p className="text-sm text-red-600 flex items-center gap-1">
        <AlertCircle className="w-4 h-4" />
        {stripeError}
      </p>
    )}
  </div>
)}
```

- [ ] **Step 5: Confirm payment on "Continue to Review"**

Find the handler that moves from the payment step to review (e.g. `handlePaymentSubmit` or the `step === 'payment'` submit handler). Add the Stripe confirmation call:

```ts
const handlePaymentContinue = async () => {
  const isCard =
    paymentData.type === 'credit-card' || paymentData.type === 'debit-card';

  if (!isCard) {
    setStep('review');
    return;
  }

  if (!stripe || !elements || !clientSecret) {
    setError('Payment not ready. Please wait a moment and try again.');
    return;
  }

  const cardElement = elements.getElement(CardElement);
  if (!cardElement) return;

  setLoading(true);
  setStripeError(null);

  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: { card: cardElement },
  });

  setLoading(false);

  if (error) {
    setStripeError(error.message ?? 'Card payment failed. Please try again.');
    return;
  }

  if (paymentIntent?.status === 'succeeded') {
    setStep('review');
  }
};
```

Wire this handler to the "Continue to Review" button on the payment step.

- [ ] **Step 6: Pass paymentIntentId when placing the order**

Find where `orderService.createOrder(checkoutData, cart, ...)` is called (on "Place Order"). Update `checkoutData` to include `paymentIntentId`:

```ts
const checkoutDataWithIntent: CheckoutData = {
  ...checkoutData,
  paymentIntentId: paymentIntentId ?? undefined,
};
const orders = await orderService.createOrder(checkoutDataWithIntent, cart, user.id, couponCodes, deliverySelections);
```

- [ ] **Step 7: Wrap the exported component in Elements**

Find where `<Checkout />` is exported or rendered in `Checkout.tsx`. Wrap the return with `<Elements>`:

```tsx
export const Checkout: React.FC = () => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutInner />
    </Elements>
  );
};
```

Rename the existing component body to `CheckoutInner` (internal, not exported). This is needed because `useStripe()` and `useElements()` must be called inside `<Elements>`.

- [ ] **Step 8: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 9: Manual smoke test (test mode)**

1. Set real `pk_test_` and `sk_test_` keys in `.env` files
2. Run `stripe listen --forward-to localhost:5000/api/payments/webhook` in a separate terminal; copy the `whsec_` into backend `.env`
3. Start backend + frontend
4. Go to checkout, select Credit Card
5. Enter test card `4242 4242 4242 4242`, any future expiry, any CVC
6. Click "Continue to Review" — should advance to review step
7. Click "Place Order" — order confirmation should appear
8. Check terminal running `stripe listen` — should show `payment_intent.succeeded` event

- [ ] **Step 10: Test declined card**

Repeat with card `4000 0000 0000 0002`
Expected: inline error "Your card has been declined." appears below the CardElement; user stays on payment step; no order created.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/pages/Checkout.tsx frontend/src/lib/stripe.ts
git commit -m "feat: integrate Stripe CardElement into checkout — real card payment flow"
```

---

### Task 8: Playwright tests

**Files:**
- Create: `e2e-testing/tests/web/buyer/stripe-checkout.spec.ts`
- Create: `e2e-testing/tests/api/stripe-webhook.api.spec.ts`

**Interfaces:**
- Consumes:
  - `base-fixture.ts` — `checkoutPage`, `cartPage`, `productListPage`
  - `auth.fixture.ts` — `buyerToken`
  - `helpers/api-client.ts` — `authHeaders`
  - Stripe test card numbers: success `4242424242424242`, declined `4000000000000002`

- [ ] **Step 1: Create E2E checkout test**

Create `e2e-testing/tests/web/buyer/stripe-checkout.spec.ts`:
```ts
import { test, expect } from '../../../fixtures/base-fixture';

// TC-STRIPE-01: successful card payment
test('TC-STRIPE-01: card payment succeeds and shows order confirmation', async ({
  page,
  productListPage,
}) => {
  await page.goto('/');
  await productListPage.clickFirstProduct();
  await page.getByTestId('add-to-cart-btn').click();
  await page.getByTestId('cart-icon').click();
  await page.getByTestId('checkout-btn').click();

  // Step 1: fill shipping
  await page.getByTestId('street-input').fill('123 Test St');
  await page.getByTestId('city-input').fill('Manila');
  await page.getByTestId('state-input').fill('Metro Manila');
  await page.getByTestId('zip-input').fill('1000');
  await page.getByTestId('continue-to-payment-btn').click();

  // Step 2: fill card via Stripe iframe
  const cardFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();
  await cardFrame.locator('[placeholder="Card number"]').fill('4242424242424242');
  await cardFrame.locator('[placeholder="MM / YY"]').fill('12 / 30');
  await cardFrame.locator('[placeholder="CVC"]').fill('123');
  await page.getByTestId('continue-to-review-btn').click();

  // Step 3: place order
  await page.getByTestId('place-order-btn').click();
  await expect(page.getByTestId('order-confirmation')).toBeVisible({ timeout: 15_000 });
});

// TC-STRIPE-02: declined card shows inline error
test('TC-STRIPE-02: declined card shows error and stays on payment step', async ({
  page,
  productListPage,
}) => {
  await page.goto('/');
  await productListPage.clickFirstProduct();
  await page.getByTestId('add-to-cart-btn').click();
  await page.getByTestId('cart-icon').click();
  await page.getByTestId('checkout-btn').click();

  await page.getByTestId('street-input').fill('123 Test St');
  await page.getByTestId('city-input').fill('Manila');
  await page.getByTestId('state-input').fill('Metro Manila');
  await page.getByTestId('zip-input').fill('1000');
  await page.getByTestId('continue-to-payment-btn').click();

  const cardFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();
  await cardFrame.locator('[placeholder="Card number"]').fill('4000000000000002');
  await cardFrame.locator('[placeholder="MM / YY"]').fill('12 / 30');
  await cardFrame.locator('[placeholder="CVC"]').fill('123');
  await page.getByTestId('continue-to-review-btn').click();

  await expect(page.getByText('Your card has been declined')).toBeVisible({ timeout: 10_000 });
  // Still on payment step
  await expect(page.getByTestId('continue-to-review-btn')).toBeVisible();
});

// TC-STRIPE-04: mocked create-intent for fast flow test (no real Stripe call)
test('TC-STRIPE-04: checkout flow works with mocked payment intent', async ({
  page,
  productListPage,
}) => {
  await page.route('**/api/payments/create-intent', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        clientSecret: 'pi_test_secret_mock',
        paymentIntentId: 'pi_test_mock',
      }),
    });
  });

  // Also mock confirmCardPayment result via Stripe.js — not easily interceptable;
  // this test validates the UI flow up to the CardElement render
  await page.goto('/');
  await productListPage.clickFirstProduct();
  await page.getByTestId('add-to-cart-btn').click();
  await page.getByTestId('cart-icon').click();
  await page.getByTestId('checkout-btn').click();

  await page.getByTestId('street-input').fill('123 Test St');
  await page.getByTestId('city-input').fill('Manila');
  await page.getByTestId('state-input').fill('Metro Manila');
  await page.getByTestId('zip-input').fill('1000');
  await page.getByTestId('continue-to-payment-btn').click();

  // Stripe iframe should be rendered
  await expect(page.frameLocator('iframe[name*="__privateStripeFrame"]').first().locator('[placeholder="Card number"]')).toBeVisible({ timeout: 8_000 });
});
```

- [ ] **Step 2: Create API-level webhook tests**

Create `e2e-testing/tests/api/stripe-webhook.api.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

// These tests call the webhook endpoint directly with a fake signature.
// The backend will reject the signature — we test the 400 path.
// Full webhook flow is tested manually via `stripe listen` during development.

test('TC-STRIPE-WH-01: webhook with invalid signature returns 400', async ({ request }) => {
  const response = await request.post(`${API_URL}/api/payments/webhook`, {
    headers: {
      'stripe-signature': 'invalid_signature',
      'content-type': 'application/json',
    },
    data: JSON.stringify({ type: 'payment_intent.succeeded' }),
  });
  expect(response.status()).toBe(400);
});

test('TC-STRIPE-WH-02: create order with missing paymentIntentId returns 402', async ({
  request,
}) => {
  // Login first
  const loginRes = await request.post(`${API_URL}/api/auth/login`, {
    data: {
      email: process.env.BUYER_EMAIL ?? 'b1@test.com',
      password: process.env.TEST_PASSWORD ?? 'Test750!!',
    },
  });
  const { token } = await loginRes.json();

  const response = await request.post(`${API_URL}/api/orders`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      items: [{ productId: 'fake_id', quantity: 1 }],
      shippingAddress: { street: '123 St', city: 'Manila', state: 'MM', zipCode: '1000' },
      paymentMethod: { type: 'credit-card' },
      // paymentIntentId intentionally omitted
    },
  });
  expect(response.status()).toBe(402);
});
```

- [ ] **Step 3: Run API tests**

```bash
cd e2e-testing && npx playwright test tests/api/stripe-webhook.api.spec.ts --project=api
```
Expected: TC-STRIPE-WH-01 passes (400 on bad sig). TC-STRIPE-WH-02 may need a real buyer token — run with `stripe listen` active.

- [ ] **Step 4: Commit**

```bash
git add e2e-testing/tests/web/buyer/stripe-checkout.spec.ts e2e-testing/tests/api/stripe-webhook.api.spec.ts
git commit -m "test: add Playwright tests for Stripe card checkout and webhook rejection"
```

---

## Local Dev Reminder

```bash
# One-time: install Stripe CLI
# Windows: https://github.com/stripe/stripe-cli/releases

# Every dev session — terminal 2:
stripe login   # first time only
stripe listen --forward-to localhost:5000/api/payments/webhook
# Copy whsec_... into backend/.env as STRIPE_WEBHOOK_SECRET
```

## Test Cards Quick Reference

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined |
| `4000 0025 0000 3155` | 3D Secure (Stripe handles modal) |

Any future expiry, any 3-digit CVC, any ZIP.
