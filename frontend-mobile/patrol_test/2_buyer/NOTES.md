# 2_buyer — Buyer Checkout Tests

Patrol tests for the buyer checkout flow on mobile. All tests cover the full path:
login → browse → add to cart → checkout → place order → assert orders screen.

Tests are grouped by product type (simple vs variant) and payment method (COD, saved card, new card).

---

## Test Cases

### TC-095 — `simple_cod_checkout_test.dart`
**Buyer places a COD order with a simple product**

Tags: `smoke`

| Step | Action |
|------|--------|
| Login | Buyer account via `modules.auth.login()` |
| Browse | Scroll to `E2E Test Lamp - Test` on product list, tap to open detail |
| Cart | Tap Add to Cart → tap cart icon on product detail to navigate to cart |
| Checkout | Tap Checkout (all items auto-selected) |
| Shipping | Fill street, city, state, zip |
| Payment | Select `cash-on-delivery` |
| Place order | Tap Place Order |

**Assertion:** orders screen is visible.

---

### TC-096 — `simple_saved_credit_checkout_test.dart`
**Buyer places an order with a saved credit card (simple product)**

Tags: `checkout-saved-cc`, `checkout`, `smoke`

Same flow as TC-095 up to payment. When the buyer account has saved cards, the payment section auto-enters Saved Card mode — the first saved card is pre-selected and no mode toggle is needed. Selects `credit-card` payment option explicitly, then places the order.

| Step | Action |
|------|--------|
| Login → Browse → Cart → Checkout | Same as TC-095 |
| Payment | Select `credit-card` (saved card pre-selected automatically) |
| Place order | Tap Place Order |

**Assertion:** orders screen is visible.

**Precondition:** buyer account must have at least one saved card (seeded via `npm run seed`).

---

### TC-097 — `simple_new_credit_checkout_test.dart`
**Buyer places an order with a new card entry (simple product)**

Tags: `checkout-new-cc`, `checkout`, `smoke`

Same flow as TC-096 but switches to new card mode when the buyer has saved cards (tab toggle). Fills card number `4111111111111111` and cardholder name.

| Step | Action |
|------|--------|
| Login → Browse → Cart → Checkout | Same as TC-095 |
| Payment | Select `credit-card`; tap New Card tab if visible; fill card number + holder name |
| Place order | Tap Place Order |

**Assertion:** orders screen is visible.

**Note:** the New Card tab only appears when the buyer already has saved cards. The test guards this with an `if ($.exists)` check so it works on both fresh and seeded accounts.

---

### TC-101 — `variant_cod_checkout_test.dart`
**Buyer places a COD order with a variant product**

Tags: `checkout-variant-cod`, `smoke`

Same flow as TC-095 but uses `E2E Variant Shirt - Test` and selects Size M before adding to cart.

| Step | Action |
|------|--------|
| Login | Buyer account |
| Browse | Scroll to `E2E Variant Shirt - Test`, open detail |
| Variant | Select `Size → M` |
| Cart | Add to cart → navigate to cart |
| Checkout | Tap Checkout |
| Shipping | Fill address fields |
| Payment | Select `cash-on-delivery` |
| Place order | Tap Place Order |

**Assertion:** orders screen is visible.

---

### TC-103 — `variant_new_credit_checkout_test.dart`
**Buyer places a new card order with a variant product**

Tags: `checkout-variant-new-cc`, `smoke`

Same flow as TC-101 up to payment. Selects `credit-card`, switches to new card tab if visible, fills card number and holder name.

| Step | Action |
|------|--------|
| Login → Browse → Variant (Size M) → Cart → Checkout | Same as TC-101 |
| Payment | Select `credit-card`; tap New Card tab if visible; fill card details |
| Place order | Tap Place Order |

**Assertion:** orders screen is visible.

---

### TC-104 — `variant_saved_credit_checkout_test.dart`
**Buyer places a saved card order with a variant product**

Tags: `checkout-variant-saved-cc`, `checkout`, `smoke`

Same flow as TC-101 up to payment. Selects `credit-card` — saved card is pre-selected automatically when the buyer has cards on file.

| Step | Action |
|------|--------|
| Login → Browse → Variant (Size M) → Cart → Checkout | Same as TC-101 |
| Payment | Select `credit-card` (saved card pre-selected) |
| Place order | Tap Place Order |

**Assertion:** orders screen is visible.

**Precondition:** buyer account must have at least one saved card.

---

## Structure

```
2_buyer/
├── NOTES.md                              ← this file
├── simple_cod_checkout_test.dart         ← TC-095
├── simple_saved_credit_checkout_test.dart ← TC-096
├── simple_new_credit_checkout_test.dart  ← TC-097
├── variant_cod_checkout_test.dart        ← TC-101
├── variant_saved_credit_checkout_test.dart ← TC-104
└── variant_new_credit_checkout_test.dart ← TC-103
```

## Coverage matrix

| TC | Product | Payment | File |
|----|---------|---------|------|
| TC-095 | Simple | Cash on Delivery | `simple_cod_checkout_test.dart` |
| TC-096 | Simple | Saved credit card | `simple_saved_credit_checkout_test.dart` |
| TC-097 | Simple | New card entry | `simple_new_credit_checkout_test.dart` |
| TC-101 | Variant (Size M) | Cash on Delivery | `variant_cod_checkout_test.dart` |
| TC-103 | Variant (Size M) | New card entry | `variant_new_credit_checkout_test.dart` |
| TC-104 | Variant (Size M) | Saved credit card | `variant_saved_credit_checkout_test.dart` |

## Key notes

- All tests use `modules.auth.login()` — no UI login duplication.
- Product names are hardcoded to seeded products (`E2E Test Lamp - Test`, `E2E Variant Shirt - Test`). Run `npm run seed` in `backend/` before executing tests.
- Cart items are auto-selected on mobile — no checkbox tap needed before checkout.
- Saved card tests require the buyer account to have a card on file (seeded). New card tests guard the mode-toggle with `if ($.exists)` so they pass on both fresh and seeded accounts.
- All locators use `keys.*` from `lib/keys.dart` — no hardcoded strings.
- Shipping address is filled on every test — the seeded buyer account has no pre-saved address.
