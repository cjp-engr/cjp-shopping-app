# web/seller — Seller Web E2E Tests

Playwright tests for seller-facing flows on the TokoMart web app (`http://localhost:5173`).
All tests run under the `web-seller` Playwright project, which injects pre-authenticated seller storage state from `.auth/seller.json`.

---

## Test Cases

### TC-042, TC-064 — `seller-product-wizard.spec.ts`
**Seller creates products via the 6-step wizard**

Drives the seller dashboard product creation wizard end-to-end. Products are created fresh per run via the wizard UI.

| TC | Product Type | Key steps |
|----|-------------|-----------|
| TC-042 | Simple product | Fill Basic Info → Pricing → Description → Images → Shipping → Review → Publish |
| TC-064 | Variant product | Same wizard but enables the variants toggle in Pricing; adds Size attribute with values S, M, L; fills per-variant price/stock |

**Assertion:** product appears in the seller dashboard list after publish.

---

### TC-054 — `seller-access.spec.ts`
**Seller dashboard only shows the seller's own products**

`beforeAll` uses a raw API context (not the fixture `request`, which is scoped to `:5173`) to promote `b@test.com` to a second seller account and create a product as that seller. The test then verifies seller1's dashboard cannot see or interact with seller2's product.

| Test | Assertion |
|------|-----------|
| Seller1 cannot see seller2's product in dashboard | `product-item-{seller2ProductId}` not visible |
| Seller1 cannot see edit/delete controls for seller2's product | `edit-product-{id}` and `delete-product-{id}` not visible |

**Note:** `beforeAll` uses `pwRequest.newContext({ baseURL: API_URL })` because the `web-seller` fixture `request` points to `:5173` (frontend), not `:5000` (API).

---

## Structure

```
web/seller/
├── NOTES.md                        ← this file
├── seller-product-wizard.spec.ts   ← TC-042, TC-064
└── seller-access.spec.ts           ← TC-054
```

## Key notes

- Tests run under `web-seller` project — seller auth state is pre-loaded from `.auth/seller.json`.
- `seller-access.spec.ts` creates a second seller via API in `beforeAll` using `pwRequest.newContext()` — never use the fixture `request` for API calls in web projects (wrong base URL).
- The wizard is 6 steps on web (vs 7 on mobile — Variants is part of the Pricing step on web).
- Product testids are parameterised by ID: `product-item-{id}`, `edit-product-{id}`, `delete-product-{id}`.
