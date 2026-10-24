# TokoMart Test Scenarios — API

> **Platform:** Playwright-API (`e2e-testing/tests/api/`). Tests hit the Express backend directly via HTTP — no browser required.  
> Full master index: [test-scenarios.md](test-scenarios.md) · Web scenarios: [test-scenarios-web.md](test-scenarios-web.md) · Mobile scenarios: [test-scenarios-mobile.md](test-scenarios-mobile.md)

---

## Buyer — Cart (API)

### TC-107: GET /api/cart returns authenticated buyer's own items
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: N/A  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/cart.api.spec.ts`  
**Preconditions**: Buyer1 logged in; at least one product added to their server-side cart  
**Steps**:
1. `DELETE /api/cart` to clear buyer1's cart
2. `PUT /api/cart` with one product item
3. `GET /api/cart` with buyer1's token

**Expected Results**:
- Response 200; `sellers` array contains the added `productId`
**Business Rule**: §3 Cart — server-side, scoped to `userId`  
**Selectors/API**: `GET /api/cart`, `PUT /api/cart`, `DELETE /api/cart`  
**Suggested Layer**: API

---

### TC-108: Cart isolation — buyer2 cannot access buyer1's cart contents (API)
**Category**: Security / Isolation  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Web (TC-109)  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/cart.api.spec.ts`  
**Preconditions**: Buyer1 has items in cart; buyer2 is a different account with an empty cart  
**Steps**:
1. Login as buyer2 (fresh account)
2. `GET /api/cart` with buyer2's token

**Expected Results**:
- Response 200; returned `sellers` array does NOT contain buyer1's product ID
- Buyer2 sees only their own (empty) cart
**Business Rule**: §3 Cart — server-side cart scoped to authenticated `userId`  
**Selectors/API**: `GET /api/cart`  
**Suggested Layer**: API

---

## Buyer — Orders (API)

### TC-110: GET /api/orders returns only the authenticated buyer's own orders
**Category**: Security / Isolation  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Web (TC-112)  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/order-isolation.api.spec.ts`  
**Preconditions**: Buyer1 has at least one placed order; buyer2 is a different account with no orders  
**Steps**:
1. Buyer1 places an order via `POST /api/orders`
2. `GET /api/orders` with buyer2's token

**Expected Results**:
- Response 200; returned orders array does NOT contain buyer1's order ID
- Buyer2 sees only their own orders (empty array if none)
**Business Rule**: §5 Order lifecycle — orders scoped to authenticated `userId`  
**Selectors/API**: `GET /api/orders`, `POST /api/orders`  
**Suggested Layer**: API

---

### TC-111: GET /api/orders/:id returns 403 when buyer2 requests buyer1's order
**Category**: Security / Isolation  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: N/A (API-only enforcement)  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/order-isolation.api.spec.ts`  
**Preconditions**: Buyer1 has a placed order; buyer2 is a different authenticated account  
**Steps**:
1. Buyer1 places an order; capture `orderId`
2. `GET /api/orders/:orderId` with buyer2's token

**Expected Results**:
- Response 403 or 404 — buyer2 cannot read buyer1's order detail
**Business Rule**: §5 Order ownership — order detail scoped to order's `userId`  
**Selectors/API**: `GET /api/orders/:id`  
**Suggested Layer**: API

---

## Security (API)

### TC-132: Protected routes return 401 with no token
**Category**: Security  
**Priority**: P1  
**Role**: Any  
**Platform**: API  
**Parity**: N/A  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/security.api.spec.ts`  
**Preconditions**: No Authorization header sent  
**Steps**:
1. Send unauthenticated requests to `GET /api/auth/me`, `GET /api/orders`, `GET /api/cart`, `GET /api/seller/products`, `PUT /api/seller/orders/:id/status`

**Expected Results**:
- All routes respond 401; `success: false`
**Business Rule**: All authenticated endpoints must reject requests with no token  
**Selectors/API**: Multiple protected routes  
**Suggested Layer**: API

---

### TC-133: Tampered JWT returns 401
**Category**: Security  
**Priority**: P1  
**Role**: Any  
**Platform**: API  
**Parity**: N/A  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/security.api.spec.ts`  
**Preconditions**: A valid buyer token exists  
**Steps**:
1. Take a valid JWT; corrupt the last character of the signature segment
2. `GET /api/auth/me` with the tampered token

**Expected Results**:
- Response 401; `success: false`
**Business Rule**: JWT signature validation must reject tampered tokens  
**Selectors/API**: `GET /api/auth/me`  
**Suggested Layer**: API

---

### TC-134: Seller order list is scoped to own account (IDOR)
**Category**: Security / Isolation  
**Priority**: P1  
**Role**: Seller  
**Platform**: API  
**Parity**: N/A  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/security.api.spec.ts`  
**Preconditions**: Two sellers (seller1, seller2); buyer places order on seller2's product  
**Steps**:
1. Seller2 creates a product
2. Buyer places an order on seller2's product
3. `GET /api/seller/orders` with seller1's token

**Expected Results**:
- Response 200; returned orders array does NOT contain seller2's order ID
**Business Rule**: Seller order list scoped to products owned by the authenticated seller  
**Selectors/API**: `GET /api/seller/orders`  
**Suggested Layer**: API

---

### TC-135: Buyer blocked from all key seller routes
**Category**: Security  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Web (extends TC-053)  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/security.api.spec.ts`  
**Preconditions**: Fresh buyer token (non-seller account)  
**Steps**:
1. Send buyer token to `GET /api/seller/products`, `POST /api/seller/products`, `GET /api/seller/orders`, `PUT /api/seller/orders/:id/status`

**Expected Results**:
- All routes respond 403; `success: false`
**Business Rule**: Seller-only routes must reject buyer role tokens  
**Selectors/API**: Multiple `/api/seller/` routes  
**Suggested Layer**: API

---

### TC-136: Weak password on signup returns 400
**Category**: Negative / Validation  
**Priority**: P1  
**Role**: Any  
**Platform**: API  
**Parity**: N/A  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/security.api.spec.ts`  
**Preconditions**: None  
**Steps**:
1. `POST /api/auth/signup` with a 3-character password (`abc`)

**Expected Results**:
- Response 400; `success: false`
**Business Rule**: Password must meet minimum length requirement  
**Selectors/API**: `POST /api/auth/signup`  
**Suggested Layer**: API

---

## Buyer — Checkout & Orders (API)

### TC-026: Order total matches pricing formula
**Category**: Business Rule  
**Priority**: P0  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/orders.api.spec.ts`  
**Preconditions**: Known product price, discount, coupon, delivery  
**Steps**:
1. Place order via API with controlled inputs
2. Assert persisted `subtotal`, `productDiscount`, `discount`, `tax`, `shipping`, `total`

**Expected Results**:
- `tax` = 8% of after-discount subtotal
- `total` = afterDiscounts + tax + shipping (2 decimal places)
**Business Rule**: §4 Price calculation  
**Selectors/API**: `POST /api/orders`, order response body  
**Suggested Layer**: API

---

### TC-027: Default shipping $9.99 when subtotal after discounts < $50
**Category**: Business Rule  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/orders.api.spec.ts`  
**Preconditions**: Seller without custom shipping; cart subtotal < $50 after discounts  
**Steps**:
1. Place order meeting conditions

**Expected Results**:
- `shipping` = 9.99 on order record
**Business Rule**: §4 Shipping default  
**Selectors/API**: `POST /api/orders`  
**Suggested Layer**: API

---

### TC-028: Free shipping when subtotal after discounts ≥ $50
**Category**: Business Rule  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/orders.api.spec.ts`  
**Preconditions**: Default shipping rules; effective subtotal ≥ $50  
**Steps**:
1. Place qualifying order

**Expected Results**:
- `shipping` = 0
**Business Rule**: §4 Shipping default  
**Selectors/API**: `POST /api/orders`  
**Suggested Layer**: API

---

### TC-033: Buyer cannot cancel processing order
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/orders.api.spec.ts`  
**Preconditions**: Order status `processing`  
**Steps**:
1. Attempt cancel via API

**Expected Results**:
- **400** — cancel not allowed
- *Updated 2026-10-24:* the buyer can cancel **pending only**, so `preparing` is also rejected. Legacy-shape orders answer **400** `"You can only cancel pending orders"`; manual-capture card orders and COD orders with `paymentStatus: not_required` answer **409** `cancellation_conflict` (shared atomic claim). See TC-206
**Business Rule**: §5 Buyer cancel — pending only (preparing removed, PR #80)  
**Selectors/API**: `PUT /api/orders/:id/status`  
**Suggested Layer**: API

---

## Buyer — Reviews (API)

### TC-035: Duplicate review blocked
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/reviews.api.spec.ts`  
**Preconditions**: User already reviewed product  
**Steps**:
1. POST second review for same product

**Expected Results**:
- **409** duplicate review
**Business Rule**: §7 Unique (userId, productId)  
**Selectors/API**: `POST /api/reviews`  
**Suggested Layer**: API

---

### TC-036: Review blocked before delivery
**Category**: Security  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/reviews.api.spec.ts`  
**Preconditions**: Order status `shipped` (not delivered)  
**Steps**:
1. Attempt create review via API

**Expected Results**:
- **403** — not eligible
**Business Rule**: §7 Eligibility  
**Selectors/API**: `POST /api/reviews`  
**Suggested Layer**: API

---

## Buyer — Social (API)

### TC-113: User cannot follow themselves (API)
**Category**: Security  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/users.api.spec.ts`  
**Preconditions**: Authenticated user  
**Steps**:
1. `POST /api/users/:id/follow` using own user ID as `:id`

**Expected Results**:
- **400** — `"Cannot follow yourself"`
**Business Rule**: §8 Follow system  
**Selectors/API**: `POST /api/users/:id/follow`  
**Suggested Layer**: API

---

## Seller — Orders (API)

### TC-048: Seller invalid status transition rejected
**Category**: Negative  
**Priority**: P1  
**Role**: Seller  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/seller-access.api.spec.ts`  
**Preconditions**: Order in `pending`  
**Steps**:
1. Attempt pending → shipped via API

**Expected Results**:
- **400** `"Cannot transition order from 'pending' to 'shipped'"`
- *Updated 2026-10-24:* `VALID_TRANSITIONS` no longer allows `shipped → cancelled` (only `shipped → delivered`), see TC-212. A `preparing` request on a non-pending order answers **409** `order_not_pending` (TC-200), not 400
**Business Rule**: §5 Invalid transition  
**Selectors/API**: `PUT /api/seller/orders/:id/status`  
**Suggested Layer**: API

---

## Security & Access Control (API)

### TC-053: Buyer blocked from seller API routes
**Category**: Security  
**Priority**: P0  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/seller-access.api.spec.ts`  
**Preconditions**: Buyer JWT  
**Steps**:
1. Call `PUT /api/seller/orders/:id/status` as buyer

**Expected Results**:
- **403** forbidden
**Business Rule**: §1 requireSeller  
**Selectors/API**: `PUT /api/seller/orders/:id/status`  
**Suggested Layer**: API

---

### TC-054: Seller cannot edit another seller's product
**Category**: Security  
**Priority**: P1  
**Role**: Seller  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/web/seller/seller-access.spec.ts`  
**Preconditions**: Two seller accounts  
**Steps**:
1. Seller A attempts update/delete Seller B product

**Expected Results**:
- **403** forbidden
**Business Rule**: §1 Authorization  
**Selectors/API**: `PUT /api/products/:id`  
**Suggested Layer**: API

---

## Edge Cases (API)

### TC-056: Insufficient stock at checkout returns 400
**Category**: Edge Case  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/orders.api.spec.ts`  
**Preconditions**: Cart qty exceeds stock at order time  
**Steps**:
1. Submit order when stock depleted

**Expected Results**:
- **400** `"Insufficient stock for..."`
**Business Rule**: §4 Stock validation  
**Selectors/API**: `POST /api/orders`  
**Suggested Layer**: API

---

### TC-057: Coupon below minimum order amount rejected
**Category**: Edge Case  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Test File**: `e2e-testing/tests/api/coupons.api.spec.ts`  
**Preconditions**: Coupon with `minOrderAmount` > cart subtotal  
**Steps**:
1. Validate coupon via API

**Expected Results**:
- **400** minimum not met
**Business Rule**: §6 Validation  
**Selectors/API**: `POST /api/coupons/validate`  
**Suggested Layer**: API

---

### TC-058: Product description max 200 characters enforced
**Category**: Edge Case  
**Priority**: P2  
**Role**: Seller  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Preconditions**: Seller token  
**Steps**:
1. Create/update product with description > 200 chars

**Expected Results**:
- **400** validation error
**Business Rule**: §2 description max 200  
**Selectors/API**: `POST /api/products`  
**Suggested Layer**: API

---

## Security & Infrastructure — Rate Limiting

### TC-114: Auth route response includes rate limit headers
**Category**: Happy Path
**Priority**: P1
**Role**: Any
**Platform**: API
**Parity**: API (backend shared with mobile)
**Automation**: Playwright-API
**Test File**: `e2e-testing/tests/api/rate-limit.api.spec.ts`  
**Preconditions**: Backend running with rate limiting middleware active
**Steps**:
1. `POST /api/auth/login` with any credentials

**Expected Results**:
- Response includes `RateLimit-Limit` header
- Response includes `RateLimit-Remaining` header
- Response includes `RateLimit-Reset` header
**Business Rule**: §12 Rate Limiting
**Selectors/API**: `POST /api/auth/login`
**Suggested Layer**: API

---

### TC-115: API route response includes rate limit headers
**Category**: Happy Path
**Priority**: P1
**Role**: Any
**Platform**: API
**Parity**: API (backend shared with mobile)
**Automation**: Playwright-API
**Test File**: `e2e-testing/tests/api/rate-limit.api.spec.ts`  
**Preconditions**: Backend running with rate limiting middleware active
**Steps**:
1. `GET /api/products`

**Expected Results**:
- Response includes `RateLimit-Limit` header
- Response includes `RateLimit-Remaining` header
- Response includes `RateLimit-Reset` header
**Business Rule**: §12 Rate Limiting
**Selectors/API**: `GET /api/products`
**Suggested Layer**: API

---

### TC-116: RateLimit-Remaining decrements with each request
**Category**: Happy Path
**Priority**: P1
**Role**: Any
**Platform**: API
**Parity**: API (backend shared with mobile)
**Automation**: Playwright-API
**Test File**: `e2e-testing/tests/api/rate-limit.api.spec.ts`  
**Preconditions**: Backend running; window not exhausted
**Steps**:
1. `GET /api/products` — record `RateLimit-Remaining` value
2. `GET /api/products` again immediately

**Expected Results**:
- `RateLimit-Remaining` on second response is exactly 1 less than first
**Business Rule**: §12 Rate Limiting
**Selectors/API**: `GET /api/products`
**Suggested Layer**: API

---

### TC-117: Auth route returns 429 after limit is exhausted
**Category**: Negative
**Priority**: P1
**Role**: Any
**Platform**: API
**Parity**: API (backend shared with mobile)
**Automation**: Playwright-API
**Test File**: `e2e-testing/tests/api/rate-limit.api.spec.ts`  
**Preconditions**: Backend started with `RATE_LIMIT_AUTH_MAX=3` (low-limit mode)
**Steps**:
1. `POST /api/auth/login` with bad credentials — repeat until limit reached (3×)
2. `POST /api/auth/login` one more time (4th request)

**Expected Results**:
- **429** on the 4th request
- `body.success` → `false`
- `body.message` → `"Too many requests, please try again later."`
**Business Rule**: §12 Rate Limiting
**Selectors/API**: `POST /api/auth/login`
**Suggested Layer**: API

---

### TC-118: 429 response includes Retry-After header
**Category**: Negative
**Priority**: P1
**Role**: Any
**Platform**: API
**Parity**: API (backend shared with mobile)
**Automation**: Playwright-API
**Test File**: `e2e-testing/tests/api/rate-limit.api.spec.ts`  
**Preconditions**: Backend started with `RATE_LIMIT_AUTH_MAX=3` (low-limit mode)
**Steps**:
1. Exhaust the auth limit (3 requests)
2. Send one more `POST /api/auth/login`

**Expected Results**:
- **429** status
- Response includes `Retry-After` header with a positive integer value
**Business Rule**: §12 Rate Limiting
**Selectors/API**: `POST /api/auth/login`
**Suggested Layer**: API

---

### TC-119: General API route returns 429 after limit is exhausted
**Category**: Negative
**Priority**: P1
**Role**: Any
**Platform**: API
**Parity**: API (backend shared with mobile)
**Automation**: Playwright-API
**Test File**: `e2e-testing/tests/api/rate-limit.api.spec.ts`  
**Preconditions**: Backend started with `RATE_LIMIT_API_MAX=5` (low-limit mode)
**Steps**:
1. `GET /api/products` — repeat until limit reached (5×)
2. `GET /api/products` one more time (6th request)

**Expected Results**:
- **429** on the 6th request
- `body.success` → `false`
- `body.message` → `"Too many requests, please try again later."`
**Business Rule**: §12 Rate Limiting
**Selectors/API**: `GET /api/products`
**Suggested Layer**: API

---
## Added 2026-10-24 — features shipped since the last review

> **Environment**: backend on a MongoDB **replica set** (never the standalone 27017 database), Stripe **test mode** with mocked or test-card data, no real money.
> **Flags**: `CHECKOUT_FLOW=legacy|manual_capture` · `SELLER_SEES_MANUAL_CAPTURE=true|false` · `DELIVERED_REFUNDS_ENABLED=true|false` · `ACCEPTANCE_SCAN_INTERVAL_MS` · `OPERATION_WORKER_INTERVAL_MS`. Each scenario states which it needs.
> Error codes below come from `backend/src/services/*` and `middleware/checkoutFlowGuard.ts` as of 2026-10-24. The envelope is `{ success, error/code, message }`; assert the `code` where one is listed.
> Scenarios tagged **Blocked** need clock control, a Stripe webhook signature or a crash/restart harness. The backend integration suite (`vitest.integration.config.ts`) already covers many of them; they are listed here so the API layer has an explicit acceptance record.

---

## Saved Addresses & Payment Methods (API)

### TC-190: Saved address create, update, default and delete
**Category**: Happy Path
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-137–141, mobile TC-172–174)
**Automation**: Playwright-API
**Preconditions**: Authenticated buyer
**Steps**:
1. `POST /api/auth/saved-addresses` twice (street, city, state, zipCode, label)
2. `PUT /api/auth/saved-addresses/:id` to change the second one
3. `PUT /api/auth/saved-addresses/:id/default` on the second
4. `DELETE /api/auth/saved-addresses/:id` on the first; `GET /api/auth/saved-addresses`

**Expected Results**:
- 2xx each time; exactly one address has `isDefault: true` (the second); the first is gone after delete
- Another buyer's addresses never appear in the list
**Business Rule**: §8 Saved addresses
**Selectors/API**: `/api/auth/saved-addresses[/:id[/default]]`
**Suggested Layer**: API

---

### TC-191: Saved address requires street and city
**Category**: Negative
**Priority**: P2
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-139)
**Automation**: Playwright-API
**Preconditions**: Authenticated buyer
**Steps**:
1. `POST /api/auth/saved-addresses` without `street`; again without `city`
2. `PUT /api/auth/saved-addresses/:id` with an empty street

**Expected Results**:
- 400 for each; nothing is saved or changed
**Business Rule**: §8 Saved addresses
**Selectors/API**: `/api/auth/saved-addresses`
**Suggested Layer**: API

---

### TC-192: Saved addresses and cards are scoped to their owner
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: Buyer A has a saved address and a saved card; buyer B authenticated
**Steps**:
1. As B, `PUT`, `DELETE` and `PUT .../default` on A's address id
2. As B, `DELETE /api/auth/payment-methods/:id` and `PATCH .../default` on A's card id
3. As B, `GET` both lists

**Expected Results**:
- 404 (or 403) for every attempt on A's ids; A's data is unchanged; B's lists contain only B's data
- Unauthenticated calls return 401
**Business Rule**: §1 Authentication, §8 Profile
**Selectors/API**: `/api/auth/saved-addresses/:id`, `/api/auth/payment-methods/:id`
**Suggested Layer**: API

---

## Authorize-at-Checkout (API, `CHECKOUT_FLOW=manual_capture`)

### TC-193: Card order through the old endpoint is refused with 426
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: `CHECKOUT_FLOW=manual_capture`; cart with items
**Steps**:
1. `POST /api/orders` with `paymentMethod.type = credit-card` (then `debit-card`)
2. `POST /api/orders` with `paymentMethod.type = cash-on-delivery`
3. Repeat step 1 with `CHECKOUT_FLOW=legacy`

**Expected Results**:
- (1) **426** `update_required`, `details.requiredEndpoint = /api/checkout/sessions`, no order created
- (2) COD is created normally (`paymentStatus: not_required`)
- (3) legacy flow accepts the card order as before
**Business Rule**: Authorize-capture §API and client contracts
**Selectors/API**: `POST /api/orders`
**Suggested Layer**: API

---

### TC-194: Client-trusted payment intent is refused with 426
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: `CHECKOUT_FLOW=manual_capture`
**Steps**:
1. `POST /api/payments/create-intent` with an arbitrary `amount`

**Expected Results**:
- **426** `update_required` (`reason: card_intent_replaced_by_sessions`); no PaymentIntent is created in Stripe
- Unauthenticated: 401
**Business Rule**: Authorize-capture §API and client contracts
**Selectors/API**: `POST /api/payments/create-intent`
**Suggested Layer**: API

---

### TC-195: Checkout session prices from the server, never from the client
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: Manual-capture flow; cart/selection with known prices and a seller coupon
**Steps**:
1. `POST /api/checkout/sessions` with the selection and an extra tampered `amount`/`total` field and a lowered client price
2. Compare the session's per-seller totals with the pricing formula (TC-026)
3. Try a non-positive quantity and an unsupported payment method

**Expected Results**:
- Seller totals follow product/variant discount → coupon → 8% tax → shipping; the tampered fields are ignored
- Non-positive quantities and unsupported payment methods are rejected with 400; unsupported currencies are rejected
- The PaymentIntent amount (minor units) equals the persisted order total
**Business Rule**: §4 Price calculation; Authorize-capture §Checkout steps 1–3
**Selectors/API**: `POST /api/checkout/sessions`
**Suggested Layer**: API

---

### TC-196: Checkout session is idempotent
**Category**: Edge Case
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: Manual-capture flow
**Steps**:
1. `POST /api/checkout/sessions` with idempotency key K and payload P
2. Repeat with K and the same P
3. Repeat with K and a changed P
4. After placement, `POST /api/checkout/sessions/:id/confirm` twice

**Expected Results**:
- (2) returns the same session and does not reserve stock twice or create a second PaymentIntent; (3) conflicts (409)
- (4) the second confirm returns the existing orders; the cart is not cleared twice
**Business Rule**: Authorize-capture §Checkout steps 2, 6
**Selectors/API**: `POST /api/checkout/sessions`, `POST /api/checkout/sessions/:id/confirm`
**Suggested Layer**: API

---

### TC-197: Checkout sessions and saved cards are owner-only
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: Buyer A has a session and a saved card; buyer B authenticated
**Steps**:
1. As B, `GET /api/checkout/sessions/:id` and `POST .../confirm` for A's session
2. As B, create a session that uses A's saved card id
3. Unauthenticated `GET` of a session

**Expected Results**:
- B gets 403/404 for (1); (2) is rejected and no PaymentIntent is made with A's card; (3) is 401
- Client secrets and drafts are never returned to anyone but the owner
**Business Rule**: Authorize-capture §Checkout step 3, §API
**Selectors/API**: `/api/checkout/sessions/:id[/confirm]`
**Suggested Layer**: API

---

### TC-198: Insufficient stock aborts the whole session
**Category**: Negative
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (extends TC-056)
**Automation**: Playwright-API
**Preconditions**: Manual-capture flow; a 2-seller selection where seller B's product has less stock than requested
**Steps**:
1. `POST /api/checkout/sessions`
2. Read both products' stock afterwards

**Expected Results**:
- 400 "Insufficient stock…"; no draft, no reservation and no PaymentIntent for either seller; stock unchanged
**Business Rule**: §4 Stock validation; Authorize-capture §Checkout step 2
**Selectors/API**: `POST /api/checkout/sessions`
**Suggested Layer**: API

---

### TC-231: Draft (`awaiting_payment`) orders stay hidden
**Category**: Business Rule
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: A checkout session created but not confirmed
**Steps**:
1. `GET /api/orders` and `GET /api/orders/:id` as the buyer
2. `GET /api/seller/orders` as the seller; `PUT /api/seller/orders/:id/status` on the draft

**Expected Results**:
- The draft is missing from buyer history and detail (404); sellers never see it and cannot change it (404 `order_not_found`)
- Manual-capture orders are hidden from sellers while `SELLER_SEES_MANUAL_CAPTURE=false`
**Business Rule**: Authorize-capture §Data and invariants
**Selectors/API**: `GET /api/orders`, `GET /api/seller/orders`
**Suggested Layer**: API

---

## Seller Acceptance and Expiry (API)

### TC-199: Seller accept captures exactly the held amount
**Category**: Happy Path
**Priority**: P0
**Role**: Seller
**Platform**: API
**Parity**: Both (web TC-155, mobile TC-182)
**Automation**: Playwright-API (Stripe test mode)
**Preconditions**: Manual-capture flow with `SELLER_SEES_MANUAL_CAPTURE=true`; a `pending` / `authorized` card order, before `acceptBy`
**Steps**:
1. `PUT /api/seller/orders/:id/status` `{ status: "preparing" }`
2. Read the order and the PaymentIntent

**Expected Results**:
- 200, order `preparing`, `paymentStatus: captured`; PaymentIntent `succeeded` and `amount_received` equals the order amount
- Capturing a multi-seller purchase's other order does not happen (independent intents)
**Business Rule**: Authorize-capture §Seller acceptance and capture
**Selectors/API**: `PUT /api/seller/orders/:id/status`
**Suggested Layer**: API

---

### TC-200: Repeat or late accept returns 409 `order_not_pending`
**Category**: Negative
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: An order already `preparing` (or cancelled)
**Steps**:
1. Send `{ status: "preparing" }` again

**Expected Results**:
- **409** `order_not_pending`; no second capture; state unchanged
**Business Rule**: Authorize-capture §Seller acceptance; open-items B5
**Selectors/API**: `PUT /api/seller/orders/:id/status`
**Suggested Layer**: API

---

### TC-201: Another seller cannot accept or cancel the order
**Category**: Security
**Priority**: P0
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: Seller A's pending order; seller B authenticated
**Steps**:
1. As B send `{ status: "preparing" }`, then `{ status: "cancelled", cancelReason: "x" }`

**Expected Results**:
- **403** `not_order_seller` for both; Stripe stays uncaptured and the order is unchanged
- Ownership comes from the persisted `sellerId` (deleting A's product does not change who owns the order)
**Business Rule**: Authorize-capture §Seller acceptance; Seller cancellation spec §Current implementation
**Selectors/API**: `PUT /api/seller/orders/:id/status`
**Suggested Layer**: API

---

### TC-202: Accept after the deadline is refused
**Category**: Edge Case
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Blocked (needs clock control or a seeded past `acceptBy`; covered by backend integration tests)
**Preconditions**: A pending order whose `acceptBy` has passed (also a case where the card's own authorization deadline minus 5 minutes is earlier than 24 hours)
**Steps**:
1. Send `{ status: "preparing" }` at, then after, the deadline

**Expected Results**:
- At the exact deadline and after: **409** `acceptance_deadline_passed`; nothing is captured
**Business Rule**: Authorize-capture §Seller acceptance (deadline)
**Selectors/API**: `PUT /api/seller/orders/:id/status`
**Suggested Layer**: Integration

---

### TC-203: Unaccepted orders are cancelled automatically at the deadline
**Category**: Business Rule
**Priority**: P1
**Role**: System
**Platform**: API
**Parity**: Both
**Automation**: Manual / Blocked (set `ACCEPTANCE_SCAN_INTERVAL_MS` low and seed an expired order)
**Preconditions**: A pending card order and a pending COD order past `acceptBy`
**Steps**:
1. Wait for the scanner (or restart the server to run the startup catch-up)

**Expected Results**:
- Both become `cancelled` with reason `seller_acceptance_timeout`, `cancelledByRole: system`; the card PaymentIntent is `canceled` (nothing captured); stock and coupon use restored exactly once, even if two workers run
**Business Rule**: Authorize-capture §Buyer cancellation, seller cancellation, and expiry
**Selectors/API**: scanner in `acceptanceScanner.ts`
**Suggested Layer**: Integration + Manual

---

### TC-204: Accept racing cancel has exactly one winner
**Category**: Edge Case
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Blocked (needs controlled concurrency; covered by integration tests)
**Preconditions**: A pending authorized order
**Steps**:
1. Fire seller accept and buyer cancel (and separately seller cancel, and two accepts) at the same time, repeatedly

**Expected Results**:
- One request wins; the loser gets 409 `cancellation_conflict` / `order_not_pending`; capture never runs for a cancelled order; a cancel never lands on a captured order; stock restored at most once
**Business Rule**: Authorize-capture §Seller acceptance and capture, §Buyer cancellation
**Selectors/API**: `PUT /api/orders/:id/status`, `PUT /api/seller/orders/:id/status`
**Suggested Layer**: Integration

---

## Cancellation (API)

### TC-205: Buyer cancels a pending order; the result is idempotent
**Category**: Happy Path
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-152, TC-153)
**Automation**: Playwright-API
**Preconditions**: A pending card order (manual capture) and a pending COD order; note stock and coupon `usedCount`
**Steps**:
1. `PUT /api/orders/:id/status` `{ status: "cancelled", cancelReason: "changed my mind" }`
2. Repeat the same request
3. Read the order, product stock and the PaymentIntent

**Expected Results**:
- 200 with `status: cancelled`; card order `paymentStatus` `release_pending` then `released`; PaymentIntent `canceled`; COD order has no Stripe call
- The repeat returns the same cancelled order without restoring stock or coupon again; `cancelledByRole: buyer` and `cancelledById` are set
**Business Rule**: Authorize-capture §Buyer cancellation
**Selectors/API**: `PUT /api/orders/:id/status`
**Suggested Layer**: API

---

### TC-206: Buyer cancel after acceptance is a conflict
**Category**: Negative
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both (extends TC-033)
**Automation**: Playwright-API
**Preconditions**: Manual-capture/COD orders in `preparing` and in `capture_pending`
**Steps**:
1. Buyer sends the cancel request for each

**Expected Results**:
- **409** `cancellation_conflict` with a message telling the buyer to refresh; the order stays `preparing`; a legacy-shape order answers 400 "You can only cancel pending orders"
**Business Rule**: Authorize-capture §Buyer cancellation; PR #80
**Selectors/API**: `PUT /api/orders/:id/status`
**Suggested Layer**: API

---

### TC-207: Buyer cancel reason is limited to 500 characters
**Category**: Negative
**Priority**: P2
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: A pending order
**Steps**:
1. Cancel with a 501-character reason; then with a non-string reason

**Expected Results**:
- **400** `invalid_cancel_reason`; the order stays pending
**Business Rule**: Authorize-capture §Buyer cancellation
**Selectors/API**: `PUT /api/orders/:id/status`
**Suggested Layer**: API

---

### TC-208: Buyer cannot cancel someone else's order
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both (extends TC-111)
**Automation**: Playwright-API
**Preconditions**: Buyer A's pending order; buyer B authenticated
**Steps**:
1. As B, `PUT /api/orders/:id/status` cancel; also `PUT .../confirm-received`

**Expected Results**:
- **403**; the order and its hold are unchanged
**Business Rule**: §1 Authentication; §5 Buyer actions
**Selectors/API**: `PUT /api/orders/:id/status`
**Suggested Layer**: API

---

### TC-209: Seller cancels a pending order — 200 with the payment operation
**Category**: Happy Path
**Priority**: P0
**Role**: Seller
**Platform**: API
**Parity**: Both (web TC-157, TC-159; mobile TC-183)
**Automation**: Playwright-API
**Preconditions**: A pending `authorized` card order and a pending COD order for the seller
**Steps**:
1. `PUT /api/seller/orders/:id/status` `{ status: "cancelled", cancelReason: "Out of stock" }` on each
2. Repeat on the card order; then as the buyer `GET /api/orders/:id`

**Expected Results**:
- Card order: 200 `{ success, order }` plus `paymentOperation.status` `pending` (while `release_pending`), then `completed` (once `released`); COD: no `paymentOperation`
- `cancelledByRole: seller`, `cancelledById`, `cancelledAt`, `cancelReason` stored once; the repeat returns the stored result with the original actor
- Stock, variant stock, sold count and coupon use restored once; the buyer's order shows the seller's reason
**Business Rule**: Seller pending cancellation spec §API contract
**Selectors/API**: `PUT /api/seller/orders/:id/status`
**Suggested Layer**: API

---

### TC-210: Seller cancel validation and ownership errors
**Category**: Negative
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both (web TC-158)
**Automation**: Playwright-API
**Preconditions**: A pending order of seller A; seller B authenticated; a draft order id
**Steps**:
1. As A, cancel with no reason, a blank reason, and a 1001-character reason
2. As B, cancel A's order
3. As A, cancel an unknown id and a draft id

**Expected Results**:
- (1) **400** `invalid_cancel_reason` (limit is 1–1000 after trimming); (2) **403** `not_order_seller`; (3) **404** `order_not_found`
- No state change in any case
**Business Rule**: Seller pending cancellation spec §API contract
**Selectors/API**: `PUT /api/seller/orders/:id/status`
**Suggested Layer**: API

---

### TC-211: Seller cancel conflicts and unsupported order shapes
**Category**: Edge Case
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API (seeded orders) / Integration
**Preconditions**: Orders: pending `capture_pending`, a `preparing` card order, a legacy-shaped card order (captured automatically), an order without a persisted `sellerId`
**Steps**:
1. Seller sends the cancel request for each

**Expected Results**:
- Pending `capture_pending` (acceptance already claimed): **409** `cancellation_conflict`, order unchanged
- Legacy-shaped or no-`sellerId` pending orders: **409** `cancellation_unavailable`, nothing changed
- Seller cancellation after `pending` stays COD-only: a `preparing` card order is refused with **409** `cancellation_unavailable` ("Seller cancellation for card payments is not available yet"); a `preparing` COD order can still be cancelled (TC-160)
- Note: the seller-cancellation spec says "preparing or later → `cancellation_conflict`"; the current code answers `cancellation_unavailable` for card orders and allows COD. Confirm which is intended (see Domain doc gaps in the master)
**Business Rule**: Seller pending cancellation spec §Approved policy (amendment)
**Selectors/API**: `PUT /api/seller/orders/:id/status`
**Suggested Layer**: API

---

### TC-212: Seller cannot cancel a shipped order
**Category**: Business Rule
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both (web TC-160)
**Automation**: Playwright-API
**Preconditions**: A `shipped` order
**Steps**:
1. `PUT /api/seller/orders/:id/status` `{ status: "cancelled" }`
2. Send `{ status: "delivered" }`

**Expected Results**:
- (1) **400** "Cannot transition order from 'shipped' to 'cancelled'" (changed from the earlier rule that allowed it); (2) succeeds and records `deliveredAt` (TC-227)
**Business Rule**: Authorize-capture §Buyer cancellation, seller cancellation, and expiry
**Selectors/API**: `PUT /api/seller/orders/:id/status`
**Suggested Layer**: API

---

### TC-213: `canSellerCancelPending` is derived by the server
**Category**: Business Rule
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: Orders in several states
**Steps**:
1. `GET /api/seller/orders` and read `canSellerCancelPending` on each

**Expected Results**:
- `true` only for a `pending` order with a persisted `sellerId` and `paymentStatus` `authorized` or `not_required`; `false` for `capture_pending`, `preparing`, cancelled, legacy-shaped and orders without `sellerId`
- Orders still appear in the seller's list after a product is deleted (matched by `sellerId`)
**Business Rule**: Seller pending cancellation spec §API contract
**Selectors/API**: `GET /api/seller/orders`
**Suggested Layer**: API

---

## Delivered-Item Refunds (API, `DELIVERED_REFUNDS_ENABLED=true`)

### TC-214: Refund eligibility for a delivered, captured card order
**Category**: Happy Path
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-161)
**Automation**: Playwright-API
**Preconditions**: A delivered, captured card order inside 7 days
**Steps**:
1. `GET /api/orders/:id/refund-eligibility`

**Expected Results**:
- `eligible: true`, `requestsEnabled: true`, `deliveredAt`, `deadlineAt` = delivery + 168 hours, `currency`, and per line `lineId`, `quantityOrdered`, `quantityAvailable`, `availableUnitAmountsMinor` (paid price after discounts + allocated tax); the sum matches the captured amount allocation
**Business Rule**: Delivered-item refund spec §Refund amount allocation
**Selectors/API**: `GET /api/orders/:id/refund-eligibility`
**Suggested Layer**: API

---

### TC-215: Ineligible refund reasons
**Category**: Edge Case
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-169)
**Automation**: Playwright-API (seeded orders)
**Preconditions**: Orders that are not delivered, delivered COD, delivered with no recorded delivery time, delivered more than 168 hours ago, with an active request, with no units left, and a payment needing review
**Steps**:
1. `GET /api/orders/:id/refund-eligibility` for each

**Expected Results**:
- `eligible: false` with the reason `not_delivered`, `unsupported_payment`, `delivery_unknown`, `window_closed`, `active_request`, `no_units_left`, `review_needed` respectively; the boundary is inclusive (a request at exactly the deadline is accepted)
- `POST` to create a request in these states is refused
**Business Rule**: Delivered-item refund spec §Delivery time and eligibility
**Selectors/API**: `GET /api/orders/:id/refund-eligibility`
**Suggested Layer**: API

---

### TC-216: Refund request body validation
**Category**: Negative
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-163)
**Automation**: Playwright-API
**Preconditions**: An eligible order
**Steps**:
1. `POST /api/orders/:id/refund-requests` with: no `items`; empty `items`; quantity 0, negative, fractional; an unknown `reasonCode` (and `change_of_mind`); empty or 1001-character `description`; missing `idempotencyKey`
2. Include a duplicate line id and a quantity above what is available

**Expected Results**:
- **400** `refund_validation` for the first group; the second group is refused without creating a request
- Valid reasons are `damaged`, `wrong_item`, `missing_items`, `not_as_described`, `other`; no photos or buyer-entered amount are accepted
**Business Rule**: Delivered-item refund spec §Approved first-version policy
**Selectors/API**: `POST /api/orders/:id/refund-requests`
**Suggested Layer**: API

---

### TC-217: Refund request idempotency
**Category**: Edge Case
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: An eligible order
**Steps**:
1. Create a request with key K
2. Repeat with K and the same payload
3. Repeat with K and a changed payload

**Expected Results**:
- (2) returns the original request (no second request, one quote); (3) **409** `refund_conflict`
**Business Rule**: Delivered-item refund spec §API and concurrency
**Selectors/API**: `POST /api/orders/:id/refund-requests`
**Suggested Layer**: API

---

### TC-218: One unresolved refund request per order
**Category**: Business Rule
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-166)
**Automation**: Playwright-API
**Preconditions**: A request in `requested`, `processing` or `needs_review` state
**Steps**:
1. Create a second request (new key) for other units
2. Resolve the first (reject), then create the second

**Expected Results**:
- (1) **409** `refund_conflict`; (2) succeeds; rejected units are not counted as refunded; `needs_review` keeps blocking until reconciled
**Business Rule**: Delivered-item refund spec §Data and service boundaries
**Selectors/API**: `POST /api/orders/:id/refund-requests`
**Suggested Layer**: API

---

### TC-219: Refunds can be switched off
**Category**: Business Rule
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API (run with the flag off)
**Preconditions**: `DELIVERED_REFUNDS_ENABLED=false` (or unset)
**Steps**:
1. Buyer creates a request; seller decides an existing request
2. Buyer and seller read existing requests

**Expected Results**:
- (1) **409** `delivered_refunds_disabled`; eligibility shows `requestsEnabled: false`
- (2) reads still work; refunds that were already approved keep settling
**Business Rule**: Delivered-item refund spec §Clients and rollout
**Selectors/API**: `POST /api/orders/:id/refund-requests`, `PUT /api/seller/refund-requests/:id/decision`
**Suggested Layer**: API

---

### TC-220: Refund amount is never taken from the client
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: An eligible order
**Steps**:
1. Create a request with extra `amount`, `amountMinor` and `shipping` fields, and with a lowered product price
2. Create requests for quantities that together exceed what was ordered

**Expected Results**:
- The stored quote equals the server allocation for the selected units; the extra fields are ignored
- Total refunded (successful + processing + uncertain) never exceeds the captured balance
**Business Rule**: Delivered-item refund spec §Refund amount allocation
**Selectors/API**: `POST /api/orders/:id/refund-requests`
**Suggested Layer**: API

---

### TC-221: Buyer isolation on refund endpoints
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: Buyer A's delivered order and request; buyer B authenticated
**Steps**:
1. As B, call `GET .../refund-eligibility`, `GET` and `POST .../refund-requests` on A's order
2. As B, `GET /api/orders/refund-requests/completed`
3. Unauthenticated calls

**Expected Results**:
- B gets **404** `order_not_found` on the eligibility call (the order is hidden); the list and create calls must also be refused (assert 403 or 404, whichever the API returns, and record it); B's completed list contains only B's refunds; unauthenticated calls are 401
**Business Rule**: §1 Authentication; Delivered-item refund spec §API
**Selectors/API**: `/api/orders/:id/refund-*`, `/api/orders/refund-requests/completed`
**Suggested Layer**: API

---

### TC-222: Seller isolation and role checks on refund decisions
**Category**: Security
**Priority**: P0
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: A request for seller A's order; seller B and a buyer authenticated
**Steps**:
1. As B, `GET /api/seller/refund-requests` and `PUT /api/seller/refund-requests/:id/decision`
2. As a buyer, call both seller endpoints
3. As A in a multi-seller order, decide only A's request

**Expected Results**:
- B sees only B's requests and gets **404** `refund_not_found` when deciding A's request; the buyer gets **403** (seller routes); A's decision never touches seller B's order or amount
**Business Rule**: §1 Roles; Delivered-item refund spec §API and concurrency
**Selectors/API**: `/api/seller/refund-requests[/:id/decision]`
**Suggested Layer**: API

---

### TC-223: Approve starts one refund; repeat and races converge
**Category**: Business Rule
**Priority**: P0
**Role**: Seller
**Platform**: API
**Parity**: Both (web TC-164)
**Automation**: Playwright-API (Stripe test mode); race cases Blocked → Integration
**Preconditions**: A requested refund
**Steps**:
1. `PUT /api/seller/refund-requests/:id/decision` `{ decision: "approve" }`
2. Repeat the approval
3. Concurrently send approve and reject (separate request)

**Expected Results**:
- State goes `requested → processing → refunded` (or `needs_review` on a failed/uncertain Stripe result, with no replacement refund); one Stripe refund for the quoted amount
- A repeated approval returns the current outcome; approve vs reject has exactly one winner
- Order `paymentStatus` becomes `partially_refunded` or `refunded`; `refundedAmountMinor` reflects confirmed refunds only
**Business Rule**: Delivered-item refund spec §Data and service boundaries, §API and concurrency
**Selectors/API**: `PUT /api/seller/refund-requests/:id/decision`
**Suggested Layer**: API + Integration

---

### TC-224: Rejection needs an explanation
**Category**: Negative
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both (web TC-165)
**Automation**: Playwright-API
**Preconditions**: A requested refund
**Steps**:
1. Decide `reject` with no reason, blank reason, and a 1001-character reason
2. Decide with an unknown `decision` value
3. Reject with a valid reason

**Expected Results**:
- (1) and (2) **400** `refund_validation`; (3) the request becomes `rejected` with the stored reason; no automatic approval or rejection happens for seller silence
**Business Rule**: Delivered-item refund spec §Approved first-version policy
**Selectors/API**: `PUT /api/seller/refund-requests/:id/decision`
**Suggested Layer**: API

---

### TC-225: A refund does not undo fulfillment
**Category**: Business Rule
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: A delivered order with an approved, settled refund; note stock, `soldCount`, coupon `usedCount` and `order.total`
**Steps**:
1. Read the order, product and coupon after the refund

**Expected Results**:
- `status` is still `delivered`; stock, sold count and coupon use are unchanged; `order.total` is unchanged
- Auto-complete never delivers an order whose `refundRequestedAt` is set
**Business Rule**: Delivered-item refund spec §Approved first-version policy; §5 Auto-complete
**Selectors/API**: `GET /api/orders/:id`
**Suggested Layer**: API

---

### TC-226: Seller refund list pagination and filters
**Category**: Edge Case
**Priority**: P2
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Preconditions**: ≥ 3 requests in mixed states
**Steps**:
1. `GET /api/seller/refund-requests?status=in_progress|approved|rejected&page=1&limit=2`
2. Try `page=0`, `limit=101`, `limit=abc`, `status=other`

**Expected Results**:
- (1) returns only the requested group and page size; (2) **400** `refund_validation` (page ≥ 1, limit 1–100, status one of the three groups)
**Business Rule**: Delivered-item refund spec §API
**Selectors/API**: `GET /api/seller/refund-requests`
**Suggested Layer**: API

---

### TC-227: Delivery records `deliveredAt` and the 7-day deadline on every path
**Category**: Business Rule
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both (mobile TC-085)
**Automation**: Playwright-API (buyer and seller paths); auto-complete path Manual / Integration
**Preconditions**: Three `shipped` orders
**Steps**:
1. Buyer `PUT /api/orders/:id/confirm-received` on one
2. Seller `PUT /api/seller/orders/:id/status` `{ status: "delivered" }` on another
3. Let auto-complete deliver the third (shipped ≥ 2 days)
4. Repeat each transition

**Expected Results**:
- Each sets `deliveredAt` and `refundRequestDeadlineAt` = `deliveredAt + 168 h` (auto-complete uses `shippedAt + 48 h`, not the worker restart time)
- Repeating a transition does not move the deadline; a stale save cannot overwrite another fulfillment change (409)
**Business Rule**: Delivered-item refund spec §Delivery time and eligibility
**Selectors/API**: `PUT /api/orders/:id/confirm-received`
**Suggested Layer**: API + Integration

---

## Platform & Documentation (API)

### TC-228: API documentation is served outside production only
**Category**: Business Rule
**Priority**: P2
**Role**: Any
**Platform**: API
**Parity**: API
**Automation**: Playwright-API
**Preconditions**: Backend with `NODE_ENV=development`, then with `NODE_ENV=production`
**Steps**:
1. `GET /api-docs.json` and open `/api-docs`
2. Repeat on the production-mode server

**Expected Results**:
- Development: a valid OpenAPI document that lists the checkout session, seller cancellation and refund endpoints, plus a working Swagger UI titled "TokoMart API documentation"
- Production: both routes return 404
**Business Rule**: Swagger integration (PRs #78, #82)
**Selectors/API**: `GET /api-docs.json`, `/api-docs`
**Suggested Layer**: API (contract tests exist: `npm run test:contracts`)

---

### TC-229: Stripe webhook rejects an invalid signature
**Category**: Security
**Priority**: P1
**Role**: Any
**Platform**: API
**Parity**: API
**Automation**: Playwright-API
**Preconditions**: Webhook secret configured
**Steps**:
1. `POST /api/payments/webhook` with a body and no `stripe-signature`, then with a wrong one

**Expected Results**:
- **400** `Invalid signature`; no order or payment state changes
**Business Rule**: Authorize-capture §Recovery and Stripe events
**Selectors/API**: `POST /api/payments/webhook`
**Suggested Layer**: API

---

### TC-230: Payment events never advance fulfillment
**Category**: Business Rule
**Priority**: P1
**Role**: System
**Platform**: API
**Parity**: API
**Automation**: Blocked (needs signed Stripe events / Stripe CLI; covered by backend integration tests)
**Preconditions**: A cancelled order and a pending authorized order
**Steps**:
1. Deliver signed `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `payment_intent.amount_capturable_updated` events, duplicated, delayed and out of order

**Expected Results**:
- Fulfillment status never moves to `processing` or back from `cancelled` because of an event; a late success on a cancelled order triggers a compensating full refund and an alert; duplicates are processed once (event inbox is unique); a failure event cannot cancel a captured order
**Business Rule**: Authorize-capture §Recovery and Stripe events
**Selectors/API**: `POST /api/payments/webhook`
**Suggested Layer**: Integration

---
