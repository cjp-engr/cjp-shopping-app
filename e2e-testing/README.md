# TokoMart E2E Testing (Playwright)

Web UI and API tests for TokoMart in one Playwright project.

| Folder | Type | Pattern |
|--------|------|---------|
| `tests/web/` | Browser E2E | `*.spec.ts` |
| `tests/api/` | HTTP API | `*.api.spec.ts` |

Mobile tests remain in `frontend-mobile/patrol_test/` (Patrol).

## Prerequisites

```bash
cd backend && npm run seed && npm run dev   # :5000
cd frontend && npm run dev                  # :5173 (web tests only)
```

## Setup

```bash
cd e2e-testing
cp .env.dev.example .env.dev   # seller + buyer credentials for local runs
npm install
npx playwright install chromium
```

## Run

```bash
npm test              # all
npm run test:api      # API only (backend required)
npm run test:web      # web UI (backend + frontend required)
npm run test:ui       # interactive UI mode
npm run report        # open HTML report
```

## QA pipeline

```
/create-scenarios → /test-strategy → /generate-tests → /review-tests
```

| Stage | Output |
|-------|--------|
| create-scenarios | `docs/test-cases/test-scenarios*.md` |
| test-strategy | `docs/test-strategies/test-strategy*.md` |

Generated tests land here; map each file to `TC-*` IDs in comments.

## Test coverage

### API (`tests/api/`)

| File | TC IDs | Description |
|------|--------|-------------|
| `auth.api.spec.ts` | — | Login, GET /me, invalid credentials |
| `health.api.spec.ts` | — | API server health smoke |
| `orders.api.spec.ts` | TC-025, TC-026, TC-027, TC-028, TC-033, TC-056 | Order totals, shipping rules, multi-seller split, cancel guard, stock validation |
| `seller-access.api.spec.ts` | TC-048, TC-053, TC-054 | Buyer blocked from seller routes, cross-seller edit/delete blocked, invalid status transition |
| `reviews.api.spec.ts` | TC-035, TC-036 | Duplicate review blocked, review before delivery blocked |
| `coupons.api.spec.ts` | TC-057 | Coupon below minimum order amount |
| `cart.api.spec.ts` | TC-107, TC-108 | Cart returns buyer's own items, cart isolation between buyers |
| `order-isolation.api.spec.ts` | TC-110, TC-111 | Order list isolation, order detail ownership (403) |

### Web E2E (`tests/web/`)

| File | TC IDs | Description |
|------|--------|-------------|
| `buyer/login.spec.ts` | TC-001 | Buyer login, authenticated navbar |
| `buyer/checkout.spec.ts` | TC-022, TC-023, TC-024 | Checkout COD, saved card, new card |
| `buyer/variant-checkout.spec.ts` | TC-098, TC-105, TC-106 | Checkout with variant product across payment methods |
| `seller/seller-product-wizard.spec.ts` | TC-042, TC-064 | Seller creates simple and variant products |
| `seller/seller-access.spec.ts` | TC-054 | Seller dashboard shows only own products |
| `mixed/cart-isolation.spec.ts` | TC-109 | Buyer2 sees own empty cart, not buyer1's items |
| `mixed/order-isolation.spec.ts` | TC-112 | Buyer2 sees only own order history, not buyer1's orders |
| `mixed/role-switch.smoke.spec.ts` | — | Auth state switching smoke test |
