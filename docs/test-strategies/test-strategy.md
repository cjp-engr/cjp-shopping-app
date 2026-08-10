# TokoMart Test Strategy

> **Input mode:** A — from `docs/test-cases/test-scenarios.md` (110 TCs: 66 web + 44 mobile-native)  
> **Date:** 2026-08-03  
> **Platform scope:** Web (Playwright) + Mobile (Patrol)

---

## 1. Summary

Test strategy for the **full scenario suite** (TC-001–TC-066 web, TC-067–TC-095 + TC-600–TC-614 mobile-native). Assigns pyramid layers, tools, and implementation order for `/generate-tests`.

**Tooling status:**
| Tool | Status |
|------|--------|
| Playwright web | `e2e-testing/tests/web/` — scaffold + sample `login.spec.ts` |
| Playwright API | `e2e-testing/tests/api/` — scaffold + health/auth samples |
| Patrol mobile | `frontend-mobile/patrol_test/login_test.dart` — S2 partial (TC-067 only) |
| Unit (Vitest/Jest) | **Blocked** — no backend unit harness |
| Component (RTL) | **Blocked** — no frontend component harness |
| Patrol keys | **Partial** — `auth_*`, `products_*` only; cart/checkout/orders/seller/wishlist keys needed |

**Key strategy choices:**
- Push pricing, auth, status codes, and coupon rules to **API** layer (shared web + mobile)
- Keep multi-page buyer/seller journeys at **E2E** (Playwright web / Patrol mobile)
- **Multi-layer** for revenue-critical flows (multi-seller orders, voucher validation)
- Mobile P0 blocked on **Patrol keys** — Phase M1 adds keys before E2E tests
- **Unit/Component** deferred — document unblock steps in §9

---

## 2. Pyramid distribution

| Layer | Count | Focus | Est. run time | Tool |
|-------|-------|-------|---------------|------|
| Unit | 0 | Tax/discount pure math | — | Vitest/Jest (**Blocked**) |
| API | 21 | Orders, coupons, auth, reviews, products, rate limiting | ~2–4 min | Playwright `request` |
| Component | 0 | Sale strikethrough tiles | — | Vitest/RTL (**Blocked**) |
| E2E Web | 49 | Auth, cart, checkout, seller wizard, catalog | ~15–25 min | Playwright `page` |
| E2E Mobile | 38 | Auth gate, cart checkbox, checkout, 7-step wizard | ~20–30 min | Patrol |
| Multi (API + E2E) | 5 | TC-020, TC-025, TC-032 (web); TC-083, TC-611 (mobile) | +5 min | Both |
| Manual / Blocked | 5 | TC-052, TC-604, TC-605; TC-062, TC-603 | — | Manual / N/A |

*Web: 49 E2E + 3 Multi + 15 API. Mobile: 38 E2E + 2 Multi (shared API legs).*

---

## 3. Smoke assignments (S1–S4)

| ID | Scenario | Final layer | Tool | Platform | Priority | Source | Rationale |
|----|----------|-------------|------|----------|----------|--------|-----------|
| S1 | Login → cart → checkout COD → order history | Multi | Playwright + Playwright-API | Web | P0 | TC-001, TC-016, TC-022, TC-098; `checkout.spec.ts`, `variant-checkout.spec.ts` | P0 buyer smoke; variant path in TC-098 |
| S2 | Mobile login → browse → cart | E2E | Patrol | Mobile | P0 | TC-067, TC-072, TC-073; `login_test.dart` | Extend existing Patrol; keys partial |
| S3 | Become seller → simple + variant listing | Multi | Playwright + Patrol | Both | P0 | Web: TC-041, TC-042, TC-064 · Mobile: TC-089, TC-090, TC-091 | Divergent wizards (6 vs 7 steps) |
| S4 | 2-seller cart → 2 orders | Multi | Playwright-API + Playwright/Patrol | Both | P0 | API: TC-025 · Web E2E: TC-021/025 · Mobile E2E: TC-083 | API proves split; platform E2E confirms UI |

---

## 4. Scenario assignments

| ID | Scenario | Final layer | Tool | Platform | Priority | Source | Rationale | Override |
|----|----------|-------------|------|----------|----------|--------|-----------|----------|
| TC-001 | Successful login | E2E | Playwright | Web | P0 | `login-form`, `login-submit-btn` | Auth smoke | |
| TC-002 | Login failure | E2E | Playwright | Web | P1 | `login-error-alert` | UI error display | |
| TC-003 | Successful signup | E2E | Playwright | Web | P1 | `signup-form` | Web password rules | |
| TC-004 | Signup weak password | E2E | Playwright | Web | P1 | `signup-form` | Client validation | |
| TC-005 | Logout clears session | E2E | Playwright | Web | P1 | `nav-signout-btn` | Session + redirect | |
| TC-006 | Cart restored on re-login | E2E | Playwright | Web | P1 | `GET /api/cart` | Server cart sync | |
| TC-007 | Checkout auth redirect | E2E | Playwright | Web | P0 | `/login?redirect=/checkout` | Protected route | |
| TC-008 | Guest browse products | E2E | Playwright | Web | P0 | `products-page` | Web-only guest | |
| TC-009 | Guest view cart | E2E | Playwright | Web | P1 | `cart-page` | Guest cart | |
| TC-010 | Search products | E2E | Playwright | Web | P1 | `product-search-input` | Catalog filter | |
| TC-011 | Filter by category | E2E | Playwright | Web | P1 | `category-filter-{slug}` | Category enum | |
| TC-012 | Sale strikethrough price | E2E | Playwright | Web | P1 | `product-price` | UI display; Component deferred | |
| TC-013 | Variant selection add to cart | E2E | Playwright | Web | P0 | `variant-value-*` | Variant happy path | |
| TC-014 | Add blocked without variant | E2E | Playwright | Web | P1 | `add-to-cart-btn` | Validation UX | |
| TC-015 | Own products hidden | E2E | Playwright | Web | P1 | `products-grid` | Listing visibility rule | |
| TC-065 | Buyer sees seller listing | E2E | Playwright | Web | P0 | `product-card-{id}` | Catalog visibility | |
| TC-066 | Find listing search/filter | E2E | Playwright | Web | P1 | `product-search-input` | Discoverability | |
| TC-016 | Cart qty update/remove | E2E | Playwright | Web | P0 | `qty-increment`, `cart-item-{id}` | Cart smoke | |
| TC-017 | Qty capped at stock | E2E | Playwright | Web | P1 | `qty-increment` | Stock UI cap | |
| TC-018 | Per-seller delivery | E2E | Playwright | Web | P0 | `cart-seller-group-{id}` | Multi-seller cart | |
| TC-019 | Apply valid voucher | E2E | Playwright | Web | P1 | `select-voucher-btn-{id}` | Coupon UI | |
| TC-020 | Invalid voucher | Multi | Playwright + Playwright-API | Web | P1 | `POST /api/coupons/validate` | API for codes; E2E for error UX | |
| TC-021 | Multi-seller cart groups | E2E | Playwright | Web | P0 | `cart-seller-group-{id}` | Structural rule | |
| TC-022 | Checkout COD | E2E | Playwright | Web | P0 | `place-order-btn` | P0 checkout smoke | |
| TC-023 | Checkout saved card | E2E | Playwright | Web | P1 | `payment-section` | Saved payment | |
| TC-024 | Checkout new card | E2E | Playwright | Web | P1 | `payment-section` | Card validation UX | |
| TC-098 | Checkout COD with variant product | E2E | Playwright | Web | P0 | `variant-value-*`, `variant-checkout.spec.ts` | API setup + buyer COD; order variant assert | |
| TC-025 | Multi-seller → 2 orders | Multi | Playwright-API + Playwright | Web | P0 | `POST /api/orders` | API split + E2E history | |
| TC-026 | Order total formula | API | Playwright-API | Web | P0 | `POST /api/orders`, `orderService.ts` | Pricing truth source | |
| TC-027 | Shipping $9.99 under $50 | API | Playwright-API | Web | P1 | `POST /api/orders` | Default shipping rule | |
| TC-028 | Free shipping ≥ $50 | API | Playwright-API | Web | P1 | `POST /api/orders` | Shipping threshold | |
| TC-029 | Missing address blocked | E2E | Playwright | Web | P1 | `shipping-section` | Form validation | |
| TC-030 | Order history tabs | E2E | Playwright | Web | P1 | `order-tab-{key}` | Status filters | |
| TC-031 | Confirm receipt | E2E | Playwright | Web | P1 | `confirm-received-btn` | Buyer action | |
| TC-032 | Buyer cancel pending | Multi | Playwright + Playwright-API | Web | P1 | `PUT /api/orders/:id/status` | E2E UX + API stock restore | |
| TC-033 | Cancel processing blocked | API | Playwright-API | Web | P1 | `PUT /api/orders/:id/status` | 400 business rule | |
| TC-034 | Leave review | E2E | Playwright | Web | P1 | `review-btn-{id}` | Post-delivery UX | |
| TC-035 | Duplicate review blocked | API | Playwright-API | Web | P1 | `POST /api/reviews` | 409 unique index | |
| TC-036 | Review before delivery | API | Playwright-API | Web | P1 | `POST /api/reviews` | 403 eligibility | |
| TC-037 | Follow/unfollow seller | E2E | Playwright | Web | P2 | `/users/:id` | Social UX | |
| TC-038 | Dark mode toggle | E2E | Playwright | Web | P2 | `theme-toggle-btn` | Web-only | |
| TC-039 | Order card persisted total | E2E | Playwright | Web | P1 | `order-card-{id}` | Display rule | |
| TC-040 | Products loading/empty | E2E | Playwright | Web | P2 | `products-loading` | UI states | |
| TC-041 | Become seller | E2E | Playwright | Web | P0 | `PUT /api/auth/profile` | Role promotion | |
| TC-042 | Simple product listing | E2E | Playwright | Web | P0 | `add-product-btn`, 6-step wizard | P0 seller listing | |
| TC-064 | Variant product listing | E2E | Playwright | Web | P0 | `variant-value-*` | Variant listing | |
| TC-043 | Wizard validation | E2E | Playwright | Web | P1 | wizard steps | Negative UX | |
| TC-044 | Edit product price/stock | E2E | Playwright | Web | P1 | `edit-product-{id}` | Seller CRUD | |
| TC-120 | Edit variant product — price, stock, new option | E2E | Playwright | Web | P1 | `edit-product-{id}`, `wizard-variant-row-{i}-price`, `variant-value-{attr}-{value}` | Variant CRUD | |
| TC-122 | My Products list view | E2E | Playwright | Web | P1 | `my-products-page`, `product-card-{id}` | Web-only | |
| TC-045 | My Products preview | E2E | Playwright | Web | P2 | `/my-products` | Web-only | |
| TC-121 | My Products preview — variant product | E2E | Playwright | Web | P2 | `my-products-page`, `variant-value-{attr}-{value}` | Web-only | |
| TC-046 | Delete product | E2E | Playwright | Web | P2 | `delete-product-{id}` | Seller CRUD | |
| TC-047 | Order status pipeline | E2E | Playwright | Web | P0 | `seller-order-action-btn` | Seller smoke | |
| TC-048 | Invalid status transition | API | Playwright-API | Web | P1 | `PUT /api/seller/orders/:id/status` | Transition matrix | |
| TC-049 | Seller cancel order | E2E | Playwright | Web | P1 | `seller-cancel-order-btn` | Cancel UX | |
| TC-050 | Voucher create + apply E2E | E2E | Playwright | Web | P1 | `POST /api/coupons` | End-to-end coupon | |
| TC-051 | Payment/delivery labels | E2E | Playwright | Web | P1 | `seller-order-detail-page` | Display formatting | |
| TC-052 | New order toast | Manual | Manual | Web | P2 | `seller-dashboard` polling | Timing-sensitive; optional Playwright | yes |
| TC-053 | Buyer blocked seller API | API | Playwright-API | Web | P0 | `PUT /api/seller/orders/:id/status` | 403 requireSeller | |
| TC-054 | Cross-seller edit/delete blocked | API | Playwright-API | Web | P1 | `PUT /api/products/:id`, `DELETE /api/products/:id` | 403 ownership (edit + delete) | |
| TC-055 | Protected routes auth | E2E | Playwright | Web | P0 | `/orders`, `/profile`, `/seller` | Auth gate | |
| TC-056 | Insufficient stock 400 | API | Playwright-API | Web | P1 | `POST /api/orders` | Stock validation | |
| TC-057 | Coupon min order 400 | API | Playwright-API | Web | P1 | `POST /api/coupons/validate` | Coupon rules | |
| TC-058 | Description max 200 | API | Playwright-API | Web | P2 | `POST /api/products` | Field validation | |
| TC-059 | Stale cart cleanup | E2E | Playwright | Web | P2 | `cart-page` | Web stale removal | |
| TC-060 | Guest catalog access | E2E | Playwright | Web | P1 | public routes | Overlaps TC-008 | |
| TC-061 | Web 6-step wizard parity | E2E | Playwright | Web | P2 | `add-product-btn` | Parity doc only | |
| TC-062 | Wishlist N/A on web | Blocked | — | Web | P3 | N/A | Mobile-only feature | |
| TC-063 | All cart items checkout | E2E | Playwright | Web | P2 | `checkout-btn` | Web vs mobile parity | |
| TC-107 | Cart GET returns own items | API | Playwright-API | Web | P1 | `GET /api/cart` | Server-side cart smoke | |
| TC-108 | Cart isolation — buyer2 cannot see buyer1 items (API) | API | Playwright-API | Web | P1 | `GET /api/cart` | userId-scoped isolation | |
| TC-109 | Cart isolation — buyer2 sees own empty cart in UI | E2E | Playwright | Web | P1 | `cart-empty`, `cart-item-{id}` | UI reflects server isolation | |
| TC-110 | Order list isolation — buyer2 cannot see buyer1 orders (API) | API | Playwright-API | Web | P1 | `GET /api/orders` | userId-scoped order list | |
| TC-111 | Order detail isolation — buyer2 gets 403 on buyer1 order (API) | API | Playwright-API | Web | P1 | `GET /api/orders/:id` | Ownership enforcement | |
| TC-112 | Order history isolation — buyer2 sees only own orders in UI | E2E | Playwright | Web | P1 | `orders-page`, `order-card-{id}` | UI reflects server isolation | |
| TC-113 | User cannot follow themselves | API | Playwright-API | Web | P1 | `POST /api/users/:id/follow` | 400 self-follow guard | |
| TC-114 | Auth route includes RateLimit headers | API | Playwright-API | Web | P1 | `POST /api/auth/login` | Middleware wired up | |
| TC-115 | API route includes RateLimit headers | API | Playwright-API | Web | P1 | `GET /api/products` | Middleware wired up | |
| TC-116 | RateLimit-Remaining decrements per request | API | Playwright-API | Web | P1 | `GET /api/products` | Counter behaviour | |
| TC-117 | Auth route returns 429 after limit exhausted | API | Playwright-API | Web | P1 | `POST /api/auth/login` | Brute-force guard | Requires `RATE_LIMIT_AUTH_MAX=3` on backend |
| TC-118 | 429 includes Retry-After header | API | Playwright-API | Web | P1 | `POST /api/auth/login` | Client back-off signal | Requires `RATE_LIMIT_AUTH_MAX=3` on backend |
| TC-119 | General API route returns 429 after limit exhausted | API | Playwright-API | Web | P1 | `GET /api/products` | General throttle | Requires `RATE_LIMIT_API_MAX=5` on backend |

---

## 4b. Mobile scenario assignments

| ID | Scenario | Final layer | Tool | Platform | Priority | Source | Rationale | Override |
|----|----------|-------------|------|----------|----------|--------|-----------|----------|
| TC-067 | Mobile login smoke | E2E | Patrol | Mobile | P0 | `keys.auth.*`, `keys.products.*`, `login_test.dart` | S2 baseline — **exists** | |
| TC-068 | Auth gate redirect | E2E | Patrol | Mobile | P0 | `app_router.dart` redirect | Mobile requires login for all routes | |
| TC-069 | Redirect from login when authed | E2E | Patrol | Mobile | P1 | `products_homeScreen` | Auth route guard | |
| TC-070 | Mobile signup (6-char password) | E2E | Patrol | Mobile | P1 | `POST /api/auth/signup` | Divergent from web TC-004 | |
| TC-071 | Mobile logout | E2E | Patrol | Mobile | P1 | Profile sign-out | Session clear | |
| TC-607 | Cart restored on re-login | E2E | Patrol | Mobile | P1 | `GET /api/cart` | Server cart sync | |
| TC-072 | Browse products home | E2E | Patrol | Mobile | P0 | `products_homeScreen` | S2 browse leg | |
| TC-073 | Open cart from products | E2E | Patrol | Mobile | P0 | `AppStrings.openCart` semantics | S2 cart leg — **key missing** | |
| TC-074 | Search products | E2E | Patrol | Mobile | P1 | `products_searchField` | Search filter | |
| TC-075 | Filter by category | E2E | Patrol | Mobile | P1 | Category chips | Catalog filter — **keys missing** | |
| TC-076 | Variant + add to cart | E2E | Patrol | Mobile | P0 | `/products/:id` | P0 buyer path — **keys missing** | |
| TC-609 | Sale strikethrough | E2E | Patrol | Mobile | P1 | Price widgets | UI display | |
| TC-608 | Buyer sees seller listing | E2E | Patrol | Mobile | P0 | `products_homeScreen` | Catalog visibility | |
| TC-610 | Own products hidden | E2E | Patrol | Mobile | P1 | `GET /api/products` | Listing rule | |
| TC-077 | Cart add/update/remove | E2E | Patrol | Mobile | P0 | `cart_screen.dart` | Cart operations — **keys missing** | |
| TC-078 | Cart checkbox subset checkout | E2E | Patrol | Mobile | P0 | Checkbox + route `extra['selected']` | **Mobile-only** critical UX | |
| TC-079 | Checkout disabled — zero selected | E2E | Patrol | Mobile | P1 | `selectedCount == 0` | Negative UX | |
| TC-080 | Select all / deselect all | E2E | Patrol | Mobile | P2 | Header checkbox | Edge case | |
| TC-081 | Per-seller delivery on cart | E2E | Patrol | Mobile | P0 | `extra['deliverySelections']` | Multi-seller cart | |
| TC-082 | Voucher via route extra | E2E | Patrol | Mobile | P1 | `extra['voucherSelections']` | Coupon UI path | |
| TC-095 | COD checkout complete | E2E | Patrol | Mobile | P0 | `CheckoutScreen` | P0 mobile checkout smoke | |
| TC-096 | Checkout with saved credit card | E2E | Patrol | Mobile | P1 | `keys.orders.paymentOption` | Saved card path | |
| TC-097 | Checkout with new card entry | E2E | Patrol | Mobile | P1 | `keys.orders.checkoutCardNumberField` | New card path | |
| TC-101 | COD checkout with variant product | E2E | Patrol | Mobile | P1 | `keys.products.variantValue` | Variant + COD | |
| TC-103 | Checkout new CC — variant product | E2E | Patrol | Mobile | P1 | `keys.orders.checkoutCardNumberField` | Variant + new card | |
| TC-104 | Checkout saved CC — variant product | E2E | Patrol | Mobile | P1 | `keys.orders.paymentOption` | Variant + saved card | |
| TC-083 | Multi-seller → 2 orders | Multi | Patrol + Playwright-API | Mobile | P0 | `POST /api/orders` + checkout UI | S4 mobile leg; API shared with TC-025 | |
| TC-084 | Order history + detail | E2E | Patrol | Mobile | P1 | `/orders`, `/orders/:id` | Buyer orders — **keys missing** | |
| TC-085 | Confirm receipt | E2E | Patrol | Mobile | P1 | Confirm received action | Buyer action — **keys missing** | |
| TC-612 | Invalid login error | E2E | Patrol | Mobile | P1 | `auth_loginButton` | Error display | |
| TC-613 | Variant required | E2E | Patrol | Mobile | P1 | Product detail | Validation UX | |
| TC-614 | Qty stock cap | E2E | Patrol | Mobile | P1 | Qty increment | Stock UI cap | |
| TC-086 | Wishlist add/remove | E2E | Patrol | Mobile | P1 | `WishlistBloc`, `/wishlist` | Mobile-only — **keys missing** | |
| TC-087 | Wishlist clear all | E2E | Patrol | Mobile | P2 | `WishlistCleared` | In-memory clear | |
| TC-088 | Follow/unfollow seller | E2E | Patrol | Mobile | P2 | `/seller-profile/:sellerId` | Social UX — **keys missing** | |
| TC-089 | Become seller | E2E | Patrol | Mobile | P0 | `PATCH /api/users/me/seller` | S3 mobile leg | |
| TC-090 | Simple product 7-step wizard | E2E | Patrol | Mobile | P0 | `/seller/add`, `_WizardStepper` | S3 mobile leg — **keys missing** | |
| TC-091 | Variant product 7-step wizard | E2E | Patrol | Mobile | P0 | Variant step 4 | Variant listing — **keys missing** | |
| TC-615 | Seller views simple product in dashboard (Read) | E2E | Patrol | Mobile | P1 | `keys.seller.productTile(id)` — **key missing** | Parity TC-045 (divergent) | |
| TC-616 | Seller edits simple product from dashboard (Update) | E2E | Patrol | Mobile | P1 | `keys.seller.editProductButton(id)` — **key missing** | Parity TC-044 (divergent) | |
| TC-617 | Seller deletes simple product from dashboard (Delete) | E2E | Patrol | Mobile | P1 | `keys.seller.deleteProductButton(id)` — **key missing** | Parity TC-046 (both) | |
| TC-092 | Seller order pipeline | E2E | Patrol | Mobile | P0 | `/seller?tab=orders` | Seller smoke | |
| TC-093 | Seller voucher CRUD + apply | E2E | Patrol | Mobile | P1 | `/seller?tab=vouchers` | End-to-end coupon | |
| TC-094 | Preview as buyer | E2E | Patrol | Mobile | P2 | `/products/:id?hideEdit=1` | Divergent from web TC-045 | |
| TC-611 | Buyer blocked from seller routes | Multi | Patrol + Playwright-API | Mobile | P0 | `GET /api/seller/*` → 403 | Shared API with TC-053 | |
| TC-600 | Auth gate vs web guest | E2E | Patrol | Mobile | P1 | Cold launch redirect | Parity documentation | |
| TC-601 | 7-step wizard step count | E2E | Patrol | Mobile | P2 | `add_edit_product_screen.dart` | Parity vs TC-061 | |
| TC-602 | Checkbox subset parity | E2E | Patrol | Mobile | P2 | TC-078 | Unchecked items remain in cart | |
| TC-603 | Wishlist in-memory only | Blocked | — | Mobile | P3 | No wishlist API | Cannot API-test persistence | |
| TC-604 | Notifications bell stub | Manual | Manual | Mobile | P3 | `onPressed: () {}` | No behavior to automate | yes |
| TC-605 | Seller order notification + deep link | Manual | Manual / Patrol | Mobile | P2 | `NotificationService`, polling | Native notification timing | yes |
| TC-606 | 6-char password accepted | E2E | Patrol | Mobile | P2 | Signup form | Parity vs TC-004 | |

---

## 5. Implementation order (for `/generate-tests`)

### Phase 1 — P0 foundation (API + smoke)
1. **API:** `health.api.spec.ts` (exists) → `orders.api.spec.ts` — TC-026, TC-053, TC-025 (API leg)
2. **API:** `coupons.api.spec.ts` — TC-057
3. **E2E Web:** Extend `login.spec.ts` — TC-001, TC-007, TC-055
4. **E2E Web:** `checkout.spec.ts` — S1 / TC-022, TC-016
5. **E2E Web:** `cart.spec.ts` — TC-021, TC-018

### Phase 2 — P0 seller + catalog
6. **E2E Web:** `seller/onboarding.spec.ts` — TC-041
7. **E2E Web:** `seller/product-wizard.spec.ts` — S3 / TC-042, TC-064
8. **E2E Web:** `products/catalog.spec.ts` — TC-065, TC-008, TC-013
9. **E2E Web:** `seller/orders.spec.ts` — TC-047, S4 (E2E leg)

### Phase 3 — P1 API batch
10. **API:** `orders.api.spec.ts` — TC-033, TC-048, TC-056, TC-032 (API leg)
11. **API:** `reviews.api.spec.ts` — TC-035, TC-036
12. **API:** `products.api.spec.ts` — TC-054, TC-058
13. **API:** `coupons.api.spec.ts` — TC-020 (API leg)

### Phase 4 — P1 E2E remainder
14. **E2E Web:** `checkout.spec.ts` — TC-023, TC-024, TC-029, TC-025 (E2E leg)
15. **E2E Web:** `cart.spec.ts` — TC-019, TC-020 (E2E leg), TC-017
16. **E2E Web:** `orders/buyer.spec.ts` — TC-030, TC-031, TC-032, TC-034, TC-039
17. **E2E Web:** `seller/vouchers.spec.ts` — TC-050
18. **E2E Web:** `auth.spec.ts` — TC-002, TC-003, TC-004, TC-005, TC-006

### Phase 5 — P2/P3 + manual
19. **E2E Web:** remaining P2 — TC-037, TC-038, TC-040, TC-043–046, TC-051, TC-059, TC-061, TC-063, TC-066
20. **Manual:** TC-052 (toast polling)
21. **Blocked:** TC-062 (wishlist — mobile only)

### Phase 6 — Mobile P0 (Patrol)

**Prerequisite:** Add `ValueKey`s per `ui-selectors.md` — cart, checkout, orders, seller, wishlist.

22. **Patrol keys:** `lib/features/cart/keys.dart`, `checkout/keys.dart`, `orders/keys.dart`, `seller/keys.dart`, `wishlist/keys.dart` → register in `lib/keys.dart`
23. **Patrol:** Extend `login_test.dart` → S2 / TC-067, TC-072, TC-073
24. **Patrol:** `auth_gate_test.dart` — TC-068, TC-069
25. **Patrol:** `product_detail_test.dart` — TC-076
26. **Patrol:** `cart_checkbox_test.dart` — TC-078, TC-079, TC-080
27. **Patrol:** `checkout_cod_test.dart` — TC-095 (S2 completion path)
28. **Patrol:** `seller/onboarding_test.dart` — TC-089
29. **Patrol:** `seller/product_wizard_test.dart` — S3 / TC-090, TC-091
30. **Patrol:** `seller/orders_test.dart` — TC-092
31. **Patrol:** `multi_seller_checkout_test.dart` — S4 / TC-083 (+ shared API TC-025)
32. **Patrol:** `catalog_test.dart` — TC-608, TC-610

### Phase 7 — Mobile P1/P2 + manual

33. **Patrol:** `auth_test.dart` — TC-070, TC-071, TC-607, TC-612, TC-606
34. **Patrol:** `browse_test.dart` — TC-074, TC-075, TC-609
35. **Patrol:** `cart_delivery_voucher_test.dart` — TC-077, TC-081, TC-082
36. **Patrol:** `orders_test.dart` — TC-084, TC-085, TC-613, TC-614
37. **Patrol:** `wishlist_test.dart` — TC-086, TC-087
38. **Patrol:** `seller/vouchers_test.dart` — TC-093
39. **Patrol:** parity tests — TC-600, TC-601, TC-602, TC-094, TC-088
40. **Manual:** TC-604 (bell stub), TC-605 (local notifications)
41. **Blocked:** TC-603 (wishlist persistence — no API)

---

## 6. Contested decisions

| ID | Scenario suggested | Strategy decision | Reason |
|----|-------------------|-------------------|--------|
| TC-012 | E2E Web | E2E only (Component deferred) | No RTL harness; strikethrough assertable in E2E |
| TC-020 | E2E + API | **Multi** — API first | Validate coupon at API; one E2E for error toast |
| TC-025 | E2E + API | **Multi** — API first | Order split is business-critical; E2E confirms UI |
| TC-026 | API | API only (Unit later) | No Vitest yet; add unit for `orderService` when unblocked |
| TC-052 | E2E optional | **Manual** primary | Polling toast flaky; Playwright optional P2 |
| TC-060 | E2E | Keep; overlaps TC-008 | TC-060 documents route list; implement once |
| TC-604 | E2E suggested | **Manual** | Bell is explicit no-op — nothing to assert |
| TC-605 | E2E suggested | **Manual** primary | Native notification + poll timing; Patrol optional P2 |
| TC-083 | E2E only | **Multi** — API + Patrol | Reuse TC-025 API leg for order split proof |

---

## 7. Gaps

| Rule / behavior | Domain ref | Suggested layer | Unblocker |
|-----------------|------------|-----------------|-----------|
| 8% tax pure calculation | §4 Pricing | Unit + API | Extract `calculateTax()` in `orderService.ts`; add Vitest |
| Coupon discount amount math | §6 | Unit + API | Unit test `applyCoupon()` |
| Sale strikethrough component | §5 Display | Component | Add Vitest + RTL in `frontend/` |
| Auto-complete shipped→delivered | §5 Cron | API / Manual | Seed shipped order + mock time or cron integration test |
| Patrol keys for cart/checkout/orders/seller | §11 | E2E Mobile | Phase M1 — add `keys.dart` per feature before Patrol tests |
| Seller cancel variant stock restore | §13 edge | API | API test documenting product-level-only restore |

---

## 8. Anti-patterns

| Issue | Status | Action |
|-------|--------|--------|
| `login_test.dart` only covers mobile login | Existing | Extend Patrol Phase 6 — S2 full flow |
| Pricing tested only at E2E | Avoid | TC-026/027/028 at API first |
| All scenarios at E2E | Avoid | 15 API-only assignments |
| Playwright for TC-062/086 wishlist | N/A | Patrol for TC-086; TC-062 Blocked on web |
| Patrol without keys | **Risk** | 36 of 38 mobile E2E need keys first — Phase M1 |
| API coupon logic in Patrol | Avoid | TC-082 UI only; TC-057 at API |

---

## 9. Blocked items

| ID | Reason | Unblocker |
|----|--------|-----------|
| TC-062 | No web wishlist route | Patrol TC-086 when keys added |
| TC-603 | Wishlist in-memory only | Manual restart test; no API |
| Unit layer (all) | No Vitest/Jest in backend | `npm install -D vitest` + `backend/src/__tests__/` |
| Component layer | No RTL setup | Vitest + `@testing-library/react` in frontend |
| Mobile Patrol (36 TCs) | Missing ValueKeys | Phase M1 — add keys in `frontend-mobile/lib/features/*/keys.dart` |
| TC-052 automation | Polling timing | Manual QA or Playwright with long timeout |
| TC-605 automation | Native notification + poll | Manual primary; Patrol with device permissions optional |

---

## Downstream

| Skill | Input |
|-------|-------|
| `/generate-tests` | This file + filtered views; start **Phase 1** |
| `/review-tests` | Strategy + `docs/test-cases/test-scenarios.md` |
