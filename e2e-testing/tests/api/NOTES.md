# api — API Tests

Playwright `request`-fixture tests that hit the backend directly at `http://localhost:5000`.
No browser or frontend needed — only the backend and MongoDB must be running.

All files follow the `*.api.spec.ts` naming convention and use `helpers/api-client.ts` for auth.

---

## Test Files

### `health.api.spec.ts`
**API server health smoke**

| Endpoint | Assertion |
|----------|-----------|
| `GET /health` | 200 OK |
| `GET /` | 200 OK |

No TC ID — pure infrastructure smoke. Run this first to confirm the backend is up.

---

### `auth.api.spec.ts`
**Authentication API smoke**

| Test | Endpoint | Assertion |
|------|----------|-----------|
| Login returns token | `POST /api/auth/login` | 200; response contains `token` |
| Invalid password rejected | `POST /api/auth/login` | 401 |
| GET /me requires auth | `GET /api/auth/me` | 401 without token |
| GET /me with valid token | `GET /api/auth/me` | 200; returns user object |

No TC ID — auth baseline smoke.

---

### `orders.api.spec.ts`
**Order creation, pricing rules, and cancel guard**

| TC | Test | Endpoint | Assertion |
|----|------|----------|-----------|
| TC-026 | Order total formula | `POST /api/orders` | `tax = subtotal × 0.08`; `total = afterDiscounts + tax + shipping` |
| TC-027 | Shipping $9.99 when subtotal < $50 | `POST /api/orders` | `shipping === 9.99` |
| TC-028 | Free shipping when subtotal ≥ $50 | `POST /api/orders` | `shipping === 0` |
| TC-056 | Insufficient stock → 400 | `POST /api/orders` | 400; message matches `/insufficient stock/i` |
| TC-033 | Buyer cannot cancel processing order | `PUT /api/orders/:id/status` | 400 after seller advances to `processing` |
| TC-025 | Multi-seller checkout → 2 orders | `POST /api/orders` | Response `orders` array has length 2 |

**Setup:** seller creates two products (cheap $20, expensive $99) in `beforeAll`. TC-025 uses a second seller account promoted via `PUT /api/auth/profile`.

---

### `seller-access.api.spec.ts`
**Role enforcement and ownership rules**

| TC | Test | Endpoint | Assertion |
|----|------|----------|-----------|
| TC-053 | Buyer blocked from seller routes | `PUT /api/seller/orders/:id/status` | 403 with buyer token |
| TC-054 | Seller cannot edit another seller's product | `PUT /api/products/:id` | 403 with seller1 token on seller2 product |
| TC-054 | Seller cannot delete another seller's product | `DELETE /api/products/:id` | 403 + message matches `/not authorized/i` |
| TC-048 | Invalid status transition (pending → shipped) | `PUT /api/seller/orders/:id/status` | 400 + message matches transition error |

**Setup:** `beforeAll` creates a fresh buyer account, a seller1 product, and a seller2 product (buyer2 account promoted to seller). Ensures all ownership assertions are against freshly created, known data.

---

### `reviews.api.spec.ts`
**Review submission rules**

| TC | Test | Endpoint | Assertion |
|----|------|----------|-----------|
| TC-036 | Review before delivery blocked | `POST /api/reviews` | 403 |
| TC-035 | Duplicate review blocked | `POST /api/reviews` | 409 |

**Setup:** seller creates a product; buyer places an order. TC-035 advances the order to `delivered` and posts the first review successfully before attempting the duplicate.

---

### `coupons.api.spec.ts`
**Coupon validation rules**

| TC | Test | Endpoint | Assertion |
|----|------|----------|-----------|
| TC-057 | Coupon below minimum order amount | `POST /api/coupons/validate` | 400 |

**Setup:** seller creates a coupon with a minimum order amount; buyer attempts to validate it with a cart total below the threshold.

---

### `cart.api.spec.ts`
**Cart isolation and auth guard**

| TC | Test | Endpoint | Assertion |
|----|------|----------|-----------|
| TC-107 | Cart returns buyer's own items | `GET /api/cart` | 200; returned product IDs contain buyer1's product |
| TC-108 | Buyer2 cannot see buyer1's cart | `GET /api/cart` | 200; returned product IDs do NOT contain buyer1's product |
| — | Unauthenticated cart request | `GET /api/cart` | 401 |

**Setup:** buyer1 (seeded account) clears and syncs cart with one product via API. Buyer2 is a fresh account created via `/api/auth/signup`.

---

### `order-isolation.api.spec.ts`
**Order ownership isolation**

| TC | Test | Endpoint | Assertion |
|----|------|----------|-----------|
| TC-110 | Order list isolation — buyer2 cannot see buyer1's orders | `GET /api/orders` | 200; order IDs do NOT contain buyer1's order |
| TC-111 | Order detail isolation — buyer2 gets 403 on buyer1's order | `GET /api/orders/:id` | 403 |

**Setup:** seller creates a product; buyer1 places an order. Buyer2 is a fresh account with no orders. Both tokens are used independently to assert server-side `userId` scoping.

---

## Structure

```
tests/api/
├── NOTES.md                        ← this file
├── health.api.spec.ts              ← server smoke
├── auth.api.spec.ts                ← auth smoke
├── orders.api.spec.ts              ← TC-025, TC-026, TC-027, TC-028, TC-033, TC-056
├── seller-access.api.spec.ts       ← TC-048, TC-053, TC-054
├── reviews.api.spec.ts             ← TC-035, TC-036
├── coupons.api.spec.ts             ← TC-057
├── cart.api.spec.ts                ← TC-107, TC-108
└── order-isolation.api.spec.ts     ← TC-110, TC-111
```

## Key notes

- All tests use the `request` fixture — no `page` or browser needed.
- Auth is handled via `login()` and `authHeaders()` from `helpers/api-client.ts`.
- Fresh accounts are created in `beforeAll` via `/api/auth/signup` to avoid dependency on shared seeded state changing between runs.
- Seller products are created via `multipart` (multer route) using a placeholder image URL.
- Run with: `cd e2e-testing && npm run test:api`
