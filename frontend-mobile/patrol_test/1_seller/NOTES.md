# 1_seller — Seller Flow Tests

Patrol tests for the seller product creation wizard on mobile.

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
| 4 — Shipping | Enable Express + Pickup delivery; set Buyer Pays with custom fees |
| 5 — Review | Tap Publish |

**Assertion:** seller dashboard screen is visible after publish.

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
| 4 — Shipping | Enable Express + Pickup; set Buyer Pays with custom fees |
| 5 — Review | Tap Publish |

**Assertion:** seller dashboard screen is visible after publish.

---

## Structure

```
1_seller/
├── NOTES.md                      ← this file
├── add_product_simple_test.dart  ← TC-090
└── add_product_variant_test.dart ← TC-091
```

## Key notes

- Both tests use `modules.auth.login()` from `modules/auth.dart` — no UI login duplication.
- Locators use `keys.seller.*` from `lib/features/seller/keys.dart` — never hardcoded strings.
- Images are captured via native camera using `$.platform.mobile` APIs; camera permission is granted inline with `grantPermissionWhenInUse()`.
- The wizard is **7 steps** (0-indexed: Basic Info → Pricing → Description → Images → Shipping → Variants → Review). TC-090 skips the Variants step; TC-091 enables it in the Pricing step.
- Variant rows require `scrollTo()` before interacting — the M and L rows scroll off screen.
