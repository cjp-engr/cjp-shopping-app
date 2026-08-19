# web/seller — Seller Web E2E Tests

Playwright tests for seller-facing flows on the TokoMart web app (`http://localhost:5173`).
All tests run under the `web-seller` Playwright project, which injects pre-authenticated seller storage state from `.auth/seller.json`.

---

## Test Cases

### TC-042, TC-064 — `seller-product-wizard.spec.ts`
**Seller creates products via the 7-step wizard**

Drives the seller dashboard product creation wizard end-to-end. Products are created fresh per run via the wizard UI.

| TC | Product Type | Key steps |
|----|-------------|-----------|
| TC-042 | Simple product | Fill Basic Info → Pricing → Description → Images → Shipping (required) → Review → Publish |
| TC-064 | Variant product | Same wizard but enables the variants toggle in Pricing; adds Size attribute with values S, M, L; fills per-variant price/stock; Shipping step is required |

**Assertion:** product appears in the seller dashboard list after publish.

---

### TC-042, TC-044, TC-045, TC-046, TC-122 — `seller-simple-product-crud.spec.ts`
**Simple product full CRUD via seller dashboard**

| TC | Test | Key steps |
|----|------|-----------|
| TC-042 | Create simple product | Wizard UI — name, price, stock, description, image, required shipping fee |
| TC-044 | Edit simple product | Edit wizard → update price and stock → assert changes on detail page |
| TC-045 | Preview simple product as buyer | My Products → product card → buyer preview → assert detail page |
| TC-046 | Delete simple product | Dashboard delete → confirm dialog → assert removed from list |
| TC-122 | My Products list shows own product | Assert product card visible in list after creation |

---

### TC-120, TC-121, TC-046 — `seller-variant-product-crud.spec.ts`
**Variant product CRUD via seller dashboard**

Product is seeded via API in `beforeAll` with `shippingOptions` and `shippingFee` — required fields.

| TC | Test | Key steps |
|----|------|-----------|
| TC-121 | Preview variant product as buyer | My Products → product card → buyer preview → assert variant selectors and price/stock update |
| TC-120 | Edit variant product | Edit wizard → update Size M price, Size L stock, add XL → assert changes on detail page |
| TC-046 | Delete variant product | Dashboard delete → confirm dialog → assert removed from list |

---

### TC-054 — `seller-access.spec.ts`
**Seller dashboard only shows the seller's own products**

`beforeAll` uses a raw API context (not the fixture `request`, which is scoped to `:5173`) to promote `b@test.com` to a second seller account and create a product as that seller using `randomShippingMultipart()`. The test then verifies seller1's dashboard cannot see or interact with seller2's product.

| Test | Assertion |
|------|-----------|
| Seller1 cannot see seller2's product in dashboard | `product-item-{seller2ProductId}` not visible |
| Seller1 cannot see edit/delete controls for seller2's product | `edit-product-{id}` and `delete-product-{id}` not visible |

**Note:** `beforeAll` uses `pwRequest.newContext({ baseURL: API_URL })` because the `web-seller` fixture `request` points to `:5173` (frontend), not `:5000` (API).

---

## Structure

```
web/seller/
├── NOTES.md                              ← this file
├── seller-product-wizard.spec.ts         ← TC-042, TC-064
├── seller-simple-product-crud.spec.ts    ← TC-042, TC-044, TC-045, TC-046, TC-122
├── seller-variant-product-crud.spec.ts   ← TC-120, TC-121, TC-046
└── seller-access.spec.ts                 ← TC-054
```

## Key notes

- Tests run under `web-seller` project — seller auth state is pre-loaded from `.auth/seller.json`.
- `seller-access.spec.ts` and `seller-variant-product-crud.spec.ts` create products via API in `beforeAll` using `pwRequest.newContext()` and `randomShippingMultipart()` — never use the fixture `request` for API calls in web projects (wrong base URL).
- The wizard is 7 steps on web: Basic Info → Pricing → Description → Variants → Images → Shipping → Review. Shipping fee is required — the wizard blocks publish until a fee mode is selected.
- Product testids are parameterised by ID: `product-item-{id}`, `edit-product-{id}`, `delete-product-{id}`.
