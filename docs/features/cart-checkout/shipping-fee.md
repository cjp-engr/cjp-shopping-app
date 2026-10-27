# Shipping fee

| | |
|---|---|
| **Area** | Cart & Checkout |
| **Roles** | Seller (sets the fee), Buyer (pays it) |
| **Support** | Backend, web, mobile |
| **Last verified** | 2026-10-26 on branch `feat/backend-shipping-change-10262026` (unit tests, type-check, lint; see Status) |

## What it does

Every order is placed per seller, and every seller order carries one shipping fee. The seller decides how that fee works when they list a product: the shipping is free, or the buyer pays a fee set for each delivery option. If the seller did not set anything, a flat safety fee of **$9.99** applies. The fee is calculated by the backend; the web and mobile apps show the same amount while the buyer is still in the cart and checkout.

## Seller settings

Set per product in the product wizard (web step 5 "Shipping", mobile step 4) and stored on the product:

| Field | Values | Meaning |
|---|---|---|
| `shippingOptions` | one or more of `standard`, `express`, `pickup` | The delivery options the buyer can choose from |
| `shippingFee` | `free` or `buyer_pays` | Who pays |
| `shippingFeeAmounts` | map of option → amount | The fee per option, used only when `buyer_pays` |

The settings are **required**. Both wizards ask for at least one option, a fee mode and, for `buyer_pays`, a fee for every selected option, and the backend enforces the same rule on both product route sets (`POST/PUT /api/seller/products` and `POST/PUT /api/products`): at least one known option (`standard`, `express`, `pickup`), a fee option, and a non-negative number for every selected option when the buyer pays. A violation answers 400 with a specific message (`/api/seller/products` also sends `code: invalid_shipping_settings`). On update the product as it will be after the update is checked, so a partial edit works, but an older product that still has no settings must get them.

## Rules

| The product has | Shipping for that seller's order |
|---|---|
| `shippingFee: free` | **$0**, for every delivery option |
| `shippingFee: buyer_pays` | The fee of the **selected delivery option**. If that option has no fee, the first configured fee. If no fee is configured at all, **$9.99**. An explicit fee of 0 stays 0 |
| no `shippingFee` (older products only) | **$9.99**, flat, whatever the amount of the order |

- There is **no free-shipping threshold**. Free shipping comes only from a seller-set `free`. (The "free at $50 or more" rule was removed; the UI promotion went in August 2026 and the backend default changed on the branch above.)
- **Delivery option** for a seller: the buyer's choice for that seller; otherwise the first choice in the request; otherwise the product's first option; otherwise the first fee key.
- Shipping is **per seller order, not per cart**. A cart with two sellers pays two shipping fees.
- Shipping comes **after discounts and is not taxed**. A coupon or product discount does not change it.

Order total for one seller:

```
afterDiscounts = subtotal − product discount − coupon discount
tax            = 8% of afterDiscounts
total          = afterDiscounts + tax + shipping
```

| Example | Shipping | Total |
|---|---|---|
| $20 product, no shipping setting | 9.99 | 20 + 1.60 + 9.99 = **31.59** |
| $20 product, seller set `free` | 0 | 20 + 1.60 = **21.60** |
| $20 product, `buyer_pays` standard 5 / express 12, express chosen | 12 | 20 + 1.60 + 12 = **33.60** |
| $100 product 10% off, 10% seller coupon, no setting | 9.99 | 81 + 6.48 + 9.99 = **97.47** |

## Where the buyer and seller see it

- **Web cart:** shows `FREE` or the amount per seller. For a `buyer_pays` seller whose option has no fee yet it shows "Select option above" and the footnote "Excludes pending shipping fees".
- **Web checkout and mobile checkout:** per-seller shipping line, using the selected delivery option.
- **Mobile cart:** shipping is added once a delivery option is selected for a `buyer_pays` seller; a seller with no setting adds $9.99.
- **Order:** the stored order keeps `shipping`, `selectedDeliveryOption` and `deliverySelections`, so later changes to a product never change an old order.
- **Seller order detail:** shows the delivery label. For older orders without `deliverySelections` it infers the option from the fee when it can.

## Cancellations and refunds

- A buyer or seller cancelling a pending order releases the whole card hold, shipping included. COD has no payment to return.
- Delivered-item refunds return the shipping fee **only** when the request selects every remaining paid unit **and** every refund on the order so far was for a seller-fault reason (`damaged`, `wrong_item`, `missing_items`, `not_as_described`). Partial requests and the reason `other` never refund shipping. Details: `docs/superpowers/specs/2026-10-18-delivered-item-refund-design.md`.

## Status

| | |
|---|---|
| **Implemented** | Yes, in the working tree on `feat/backend-shipping-change-10262026` (based on `e78ee44`), not committed |
| **Verified** | 2026-10-26 and 2026-10-27: backend `shippingSettings.test.ts` and `sellerProductShipping.test.ts` (the required-settings rule, 29 tests), the Swagger contract tests, backend `checkoutPricing.test.ts` (18 tests), web `shipping.test.ts` (7), mobile `seller_shipping_test.dart`; backend `tsc`, web `tsc -b` and `eslint`, `flutter analyze` all clean. **Not run:** the API spec `orders.api.spec.ts`, the backend integration tests, Playwright, Patrol, any manual check |
| **Enabled** | No flag: always on once the backend and apps are deployed |
| **Deployed** | Not deployed |

## Known limitations and remaining work

1. **The first product decides.** When one seller's order holds products with different shipping settings, only the first product's settings are used for that seller.
2. **Older products can still have no settings.** Products saved before the rule was added keep falling back to $9.99 until the seller edits them (the edit must then supply the settings). There is no migration and no log when the fallback is used.
3. **Fees have no upper limit.** Negative fees, unknown delivery options and empty or non-numeric amounts are rejected, but a very large fee is accepted. The database schema itself does not require the settings, so a product written outside the API (a script, the seed) can still lack them.
4. **Three copies of the rule.** The backend (`computeSellerTotals`), the web helper and the mobile helper each implement it and each hold the 9.99 constant. Change all three together.
5. **The carts differ before a choice is made.** For a `buyer_pays` seller the web cart shows "Select option above" until a fee is known; the mobile cart adds nothing for that seller until an option is selected.
6. **Stale domain doc.** `.claude/skills/tokomart-domain/business-rules.md` §4 still describes the old "$9.99 under $50, free at $50 or more" default.

## Code, tests and scenarios

- Backend: `backend/src/validators/shippingSettings.ts` (the required-settings rule, used by `sellerService.ts` and `productController.ts`); `backend/src/services/checkoutPricing.ts` (`computeSellerTotals`, `STANDARD_SHIPPING_FEE`), used by `orderService.ts` (`POST /api/orders`) and `checkoutService.ts` (checkout sessions). Refund share: `refundShipping.ts`, `refundAllocation.ts`.
- Web: `frontend/src/utils/shipping.ts` (`sellerShippingFee`), `pages/Cart.tsx`, `pages/Checkout.tsx`, `utils/constants.ts` (`DEFAULT_SHIPPING_FEE`).
- Mobile: `frontend-mobile/lib/core/utils/seller_shipping.dart`, `cart_state.dart`, `checkout_screen.dart`.
- Tests: `checkoutPricing.test.ts`, `shipping.test.ts`, `seller_shipping_test.dart`, `e2e-testing/tests/api/orders.api.spec.ts`.
- Scenarios (`docs/test-cases/test-scenarios-api.md`): TC-026, TC-027, TC-028, TC-257, TC-263, TC-301, TC-302, TC-303.
- History: the $50 free-shipping promotion was removed from the apps in PR #22 (commit `9a15df9`, 2026-08-19) and the banner in `8a6011c` (2026-09-30).
