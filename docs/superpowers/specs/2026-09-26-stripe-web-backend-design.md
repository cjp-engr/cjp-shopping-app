# Stripe Payment Integration — Backend + Web

**Date:** 2026-09-26
**Scope:** Backend (Node/Express) + Web (React) only. Mobile (Flutter) is a separate sub-project.
**Mode:** Stripe test mode (`pk_test_` / `sk_test_`). Keys swap to live without code changes.

---

## 1. Goals

- Replace the mock card payment flow with real Stripe card charges
- Card payments only (Payment Intents). No saved cards. No digital wallets.
- Cash on Delivery (COD) flow is unchanged.
- Order is created only after payment is confirmed — no order without a successful charge.

---

## 2. Stripe Pattern: Payment Intents + Webhooks

Stripe's recommended approach. The webhook is the source of truth — not the frontend response.

```
Checkout Step 2 (Payment)
  User selects credit/debit card
  → Frontend: POST /api/payments/create-intent
  → Backend: Stripe.paymentIntents.create() → returns { clientSecret, paymentIntentId }

User fills card on Stripe CardElement → clicks "Continue to Review"
  → stripe.confirmCardPayment(clientSecret) called client-side
  → Card validated by Stripe — success or inline error
  → On success: paymentIntentId stored in checkout state

Checkout Step 3 (Review & Confirm)
  User clicks "Place Order"
  → Frontend: POST /api/orders + paymentIntentId
  → Backend: retrieves PaymentIntent from Stripe, verifies status
  → If verified: order saved with paymentIntentId attached
  → Order confirmation page shown

Stripe → POST /api/payments/webhook (async)
  payment_intent.succeeded   → order status set to 'processing'
  payment_intent.payment_failed → order status set to 'cancelled'
```

---

## 3. Environment Variables

```
# Backend (.env)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # printed by `stripe listen` locally

# Frontend (.env)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

No secrets are ever sent to the frontend. `VITE_STRIPE_PUBLISHABLE_KEY` is a public key by design.

---

## 4. Backend

### 4.1 New Files

#### `backend/src/services/stripeService.ts`
Single module that holds the Stripe SDK instance. All other modules import from here — no other file imports `stripe` directly.

Exports:
- `createPaymentIntent(amountInCents: number, currency: string, metadata: Record<string, string>)` → `Promise<{ id: string; clientSecret: string }>`
- `constructWebhookEvent(rawBody: Buffer, signature: string, secret: string)` → `Stripe.Event`
- `retrievePaymentIntent(id: string)` → `Promise<Stripe.PaymentIntent>`

#### `backend/src/controllers/paymentController.ts`
Two handler functions:

**`createIntent`** — `POST /api/payments/create-intent`
- Requires auth (buyer role)
- Backend recalculates order total from the current cart server-side — ignores any amount sent by the frontend
- Calls `stripeService.createPaymentIntent()`
- Returns `{ clientSecret, paymentIntentId }`

**`handleWebhook`** — `POST /api/payments/webhook`
- No auth middleware — uses Stripe signature verification instead
- Requires raw (unparsed) request body — see Section 4.3
- Handles:
  - `payment_intent.succeeded` → find order by `paymentIntentId`, set `status = 'processing'`
  - `payment_intent.payment_failed` → find order by `paymentIntentId`, set `status = 'cancelled'`
- Returns `200` immediately regardless of internal outcome (Stripe retries on non-200)
- Invalid signature → 400, log attempt

#### `backend/src/routes/paymentRoutes.ts`
```
POST /api/payments/create-intent   → authMiddleware → createIntent
POST /api/payments/webhook         → express.raw({ type: 'application/json' }) → handleWebhook
```

### 4.2 Modified Files

#### `backend/src/models/Order.ts`
Add one optional field to `IOrder` and the Mongoose schema:
```ts
paymentIntentId?: string;
```

#### `backend/src/routes/orderRoutes.ts` / order creation handler
Before saving a new order where `paymentMethod.type` is `credit-card` or `debit-card`:
1. Call `stripeService.retrievePaymentIntent(paymentIntentId)`
2. If status is not `succeeded` → reject with HTTP 402 `{ error: 'Payment not confirmed' }`
3. Check no existing order has this `paymentIntentId` → reject duplicate with 409
4. Save order with `paymentIntentId` field populated

COD orders skip steps 1–3 entirely.

#### `backend/src/server.ts`
The webhook route must be registered **before** the global `express.json()` middleware so it receives the raw body:
```ts
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);
app.use(express.json()); // all other routes
```

### 4.3 Raw Body Requirement
Stripe webhook signature verification requires the exact raw bytes of the request body. Express's `json()` middleware parses and re-serialises the body, breaking the signature. The webhook route must bypass `json()` and use `express.raw()` instead.

---

## 5. Frontend

### 5.1 New Dependencies
```
@stripe/stripe-js
@stripe/react-stripe-js
```

### 5.2 New Files

#### `frontend/src/lib/stripe.ts`
```ts
import { loadStripe } from '@stripe/stripe-js';
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
```
Loaded once at module level — Stripe.js is fetched from Stripe's CDN automatically.

### 5.3 Modified Files

#### `frontend/src/services/orderService.ts`
Add:
- `createPaymentIntent(amountInCents: number)` → `POST /api/payments/create-intent` → returns `{ clientSecret, paymentIntentId }`

Modify existing `createOrder`:
- Accept optional `paymentIntentId` in the order payload
- Pass it through to the backend unchanged

#### `frontend/src/components/checkout/` — Payment Step (Step 2)
Wrap the checkout root component in `<Elements stripe={stripePromise}>` to provide Stripe context.

When `credit-card` or `debit-card` is selected:
1. Call `createPaymentIntent(orderTotal)` on selection — store `clientSecret` + `paymentIntentId` in checkout state
2. Render `<CardElement>` in place of the existing mock card input fields
3. On "Continue to Review":
   - Call `stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardElement } })`
   - On error → display `error.message` inline below the CardElement, stay on step 2
   - On success → advance to step 3

When COD is selected — no change to existing logic.

#### `frontend/src/components/checkout/` — Review Step (Step 3)
No UI changes. On "Place Order":
- Pass `paymentIntentId` from checkout state in the order payload
- Existing order confirmation flow unchanged

### 5.4 UI Error States

| Error | Behaviour |
|---|---|
| Card declined | Inline error under CardElement, stay on step 2 |
| Network error on `/create-intent` | Toast notification, user can retry |
| Backend rejects order (intent not verified) | Toast "Payment could not be verified, please try again" |
| 3D Secure required | Stripe handles this automatically via `confirmCardPayment` — modal shown inline |

---

## 6. Edge Cases

| Scenario | Resolution |
|---|---|
| Browser closed after card confirmed, before "Place Order" | PaymentIntent stays open. No order created. Stripe auto-cancels after 7 days. No charge. |
| Double-submit "Place Order" | Backend rejects second request with 409 (duplicate `paymentIntentId`) |
| Webhook arrives before order is saved | Webhook handler no-ops if order not found. Stripe retries for up to 3 days. |
| Invalid webhook signature | Reject 400, log attempt. No state changed. |
| User navigates back from step 3 to step 2 | Existing `clientSecret` reused — no new PaymentIntent created |
| Frontend sends wrong amount | Backend ignores frontend amount, recalculates from cart server-side |

---

## 7. Local Development

```bash
# Install Stripe CLI (if not already)
brew install stripe/stripe-cli/stripe   # or download from stripe.com/docs/stripe-cli

# Terminal 1 — backend
npm run dev

# Terminal 2 — forward webhooks to local server
stripe listen --forward-to localhost:5000/api/payments/webhook
# Copy the whsec_... printed here into .env as STRIPE_WEBHOOK_SECRET
```

### Test Cards
| Card Number | Result |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Card declined |
| `4000 0025 0000 3155` | Requires 3D Secure (handled by Stripe modal) |

Use any future expiry date, any 3-digit CVC, any ZIP.

---

## 8. Testing

### Playwright (Web E2E)
- `TC-STRIPE-01` — successful card payment end-to-end → order confirmation shown
- `TC-STRIPE-02` — declined card → inline error on step 2, no order created
- `TC-STRIPE-03` — COD flow unchanged — existing tests pass without modification
- `TC-STRIPE-04` — `page.route()` mocks `/api/payments/create-intent` for fast checkout flow tests
- `TC-STRIPE-05` — 3D Secure card → Stripe modal appears, completes, order placed

### API Tests (Playwright `tests/api/`)
- Webhook handler: `payment_intent.succeeded` → order status becomes `processing`
- Webhook handler: `payment_intent.payment_failed` → order status becomes `cancelled`
- Webhook handler: invalid signature → 400 returned
- Create order with unverified PaymentIntent → 402 returned
- Create order duplicate `paymentIntentId` → 409 returned

---

## 9. Out of Scope

- Mobile (Flutter) — separate sub-project
- Saved cards / Stripe Customers
- Refunds via Stripe (currently handled manually)
- PayPal, GCash, or other payment methods
- Stripe Radar fraud rules
- Production key rotation process
