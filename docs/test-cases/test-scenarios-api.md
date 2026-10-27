# TokoMart Test Scenarios — API

> **Platform:** Playwright-API (`e2e-testing/tests/api/`). Tests hit the Express backend directly via HTTP — no browser required.  
> Full master index: [test-scenarios.md](test-scenarios.md) · Web scenarios: [test-scenarios-web.md](test-scenarios-web.md) · Mobile scenarios: [test-scenarios-mobile.md](test-scenarios-mobile.md)

Tracking fields follow [the master index conventions](test-scenarios.md#how-to-track-these-cases). Tool labels and existing script references are not proof of implemented or passing automation. Historical integration-coverage notes require an actual source/report audit before setting verified coverage.

---

## Buyer — Cart (API)

### TC-107: GET /api/cart returns authenticated buyer's own items
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: N/A  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Security / Isolation  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Web (TC-109)  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Security / Isolation  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Web (TC-112)  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Security / Isolation  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: N/A (API-only enforcement)  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Security  
**Priority**: P1  
**Role**: Any  
**Platform**: API  
**Parity**: N/A  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Security  
**Priority**: P1  
**Role**: Any  
**Platform**: API  
**Parity**: N/A  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Security / Isolation  
**Priority**: P1  
**Role**: Seller  
**Platform**: API  
**Parity**: N/A  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Security  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Web (extends TC-053)  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Negative / Validation  
**Priority**: P1  
**Role**: Any  
**Platform**: API  
**Parity**: N/A  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Business Rule  
**Priority**: P0  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/api/orders.api.spec.ts`  
**Preconditions**: Known product price, discount, coupon, delivery  
**Steps**:
1. Place order via API with controlled inputs
2. Assert persisted `subtotal`, `productDiscount`, `discount`, `tax`, `shipping`, `total`

**Expected Results**:
- `tax` = 8% of after-discount subtotal
- `total` = afterDiscounts + tax + shipping (2 decimal places)
- A $20 product with no shipping fee: subtotal 20, tax 1.60, shipping 9.99, total 31.59
- A $100 product at 10% off with a 10% seller coupon: product discount 10, coupon discount 9 (10% of the $90), tax 6.48, shipping 9.99, total 97.47
**Business Rule**: §4 Price calculation  
**Selectors/API**: `POST /api/orders`, order response body  
**Suggested Layer**: API

---

### TC-027: Shipping is a flat $9.99 when the seller set no shipping fee
**Scenario status**: Active
**Category**: Business Rule  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Blocked (the API cannot create a product without shipping settings; covered by unit tests)
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: unit: `backend/src/services/__tests__/checkoutPricing.test.ts`
**Preconditions**: A buyer who is not the seller; a product priced $20 with no `shippingFee` (an older product saved before shipping settings were required)
**Steps**:
1. Place a COD order for one unit
2. Read `shipping` and `total` on the order

**Expected Results**:
- `shipping` = 9.99, whatever the amount: there is no free-shipping threshold (larger amounts are TC-028 and TC-263)
- `total` = after-discount amount + 8% tax + 9.99
- Only a product the seller set to `free` ships for $0 (TC-257)
**Business Rule**: §4 Shipping rules (default fee)
**Selectors/API**: `POST /api/orders`; `computeSellerTotals`
**Suggested Layer**: Unit
---

### TC-028: A large order still pays the flat shipping fee
**Scenario status**: Active
**Category**: Business Rule  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Blocked (the API cannot create a product without shipping settings; covered by unit tests)
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: unit: `backend/src/services/__tests__/checkoutPricing.test.ts`
**Preconditions**: A no-fee product priced $99
**Steps**:
1. Place a COD order for one unit

**Expected Results**:
- `shipping` = 9.99, even though the after-discount amount is above $50
- Only a product the seller set to `free` ships for $0 (TC-257)
**Business Rule**: §4 Shipping rules (default fee)
**Selectors/API**: `POST /api/orders`
**Suggested Layer**: Unit
---

### TC-033: Buyer cannot cancel processing order
**Scenario status**: Active
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/api/orders.api.spec.ts`  
**Preconditions**: Order status `processing`  
**Steps**:
1. Attempt cancel via API

**Expected Results**:
- **400** — cancel not allowed
- *Updated 2026-10-24:* the buyer can cancel **pending only**, so `preparing` is also rejected. Legacy-shape orders answer **400** `"You can only cancel pending orders"`; manual-capture card orders and COD orders with `paymentStatus: not_required` answer **409** `cancellation_conflict` (shared atomic claim). See TC-206
- *Updated 2026-10-25:* `orders.api.spec.ts` places a COD order, so it asserts **409** `cancellation_conflict`; the 400 above applies to legacy-shaped orders only
**Business Rule**: §5 Buyer cancel — pending only (preparing removed, PR #80)  
**Selectors/API**: `PUT /api/orders/:id/status`  
**Suggested Layer**: API

---

## Buyer — Reviews (API)

### TC-035: Duplicate review blocked
**Scenario status**: Active
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Security  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Security  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Negative  
**Priority**: P1  
**Role**: Seller  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Security  
**Priority**: P0  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Security  
**Priority**: P1  
**Role**: Seller  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Edge Case  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Edge Case  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Edge Case  
**Priority**: P2  
**Role**: Seller  
**Platform**: API  
**Parity**: Both  
**Automation**: Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Seller token  
**Steps**:
1. Create/update product with description > 200 chars

**Expected Results**:
- **400** validation error
- On `/api/seller/products` this is checked with the other value rules in TC-306 (create) and TC-307 (update). `POST /api/products` appears to answer 500 for it (from the code, not run); the apps do not use that route
**Business Rule**: §2 description max 200  
**Selectors/API**: `POST /api/products`  
**Suggested Layer**: API

---

## Security & Infrastructure — Rate Limiting

### TC-114: Auth route response includes rate limit headers
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Any
**Platform**: API
**Parity**: API (backend shared with mobile)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Any
**Platform**: API
**Parity**: API (backend shared with mobile)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Any
**Platform**: API
**Parity**: API (backend shared with mobile)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Any
**Platform**: API
**Parity**: API (backend shared with mobile)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Any
**Platform**: API
**Parity**: API (backend shared with mobile)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Any
**Platform**: API
**Parity**: API (backend shared with mobile)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
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
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-137–141, mobile TC-172–174)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Negative
**Priority**: P2
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-139)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (extends TC-056)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P0
**Role**: Seller
**Platform**: API
**Parity**: Both (web TC-155, mobile TC-182)
**Automation**: Playwright-API (Stripe test mode)
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Security
**Priority**: P0
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Blocked (needs clock control or a seeded past `acceptBy`; covered by backend integration tests)
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: System
**Platform**: API
**Parity**: Both
**Automation**: Manual / Blocked (set `ACCEPTANCE_SCAN_INTERVAL_MS` low and seed an expired order)
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Blocked (needs controlled concurrency; covered by integration tests)
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-152, TC-153)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Negative
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both (extends TC-033)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Negative
**Priority**: P2
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both (extends TC-111)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P0
**Role**: Seller
**Platform**: API
**Parity**: Both (web TC-157, TC-159; mobile TC-183)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both (web TC-158)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API (seeded orders) / Integration
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both (web TC-160)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-161)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-169)
**Automation**: Playwright-API (seeded orders)
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-163)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-166)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API (run with the flag off)
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Security
**Priority**: P0
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P0
**Role**: Seller
**Platform**: API
**Parity**: Both (web TC-164)
**Automation**: Playwright-API (Stripe test mode); race cases Blocked → Integration
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both (web TC-165)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P2
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both (mobile TC-085)
**Automation**: Playwright-API (buyer and seller paths); auto-complete path Manual / Integration
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P2
**Role**: Any
**Platform**: API
**Parity**: API
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
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
**Scenario status**: Active
**Category**: Security
**Priority**: P1
**Role**: Any
**Platform**: API
**Parity**: API
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Webhook secret configured
**Steps**:
1. `POST /api/payments/webhook` with a body and no `stripe-signature`, then with a wrong one

**Expected Results**:
- **400** `Invalid signature`; no order or payment state changes
**Business Rule**: Authorize-capture §Recovery and Stripe events
**Selectors/API**: `POST /api/payments/webhook`
**Suggested Layer**: API

---

### TC-230: Payment events respect acceptance ownership and flag unexpected captures
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: System
**Platform**: API
**Parity**: API
**Automation**: Blocked (needs controlled provider state and signed events; integration is intended, coverage has not been audited here)
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Independent manual-capture fixtures: a cancelled order, a pending authorized order, a claimed acceptance with `paymentStatus: capture_pending`, and an already captured order. Automated checks mock Stripe; real Stripe test-mode webhook verification is owner-run manual work
**Steps**:
1. Deliver duplicated, delayed and out-of-order `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` and `payment_intent.amount_capturable_updated` events against the independent fixtures with controlled current provider state
2. For unexpected capture on a cancelled order, make the current provider intent read back as `succeeded`; inspect the persisted error and unchanged fulfillment status
3. For claimed acceptance, supply verified success for the matching intent and exact amount; repeat the event

**Expected Results**:
- Verified success may finalize an already claimed `capture_pending` acceptance to `preparing`/`captured`; it cannot independently accept a pending authorized order or advance fulfillment to `processing`
- Unexpected success on a cancelled or otherwise unclaimed order records `paymentError.code: unexpected_capture` and logs a support-review alert. It does not restore cancelled fulfillment or automatically issue a compensating refund
- Duplicate deliveries produce one inbox record per provider event ID and no repeated business side effects. Duplicate success or failure leaves already captured orders unchanged
- Confirmed provider cancellation may cancel a still-pending `authorized` order, but cannot take over a `capture_pending` operation or cancel an already captured order
**Known implementation gap**: Earlier wording promised automatic compensation after unexpected capture. The current handler requires support review instead. Automatic compensation remains an open product decision needing separate implementation; this correction does not claim it exists
**Business Rule**: Authorize-capture §Recovery and Stripe events
**Selectors/API**: `POST /api/payments/webhook`
**Suggested Layer**: Integration

---

## Authentication (API) — added 2026-10-24 for the existing `auth.api.spec.ts`

### TC-232: Login returns a token for valid credentials
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P0
**Role**: Both
**Platform**: API
**Parity**: Both (web TC-001, mobile TC-067)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/api/auth.api.spec.ts`
**Preconditions**: Seeded user exists
**Steps**:
1. `POST /api/auth/login` with a valid email and password

**Expected Results**:
- 2xx; `success: true`, a non-empty `token`, and `user.email` equal to the email sent
**Business Rule**: §1 Authentication
**Selectors/API**: `POST /api/auth/login`
**Suggested Layer**: API

---

### TC-233: Login rejects an invalid password
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both (web TC-002, mobile TC-612)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/api/auth.api.spec.ts`
**Preconditions**: Seeded user exists
**Steps**:
1. `POST /api/auth/login` with a valid email and a wrong password

**Expected Results**:
- Rejected with **401** `Invalid credentials` (the spec asserts any status ≥ 400; tighten it to 401); no token is returned
**Business Rule**: §1 Authentication
**Selectors/API**: `POST /api/auth/login`
**Suggested Layer**: API

---

### TC-234: `GET /api/auth/me` returns the logged-in user
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/api/auth.api.spec.ts`
**Preconditions**: A valid token from TC-232
**Steps**:
1. `GET /api/auth/me` with `Authorization: Bearer <token>`

**Expected Results**:
- 2xx; `user.email` is the authenticated user's email
- Without a token the same call returns 401 (covered by TC-132)
**Business Rule**: §1 Authentication
**Selectors/API**: `GET /api/auth/me`
**Suggested Layer**: API

---

## Coupons / Vouchers (API) — added 2026-10-25

> Related existing scenarios: TC-057 (minimum order), web TC-019, TC-020, TC-050, mobile TC-082, TC-093. Rules: `business-rules.md` §6. Code: `couponController.ts`, `couponRoutes.ts`, `checkoutPricing.ts` `couponDiscountFor`.
> Seller routes are under `/api/coupons/seller`, buyer routes under `/api/coupons`. Create test coupons with unique codes and delete them afterwards.

### TC-235: Validate returns the discount for a valid percentage coupon
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-019, mobile TC-082)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A seller's active 10% coupon with no minimum; a fresh buyer token
**Steps**:
1. `POST /api/coupons/validate` `{ code, sellerId, orderAmount: 200 }` as the buyer

**Expected Results**:
- **200** `success: true`; `discountAmount` = 20
- `coupon` carries `id`, `code` (upper case), `discountType`, `discountValue`, `maxDiscount`, `description`
**Business Rule**: §6 Discount amount
**Selectors/API**: `POST /api/coupons/validate`
**Suggested Layer**: API

---

### TC-236: Percentage discount is capped by `maxDiscount`
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A 50% coupon with `maxDiscount` 15
**Steps**:
1. Validate with `orderAmount` 100
2. Validate with `orderAmount` 20

**Expected Results**:
- (1) `discountAmount` = 15 (capped); (2) `discountAmount` = 10 (below the cap)
- The same cap is applied at checkout (`couponDiscountFor`), so the validated amount equals the order's coupon discount
- Known edge: `maxDiscount: 0` is treated as "no cap" by the code
**Business Rule**: §6 Discount amount
**Selectors/API**: `POST /api/coupons/validate`; `checkoutPricing.ts`
**Suggested Layer**: API + Unit

---

### TC-237: Fixed coupon never discounts more than the order amount
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A fixed coupon worth $20
**Steps**:
1. Validate with `orderAmount` 15
2. Validate with `orderAmount` 50
3. Place an order of 15 with the coupon and read its coupon discount

**Expected Results**:
- (2) `discountAmount` = 20
- (1) and (3) `discountAmount` = 15, i.e. `min(discountValue, subtotal)` as `business-rules.md` §6 and checkout pricing define
- **Open mismatch:** `validateCoupon` currently returns the full `discountValue` (20) for (1), while checkout applies 15. Decide whether to fix the endpoint; until then (1) fails against the rule
**Business Rule**: §6 Discount amount (`fixed: min(discountValue, subtotal)`)
**Selectors/API**: `POST /api/coupons/validate`; `couponDiscountFor`
**Suggested Layer**: API + Unit

---

### TC-238: Unknown voucher code is rejected
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (API leg of web TC-020)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A code that does not exist
**Steps**:
1. `POST /api/coupons/validate` with the unknown code and a valid `sellerId`

**Expected Results**:
- **404** `Invalid voucher code`; `success: false`
- The code is matched case-insensitively (a lower-case valid code is accepted)
**Business Rule**: §6 Validation
**Selectors/API**: `POST /api/coupons/validate`
**Suggested Layer**: API

---

### TC-239: Inactive voucher is rejected
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A coupon the seller switched off (`PUT /api/coupons/seller/:id` `{ isActive: false }`)
**Steps**:
1. Validate the coupon as a buyer

**Expected Results**:
- **400** `This voucher is no longer active`; re-enabling it makes validation succeed again
- An inactive coupon is also absent from `GET /api/coupons` (TC-251)
**Business Rule**: §6 Validation
**Selectors/API**: `POST /api/coupons/validate`, `PUT /api/coupons/seller/:id`
**Suggested Layer**: API

---

### TC-240: Expired voucher is rejected
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A coupon created with `expiresAt` in the past (the create endpoint accepts it)
**Steps**:
1. Validate the coupon as a buyer

**Expected Results**:
- **400** `This voucher has expired`
- A coupon expiring in the future validates normally
**Business Rule**: §6 Validation
**Selectors/API**: `POST /api/coupons/validate`
**Suggested Layer**: API

---

### TC-241: Voucher that reached its usage limit is rejected
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A coupon with `usageLimit` 1 and one order already placed with it (see TC-252)
**Steps**:
1. Validate the coupon again

**Expected Results**:
- **400** `This voucher has reached its usage limit`; it is also missing from `GET /api/coupons`
- A second order that still submits the code gets no discount (`couponDiscountFor` rejects it)
**Business Rule**: §6 Validation
**Selectors/API**: `POST /api/coupons/validate`
**Suggested Layer**: API

---

### TC-242: A voucher cannot be used with another seller
**Scenario status**: Active
**Category**: Security
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A coupon owned by seller A; seller B's id
**Steps**:
1. Validate seller A's code with `sellerId` = seller B

**Expected Results**:
- **404** `Invalid voucher code` (the lookup is scoped to `code` + `sellerId`); no discount is returned
- In a multi-seller cart the code only applies to seller A's order
**Business Rule**: §6 Application scope (one coupon per seller)
**Selectors/API**: `POST /api/coupons/validate`
**Suggested Layer**: API

---

### TC-243: Validate needs a code, a seller id and a token
**Scenario status**: Active
**Category**: Negative
**Priority**: P2
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: None
**Steps**:
1. `POST /api/coupons/validate` without `code`; then without `sellerId`
2. `POST /api/coupons/validate` and `GET /api/coupons?sellerId=…` with no token

**Expected Results**:
- (1) **400** `code and sellerId are required`
- (2) **401** for both
**Business Rule**: §1 Authentication; §6 Validation
**Selectors/API**: `POST /api/coupons/validate`
**Suggested Layer**: API

---

### TC-244: Validate without an order amount skips the minimum check
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P2
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A percentage coupon with a $100 minimum
**Steps**:
1. Validate with no `orderAmount`

**Expected Results**:
- Current behaviour: **200**; the minimum is not checked and a percentage coupon returns `discountAmount` 0 (a fixed coupon returns its full value)
- Decide whether this is intended or whether `orderAmount` should be required; update this scenario with the decision
**Business Rule**: §6 Validation
**Selectors/API**: `POST /api/coupons/validate`
**Suggested Layer**: API

---

### TC-245: Malformed seller id is handled without a server error
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P3
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: None
**Steps**:
1. `POST /api/coupons/validate` with `sellerId: "abc"` (not an ObjectId)
2. `GET /api/coupons?sellerId=abc`

**Expected Results**:
- A **4xx** (400 or 404) with a readable message
- **Unverified risk:** the controllers pass the value straight to Mongoose, so a cast error probably surfaces as **500**; run it before relying on this result
**Business Rule**: §6 Validation
**Selectors/API**: `POST /api/coupons/validate`, `GET /api/coupons`
**Suggested Layer**: API

---

### TC-246: Seller creates a coupon; the code is stored upper case
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both (web TC-050, mobile TC-093)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Seller token
**Steps**:
1. `POST /api/coupons/seller` `{ code: "save10x", discountType: "percentage", discountValue: 10 }`
2. `GET /api/coupons/seller`

**Expected Results**:
- **201**; `coupon.code` = `SAVE10X`; `minOrderAmount` defaults to 0; the seller owns it
- The coupon appears in the seller's list and nowhere in another seller's list
**Business Rule**: §6 Seller creates coupon
**Selectors/API**: `POST /api/coupons/seller`, `GET /api/coupons/seller`
**Suggested Layer**: API

---

### TC-247: Coupon creation validation and duplicate codes
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: An existing coupon `DUP1`
**Steps**:
1. Create with no `code`, then with no `discountType`, then with no `discountValue`
2. Create `DUP1` again, and again as `dup1`

**Expected Results**:
- (1) **400** `code, discountType, and discountValue are required`
- (2) **409** `Coupon code already exists` for both spellings (codes are unique across sellers)
**Business Rule**: §6 Seller creates coupon (duplicate → 409)
**Selectors/API**: `POST /api/coupons/seller`
**Suggested Layer**: API

---

### TC-248: A buyer cannot manage coupons
**Scenario status**: Active
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both (extends TC-135)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A fresh buyer token (role `buyer`); a seller's coupon id
**Steps**:
1. As the buyer call `GET /api/coupons/seller`, `POST /api/coupons/seller`, `PUT /api/coupons/seller/:id`, `DELETE /api/coupons/seller/:id`
2. Repeat with no token

**Expected Results**:
- (1) **403** each; the coupon is unchanged
- (2) **401** each
**Business Rule**: §1 Roles
**Selectors/API**: `/api/coupons/seller[/:id]`, `requireSeller`
**Suggested Layer**: API

---

### TC-249: A seller cannot change or delete another seller's coupon
**Scenario status**: Active
**Category**: Security
**Priority**: P0
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Seller A's coupon; seller B authenticated
**Steps**:
1. As B `PUT /api/coupons/seller/:id` with `{ discountValue: 90 }`
2. As B `DELETE /api/coupons/seller/:id`
3. As A read the coupon

**Expected Results**:
- (1) and (2) **404** `Coupon not found`; (3) the coupon is unchanged and still validates
**Business Rule**: §6; ownership (extends TC-054)
**Selectors/API**: `PUT/DELETE /api/coupons/seller/:id`
**Suggested Layer**: API

---

### TC-250: Seller updates and deletes their own coupon
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P2
**Role**: Seller
**Platform**: API
**Parity**: Both (mobile TC-093)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Seller's own coupon
**Steps**:
1. `PUT /api/coupons/seller/:id` with `discountValue`, `minOrderAmount`, `expiresAt`, `usageLimit`, `isActive`, `description`; also try `code` and `sellerId`
2. `DELETE /api/coupons/seller/:id`; validate the code again

**Expected Results**:
- (1) **200** with the new values; `code` and `sellerId` are not changed (only the allowed fields are applied)
- (2) **200** `Coupon deleted`; validation then returns 404
**Business Rule**: §6 Seller creates coupon
**Selectors/API**: `PUT/DELETE /api/coupons/seller/:id`
**Suggested Layer**: API

---

### TC-251: Available vouchers list only returns usable coupons
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-019, mobile TC-082)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: One seller with an active coupon, an inactive one, an expired one, a used-up one, and one with a $100 minimum
**Steps**:
1. `GET /api/coupons?sellerId=<seller>`
2. `GET /api/coupons?sellerId=<seller>&orderAmount=50`
3. `GET /api/coupons` with no `sellerId`

**Expected Results**:
- (1) Only active, unexpired, not-used-up coupons, sorted by `discountValue` descending
- (2) The $100-minimum coupon is also excluded
- (3) **400** `sellerId is required`
**Business Rule**: §6 Application scope (`GET /api/coupons?sellerId=…&orderAmount=…`)
**Selectors/API**: `GET /api/coupons`
**Suggested Layer**: API

---

### TC-252: An applied coupon discounts the order and counts one use
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both (web TC-050)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A 10% coupon with `usageLimit` 1; a buyer; a product from the same seller
**Steps**:
1. Place a COD order with `couponCodes[sellerId]` = the code (legacy `POST /api/orders`)
2. Read the order and the seller's coupon list
3. Place a second order with the same code

**Expected Results**:
- (1) The order's `discount` equals the validated amount; `total` follows the pricing formula (coupon before 8% tax)
- (2) `usedCount` = 1
- (3) The second order gets no coupon discount (limit reached, TC-241)
- Under `CHECKOUT_FLOW=manual_capture` the capacity is reserved at checkout and restored once on cancellation (see TC-205)
**Business Rule**: §4 Price calculation; §6 Application scope
**Selectors/API**: `POST /api/orders`, `GET /api/coupons/seller`
**Suggested Layer**: API

---

### TC-253: Out-of-range coupon values are rejected
**Scenario status**: Active
**Category**: Negative
**Priority**: P2
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Seller token
**Steps**:
1. Create a percentage coupon with `discountValue` 150
2. Create coupons with a negative `discountValue`, `usageLimit` 0, and an invalid `discountType`
3. If (1) is accepted, validate it with `orderAmount` 100 and place an order with it

**Expected Results**:
- Each invalid create returns a **400** with a readable message and creates nothing
- A percentage coupon never discounts more than the order amount, and the order total never goes negative
- **Current code (verify):** the model only enforces `discountValue >= 0`, `usageLimit >= 1` and the `discountType` enum, and the controller turns validation errors into **500**. A 150% coupon is accepted, and neither `validateCoupon` nor `couponDiscountFor` caps a percentage discount at the subtotal, so it would discount 150. Confirm and decide the intended limits
**Business Rule**: §6 Seller creates coupon; §4 Price calculation
**Selectors/API**: `POST /api/coupons/seller`, `POST /api/coupons/validate`
**Suggested Layer**: API + Unit

---

## Order creation (API) — added 2026-10-25

> Related existing scenarios: TC-025 (multi-seller), TC-026 (total formula), TC-027 and TC-028 (shipping), TC-056 (insufficient stock), TC-033 (buyer cancel), TC-193 (card order refused with 426 under `manual_capture`), TC-205 (buyer cancel). Rules: `business-rules.md` §4. Code: `orderService.ts` `createOrders`, `checkoutPricing.ts`, `orderValidators.ts`.
> These use COD orders on the legacy `POST /api/orders` path, which stays available for COD under both `CHECKOUT_FLOW` values.

### TC-254: Order creation requires authentication
**Scenario status**: Active
**Category**: Security
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A valid product id
**Steps**:
1. `POST /api/orders` with a valid body and no token
2. Repeat with a tampered token

**Expected Results**:
- **401** for both; no order is created and stock is unchanged
- (`GET /api/orders` without a token is covered by TC-132)
**Business Rule**: §1 Authentication
**Selectors/API**: `POST /api/orders`
**Suggested Layer**: API

---

### TC-255: Order creation rejects an invalid body
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-029)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Authenticated buyer; a valid product id
**Steps**:
1. `POST /api/orders` with `items: []`, then with no `items`
2. Items with `quantity` 0, -1 and 1.5, and an item with no `productId`
3. No `shippingAddress`; no `paymentMethod`
4. A `shippingAddress` missing `street`, `city`, `state` or `zipCode`; an unsupported `paymentMethod.type`

**Expected Results**:
- (1)–(3) **400** with the validator message ("Order must contain at least one item", "Quantity must be a positive integer", "Shipping address is required", "Payment method is required"); no order is created
- (4) Expected 400 from the Order model validation. **Verify:** the route validator only checks that `shippingAddress` and `paymentMethod` are non-empty, so confirm the model rejects incomplete addresses and unknown payment types rather than accepting them
**Business Rule**: §4 Shipping address, §4 Payment methods
**Selectors/API**: `POST /api/orders`
**Suggested Layer**: API

---

### TC-256: Unknown product or variant returns 404 and changes nothing
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A valid product, a variant product, and a well-formed id that does not exist
**Steps**:
1. Order two items: a valid one and one with an unknown `productId`
2. Order a variant product with an unknown `variantId`
3. Order with a malformed `productId` (`abc`)

**Expected Results**:
- (1) **404** `Product not found: <id>`; the valid item's stock is unchanged and no order exists (products are validated before any stock is deducted)
- (2) **404** `Variant not found for: <name>`
- (3) A 4xx (the error handler maps a cast error to **400** `Invalid resource ID`); confirm it is not a 500
**Business Rule**: §4 Stock validation at order time
**Selectors/API**: `POST /api/orders`
**Suggested Layer**: API

---

### TC-257: Delivery option and seller shipping settings set the fee
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-018, mobile TC-081)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/api/orders.api.spec.ts`
**Preconditions**: Two products priced $20: one with `shippingFee: free`; one with `shippingFee: buyer_pays` and `shippingFeeAmounts` `{ standard: 5, express: 15 }` with options standard and express
**Steps**:
1. Order the free-shipping product
2. Order the buyer-pays product with `deliverySelections[sellerId]` = `express`; again with `standard`; again with no selection

**Expected Results**:
- (1) `shipping` 0, so the total is $20 + $1.60 tax = $21.60
- (2) `shipping` 15 for express and 5 for standard; with no selection, the first option's fee (5); the order stores `selectedDeliveryOption` and `deliverySelections`
- An older product with no shipping setting, or a buyer-pays product with no fee, pays the flat 9.99 (see TC-027, TC-302); the API can no longer create one
- Resolution order: the client selection for that seller, then the first value in `deliverySelections`, then the product's first option, then the first fee key
**Business Rule**: §4 Shipping rules; delivery option resolution order
**Selectors/API**: `POST /api/orders`; `computeSellerTotals`
**Suggested Layer**: API + Unit

---

### TC-258: Variant order uses the variant's price, discount and attributes
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-098, mobile TC-101)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A product at $30 with a variant at $40 and a variant discount of 25%
**Steps**:
1. Order the variant with `variantId` and `selectedAttributes`
2. Read the order and the product

**Expected Results**:
- The order item has `variantId`, `selectedAttributes`, `productPrice` 40 and `discountPercent` 25, so `subtotal` 40, `productDiscount` 10
- The variant's stock decreases by the quantity, not the product's stock
- A variant with no discount of its own does not inherit the product discount
**Business Rule**: §2 Variant pricing
**Selectors/API**: `POST /api/orders`; `priceLine`
**Suggested Layer**: API + Unit

---

### TC-259: An unknown or ineligible coupon code does not block the order
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P2
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: An unknown code, an inactive coupon, an expired coupon, and a coupon with a $100 minimum
**Steps**:
1. Place an order under $100 with each code in `couponCodes[sellerId]`

**Expected Results**:
- Each order is **201** with `discount` 0 and no `couponCode`; the coupon's `usedCount` is unchanged
- Current behaviour is silent: the buyer gets no error for a bad code at order time (validation errors only come from `POST /api/coupons/validate`, TC-238 to TC-241). Confirm that is intended
**Business Rule**: §6 Validation; application scope
**Selectors/API**: `POST /api/orders` with `couponCodes`
**Suggested Layer**: API

---

### TC-260: Placing an order deducts stock and counts the sale; cancelling restores stock
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A product with stock 10 and `soldCount` 0
**Steps**:
1. Place a COD order for quantity 3 and read the product
2. Cancel the pending order as the buyer and read the product again

**Expected Results**:
- (1) `stock` 7 and `soldCount` 3
- (2) `stock` back to 10 and `soldCount` back to 0, restored once (repeating the cancel changes nothing, see TC-205)
**Business Rule**: §4 Post-checkout; §5 Cancellation and stock restore
**Selectors/API**: `POST /api/orders`, `PUT /api/orders/:id/status`, `GET /api/products/:id`
**Suggested Layer**: API

---

### TC-261: Ordered items leave the server cart; other items stay
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P2
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-006)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Server cart (`PUT /api/cart`) with product A, product B (another seller) and a variant product with two variants
**Steps**:
1. Order only product A; `GET /api/cart`
2. Order one variant of the variant product; `GET /api/cart`

**Expected Results**:
- (1) Product A is gone, B stays, and empty seller groups are removed
- (2) Only the ordered variant should leave the cart. **Verify:** the legacy path removes cart lines by `product` id (`$in: orderedProductIds`), so the other variant's line probably disappears too; the checkout-session path matches product and variant. Record the actual result and decide whether to fix
**Business Rule**: §3 Cart; §4 Post-checkout (cart cleared after order)
**Selectors/API**: `POST /api/orders`, `PUT /api/cart`, `GET /api/cart`
**Suggested Layer**: API

---

### TC-262: A COD order starts pending with the acceptance fields set
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-022, mobile TC-095)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Authenticated buyer; backend run with each `CHECKOUT_FLOW` value
**Steps**:
1. Place a COD order for one seller's product
2. Read the order from the response and from `GET /api/orders/:id`

**Expected Results**:
- `status` `pending`, `paymentStatus` `not_required`, no `paymentIntentId`
- `sellerId` is the product owner's id; `placedAt` is set and `acceptBy` = `placedAt` + 24 hours
- `estimatedDelivery` ≈ order date + 7 days; `paymentMethod.type` `cash-on-delivery`
- The same shape under `CHECKOUT_FLOW=legacy` and `manual_capture`; the order has no Stripe call
**Business Rule**: §4 Post-checkout; Seller pending cancellation spec §Amendment
**Selectors/API**: `POST /api/orders`, `GET /api/orders/:id`
**Suggested Layer**: API

---

### TC-263: No free-shipping boundary at $50
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (boundary of TC-027 and TC-028)
**Automation**: Blocked (the API cannot create a product without shipping settings; covered by unit tests)
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: unit: `backend/src/services/__tests__/checkoutPricing.test.ts`
**Preconditions**: Three no-fee products priced $49.99, $50.00 and $99
**Steps**:
1. Order one unit of each product

**Expected Results**:
- `shipping` = 9.99 for all three: the amount does not change the fee
- The unit tests for `computeSellerTotals`, the web helper and the mobile helper assert the same
**Business Rule**: §4 Shipping rules (default fee)
**Selectors/API**: `POST /api/orders`; `computeSellerTotals`
**Suggested Layer**: Unit
---

## Rate limiting (API) — added 2026-10-25

> Related existing scenarios: TC-114 to TC-119 (`rate-limit.api.spec.ts`). Code: `server.ts` (`authLimiter` on `/api/auth`, `apiLimiter` on products, orders, seller, cart, reviews, users, coupons and checkout), `config/deployment.ts` (`TRUST_PROXY_HOPS`).
> Limits are per IP in a fixed 60-second window: `RATE_LIMIT_AUTH_MAX` (default 10) and `RATE_LIMIT_API_MAX` (default 100); `0` disables a limit. Scenarios marked low-limit need a backend started with small values (for example 3 and 5) and must run alone, because exhausting the bucket makes every other request from the same IP fail with 429 for up to a minute.

### TC-264: The limit resets after the window
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P2
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Low-limit backend (auth limit 3); run alone
**Steps**:
1. Exhaust the auth limit and confirm the next login attempt returns 429 with `Retry-After`
2. Wait for the number of seconds in `Retry-After` (up to 60)
3. Send another login request

**Expected Results**:
- (3) is no longer 429 (a wrong password gives 401) and `RateLimit-Remaining` is back near the limit
- `Retry-After` and `RateLimit-Reset` agree to within a second or two
- This test takes about a minute; tag it as slow and keep it out of the default run
**Business Rule**: Rate limiting (fixed 60 s window)
**Selectors/API**: `POST /api/auth/login`
**Suggested Layer**: API

---

### TC-265: A limit set to 0 disables rate limiting
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P2
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Backend started with `RATE_LIMIT_AUTH_MAX=0` and `RATE_LIMIT_API_MAX=0`
**Steps**:
1. Send 200 `GET /api/products` and 30 `POST /api/auth/login` requests
2. Inspect the status codes and headers

**Expected Results**:
- No request returns 429
- Current code maps `0` to `Infinity`; record which `RateLimit-*` headers (if any) are sent. TC-114 to TC-116 skip in this mode because there is no finite limit to assert
**Business Rule**: Rate limiting (`0 = unlimited`, `server.ts`, the Swagger rate-limit text)
**Selectors/API**: `GET /api/products`, `POST /api/auth/login`
**Suggested Layer**: API

---

### TC-266: Checkout routes are rate limited like other API routes
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P2
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Authenticated buyer; default or low-limit backend
**Steps**:
1. `GET /api/checkout/sessions/000000000000000000000000` (a 404 is fine)
2. In low-limit mode, repeat until the API limit is exhausted

**Expected Results**:
- The response carries `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`
- In low-limit mode the next request is **429** with the standard message; the checkout routes share the same API bucket as products, orders and cart
**Business Rule**: Rate limiting; `/api/checkout` uses `apiLimiter`
**Selectors/API**: `/api/checkout/sessions/:id`
**Suggested Layer**: API

---

### TC-267: Payments routes, the Stripe webhook and health are never rate limited
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: System
**Platform**: API
**Parity**: API
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Low-limit backend (API limit 5); run alone
**Steps**:
1. Exhaust the API limit with `GET /api/products` until it returns 429
2. Send 15 `POST /api/payments/webhook` requests with an invalid signature
3. Send `GET /health`

**Expected Results**:
- (2) every response is **400** `Invalid signature`, never 429, and carries no `RateLimit-*` headers: Stripe retries must never be blocked by the limiter (the Swagger tag text says these routes are not behind the limiter)
- (3) **200**
**Business Rule**: Rate limiting scope; Authorize-capture §Recovery and Stripe events
**Selectors/API**: `POST /api/payments/webhook`, `GET /health`
**Suggested Layer**: API

---

### TC-268: All auth routes share one bucket, including profile, addresses and cards
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P2
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Low-limit backend (auth limit 3); a buyer token; run alone
**Steps**:
1. Send `GET /api/auth/me` three times
2. Send `GET /api/auth/saved-addresses`, then `GET /api/auth/payment-methods`

**Expected Results**:
- (2) returns **429**: every `/api/auth/*` route (login, signup, `me`, profile, avatar, saved addresses, payment methods) counts against the same strict brute-force limit
- **Product risk to decide:** at the default of 10 per minute, a signed-in user who edits addresses and cards, or who loads several screens, can reach 429 without any attack. Decide whether the saved-address and payment-method routes should use the general API limiter instead
**Business Rule**: Rate limiting scope (`/api/auth` uses `authLimiter`)
**Selectors/API**: `/api/auth/*`
**Suggested Layer**: API

---

### TC-269: A spoofed forwarding header cannot bypass the limit
**Scenario status**: Active
**Category**: Security
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Low-limit backend (auth limit 3) with `TRUST_PROXY_HOPS` unset (the default: forwarded headers are ignored); run alone
**Steps**:
1. Send 3 login attempts, each with a different `X-Forwarded-For` value
2. Send a 4th attempt with yet another `X-Forwarded-For` value

**Expected Results**:
- (2) is **429**: the client IP, not the header, decides the bucket, so a script cannot dodge the limit by rotating the header
- Starting the backend with a non-integer `TRUST_PROXY_HOPS` fails at startup (`TRUST_PROXY_HOPS must be a non-negative integer`)
**Business Rule**: Rate limiting; `deployment.md` Proxy and rate limiting; `configureTrustProxy`
**Selectors/API**: `POST /api/auth/login` with `X-Forwarded-For`
**Suggested Layer**: API

---

### TC-270: Behind the real proxy, separate clients get separate buckets
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Manual
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: The hosted environment, with `TRUST_PROXY_HOPS` set to the verified number of proxies (for one reverse proxy, 1); two machines or networks
**Steps**:
1. From client A exhaust the auth limit until it gets 429
2. From client B send a login request

**Expected Results**:
- Client B is **not** limited, and client A is still limited. If B is limited too, the app sees the proxy's address for everyone and the whole site is throttled as one client; raise or fix `TRUST_PROXY_HOPS`
- `deployment.md` asks for exactly this check on the actual host
**Business Rule**: `deployment.md` Proxy and rate limiting
**Selectors/API**: `POST /api/auth/login` on the deployed host
**Suggested Layer**: Manual

---

### TC-271: The 429 response has a consistent body
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P3
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Low-limit backend; run alone
**Steps**:
1. Trigger a 429 on an auth route and on an API route
2. Compare the bodies with the documented `TooManyRequests` response and with other API errors

**Expected Results**:
- Both bodies are `{ success: false, message: "Too many requests, please try again later." }` plus the `Retry-After` and `RateLimit-*` headers
- Known inconsistency: other errors carry a machine-readable `code`, but the limiter response does not, and `RATE_LIMITED` in `apiResponse.ts` is unused. Decide whether to add `code: "RATE_LIMITED"`, then assert it here
**Business Rule**: Rate limiting; API error envelope
**Selectors/API**: `POST /api/auth/login`, `GET /api/products`; `config/swagger.ts` `TooManyRequests`
**Suggested Layer**: API

---

## Reviews (API) — added 2026-10-25

> Related existing scenarios: TC-034 (leave a review, web UI), TC-035 (duplicate review), TC-036 (review before delivery). Rules: `business-rules.md` §7. Code: `reviewController.ts`, `reviewRoutes.ts`, `models/Review.ts`.
> Endpoints: `POST /api/reviews`, `PUT /api/reviews/:id`, `GET /api/reviews/check/:productId` (all need a token); `GET /api/reviews/product/:productId` is public. There is no delete endpoint.
> Several scenarios below record behaviour that looks wrong in the current code; they state the expected result and mark the current behaviour so the owner can decide.

### TC-272: Review endpoints require authentication
**Scenario status**: Active
**Category**: Security
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A product and an existing review id
**Steps**:
1. `POST /api/reviews`, `PUT /api/reviews/:id` and `GET /api/reviews/check/:productId` with no token, then with a tampered token
2. `GET /api/reviews/product/:productId` with no token

**Expected Results**:
- (1) **401** for each; no review is created or changed
- (2) **200**: the product's review list is public
**Business Rule**: §1 Authentication; §7 Reviews
**Selectors/API**: `/api/reviews`
**Suggested Layer**: API

---

### TC-273: Create-review validation
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A fresh buyer with a delivered order for a product
**Steps**:
1. `POST /api/reviews` once each without `productId`, `orderId`, `rating` and `comment`
2. Rating 0, 6 and -1

**Expected Results**:
- (1) **400** `productId, orderId, rating, and comment are required`
- (2) **400** (rating 0 is rejected as "required", 6 and -1 as `Rating must be between 1 and 5`)
- No review is created and the product rating is unchanged
**Business Rule**: §7 Fields (`rating` 1–5, `comment` required)
**Selectors/API**: `POST /api/reviews`
**Suggested Layer**: API

---

### TC-274: Over-long or malformed values return a client error, not 500
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A delivered order; an existing review of your own
**Steps**:
1. `POST /api/reviews` with a 1001-character `comment`; with a 1000-character `comment`
2. `POST /api/reviews` with `rating: "abc"`; with `rating: 4.5`
3. `POST /api/reviews` with `orderId: "abc"` and with `productId: "abc"`
4. `PUT /api/reviews/:id` with a 1001-character `comment`

**Expected Results**:
- (1) the 1001-character comment is **400** (business rules §7: max 1000); the 1000-character comment is **201**
- (2) `abc` is **400**; decide whether 4.5 is allowed (the model accepts any number from 1 to 5)
- (3) and (4) **400**
- **Current behaviour (verify):** the controller only turns the duplicate-key error into a clean response, and every other failure becomes **500 `Server error`**. The model rejects the 1001-character comment and `abc` with a validation error, and a malformed id with a cast error, so (1) over-long, (2) `abc`, (3) and (4) are probably 500 today
**Business Rule**: §7 Fields (`comment` max 1000)
**Selectors/API**: `POST /api/reviews`, `PUT /api/reviews/:id`
**Suggested Layer**: API

---

### TC-275: A review needs the buyer's own delivered order that contains the product
**Scenario status**: Active
**Category**: Security
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Buyer A with a delivered order for product P; buyer B authenticated; a second product Q; a cancelled order of buyer A; a well-formed order id that does not exist
**Steps**:
1. As B, review P using A's delivered order id
2. As A, review Q using the delivered order that only contains P
3. As A, review P using the cancelled order
4. As A, review P using the nonexistent order id

**Expected Results**:
- (1), (3) and (4): **403** `You can only review products from delivered orders`
- (2): **403** `This product is not in the specified order`
- No review is created; the identical message for another buyer's, cancelled and nonexistent orders does not reveal which order ids exist
**Business Rule**: §7 Eligibility
**Selectors/API**: `POST /api/reviews`
**Suggested Layer**: API

---

### TC-276: A seller cannot review their own product
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P2
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A seller who bought (and received) their own product
**Steps**:
1. Submit a review of that product as the seller

**Expected Results**:
- Proposed rule: **403**, because a self-review inflates the product's rating
- **Current behaviour:** the controller has no such check, so the review is created (**201**) and counts toward the rating. This scenario needs an owner decision; the old `reviews.api.spec.ts` ran as the seller reviewing their own product, which is why the gap went unnoticed
**Business Rule**: §7 (not specified; decision needed)
**Selectors/API**: `POST /api/reviews`
**Suggested Layer**: API

---

### TC-277: Product rating and count follow the reviews
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A new product with no reviews; three fresh buyers, each with a delivered order for it
**Steps**:
1. Buyer 1 reviews with rating 5; read the product
2. Buyer 2 reviews with rating 4; read the product
3. Buyer 3 reviews with rating 4; read the product

**Expected Results**:
- (1) `rating` 5, `reviews` 1; (2) `rating` 4.5, `reviews` 2; (3) `rating` 4.3 (4.333… rounded to one decimal), `reviews` 3
- A rejected review (duplicate or ineligible) does not change either value
**Business Rule**: §7 Product rating update (average, 1 decimal; count)
**Selectors/API**: `POST /api/reviews`, `GET /api/products/:id`
**Suggested Layer**: API

---

### TC-278: Buyer edits their own review
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (mobile review sheet)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A buyer's review (rating 4) on a product with only that review
**Steps**:
1. `PUT /api/reviews/:id` `{ rating: 2 }`; read the product
2. `PUT /api/reviews/:id` `{ comment: "Changed my mind" }`
3. `PUT /api/reviews/:id` with an empty body; with rating 0 and 6

**Expected Results**:
- (1) **200**, `rating` 2, the comment unchanged; the product `rating` becomes 2 with `reviews` still 1
- (2) **200**, the comment is saved (trimmed) and the rating stays 2
- (3) **400** `Provide rating or comment to update`; ratings outside 1 to 5 give **400**
- `PUT` cannot change the product or order the review belongs to
**Business Rule**: §7 Buyer flow (edit); product rating update
**Selectors/API**: `PUT /api/reviews/:id`
**Suggested Layer**: API

---

### TC-279: A buyer cannot edit someone else's review
**Scenario status**: Active
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Buyer A's review; buyer B authenticated
**Steps**:
1. As B, `PUT /api/reviews/<A's review id>` with `{ rating: 1, comment: "spam" }`
2. As B, `PUT /api/reviews/<nonexistent id>`
3. As A, read the review and the product rating

**Expected Results**:
- (1) and (2) **404** `Review not found or not yours`: the response is the same whether the review exists or not
- (3) the review and the product's rating are unchanged
**Business Rule**: §7 Reviews; ownership
**Selectors/API**: `PUT /api/reviews/:id`
**Suggested Layer**: API

---

### TC-280: The product review list is public, paged and newest first
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web TC-034, mobile product detail)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A product with 3 reviews written one after another
**Steps**:
1. `GET /api/reviews/product/:productId` with no token
2. `GET /api/reviews/product/:productId?limit=2&page=1`, then `page=2`
3. `GET` the list for a product with no reviews

**Expected Results**:
- (1) **200** `{ success, data, total: 3, page: 1, pages: 1 }`; reviews are sorted newest first, each with `rating`, `comment` and the reviewer's `firstName`, `lastName`, `avatar` (no email or password)
- (2) page 1 has 2 reviews and page 2 has 1; `pages` is 2
- (3) `data: []`, `total: 0`
**Business Rule**: §7 Reviews
**Selectors/API**: `GET /api/reviews/product/:productId`
**Suggested Layer**: API

---

### TC-281: Odd paging values and ids are handled safely
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P2
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A product with a few reviews
**Steps**:
1. `GET /api/reviews/product/:productId?page=0`, `page=-1`, `page=abc`
2. `?limit=0`, `?limit=100000`, `?limit=abc`
3. `GET /api/reviews/product/abc`

**Expected Results**:
- (1) and (2) fall back to the defaults (page 1, limit 10) or return a 4xx; never a 500. `limit` is capped (for example 50) so one request cannot return the whole collection
- (3) **400** or an empty list, not 500
- **Current behaviour (verify):** `page=0`, `limit=0` and `abc` fall back to the defaults because of `|| 1` / `|| 10`; `page=-1` probably becomes a negative `skip` and returns 500; `limit` has no upper bound; a malformed product id is a cast error and returns 500
**Business Rule**: Pagination (extends TC-123 to TC-131 for the products list)
**Selectors/API**: `GET /api/reviews/product/:productId`
**Suggested Layer**: API

---

### TC-282: `GET /api/reviews/check/:productId` reports whether the buyer reviewed
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P2
**Role**: Buyer
**Platform**: API
**Parity**: Both (web order detail, mobile order detail)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A delivered product that the buyer has not reviewed yet; a second buyer
**Steps**:
1. `GET /api/reviews/check/:productId` as the buyer
2. Submit a review, then call it again
3. Call it as a second buyer who has not reviewed

**Expected Results**:
- (1) `hasReviewed: false`, `review: null`; (2) `hasReviewed: true` with the review; (3) `hasReviewed: false`: the check is scoped to the caller
**Business Rule**: §7 Buyer flow (check existing review)
**Selectors/API**: `GET /api/reviews/check/:productId`
**Suggested Layer**: API

---

### TC-283: Two simultaneous reviews create only one
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P2
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A buyer with a delivered order and no review of the product
**Steps**:
1. Send the same `POST /api/reviews` request twice at the same time (for example with `Promise.all`)
2. Read the product and `GET /api/reviews/check/:productId`

**Expected Results**:
- One response is **201** and the other **409** `You have already reviewed this product` (the unique `(userId, productId)` index decides the race)
- The product has `reviews` 1 and the rating equals the review's rating, not double-counted
**Business Rule**: §7 One review per user per product
**Selectors/API**: `POST /api/reviews`
**Suggested Layer**: API

---

### TC-284: Reviews cannot be deleted
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P3
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A review and its product
**Steps**:
1. `DELETE /api/reviews/:id` as the review's author
2. Delete the product as its seller, then `GET /api/reviews/product/:productId`

**Expected Results**:
- (1) **404** (the route does not exist). `business-rules.md` §7 says the product rating updates "after create/update/delete", but no delete exists; decide whether to add it or fix the doc, then update this scenario
- (2) the product is removed but its reviews remain in the collection and are still returned by the list (orphans); decide whether deleting a product should remove or hide them
**Business Rule**: §7 Product rating update
**Selectors/API**: `DELETE /api/reviews/:id`, `DELETE /api/seller/products/:id`
**Suggested Layer**: API

---

## Seller access, security, users, Stripe and health (API) — added 2026-10-25

> Related existing scenarios: TC-048, TC-053, TC-054, TC-113, TC-132 to TC-136, TC-193, TC-229. Specs: `seller-access.api.spec.ts`, `security.api.spec.ts`, `users.api.spec.ts`, `stripe-webhook.api.spec.ts`, `health.api.spec.ts`.
> Several scenarios record behaviour that looks wrong in the current code; they give the expected result and mark the current behaviour so the owner can decide.

### TC-285: Product ownership holds on both product route sets
**Scenario status**: Active
**Category**: Security
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Seller A's product; seller B and a buyer authenticated; a well-formed id that does not exist
**Steps**:
1. As B, `PUT` and `DELETE` on `/api/products/:id` and on `/api/seller/products/:id` for A's product
2. As a buyer, repeat both
3. As A, `PUT` and `DELETE` on a nonexistent id

**Expected Results**:
- (1) **403** on all four (the delete message is `Not authorized to delete this product`); A's product is unchanged
- (2) **403** (seller-only route)
- (3) **404** `Product not found`
- TC-054 only exercises the `/api/products/:id` routes; the app also has the `/api/seller/products/:id` routes, which must enforce the same rule
**Business Rule**: §2 Listing visibility; ownership
**Selectors/API**: `/api/products/:id`, `/api/seller/products/:id`
**Suggested Layer**: API

---

### TC-286: More protected routes return 401 without a token
**Scenario status**: Active
**Category**: Security
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both (extends TC-132)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: None
**Steps**:
1. Call each of these with no `Authorization` header: `POST /api/orders`, `POST /api/checkout/sessions`, `GET /api/checkout/sessions/:id`, `POST /api/reviews`, `PUT /api/reviews/:id`, `GET /api/auth/saved-addresses`, `GET /api/auth/payment-methods`, `POST /api/payments/create-intent`, `POST /api/payments/save-card`, `POST /api/users/:id/follow`, `GET /api/coupons`, `POST /api/coupons/validate`, `GET /api/orders/:id/refund-eligibility`, `GET /api/seller/refund-requests`, `PUT /api/cart`, `DELETE /api/cart`

**Expected Results**:
- **401** with `success: false` for every one; nothing is created or changed
- Public by design (must stay open): `GET /api/products`, `GET /api/products/:id`, `GET /api/reviews/product/:productId`, `GET /health`, `GET /`, and `POST /api/payments/webhook` (signature-checked instead)
**Business Rule**: §1 Authentication
**Selectors/API**: the routes above
**Suggested Layer**: API

---

### TC-287: Malformed, expired and foreign tokens are rejected
**Scenario status**: Active
**Category**: Security
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both (extends TC-133)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A valid token for a fresh user
**Steps**:
1. `GET /api/auth/me` with `Authorization: <token>` (no `Bearer ` prefix), with `Bearer ` and nothing after it, and with `Bearer abc`
2. With a token whose header is `alg: none` and whose payload is the valid one
3. With a token signed by a different secret
4. With a valid token whose user has been deleted
5. With an expired token

**Expected Results**:
- **401** for each; (4) answers `User not found`, the others `Not authorized to access this route`
- (5) needs a backend started with a very short `JWT_EXPIRES_IN` (for example 1 second) or an integration test; mark it slow
**Business Rule**: §1 Authentication
**Selectors/API**: `GET /api/auth/me`; `middleware/auth.ts`
**Suggested Layer**: API + Integration

---

### TC-288: A buyer is blocked from every seller-only route
**Scenario status**: Active
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both (extends TC-053 and TC-135)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A fresh buyer token (never promoted); a seller's product, coupon, order and refund request ids
**Steps**:
1. As the buyer call every seller-only route: `POST/GET /api/seller/products`, `PUT/DELETE /api/seller/products/:id`, `GET /api/seller/orders`, `PUT /api/seller/orders/:id/status`, `GET /api/seller/orders/:id/refund-requests`, `GET /api/seller/refund-requests`, `PUT /api/seller/refund-requests/:id/decision`, `GET/POST /api/coupons/seller`, `PUT/DELETE /api/coupons/seller/:id`, `POST /api/products`, `PUT/DELETE /api/products/:id`, `POST /api/products/:id/image`, `POST /api/products/variant-image`

**Expected Results**:
- **403** with `success: false` for every call, and no data is changed or returned
- A review of the route table in `sellerRoutes.ts`, `couponRoutes.ts` and `productRoutes.ts` finds no seller-only route outside this list; any new one must be added
**Business Rule**: §1 Roles
**Selectors/API**: the routes above; `requireSeller`
**Suggested Layer**: API

---

### TC-289: Signup validation
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Divergent (web needs 8 characters with upper, lower and a digit; mobile 6; the API only 6)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A fresh email
**Steps**:
1. `POST /api/auth/signup` with an invalid email (`abc`), with a 5-character password, then with exactly 6 characters
2. With a missing, empty and spaces-only `firstName` and `lastName`
3. Sign up with an email that already exists, and again with the same email in different letter case

**Expected Results**:
- (1) invalid email **400** `Valid email is required`; 5 characters **400** `Password must be at least 6 characters`; 6 characters **201** with a `token` and a `user` that has no password
- (2) **400** `First name is required` / `Last name is required`
- (3) **400** `User already exists with this email` for both spellings. **Decision:** it is a 400, not a 409, and the message confirms the email is registered (account enumeration), while login hides it behind `Invalid credentials`
**Business Rule**: §1 Authentication; §10 Client-side validation
**Selectors/API**: `POST /api/auth/signup`
**Suggested Layer**: API

---

### TC-290: Follow and unfollow update the counts and are idempotent
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both (web TC-037, mobile TC-088)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Two fresh users, A and B
**Steps**:
1. A follows B; A follows B again
2. `GET /api/users/:B` as A, then as B
3. A unfollows B; A unfollows B again

**Expected Results**:
- (1) **200** `isFollowing: true`, `followersCount` 1 both times (no double count)
- (2) as A `isFollowing: true`, as B `isFollowing: false`; `followersCount` 1; A's `followingCount` 1
- (3) **200** `isFollowing: false`, `followersCount` 0 both times
**Business Rule**: §8 Follow system
**Selectors/API**: `POST/DELETE /api/users/:id/follow`, `GET /api/users/:id`
**Suggested Layer**: API

---

### TC-291: Follow and unfollow with bad inputs
**Scenario status**: Active
**Category**: Negative
**Priority**: P2
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: An authenticated user
**Steps**:
1. Follow a well-formed id that does not exist; follow `abc`
2. Unfollow a user never followed; unfollow `abc`
3. Follow with no token

**Expected Results**:
- (1) **404** `User not found` and **400** `Invalid user id`
- (2) never-followed returns **200** `isFollowing: false`; `abc` should be a **4xx**. **Verify:** the unfollow path has no id check, so a malformed id reaches Mongo and the error handler maps the cast error to 400 `Invalid resource ID`
- (3) **401**. (Following yourself is TC-113.)
**Business Rule**: §8 Follow system
**Selectors/API**: `POST/DELETE /api/users/:id/follow`
**Suggested Layer**: API

---

### TC-292: User search
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P2
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: At least 31 users exist; a user named with a unique string, for example "Zyxwv"
**Steps**:
1. `GET /api/users?q=zyx` as another user
2. `GET /api/users` with no `q`
3. Search for your own name
4. Inspect the keys of a returned user

**Expected Results**:
- (1) the user is found by a partial, case-insensitive match on first or last name
- (2) at most **30** users; (3) the caller is never in the results
- (4) only `id`, `firstName`, `lastName`, `avatar`, `role`, `followersCount`, `followingCount`, `isFollowing`; no email, password or addresses
**Business Rule**: §8 Follow system (`GET /api/users?q=`, max 30, excludes self)
**Selectors/API**: `GET /api/users`
**Suggested Layer**: API

---

### TC-293: Search text with regex characters is handled safely
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P2
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: An authenticated user
**Steps**:
1. `GET /api/users?q=(` and `?q=[` and `?q=*`
2. `GET /api/users?q=.*` and a long repeated pattern such as `(a+)+$`

**Expected Results**:
- Each returns **200** treating the text literally (or a **400**), never a **500**, and the long pattern does not hang the request
- **Current behaviour (verify):** `searchUsers` passes the trimmed text straight into a MongoDB `$regex`, so an invalid pattern such as `(` or `[` probably returns 500, `.*` matches every user, and a pathological pattern could be slow. The fix is to escape the text (or use a text index)
**Business Rule**: §8 Follow system (search)
**Selectors/API**: `GET /api/users?q=`
**Suggested Layer**: API

---

### TC-294: Public profile, followers and following lists
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P2
**Role**: Both
**Platform**: API
**Parity**: Both (web `/users/:id`, mobile `/seller-profile/:id`)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A follows B; C follows B; users A, B, C
**Steps**:
1. `GET /api/users/:B/followers` and `GET /api/users/:A/following` as C
2. `GET /api/users/:id` with `abc` and with a nonexistent id
3. `GET /api/users/:id/followers` for a nonexistent id; `GET /api/users/:id/following` for a nonexistent id
4. All four calls with no token

**Expected Results**:
- (1) followers of B are A and C; A follows only B; each entry carries `isFollowing` from C's point of view
- (2) **400** `Invalid user id` and **404** `User not found`
- (3) following of an unknown user is **404**, but followers of an unknown user currently returns **200** with `[]`. Make the two consistent (404) and update this scenario
- (4) **401**
**Business Rule**: §8 Follow system
**Selectors/API**: `/api/users/:id`, `/followers`, `/following`
**Suggested Layer**: API

---

### TC-295: A card order without a payment intent
**Scenario status**: Active
**Category**: Security
**Priority**: P0
**Role**: Buyer
**Platform**: API
**Parity**: Both (extends TC-193)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/api/stripe-webhook.api.spec.ts`
**Preconditions**: A real product and a fresh buyer; run once with each `CHECKOUT_FLOW` value
**Steps**:
1. `POST /api/orders` with `paymentMethod.type: "credit-card"` (and again with `debit-card`) and no `paymentIntentId`

**Expected Results**:
- `CHECKOUT_FLOW=manual_capture`: **426** `{ success: false, error: { code: "update_required", details: { reason: "card_order_requires_session", requiredEndpoint: "/api/checkout/sessions" } } }`; no order
- `CHECKOUT_FLOW=legacy`: **current behaviour** is **201**; `orderService.createOrders` skips Stripe verification when no intent is supplied ("saved/mock card path"), so an order marked as paid by card is created with nothing charged. The old `TC-STRIPE-WH-02` expected 402, which the code never returns for this case. **Decision needed:** keep the mock path only for development, or require a verified intent for every card order
- The spec asserts 426 under `manual_capture` and records the legacy result as a known gap
**Business Rule**: §4 Payment methods; Authorize-capture §API and client contracts
**Selectors/API**: `POST /api/orders`; `rejectLegacyCardOrder`
**Suggested Layer**: API

---

### TC-296: A card order with an unconfirmed or reused payment intent
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: `CHECKOUT_FLOW=legacy`; Stripe in test mode (or mocked); an intent that is not `succeeded` and one that is
**Steps**:
1. `POST /api/orders` with a card and a `paymentIntentId` whose status is not `succeeded`
2. Place an order with a succeeded intent, then submit the same intent for a second order

**Expected Results**:
- (1) **402** `Payment not confirmed. Please complete payment before placing your order.`; no order or stock change
- (2) the first order is created; the second is **409** `This payment has already been used for an order`
- Best covered with Stripe mocked in the backend tests (`orderService.stripe.test.ts`); an API run needs real test-mode intents
**Business Rule**: §4 Payment methods
**Selectors/API**: `POST /api/orders` with `paymentIntentId`
**Suggested Layer**: Integration + API

---

### TC-297: Error responses use one envelope
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P3
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: None
**Steps**:
1. Trigger one error of each kind: a service error (`GET /api/orders/<other buyer's id>`), a guarded route (`POST /api/orders` with a card under `manual_capture`), the rate limiter (low-limit mode), an invalid webhook signature, and an unknown route
2. Compare the bodies

**Expected Results**:
- Current shapes: service errors `{ success, message, code? }`; `426` guards `{ success, error: { code, message, retryable, details } }`; the limiter `{ success, message }`; the webhook `{ error }`; unknown routes `{ success, message }`
- Expected: one envelope with `success: false` and a machine-readable `code` everywhere (including 429 and the webhook), so clients can parse errors in one place. Decide the target shape, then assert it per route
**Business Rule**: API error contract; Swagger `Error` schema
**Selectors/API**: the routes above
**Suggested Layer**: API

---

### TC-298: Health and root endpoints respond
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/api/health.api.spec.ts`
**Preconditions**: Backend running
**Steps**:
1. `GET /health`
2. `GET /`

**Expected Results**:
- (1) **200** `{ success: true, message: "Server is running", timestamp }`
- (2) **200** `{ success: true, message: "TokoMart API", version: "1.0.0" }`
- Neither route needs a token and neither is rate limited
**Business Rule**: Smoke
**Selectors/API**: `GET /health`, `GET /`
**Suggested Layer**: API

---

### TC-299: Unknown routes return a JSON 404
**Scenario status**: Active
**Category**: Negative
**Priority**: P3
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: None
**Steps**:
1. `GET /api/does-not-exist` and `POST /nowhere`

**Expected Results**:
- **404** `{ success: false, message: "Not Found — <path>" }` as JSON, not an HTML page, and no stack trace outside `NODE_ENV=development`
**Business Rule**: API error contract
**Selectors/API**: `notFound` middleware
**Suggested Layer**: API

---

### TC-300: `/health` does not reflect the database
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P3
**Role**: Both
**Platform**: API
**Parity**: Both
**Automation**: Manual
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A test backend whose MongoDB can be stopped (never the owner's standalone 27017 database)
**Steps**:
1. Stop the test database while the backend keeps running
2. Call `GET /health` and `GET /api/products`

**Expected Results**:
- Current behaviour: `/health` still returns 200 (it does not query the database) while `/api/products` fails, so a load balancer using `/health` would keep sending traffic to a backend with no database
- Decide whether to add a readiness check (`/health/ready` that pings the database) and then assert it here
**Business Rule**: Deployment health checks (`docs/deployment.md`)
**Selectors/API**: `GET /health`
**Suggested Layer**: Manual

---

## Shipping fee default (API, web and mobile) — added 2026-10-26

> Rule: shipping is **free only when the seller sets `free`**; a buyer-pays product charges the seller's fee for the chosen option; anything else charges the **flat $9.99** safety fee, whatever the order amount.
> Code: `computeSellerTotals` and `STANDARD_SHIPPING_FEE` in `backend/src/services/checkoutPricing.ts`; `sellerShippingFee` in `frontend/src/utils/shipping.ts` and `frontend-mobile/lib/core/utils/seller_shipping.dart`.
> The product wizards on web and mobile already force the seller to pick `free` or `buyer_pays`, and the product API requires them too (TC-303), so the fallback is reached only by older products saved before that rule.

### TC-301: A product with no shipping fee pays the same flat $9.99 on every platform
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both (web cart and checkout, mobile cart and checkout)
**Automation**: Blocked (the API cannot create a product without shipping settings; covered by unit tests)
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: unit: `backend/src/services/__tests__/checkoutPricing.test.ts`, `frontend/src/utils/shipping.test.ts`, `frontend-mobile/test/core/utils/seller_shipping_test.dart`
**Preconditions**: Older products with no `shippingFee`, priced $10, $49.99, $50 and $500; one product with `shippingFee: free`
**Steps**:
1. Order each no-fee product through the API and read `shipping`
2. Put the same products in the web cart and open web checkout; read the shipping line
3. Do the same on the mobile cart and mobile checkout
4. Order the `free` product

**Expected Results**:
- (1) `shipping` is 9.99 for all four amounts, and the order total is the after-discount amount + 8% tax + 9.99
- (2) and (3) the shipping line reads $9.99 in the cart and in checkout, and the displayed total equals the order total the backend stores
- (4) `shipping` is 0 (the only way to ship free)
**Business Rule**: §4 Shipping rules (default)
**Selectors/API**: `POST /api/orders`; `computeSellerTotals`; web `Cart.tsx`, `Checkout.tsx`; mobile `cart_state.dart`, `checkout_screen.dart`
**Suggested Layer**: Unit

---

### TC-302: A buyer-pays product with no fee configured pays $9.99; an explicit 0 stays 0
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P1
**Role**: Buyer
**Platform**: API
**Parity**: Both
**Automation**: Blocked (the API cannot create a product without shipping settings; covered by unit tests)
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: unit: `backend/src/services/__tests__/checkoutPricing.test.ts`, `frontend/src/utils/shipping.test.ts`, `frontend-mobile/test/core/utils/seller_shipping_test.dart`
**Preconditions**: A `buyer_pays` product with `shippingFeeAmounts` `{}` (an older product; the API no longer accepts it); one with `{ standard: 0 }`; one with `{ standard: 5 }` and options standard and express
**Steps**:
1. Order the product with no configured fee
2. Order the product whose fee is an explicit 0
3. Order the product with only a standard fee while selecting `express`

**Expected Results**:
- (1) `shipping` 9.99: a missing fee must never become free, or the seller would absorb the cost
- (2) `shipping` 0: an explicit fee, including 0, is the seller's choice
- (3) `shipping` 5: an option with no fee of its own falls back to the first configured fee
- Create and update now reject a `buyer_pays` product with no amounts (TC-303), so this fallback only protects older products
**Business Rule**: §4 Shipping rules; delivery option resolution order
**Selectors/API**: `POST /api/orders`; `computeSellerTotals`
**Suggested Layer**: Unit

---

### TC-303: Shipping settings are required when a product is created or updated
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both (the web and mobile wizards ask for the same settings)
**Automation**: Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped (unit: `backend/src/validators/__tests__/shippingSettings.test.ts`, `backend/src/services/__tests__/sellerProductShipping.test.ts`)
**Preconditions**: A seller; a product with valid shipping settings; an older product with none (written straight to the database, since the API no longer creates one)
**Steps**:
1. `POST /api/seller/products` and `POST /api/products` with no `shippingOptions`, with `[]`, and with `["drone"]`
2. The same two routes with no `shippingFee`, and with `shippingFee: "flat"`
3. With `shippingFee: "buyer_pays"` and no fee for one selected option; with an empty, text and a negative fee
4. `PUT` only the price of the valid product; `PUT` only the price of the older product; `PUT` the older product with valid shipping settings

**Expected Results**:
- (1) to (3) **400** with a specific message: "At least one delivery option is required.", `Unknown delivery option "drone". Use standard, express or pickup.`, "Shipping fee option is required.", `Shipping fee must be "free" or "buyer_pays".`, `Shipping fee amount is required for delivery option "<option>".`, `Shipping fee amount for "<option>" cannot be negative.`; `/api/seller/products` also returns `code: "invalid_shipping_settings"`; no product is created
- (4) the valid product is updated; the older product is rejected with 400 until the update gives it valid settings, then it is saved
- A `free` product ignores any `shippingFeeAmounts`; an explicit fee of 0 is accepted; numeric strings from multipart bodies are accepted
- Another seller's product still answers 403 (ownership is checked before the shipping settings)
**Business Rule**: §2 Product wizard (shipping step); §4 Shipping rules
**Selectors/API**: `POST/PUT /api/seller/products`, `POST/PUT /api/products`
**Suggested Layer**: API + Unit

---

### TC-304: Creating a product needs a name, description, price and category
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both (the web and mobile wizards send the same fields)
**Automation**: Playwright-API
**Automation status**: Automated
**Script mapping**: Verified: describe block "TC-304: Creating a product needs a name, description, price and category" in `e2e-testing/tests/api/seller-products.api.spec.ts`, tests tagged `@TC-304`
**Latest result**: Passed
**Last run**: 2026-10-27
**Run evidence**: Local run, `npx playwright test --project=api` on the whole spec (68 tests, 3 runs in a row, all passed), against a private backend on port 5057 and database `tokomart_sp_test` on the replica set at 27018; no report file kept
**Run baseline**: Branch `update/create-update-product`, uncommitted; backend with the TC-309/TC-310 fixes
**Test File**: `e2e-testing/tests/api/seller-products.api.spec.ts`; unit: `backend/src/validators/__tests__/productInput.test.ts`, `backend/src/controllers/__tests__/sellerProductController.test.ts`, `backend/src/models/__tests__/Product.test.ts`
**Preconditions**: An authenticated seller; the seller's current product count from `GET /api/seller/products`; valid shipping settings (`shippingOptions` `["standard"]`, `shippingFee` `free`) on every request, so only the field under test can fail
**Steps**:
1. Control: `POST /api/seller/products` (multipart) with `name`, `description`, `price` and `category` plus the shipping settings
2. Repeat the request leaving out one field at a time: `name`, `description`, `price`, `category`
3. Repeat with `name`, `description` and `category` each sent as an empty string
4. Repeat with a `name` of only spaces
5. Repeat with a `category` of only spaces
6. `GET /api/seller/products` after each failed request

**Expected Results**:
- (1) **201**, `product.sellerId` is the caller, `product._id` returned
- (2) and (3) **400** `{ success: false, message: "name, description, price, and category are required" }`; no `code` field
- (4) **400** ``Path `name` is required.`` (the controller accepts the spaces, the model trims them to empty and rejects it)
- (5) **400** from the model: spaces are not one of the allowed categories
- (6) the seller's product count is unchanged after every 400
- `price` of `0` is accepted (the check is "missing", not "falsy"); see TC-306 for negative prices and TC-310 for an empty price
**Business Rule**: §2 Product wizard (required fields)
**Selectors/API**: `POST /api/seller/products`
**Suggested Layer**: API

---

### TC-305: Optional product fields can be left out and get their defaults
**Scenario status**: Active
**Category**: Positive
**Priority**: P2
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Automated
**Script mapping**: Verified: describe block "TC-305: Optional product fields can be left out and get their defaults" in `e2e-testing/tests/api/seller-products.api.spec.ts`, tests tagged `@TC-305`
**Latest result**: Passed
**Last run**: 2026-10-27
**Run evidence**: Local run, `npx playwright test --project=api` on the whole spec (68 tests, 3 runs in a row, all passed), against a private backend on port 5057 and database `tokomart_sp_test` on the replica set at 27018; no report file kept
**Run baseline**: Branch `update/create-update-product`, uncommitted; backend with the TC-309/TC-310 fixes
**Test File**: `e2e-testing/tests/api/seller-products.api.spec.ts`; unit: `backend/src/validators/__tests__/productInput.test.ts`, `backend/src/controllers/__tests__/sellerProductController.test.ts`, `backend/src/models/__tests__/Product.test.ts`
**Preconditions**: An authenticated seller
**Steps**:
1. `POST /api/seller/products` with only `name`, `description`, `price`, `category` and the shipping settings
2. `POST` again with every optional field: `stock`, `tags`, `brand`, `condition: used`, `sku`, `discount` 10 and an `image` URL
3. `POST` a variant product: `variantAttributes` and `variants` (each with `price`, `stock`, `sku`, `discount` and a single `image`), plus a top-level `price`
4. `POST` with extra fields the seller must not control: `rating` 5, `soldCount` 99, `sellerId` of another user

**Expected Results**:
- (1) **201** with defaults: `stock` 0, `image` empty, `images` empty, `condition` `new`, no `discount`, no `tags`, no `variants`, `rating` 0, `reviews` 0, `soldCount` 0
- (2) **201** and every value is stored as sent
- (3) **201**; each variant's `image` is stored as `images: [image]`; the top-level `price` is still required for a variant product on this route
- (4) **201** but the extra fields are ignored: `rating` stays 0, `soldCount` stays 0 and `sellerId` is the caller (the controller reads a fixed list of fields)
**Business Rule**: §2 Product wizard (optional fields)
**Selectors/API**: `POST /api/seller/products`
**Suggested Layer**: API

---

### TC-306: Creating a product rejects values outside the allowed range
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Automated
**Script mapping**: Verified: describe block "TC-306: Creating a product rejects values outside the allowed range" in `e2e-testing/tests/api/seller-products.api.spec.ts`, tests tagged `@TC-306`
**Latest result**: Passed
**Last run**: 2026-10-27
**Run evidence**: Local run, `npx playwright test --project=api` on the whole spec (68 tests, 3 runs in a row, all passed), against a private backend on port 5057 and database `tokomart_sp_test` on the replica set at 27018; no report file kept
**Run baseline**: Branch `update/create-update-product`, uncommitted; backend with the TC-309/TC-310 fixes
**Test File**: `e2e-testing/tests/api/seller-products.api.spec.ts`; unit: `backend/src/validators/__tests__/productInput.test.ts`, `backend/src/controllers/__tests__/sellerProductController.test.ts`, `backend/src/models/__tests__/Product.test.ts`
**Preconditions**: An authenticated seller; a valid request body to change one field at a time; the seller's current product count
**Steps**:
1. `price` -1 and `price` "abc"
2. `stock` -1 and `stock` "abc"
3. `category` "Toys" (the allowed values are Electronics, Clothing, Home & Garden, Books, Sports & Outdoors)
4. `description` of 201 characters; then 200 characters
5. `discount` -1, 101 and "abc"
6. `condition` "broken" (the allowed values are `new` and `used`)
7. A `variantAttributes` entry with no `name`
8. Variants with `price` -1, `stock` -1 and `discount` 101
9. Two bad fields at once (`price` -1 and `stock` -1)

**Expected Results**:
- (1) to (3) and (5) to (8) **400** `{ success: false, message }` where the message comes from the model, for example "Path `price` (-1) is less than minimum allowed value (0)." for a negative number and "Cast to Number failed" for text; no `code` field
- (4) 201 characters is **400** ("is longer than the maximum allowed length (200)"); 200 characters is **201** (the boundary of TC-058)
- (9) one **400** whose message lists both problems, joined with ", "
- No product is created by any 400 request (the product count is unchanged)
**Business Rule**: §2 Product wizard (field limits); TC-058
**Selectors/API**: `POST /api/seller/products`
**Suggested Layer**: API

---

### TC-307: Updating a product needs no field, but a changed field must stay valid
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Automated
**Script mapping**: Verified: describe block "TC-307: Updating a product needs no field, but a changed field must stay valid" in `e2e-testing/tests/api/seller-products.api.spec.ts`, tests tagged `@TC-307`
**Latest result**: Passed
**Last run**: 2026-10-27
**Run evidence**: Local run, `npx playwright test --project=api` on the whole spec (68 tests, 3 runs in a row, all passed), against a private backend on port 5057 and database `tokomart_sp_test` on the replica set at 27018; no report file kept
**Run baseline**: Branch `update/create-update-product`, uncommitted; backend with the TC-309/TC-310 fixes
**Test File**: `e2e-testing/tests/api/seller-products.api.spec.ts`; unit: `backend/src/validators/__tests__/productInput.test.ts`, `backend/src/controllers/__tests__/sellerProductController.test.ts`, `backend/src/models/__tests__/Product.test.ts`
**Preconditions**: A seller with one valid product (created with all required fields and valid shipping settings)
**Steps**:
1. `PUT /api/seller/products/:id` with only `price` 25; then with only `stock` 0
2. `PUT` with an empty body
3. `PUT` with `name`, `description` and `category` each sent as an empty string, one request each; `name` of only spaces
4. `PUT` with each value rule of TC-306: `price` -1, `stock` -1, `category` "Toys", a 201-character `description`, `discount` 101, `condition` "broken"
5. `PUT` with no image after the product has one
6. `GET /api/seller/products` after each request

**Expected Results**:
- (1) **200**, the changed field is updated and every other field keeps its stored value
- (2) **200** and nothing changes (the stored shipping settings are still valid)
- (3) **400** ``Path `name` is required.`` (and the same for `description` and `category`); an empty string is a value, so unlike creation the controller does not block it, the model does
- (4) **400** with the model message of TC-306
- (5) **200**, the existing `image` and `images` stay
- (6) after every 400 the stored product is unchanged
- Shipping settings on update: see TC-303
**Business Rule**: §2 Product wizard (edit)
**Selectors/API**: `PUT /api/seller/products/:id`
**Suggested Layer**: API

---

### TC-308: Updating a product with an unknown, malformed or someone else's id
**Scenario status**: Active
**Category**: Negative
**Priority**: P2
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Automated
**Script mapping**: Verified: describe block "TC-308: Updating a product with an unknown, malformed or someone else's id" in `e2e-testing/tests/api/seller-products.api.spec.ts`, tests tagged `@TC-308`
**Latest result**: Passed
**Last run**: 2026-10-27
**Run evidence**: Local run, `npx playwright test --project=api` on the whole spec (68 tests, 3 runs in a row, all passed), against a private backend on port 5057 and database `tokomart_sp_test` on the replica set at 27018; no report file kept
**Run baseline**: Branch `update/create-update-product`, uncommitted; backend with the TC-309/TC-310 fixes
**Test File**: `e2e-testing/tests/api/seller-products.api.spec.ts`; unit: `backend/src/validators/__tests__/productInput.test.ts`, `backend/src/controllers/__tests__/sellerProductController.test.ts`, `backend/src/models/__tests__/Product.test.ts`
**Preconditions**: Seller A with a product; seller B authenticated
**Steps**:
1. As A, `PUT /api/seller/products/<unknown but well-formed id>` with a valid body
2. As A, `PUT /api/seller/products/not-an-id`
3. As B, `PUT` A's product with a valid body
4. As B, `PUT` A's product with an invalid body (`price` -1, and a missing shipping setting)

**Expected Results**:
- (1) **404** "Product not found"
- (2) **400** "Invalid resource ID"
- (3) **403** "Not authorized to update this product"; A's product is unchanged
- (4) **403** as in (3): ownership is checked before the field rules, so B learns nothing about validation of A's product. The two checks the controller makes before it looks the product up are the exception: malformed JSON (TC-309) and an empty `price` or `stock` (TC-310) answer 400 whatever the owner
- Ownership of the other routes: TC-054 and TC-285
**Business Rule**: §2 Product ownership
**Selectors/API**: `PUT /api/seller/products/:id`
**Suggested Layer**: API

---

### TC-309: Malformed JSON in a product field returns 400
**Scenario status**: Active
**Category**: Negative
**Priority**: P2
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Automated
**Script mapping**: Verified: describe block "TC-309: Malformed JSON in a product field returns 400" in `e2e-testing/tests/api/seller-products.api.spec.ts`, tests tagged `@TC-309`
**Latest result**: Passed
**Last run**: 2026-10-27
**Run evidence**: Local run, `npx playwright test --project=api` on the whole spec (68 tests, 3 runs in a row, all passed), against a private backend on port 5057 and database `tokomart_sp_test` on the replica set at 27018; no report file kept
**Run baseline**: Branch `update/create-update-product`, uncommitted; backend with the TC-309/TC-310 fixes
**Test File**: `e2e-testing/tests/api/seller-products.api.spec.ts`; unit: `backend/src/validators/__tests__/productInput.test.ts`, `backend/src/controllers/__tests__/sellerProductController.test.ts`, `backend/src/models/__tests__/Product.test.ts`
**Preconditions**: An authenticated seller; for `PUT`, one valid product
**Steps**:
1. `POST /api/seller/products` with `shippingOptions` set to `["standard"` (not valid JSON); then `shippingFeeAmounts` set to `{`; then `variants` set to `[{`; then `variantAttributes` set to `[{`
2. `PUT /api/seller/products/:id` with the same four values, one request each

**Expected Results**:
- **400** `{ success: false, message: "<field> must be valid JSON.", code: "invalid_product_json" }` naming the field, and no product is created or changed
- Blank text for one of these fields counts as not sent: for `POST` a blank `shippingOptions` gives the shipping 400 of TC-303, a blank `variants` creates a product without variants
- Fixed 2026-10-27 (it used to answer **500**: the controller let the `SyntaxError` reach the error handler without a status code). Unit tests: `validators/__tests__/productInput.test.ts`, `controllers/__tests__/sellerProductController.test.ts`
**Business Rule**: §2 Product wizard
**Selectors/API**: `POST /api/seller/products`, `PUT /api/seller/products/:id`
**Suggested Layer**: API

---

### TC-310: Empty strings for number fields are never turned into 0
**Scenario status**: Active
**Category**: Negative
**Priority**: P2
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Automated
**Script mapping**: Verified: describe block "TC-310: Empty strings for number fields are never turned into 0" in `e2e-testing/tests/api/seller-products.api.spec.ts`, tests tagged `@TC-310`
**Latest result**: Passed
**Last run**: 2026-10-27
**Run evidence**: Local run, `npx playwright test --project=api` on the whole spec (68 tests, 3 runs in a row, all passed), against a private backend on port 5057 and database `tokomart_sp_test` on the replica set at 27018; no report file kept
**Run baseline**: Branch `update/create-update-product`, uncommitted; backend with the TC-309/TC-310 fixes
**Test File**: `e2e-testing/tests/api/seller-products.api.spec.ts`; unit: `backend/src/validators/__tests__/productInput.test.ts`, `backend/src/controllers/__tests__/sellerProductController.test.ts`, `backend/src/models/__tests__/Product.test.ts`
**Preconditions**: An authenticated seller; a valid product for the `PUT` steps
**Steps**:
1. `POST /api/seller/products` with `price` sent as an empty string
2. `POST` with `stock` sent as an empty string; and with `discount` sent as an empty string
3. `PUT` a valid product with `price` sent as an empty string
4. `POST` with a `description` of only spaces

**Expected Results**:
- (1) **400** "name, description, price, and category are required": an empty or space-only price counts as missing; no product is created
- (2) an empty `stock` is the default 0 and an empty `discount` means no discount; both **201**
- (3) **400** "price cannot be empty." with `code: invalid_product_number`; the stored price is unchanged. An empty `stock` on update answers the same way. An empty `discount` on update is ignored and the stored discount stays
- (4) **400** ``Path `description` is required.``: the model now trims the description, so spaces alone count as empty
- Fixed 2026-10-27 (an empty price used to create a product at 0 and a space-only description was accepted). Unit tests: `productInput.test.ts`, `sellerProductController.test.ts`, `models/__tests__/Product.test.ts`
**Business Rule**: §2 Product wizard (required fields)
**Selectors/API**: `POST /api/seller/products`, `PUT /api/seller/products/:id`
**Suggested Layer**: API

---

### TC-311: Leading and trailing spaces are trimmed before saving
**Scenario status**: Active
**Category**: Boundary
**Priority**: P2
**Role**: Seller
**Platform**: API
**Parity**: Both
**Automation**: Playwright-API
**Automation status**: Automated
**Script mapping**: Verified: describe block "TC-311: Leading and trailing spaces are trimmed before saving" in `e2e-testing/tests/api/seller-products.api.spec.ts`, tests tagged `@TC-311`
**Latest result**: Passed
**Last run**: 2026-10-27
**Run evidence**: Local run, `npx playwright test --project=api` on the whole spec (73 tests, 3 runs in a row, all passed), against a private backend on port 5057 and database `tokomart_sp_test` on the replica set at 27018; no report file kept
**Run baseline**: Branch `update/create-update-product`, uncommitted; backend with the trim change
**Test File**: `e2e-testing/tests/api/seller-products.api.spec.ts`; unit: `backend/src/models/__tests__/Product.test.ts`
**Preconditions**: An authenticated seller; valid shipping settings on every request
**Steps**:
1. `POST /api/seller/products` with spaces around `name`, `description`, `brand`, `sku` and `tags`, and two spaces inside the name
2. `POST` a variant product with spaces around the variant attribute `name` and `values`, around the keys and values of each variant's `attributes`, and around the variant `sku`
3. `PUT` a product with spaces around `name`, `brand`, `tags`, the variant attributes and the variant `sku`
4. `POST` with a `category` that has a space before it (` Electronics`)
5. `POST` with a delivery option that has spaces around it (`[" standard "]`)

**Expected Results**:
- (1) **201**; the values are saved without the spaces at the start and end, and the spaces inside a value stay (`"Desk  Lamp"` keeps both spaces)
- (2) **201**; `variantAttributes[].name` and `values`, the keys and values of `variants[].attributes`, and `variants[].sku` are saved trimmed
- (3) **200**; the same fields are trimmed, and the stored product shows the trimmed values
- (4) **400** "is not a valid enum value for path `category`": a value that must be one of a list is **not trimmed**, it is rejected
- (5) **400** `invalid_shipping_settings` `Unknown delivery option " standard ". Use standard, express or pickup.`; the same rule applies to `condition` and `shippingFee`
- The trimming is done by the product model (`trim` on the text fields, tags and attribute values, and a validation hook for the attribute keys), so `POST/PUT /api/products` trims the same way
**Business Rule**: §2 Product wizard (text fields)
**Selectors/API**: `POST /api/seller/products`, `PUT /api/seller/products/:id`
**Suggested Layer**: API + Unit

---
