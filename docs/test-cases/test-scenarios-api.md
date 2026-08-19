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
**Business Rule**: §5 Buyer cancel — pending/preparing only  
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
