<div align="center">

# Web E2E Tests (Playwright)

Browser-driven end-to-end tests for the TokoMart web frontend.

  <img src="../../../docs/images/toko-mart-playwright-read-me.png" alt="TokoMart-Playwright" width="800" />

</div>

---

## Best Practices

### Structure

- **TC-* ID in the file header.** First comment block must list every TC ID covered by the file.
- **Self-contained.** Each test must be independent — never rely on state left by a previous test in the same file, unless tests are explicitly serialized with `test.describe.configure({ mode: 'serial' })` and share a clear setup contract.
- **No `test.only()` or `test.skip()` in committed files.**
- **Descriptive test names.** The test name should read as a plain-English sentence that describes the outcome, not the steps.
- **Group related tests under `test.describe`.** Map each `describe` block to one or more `TC-*` IDs.

### Auth

- **`buyer/` and `seller/` tests:** auth is injected automatically via `storageState`. Do not call the login UI or `login()` inside these test files — you are already authenticated.
- **`mixed/` tests:** no `storageState` is applied. Use `signupFreshUser()` from `helpers/api-client.ts` for fresh accounts, or `login()` + `injectAuth()` for seeded accounts. Never use the login UI in web tests.
- **Clear server-side cart in `beforeEach`** when tests mutate cart state, to avoid cross-test pollution. Use `clearBuyerCart(request, API_URL)` from `helpers/auth-state.ts`.

### Locators — scope first, then most stable inside the scope

1. **Structural anchor for repeated UI** — scope to a container testid before reaching inside:
   ```ts
   const sellerGroup = page.getByTestId(`cart-seller-group-${sellerId}`);
   const productCard = page.getByTestId(`product-card-${productId}`);
   const orderCard  = page.getByTestId(`order-card-${orderId}`);
   ```
2. **Inside a scope — role + accessible name** (preferred for unique controls):
   ```ts
   sellerGroup.getByRole('button', { name: 'Apply voucher' });
   page.getByRole('button', { name: 'Sign in' });
   page.getByRole('textbox', { name: 'Email' });
   ```
3. **Fallback — element testid** when role/name is missing or ambiguous:
   ```ts
   sellerGroup.getByTestId(`select-voucher-btn-${sellerId}`);
   ```
4. **Scoped stable text** — only when scoped and the copy is stable business language (not a price, ID, or product name):
   ```ts
   paymentSection.getByText('Cash on Delivery');
   ```
5. **Never:** XPath, CSS chains, `nth-child`, unscoped index, `waitForTimeout`, unscoped `getByText` on prices/order IDs/product names.

### Multi-Seller Scoping

Always anchor cart, checkout, and order locators to `cart-seller-group-{sellerId}` before using role or text. An unscoped selector in multi-seller UI is a flakiness risk — it will match the wrong seller's row.

```ts
const sellerGroup = page.getByTestId(`cart-seller-group-${sellerId}`);
await sellerGroup.getByRole('button', { name: 'Apply voucher' }).click();
```

### Fixtures — use POM fixtures from `base-fixture.ts`

Import `test` and `expect` from `fixtures/base-fixture`, not directly from `@playwright/test`, to get the pre-built POM fixtures:

```ts
import { test, expect } from '../../../fixtures/base-fixture';

test('...', async ({ page, productListPage, productDetailPage, cartPage, checkoutPage }) => { ... });
```

### Waits

- **Never use `waitForTimeout`.** Playwright auto-waits on actions and assertions — adding a hard sleep is always wrong.
- Use `expect(locator).toBeVisible()` or `locator.waitFor()` when you need an explicit readiness signal (e.g. after a page transition).
- POM root elements (e.g. `checkoutPage.root`) should be waited on after navigation to confirm the page is ready before interacting.

### Assertions — domain rules

- **Order totals:** use the persisted `order.total`, not a sum of raw line prices.
- **Payment label:** assert `"Cash on Delivery"` (the display label), not `"cash-on-delivery"` (the slug).
- **Per-seller breakdown:** on multi-seller checkout, tax and shipping lines must appear separately per seller.
- **Shipping cost:** assert `Free` when the seller set free shipping, or the configured fee amount when buyer pays. Never assert a flat `$9.99` or a free-over-`$50` threshold — that feature has been removed.
- **Sale items:** assert the discounted price AND the strikethrough original price.
- **Status codes and messages:** for API-backed assertions, check `backend/NOTES.md` for the exact error string from the source.

### `mixed/` tests — additional rules

- Use `signupFreshUser()` for accounts that must start with no prior state (empty cart, no orders).
- Inject auth with `injectAuth(page, token, userData)` from `helpers/auth-inject.ts` rather than navigating through the login UI.
- `beforeAll` creates the accounts; `beforeEach` resets any mutable server-side state (cart, etc.) if tests are serialized.
- **Product seeds** must include `shippingOptions` and `shippingFee` — the backend rejects creation without them. Use `randomShippingMultipart()` from `helpers/test-data.ts` for multipart requests and `randomShipping()` for JSON-body requests.
- **Seller catalog exclusion:** the Products page (`/products`) filters out the logged-in seller's own listings server-side. Tests verifying buyer catalog visibility must run under a buyer session, not the seller's own.

---

## Test Coverage

| File | TC IDs | Description |
|------|--------|-------------|
| `buyer/login.spec.ts` | TC-001 | Buyer login, authenticated navbar |
| `buyer/product-browse.spec.ts` | TC-010, TC-011 | Search by keyword, filter by category |
| `buyer/product-detail.spec.ts` | TC-012, TC-013, TC-014 | Sale price display, variant selection, add-to-cart guard |
| `buyer/checkout.spec.ts` | TC-022, TC-023, TC-024 | Checkout COD, saved card, new card |
| `buyer/variant-checkout.spec.ts` | TC-098, TC-105, TC-106 | Checkout with variant product across payment methods |
| `seller/seller-product-wizard.spec.ts` | TC-042, TC-064 | Seller creates simple and variant products via wizard |
| `seller/seller-simple-product-crud.spec.ts` | TC-042, TC-044, TC-045, TC-046, TC-122 | Simple product CRUD: create, edit, preview, delete, My Products list |
| `seller/seller-variant-product-crud.spec.ts` | TC-120, TC-121, TC-046 | Variant product edit, buyer preview, delete |
| `seller/seller-access.spec.ts` | TC-054 | Seller dashboard shows only own products |
| `mixed/cart-isolation.spec.ts` | TC-109 | Buyer2 sees own empty cart, not buyer1's items |
| `mixed/order-isolation.spec.ts` | TC-112 | Buyer2 sees only own order history, not buyer1's orders |
| `mixed/product-catalog-visibility.spec.ts` | TC-008, TC-065 | Guest browse, seller listing visible to buyer in catalog |
| `mixed/role-switch.smoke.spec.ts` | — | Auth state switching smoke test |

---

| Folder | Project | Auth |
|--------|---------|------|
| `buyer/` | `web-buyer` | `storageState` from `buyer.setup.ts` |
| `seller/` | `web-seller` | `storageState` from `seller.setup.ts` |
| `mixed/` | `web-mixed` | No `storageState` — tests manage auth themselves |