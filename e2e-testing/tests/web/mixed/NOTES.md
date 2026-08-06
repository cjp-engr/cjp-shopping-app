# web/mixed — Mixed-Role Web E2E Tests

Playwright tests that involve more than one user account or role switching.
All tests run under the `web-mixed` Playwright project, which has **no pre-loaded storage state** — each test manages its own auth via localStorage injection.

---

## Test Cases

### `role-switch.smoke.spec.ts`
**Smoke test — switchRole applies the correct auth state**

Infrastructure-level smoke test that verifies the `switchRole` fixture correctly swaps localStorage between buyer and seller auth states. Not a business-flow test.

| Check | Assertion |
|-------|-----------|
| After `switchRole('buyer')` | Buyer-specific nav element visible |
| After `switchRole('seller')` | Seller-specific nav element visible |

---

### TC-109 — `cart-isolation.spec.ts`
**Buyer2 sees own empty cart in UI — not buyer1's items**

`beforeAll` uses a raw API context to: login as buyer1 (seeded account), add a product to buyer1's server-side cart, then create a fresh buyer2 account via signup.

The test injects buyer2's auth into localStorage via `injectAuth()`, reloads, navigates to `/cart`, and asserts buyer1's cart item is not visible and buyer2's cart is empty.

| Step | Detail |
|------|--------|
| Setup | Buyer1 adds product to cart via API; buyer2 created via `/api/auth/signup` |
| Auth injection | `injectAuth(page, buyer2Token, buyer2UserData)` from `helpers/auth-inject.ts` |
| Navigation | `page.goto('/cart')` after reload |
| Assertions | `cart-empty` visible; `cart-item-{buyer1ProductId}` not visible |

---

### TC-112 — `order-isolation.spec.ts`
**Buyer2 sees only own order history — not buyer1's orders**

`beforeAll` uses a raw API context to: create a seller product, place an order as buyer1, then create a fresh buyer2 account.

The test injects buyer2's auth, navigates to `/orders` via `myOrdersPage.open()`, and asserts buyer1's order card is not visible.

| Step | Detail |
|------|--------|
| Setup | Seller creates product; buyer1 places order via API; buyer2 created via signup |
| Auth injection | `injectAuth(page, buyer2Token, buyer2UserData)` |
| Navigation | `myOrdersPage.open()` → `/orders` |
| Assertions | `order-card-{buyer1OrderId}` not visible |

---

## Structure

```
web/mixed/
├── NOTES.md                    ← this file
├── role-switch.smoke.spec.ts   ← infra smoke
├── cart-isolation.spec.ts      ← TC-109
└── order-isolation.spec.ts     ← TC-112
```

## Key notes

- `web-mixed` project has no `storageState` — tests must manage auth themselves.
- Auth injection uses `injectAuth()` from `helpers/auth-inject.ts` (sets `shopping_app_auth_token`, `shopping_app_user_data`, clears `shopping_app_cart_data`, reloads, waits for `user-menu-btn`).
- All API setup in `beforeAll` uses `pwRequest.newContext({ baseURL: API_URL })` — never the fixture `request` (scoped to `:5173`).
- Buyer2 is always a fresh account created via `/api/auth/signup` to guarantee a clean slate (no cart, no orders).
- POM used: `cartPage` (locators for cart items), `myOrdersPage` (locators for order cards + `open()` / `expectLoaded()`).
