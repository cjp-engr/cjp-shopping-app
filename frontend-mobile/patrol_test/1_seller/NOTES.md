# 1_seller — Seller Flow Tests

Patrol tests for seller product management on mobile — create, read, edit, and delete for both simple and variant products.

## Test Cases

### TC-090 — `add_product_simple_test.dart`
**Seller creates a simple product via the 7-step wizard**

Tags: `add-product-simple`, `seller`, `smoke`

Logs in as the seeded seller account, opens the product wizard via the FAB on the seller dashboard, and completes all 7 steps for a simple (non-variant) product. Product data (name, category, price, stock) is randomised per run from a fixed set of 4 products.

| Step | Action |
|------|--------|
| 0 — Basic Info | Enter name, select category from bottom sheet, enter brand |
| 1 — Pricing | Enter price, stock, SKU, 10% discount |
| 2 — Description | Enter description, add a tag |
| 3 — Images | Open camera, grant permission, take photo, confirm |
| 4 — Shipping | Select delivery options; choose Free or Buyer Pays and enter fee amounts — **required, wizard blocks publish if not set** |
| 5 — Review | Tap Publish |

**Assertion:** seller dashboard screen is visible after publish.

---

### TC-615 — `read_product_simple_test.dart`
**Seller views a simple product in the seller dashboard**

Tags: `read-product-simple`, `seller`

Logs in as the seeded seller, navigates to the seller dashboard, and verifies the seeded simple product card is visible in the product list.

**Assertion:** product card with correct name is visible on the seller dashboard.

---

### TC-616 — `edit_product_simple_test.dart`
**Seller edits a simple product from the dashboard**

Tags: `edit-product-simple`, `seller`

Logs in, opens the edit wizard for a seeded simple product, updates name/price/stock, and saves.

**Assertion:** updated values are reflected on the product detail screen.

---

### TC-617 — `delete_product_simple_test.dart`
**Seller deletes a simple product from the dashboard**

Tags: `delete-product-simple`, `seller`

Logs in, taps the delete action on a seeded simple product, confirms in the dialog.

**Assertion:** product is no longer visible in the seller dashboard list.

---

### TC-091 — `add_product_variant_test.dart`
**Seller creates a variant product via the 7-step wizard**

Tags: `add-product-variant`, `seller`, `smoke`

Logs in as the seeded seller account and completes the full 7-step wizard for a product with size variants (S, M, L). The Pricing step differs from TC-090: the variants toggle is enabled and each variant row gets its own price, stock, discount, and SKU.

| Step | Action |
|------|--------|
| 0 — Basic Info | Enter name (`E2E Variant Shirt`), select `Clothing`, enter brand |
| 1 — Pricing | Enable variants toggle; add `Size` attribute with values S, M, L; fill price/stock/discount/SKU per variant row (scrolls each row into view) |
| 2 — Description | Enter description, add tag `e2e` |
| 3 — Images | Open camera, grant permission, take photo, confirm |
| 4 — Shipping | Select delivery options; choose Free or Buyer Pays and enter fee amounts — **required, wizard blocks publish if not set** |
| 5 — Review | Tap Publish |

**Assertion:** seller dashboard screen is visible after publish.

---

### TC-618 — `read_product_variant_test.dart`
**Seller views a variant product in the seller dashboard**

Tags: `read-product-variant`, `seller`

Logs in, navigates to the seller dashboard, and verifies the seeded variant product card is visible.

**Assertion:** variant product card with correct name is visible on the seller dashboard.

---

### TC-619 — `edit_product_variant_test.dart`
**Seller edits a variant product from the dashboard**

Tags: `edit-product-variant`, `seller`

Logs in, opens the edit wizard for a seeded variant product, updates a variant row's price/stock, and saves.

**Assertion:** updated values are reflected on the product detail screen.

---

### TC-620 — `delete_product_variant_test.dart`
**Seller deletes a variant product from the dashboard**

Tags: `delete-product-variant`, `seller`

Logs in, taps the delete action on a seeded variant product, confirms in the dialog.

**Assertion:** product is no longer visible in the seller dashboard list.

---

## Structure

```
1_seller/
├── NOTES.md                        ← this file
├── add_product_simple_test.dart    ← TC-090
├── read_product_simple_test.dart   ← TC-615
├── edit_product_simple_test.dart   ← TC-616
├── delete_product_simple_test.dart ← TC-617
├── add_product_variant_test.dart   ← TC-091
├── read_product_variant_test.dart  ← TC-618
├── edit_product_variant_test.dart  ← TC-619
└── delete_product_variant_test.dart ← TC-620
```

## Key notes

- All tests use `modules.auth.login()` from `modules/auth.dart` — no UI login duplication.
- Locators use `keys.seller.*` from `lib/features/seller/keys.dart` — never hardcoded strings.
- Images are captured via native camera using `$.platform.mobile` APIs; camera permission is granted inline with `grantPermissionWhenInUse()`.
- The wizard is **7 steps** (0-indexed: Basic Info → Pricing → Description → Images → Shipping → Variants → Review). TC-090 skips the Variants step; TC-091 enables it in the Pricing step.
- **Shipping fee is required** — the wizard blocks publish until a fee mode (Free or Buyer Pays) is selected. When Buyer Pays, a fee amount must be entered for each selected delivery option.
- Variant rows require `scrollTo()` before interacting — the M and L rows scroll off screen.
