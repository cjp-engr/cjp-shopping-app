# Seller Simple Product CRUD Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move TC-042 into a new seller CRUD spec and add TC-122, TC-045, TC-044, TC-046 — covering the full read/update/delete lifecycle of a simple product on the web seller dashboard.

**Architecture:** One new spec file (`seller-simple-product-crud.spec.ts`) owns all five TCs inside a `test.describe.serial()` block. TC-042 creates the product via wizard and stores the `productId` in a shared closure variable. TC-122, TC-045, and TC-044 reuse that `productId`. TC-046 deletes it via UI as the final step. An `afterAll` fires an API delete as a safety net in case TC-046 is skipped due to an earlier failure — guaranteeing a clean database after every run. POM stubs (`ListProductsSection`, `DeleteProductSection`) are filled before the spec is written.

**Tech Stack:** Playwright (TypeScript), `e2e-testing/` package, `web-seller` project (pre-loaded seller auth state from `.auth/seller.json`).

## Global Constraints

- All tests run under the `web-seller` Playwright project — seller auth injected via storageState, never via UI login.
- For raw API calls inside `beforeAll`, use `pwRequest.newContext({ baseURL: API_URL })` then dispose. Never use the fixture `request` context for API calls in web projects (it points to `:5173`).
- Seller token for `beforeAll` comes from `getSellerToken()` in `helpers/auth-state.ts` (reads `.auth/seller.json` — no network call needed).
- Locators must follow the hybrid priority: scope → `getByTestId` → `getByRole` → scoped text. No XPath, no `waitForTimeout`.
- Every test must be self-contained: navigate to `/` or the target page at the start.
- Tags: each test must carry its TC tag, `@seller`, and a feature tag.
- Run command for this suite: `cd e2e-testing && npx playwright test tests/web/seller/seller-simple-product-crud.spec.ts --project=web-seller --reporter=line`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `e2e-testing/helpers/auth-state.ts` | Modify | Fix broken `PASSWORD` import → `TEST_PASSWORD` |
| `e2e-testing/tests/web/seller/seller-access.spec.ts` | Modify | Fix broken `PASSWORD` import → `TEST_PASSWORD` |
| `e2e-testing/pages/seller-dashboard/pages/my-products/list-products/sections/01-list-products.section.ts` | Modify | Fill real locators: `productCard()`, `editButton()`, `deleteButton()`, `expectProductVisible()`, `expectProductNotVisible()` |
| `e2e-testing/pages/seller-dashboard/pages/my-products/list-products/sections/02-delete-product.section.ts` | Modify | Fill confirm dialog locator and `confirm()` method |
| `e2e-testing/pages/seller-dashboard/pages/my-products/list-products/list-products.page.ts` | Modify | Add `goto()` and `expectLoaded()` |
| `e2e-testing/pages/seller-dashboard/seller-dashboard.page.ts` | Modify | Add `navigateToMyProducts()` |
| `e2e-testing/pages/seller-dashboard/components/product-wizard/product-wizard.page.ts` | Modify | Add `editSimpleProductPricing(price, stock)` |
| `e2e-testing/tests/web/seller/seller-simple-product-crud.spec.ts` | Create | TC-042, TC-122, TC-045, TC-044, TC-046 |
| `e2e-testing/tests/web/seller/seller-product-wizard.spec.ts` | Modify | Remove TC-042 block; keep TC-064 only |
| `e2e-testing/tests/web/seller/NOTES.md` | Modify | Update file map and TC coverage table |

---

### Task 1: Fix broken imports + fill POM stubs + add POM methods

**Files:**
- Modify: `e2e-testing/helpers/auth-state.ts`
- Modify: `e2e-testing/tests/web/seller/seller-access.spec.ts`
- Modify: `e2e-testing/pages/seller-dashboard/pages/my-products/list-products/sections/01-list-products.section.ts`
- Modify: `e2e-testing/pages/seller-dashboard/pages/my-products/list-products/sections/02-delete-product.section.ts`
- Modify: `e2e-testing/pages/seller-dashboard/pages/my-products/list-products/list-products.page.ts`
- Modify: `e2e-testing/pages/seller-dashboard/seller-dashboard.page.ts`
- Modify: `e2e-testing/pages/seller-dashboard/components/product-wizard/product-wizard.page.ts`

**Interfaces:**
- Produces: `ListProductsSection.productCard(id)`, `editButton(id)`, `deleteButton(id)`, `expectProductVisible(id)`, `expectProductNotVisible(id)`
- Produces: `DeleteProductSection.confirm()`
- Produces: `ListProductsPage.goto()`, `ListProductsPage.expectLoaded()`
- Produces: `SellerDashboardPage.navigateToMyProducts()`
- Produces: `ProductWizardPage.editSimpleProductPricing(price, stock)`

- [ ] **Step 1: Fix `auth-state.ts` — replace broken `PASSWORD` import**

Open `e2e-testing/helpers/auth-state.ts`. Line 6 imports `PASSWORD` which no longer exists in `api-client.ts` (user renamed it to `TEST_PASSWORD`). Fix the import and the usage inside `loginSeller()`:

```ts
import { authHeaders, TEST_PASSWORD, SELLER_EMAIL } from './api-client';
```

And update the usage in `loginSeller()`:
```ts
data: { email: SELLER_EMAIL, password: TEST_PASSWORD },
```

- [ ] **Step 2: Fix `seller-access.spec.ts` — replace broken `PASSWORD` import**

Open `e2e-testing/tests/web/seller/seller-access.spec.ts`. Line 5 imports `PASSWORD`. Change to:

```ts
import { login, authHeaders, BUYER_EMAIL, TEST_PASSWORD } from '../../../helpers/api-client';
```

And update the usage on line 16:
```ts
const seller2Token = await login(ctx, BUYER_EMAIL, TEST_PASSWORD);
```

- [ ] **Step 3: Verify the existing seller tests still compile and pass**

```bash
cd e2e-testing && npx playwright test tests/web/seller/ --project=web-seller --reporter=line
```

Expected: TC-042, TC-064, TC-054 all pass (or are green before your changes). If they fail, fix before continuing.

- [ ] **Step 4: Fill `ListProductsSection` with real locators**

Replace the entire content of `e2e-testing/pages/seller-dashboard/pages/my-products/list-products/sections/01-list-products.section.ts`:

```ts
import { expect, Locator, Page } from '@playwright/test';

export class ListProductsSection {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  productCard(id: string): Locator {
    return this.page.getByTestId(`product-card-${id}`);
  }

  editButton(id: string): Locator {
    return this.page.getByTestId(`edit-product-${id}`);
  }

  deleteButton(id: string): Locator {
    return this.page.getByTestId(`delete-product-${id}`);
  }

  async expectProductVisible(id: string): Promise<void> {
    await expect(this.productCard(id)).toBeVisible();
  }

  async expectProductNotVisible(id: string): Promise<void> {
    await expect(this.productCard(id)).not.toBeVisible();
  }
}
```

**Note:** `edit-product-{id}` and `delete-product-{id}` are on the **seller dashboard** (`SellerDashboard.tsx` lines 407/415). `product-card-{id}` is on the **My Products** page (`ProductCard.tsx` line 48). `ListProductsSection` is used by both flows.

- [ ] **Step 5: Fill `DeleteProductSection` with confirm dialog locator**

Replace the entire content of `e2e-testing/pages/seller-dashboard/pages/my-products/list-products/sections/02-delete-product.section.ts`:

```ts
import { Locator, Page } from '@playwright/test';

export class DeleteProductSection {
  readonly page: Page;
  /** "Delete Product" button inside the ConfirmDialog — located by its accessible label. */
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.confirmButton = page.getByRole('button', { name: 'Delete Product' });
  }

  async confirm(): Promise<void> {
    await this.confirmButton.waitFor({ state: 'visible', timeout: 5_000 });
    await this.confirmButton.click();
    await this.confirmButton.waitFor({ state: 'hidden', timeout: 10_000 });
  }
}
```

**Why role+name:** `ConfirmDialog.tsx` renders no `data-testid` on its buttons. The confirm button text is set via `confirmLabel="Delete Product"` in `SellerDashboard.tsx` line 859. `getByRole('button', { name: 'Delete Product' })` is the stable, accessible locator.

- [ ] **Step 6: Add `goto()` and `expectLoaded()` to `ListProductsPage`**

Replace the entire content of `e2e-testing/pages/seller-dashboard/pages/my-products/list-products/list-products.page.ts`:

```ts
import { expect, Page } from '@playwright/test';

import { ListProductsSection } from './sections/01-list-products.section';
import { DeleteProductSection } from './sections/02-delete-product.section';

export class ListProductsPage {
  readonly page: Page;
  readonly listProductsSection: ListProductsSection;
  readonly deleteProductSection: DeleteProductSection;

  constructor(page: Page) {
    this.page = page;
    this.listProductsSection = new ListProductsSection(page);
    this.deleteProductSection = new DeleteProductSection(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/my-products');
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page.getByTestId('my-products-page')).toBeVisible({ timeout: 10_000 });
  }
}
```

- [ ] **Step 7: Add `navigateToMyProducts()` to `SellerDashboardPage`**

Open `e2e-testing/pages/seller-dashboard/seller-dashboard.page.ts`. Add the nav link locator in the constructor and a navigation method:

```ts
import { expect, Locator, Page } from '@playwright/test';

import { ProductWizardPage } from './components/product-wizard/product-wizard.page';

export class SellerDashboardPage {
  readonly page: Page;
  readonly root: Locator;
  readonly addProductButton: Locator;
  readonly myProductsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('seller-dashboard');
    this.addProductButton = page.getByTestId('add-product-btn');
    this.myProductsLink = page.getByTestId('nav-link-my-products');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.root).toBeVisible({ timeout: 10_000 });
  }

  async openCreateProductWizard(): Promise<ProductWizardPage> {
    await this.addProductButton.click();
    return new ProductWizardPage(this.page);
  }

  async navigateToMyProducts(): Promise<void> {
    await this.myProductsLink.click();
    await expect(this.page.getByTestId('my-products-page')).toBeVisible({ timeout: 10_000 });
  }

  getProductCard(name: string): Locator {
    return this.page
      .locator('[data-testid^="product-item-"]')
      .filter({ hasText: name });
  }

  async getProductIdFromCard(name: string): Promise<string> {
    const card = this.getProductCard(name);
    await expect(card).toBeVisible();
    const testId = await card.getAttribute('data-testid');
    const productId = testId?.replace('product-item-', '');
    if (!productId) {
      throw new Error(`Could not resolve product id from card: ${name}`);
    }
    return productId;
  }
}
```

- [ ] **Step 8: Add `editSimpleProductPricing()` to `ProductWizardPage`**

Open `e2e-testing/pages/seller-dashboard/components/product-wizard/product-wizard.page.ts`. Add the new method at the end of the class (before the closing `}`):

```ts
/**
 * For edit mode: navigates through all wizard steps updating only price and stock
 * on step 2 (Pricing). All other steps are passed through unchanged.
 * Caller must have already clicked edit-product-{id} to open the wizard.
 */
async editSimpleProductPricing(price: string, stock: string): Promise<void> {
  // Step 1 (Basic Info) — skip, click Next
  await this.basicInfo.continue();
  // Step 2 (Pricing) — update price and stock
  await this.pricing.priceInput.fill(price);
  await this.pricing.stockInput.fill(stock);
  await this.pricing.continue();
  // Step 3 (Description) — skip
  await this.description.continue();
  // Step 4 (Images) — skip
  await this.images.continue();
  // Step 5 (Shipping) — skip
  await this.shipping.acceptDefaultAndContinue();
  // Step 6 (Review) — save changes
  await this.publish();
}
```

- [ ] **Step 9: Commit**

```bash
git add \
  e2e-testing/helpers/auth-state.ts \
  e2e-testing/tests/web/seller/seller-access.spec.ts \
  e2e-testing/pages/seller-dashboard/pages/my-products/list-products/sections/01-list-products.section.ts \
  e2e-testing/pages/seller-dashboard/pages/my-products/list-products/sections/02-delete-product.section.ts \
  e2e-testing/pages/seller-dashboard/pages/my-products/list-products/list-products.page.ts \
  e2e-testing/pages/seller-dashboard/seller-dashboard.page.ts \
  e2e-testing/pages/seller-dashboard/components/product-wizard/product-wizard.page.ts
git commit -m "refactor(pom): fill list/delete product stubs; fix PASSWORD import; add edit wizard method"
```

---

### Task 2: Create spec — serial CRUD chain TC-042 → TC-122 → TC-045 → TC-044 → TC-046

**Files:**
- Create: `e2e-testing/tests/web/seller/seller-simple-product-crud.spec.ts`

**Interfaces:**
- Consumes: `ListProductsPage.goto()`, `ListProductsPage.expectLoaded()`, `ListProductsSection.productCard()`, `ListProductsSection.expectProductVisible()`, `SellerDashboardPage.navigateToMyProducts()` (from Task 1)
- Consumes: `ProductWizardPage`, `SellerDashboardPage`, `ProductDetailPage` from existing POMs
- Consumes: `getSellerToken()`, `authHeaders` for `afterAll` safety-net delete
- Produces: `seller-simple-product-crud.spec.ts` — all 5 TCs in serial order

- [ ] **Step 1: Create the spec file with imports and shared closure variable**

Create `e2e-testing/tests/web/seller/seller-simple-product-crud.spec.ts`:

```ts
// TC-042: Seller creates simple product via wizard
// TC-122: Seller views My Products list
// TC-045: Seller previews simple product as buyer via My Products
// TC-044: Seller edits simple product price and stock
// TC-046: Seller deletes simple product from dashboard

import { request as pwRequest } from '@playwright/test';

import { test, expect } from '../../../fixtures/base-fixture';
import { getSellerToken } from '../../../helpers/auth-state';
import { authHeaders } from '../../../helpers/api-client';
import { ProductWizardPage } from '../../../pages/seller-dashboard/components/product-wizard/product-wizard.page';
import { ListProductsPage } from '../../../pages/seller-dashboard/pages/my-products/list-products/list-products.page';
import { API_URL, BUYER_PAYS_SHIPPING } from '../../../helpers/test-data';

const PRODUCT_NAME = `E2E Simple Lamp ${Date.now()}`;
const PRODUCT_IMAGE_URL =
  'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400';
const PRODUCT_DESCRIPTION =
  'A beautiful E2E test lamp for home decor. Energy efficient and modern design.';
const PRODUCT_TAGS = ['lamp', 'home-decor', 'lighting'];
```

- [ ] **Step 2: Open the serial describe block with shared state and `afterAll` cleanup**

Append to the spec file:

```ts
test.describe.serial('Seller simple product CRUD', () => {
  // productId is set by TC-042 and reused by all subsequent tests.
  let productId: string;

  // Safety net: deletes the product via API if TC-046 was skipped due to an
  // earlier failure. If TC-046 already deleted it, the 404 is silently ignored.
  test.afterAll(async () => {
    if (!productId) return;
    const ctx = await pwRequest.newContext({ baseURL: API_URL });
    try {
      await ctx.delete(`/api/products/${productId}`, {
        headers: authHeaders(getSellerToken()),
      });
    } catch {
      // product already deleted by TC-046 or never created — nothing to clean up
    } finally {
      await ctx.dispose();
    }
  });
```

- [ ] **Step 3: Add TC-042 (create via wizard — sets `productId`)**

Append inside the describe block:

```ts
  test(
    'TC-042: seller creates simple product via wizard and verifies dashboard + detail page',
    { tag: ['@TC-042', '@seller', '@product-create', '@simple', '@smoke'] },
    async ({ page, homePage, sellerDashboardPage, productDetailPage }) => {
      await page.goto('/');
      await expect(page.getByTestId('navbar')).toBeVisible();
      await homePage.navigateToSellerDashboard();
      await sellerDashboardPage.expectLoaded();

      const wizard = await sellerDashboardPage.openCreateProductWizard();
      await expect(wizard.root).toBeVisible();

      await wizard.createSimpleProduct({
        name: PRODUCT_NAME,
        category: 'Electronics',
        brand: 'Test Brand',
        price: '29.99',
        stock: '10',
        sku: 'SKU-001',
        discount: '10',
        description: PRODUCT_DESCRIPTION,
        tags: PRODUCT_TAGS,
        imageUrl: PRODUCT_IMAGE_URL,
        shipping: BUYER_PAYS_SHIPPING,
      });

      await expect(wizard.root).not.toBeVisible();
      await expect(wizard.errorAlert).not.toBeVisible().catch(() => {});

      // Capture productId from dashboard card — used by all subsequent tests
      productId = await sellerDashboardPage.getProductIdFromCard(PRODUCT_NAME);
      expect(productId).toBeTruthy();

      await productDetailPage.goto(productId);
      await expect(page.getByTestId('product-name')).toContainText(PRODUCT_NAME);
      await productDetailPage.expectNoVariantSelectors();
    },
  );
```

- [ ] **Step 4: Add TC-122 (My Products list view)**

Append inside the describe block:

```ts
  test(
    'TC-122: seller views product list on My Products page',
    { tag: ['@TC-122', '@seller', '@product-read'] },
    async ({ page, sellerDashboardPage }) => {
      const listProductsPage = new ListProductsPage(page);

      await page.goto('/');
      await expect(page.getByTestId('navbar')).toBeVisible();
      await sellerDashboardPage.navigateToMyProducts();
      await listProductsPage.expectLoaded();

      const list = listProductsPage.listProductsSection;
      await list.expectProductVisible(productId);
      await expect(list.productCard(productId)).toContainText('Electronics');
    },
  );
```

- [ ] **Step 5: Add TC-045 (preview simple product as buyer)**

Append inside the describe block:

```ts
  test(
    'TC-045: seller previews simple product as buyer via My Products page',
    { tag: ['@TC-045', '@seller', '@product-read'] },
    async ({ page, sellerDashboardPage, productDetailPage }) => {
      const listProductsPage = new ListProductsPage(page);

      await page.goto('/');
      await expect(page.getByTestId('navbar')).toBeVisible();
      await sellerDashboardPage.navigateToMyProducts();
      await listProductsPage.expectLoaded();

      await listProductsPage.listProductsSection.productCard(productId).click();

      await expect(page.getByTestId('product-detail-page')).toBeVisible({ timeout: 10_000 });
      await expect(page).toHaveURL(new RegExp(`/products/${productId}`));
      await productDetailPage.expectNoVariantSelectors();
    },
  );
```

- [ ] **Step 6: Add TC-044 (edit price and stock)**

Append inside the describe block:

```ts
  test(
    'TC-044: seller edits simple product price and stock — changes reflected on detail page',
    { tag: ['@TC-044', '@seller', '@product-update'] },
    async ({ page, homePage, sellerDashboardPage, productDetailPage }) => {
      const NEW_PRICE = '39.99';
      const NEW_STOCK = '25';

      await page.goto('/');
      await expect(page.getByTestId('navbar')).toBeVisible();
      await homePage.navigateToSellerDashboard();
      await sellerDashboardPage.expectLoaded();

      await page.getByTestId(`edit-product-${productId}`).click();
      const wizard = new ProductWizardPage(page);
      await expect(wizard.root).toBeVisible();

      await wizard.editSimpleProductPricing(NEW_PRICE, NEW_STOCK);
      await expect(wizard.root).not.toBeVisible({ timeout: 10_000 });

      await productDetailPage.goto(productId);
      await productDetailPage.expectDisplayedPrice(`$${NEW_PRICE}`);
    },
  );
```

- [ ] **Step 7: Add TC-046 (delete product) and close the describe block**

Append inside the describe block, then close it:

```ts
  test(
    'TC-046: seller deletes product from dashboard — product removed from dashboard',
    { tag: ['@TC-046', '@seller', '@product-delete'] },
    async ({ page, homePage, sellerDashboardPage }) => {
      const listProductsPage = new ListProductsPage(page);

      await page.goto('/');
      await expect(page.getByTestId('navbar')).toBeVisible();
      await homePage.navigateToSellerDashboard();
      await sellerDashboardPage.expectLoaded();

      // Confirm product exists before deleting
      await expect(page.getByTestId(`product-item-${productId}`)).toBeVisible();

      // Click delete — opens ConfirmDialog
      await page.getByTestId(`delete-product-${productId}`).click();

      // Confirm deletion
      await listProductsPage.deleteProductSection.confirm();

      // Product card must be gone from the dashboard
      await expect(
        page.getByTestId(`product-item-${productId}`),
      ).not.toBeVisible({ timeout: 10_000 });
    },
  );
}); // end test.describe.serial
```

- [ ] **Step 8: Run the full spec**

```bash
cd e2e-testing && npx playwright test tests/web/seller/seller-simple-product-crud.spec.ts --project=web-seller --reporter=line
```

Expected: all 5 tests pass in order (TC-042, TC-122, TC-045, TC-044, TC-046). Fix any failures before continuing.

- [ ] **Step 9: Commit**

```bash
git add e2e-testing/tests/web/seller/seller-simple-product-crud.spec.ts
git commit -m "test(seller): add seller-simple-product-crud.spec.ts — serial CRUD chain TC-042→TC-122→TC-045→TC-044→TC-046"
```

---

### Task 5: Trim wizard spec + update NOTES.md

**Files:**
- Modify: `e2e-testing/tests/web/seller/seller-product-wizard.spec.ts`
- Modify: `e2e-testing/tests/web/seller/NOTES.md`

**Interfaces:**
- Consumes: nothing new

- [ ] **Step 1: Remove TC-042 block from `seller-product-wizard.spec.ts`**

Open `e2e-testing/tests/web/seller/seller-product-wizard.spec.ts`. Delete the entire `test('TC-042: ...')` block (lines 41–80). Also remove any imports that are now only used by TC-042 if no longer needed by TC-064. Keep everything related to TC-064.

After the edit, the file header comment should read:
```ts
// TC-064: Seller creates variant product via wizard
```

- [ ] **Step 2: Verify TC-064 still passes**

```bash
cd e2e-testing && npx playwright test tests/web/seller/seller-product-wizard.spec.ts --project=web-seller --reporter=line
```

Expected: TC-064 passes. Fix any import errors before continuing.

- [ ] **Step 3: Update `NOTES.md`**

Replace the content of `e2e-testing/tests/web/seller/NOTES.md` with:

```markdown
# web/seller — Seller Web E2E Tests

Playwright tests for seller-facing flows on the TokoMart web app (`http://localhost:5173`).
All tests run under the `web-seller` Playwright project, which injects pre-authenticated seller storage state from `.auth/seller.json`.

---

## Test Cases

### TC-042, TC-122, TC-045, TC-044, TC-046 — `seller-simple-product-crud.spec.ts`
**Seller CRUD for simple products**

A `beforeAll` creates a shared simple product via API (reused by TC-122, TC-045, TC-044). TC-042 drives its own wizard flow. TC-046 creates and deletes a dedicated product.

| TC | Description | Key steps |
|----|-------------|-----------|
| TC-042 | Create simple product via wizard | Fill 6-step wizard → verify dashboard card + product detail |
| TC-122 | View My Products list | Navigate to `/my-products` → product card visible with correct category |
| TC-045 | Preview simple product as buyer | Click product card on My Products → product detail page visible, no variant selectors |
| TC-044 | Edit price and stock | `edit-product-{id}` → wizard edit mode → change price/stock → verify on detail page |
| TC-046 | Delete product from dashboard | Create dedicated product → `delete-product-{id}` → confirm dialog → card removed |

---

### TC-064 — `seller-product-wizard.spec.ts`
**Seller creates variant product via wizard**

Drives the 6-step wizard with the Variants toggle enabled. Adds Size attribute (S, M, L) with per-variant price/stock and images.

| TC | Product Type | Key steps |
|----|-------------|-----------|
| TC-064 | Variant product | Pricing step → enable variants → add Size attribute → fill rows → images → Shipping → Review → Publish |

---

### TC-054 — `seller-access.spec.ts`
**Seller dashboard only shows the seller's own products**

`beforeAll` promotes buyer to a second seller account via API and creates a product. Test verifies seller1 cannot see seller2's product or its edit/delete controls.

| Test | Assertion |
|------|-----------|
| Seller1 cannot see seller2 product | `product-item-{seller2ProductId}` not visible |
| Seller1 cannot see edit/delete for seller2 product | `edit-product-{id}` and `delete-product-{id}` not visible |

---

## Structure

```
web/seller/
├── NOTES.md                             ← this file
├── seller-simple-product-crud.spec.ts   ← TC-042, TC-122, TC-045, TC-044, TC-046
├── seller-product-wizard.spec.ts        ← TC-064
└── seller-access.spec.ts               ← TC-054
```

## Key notes

- Tests run under `web-seller` project — seller auth state is pre-loaded from `.auth/seller.json`.
- For raw API calls in `beforeAll`, use `pwRequest.newContext({ baseURL: API_URL })` (not the fixture `request`, which points to `:5173`).
- Seller token for API setup comes from `getSellerToken()` — reads `.auth/seller.json` synchronously.
- The wizard opens in **edit mode** when `edit-product-{id}` is clicked — same `product-wizard` testid, "Save Changes" instead of "Publish Listing" on step 6 (`wizard-publish-btn`).
- The `ConfirmDialog` (delete product) has no `data-testid` — located by `getByRole('button', { name: 'Delete Product' })`.
- `edit-product-{id}` / `delete-product-{id}` are on the seller dashboard (`/seller`), not the My Products page (`/my-products`).
- `product-card-{id}` is on the My Products page (via `ProductCard` component).
- The wizard is 6 steps on web (vs 7 on mobile — Variants is part of the Pricing step on web).
```

- [ ] **Step 4: Run the full seller suite to confirm all tests pass**

```bash
cd e2e-testing && npx playwright test tests/web/seller/ --project=web-seller --reporter=line
```

Expected: TC-042, TC-122, TC-045, TC-044, TC-046, TC-064, TC-054 all pass.

- [ ] **Step 5: Commit**

```bash
git add \
  e2e-testing/tests/web/seller/seller-product-wizard.spec.ts \
  e2e-testing/tests/web/seller/NOTES.md
git commit -m "refactor(seller): move TC-042 to crud spec; trim wizard spec to TC-064 only; update NOTES"
```
