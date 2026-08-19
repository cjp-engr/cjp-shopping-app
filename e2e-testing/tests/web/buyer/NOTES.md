# web/buyer — Buyer Web E2E Tests

Playwright tests for buyer-facing flows on the TokoMart web app (`http://localhost:5173`).
All tests run under the `web-buyer` Playwright project, which injects pre-authenticated buyer storage state from `.auth/buyer.json`.

---

## Test Cases

### TC-001 — `login.spec.ts`
**Buyer can log in and see the authenticated navbar**

Navigates to `/login`, fills credentials, submits the form, and asserts the authenticated navbar is visible. Covers the S1 smoke baseline for web login.

| Assertion | Element |
|-----------|---------|
| Navbar visible after login | `navbar` testid |

---

### TC-022, TC-023, TC-024 — `checkout.spec.ts`
**Buyer checkout across all three payment methods (simple product)**

Each test sets up state via API in `beforeAll` (gets buyer token, clears cart, creates a seller product), then drives the UI through the full checkout flow.

| TC | Payment Method | Key steps |
|----|---------------|-----------|
| TC-022 | Cash on Delivery | Select COD option → place order → assert order confirmation |
| TC-023 | Saved credit card | Select credit card (saved card pre-selected) → place order |
| TC-024 | New card entry | Select credit card → switch to new card tab → fill card number + holder → place order |

**Shared setup:** `clearBuyerCart()` + `getBuyerToken()` from `helpers/auth-state.ts`. Shipping address from `helpers/test-data.ts`.

---

### TC-098, TC-105, TC-106 — `variant-checkout.spec.ts`
**Buyer checkout with a variant product across all three payment methods**

Same structure as `checkout.spec.ts` but the product has size variants. The test selects Size M before adding to cart.

| TC | Payment Method |
|----|---------------|
| TC-098 | Cash on Delivery |
| TC-105 | New card entry |
| TC-106 | Saved credit card |

**Shared setup:** `clearBuyerCart()`, `getBuyerToken()`, `loginSeller()` from `helpers/auth-state.ts`. Order total asserted via `fetchOrder()` from `helpers/product-assertions.ts`.

---

## Structure

```
web/buyer/
├── NOTES.md                    ← this file
├── login.spec.ts               ← TC-001
├── checkout.spec.ts            ← TC-022, TC-023, TC-024
└── variant-checkout.spec.ts   ← TC-098, TC-105, TC-106
```

## Key notes

- Tests run under `web-buyer` project — buyer auth state is pre-loaded; no UI login needed except `login.spec.ts`.
- Cart is cleared via API before each checkout test to guarantee a clean state.
- Products are created fresh in `beforeAll` via the seller API to avoid dependency on seeded catalog. All product creation calls must include `shippingOptions` and `shippingFee` (use `randomShipping()` or `randomShippingMultipart()` from `helpers/test-data.ts`).
- Saved card tests require the buyer account to have a card on file (seeded via `npm run seed`).
- New card tab is conditionally tapped — only appears when the buyer already has saved cards.
