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
**Preconditions**: None  
**Steps**:
1. `POST /api/auth/signup` with a 3-character password (`abc`)
**Expected Results**:
- Response 400; `success: false`
**Business Rule**: Password must meet minimum length requirement  
**Selectors/API**: `POST /api/auth/signup`  
**Suggested Layer**: API

---
