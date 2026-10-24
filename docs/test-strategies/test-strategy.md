# TokoMart Test Strategy

> **Input mode:** A — from `docs/test-cases/test-scenarios.md` and its web, mobile and API files (256 scenarios: web 108, mobile 78, API 70)  
> **Date:** 2026-08-03; **updated 2026-10-24** (code reviewed on branch `main` at `2251348`; no tests were run for this update)  
> **Platform scope:** Web (Playwright) + Mobile (Patrol) + API, with unit, integration, component and widget layers

---

## 1. Summary

Test strategy for the **full scenario suite**. The 2026-10-24 update:
- assigns a layer to the **95 scenarios added for the authorize-at-checkout, cancellation, refund, saved-address and offline features** (TC-137–231, new §4c),
- assigns the **23 older scenarios the strategy had never listed** (TC-099–100, TC-102, TC-105–106, TC-123–136, TC-621–624; new §4d),
- corrects the tooling status (the unit, integration, component and widget layers **now exist**, so most new rules are pushed down to them),
- adds an **Integration** layer (backend tests against a MongoDB replica set with Stripe mocked), and an automation status map (§10).

**Tooling status (verified by listing the repo on 2026-10-24; none of these suites were run for this update):**
| Tool | Status |
|------|--------|
| Playwright web | `e2e-testing/tests/web/` — 16 specs (buyer, seller, mixed); only some carry `TC-` tags (§10) |
| Playwright API | `e2e-testing/tests/api/` — 12 specs (auth, cart, orders, security, rate limit, webhook, …) |
| Patrol mobile | `frontend-mobile/patrol_test/` — 19 tests (auth, seller CRUD, buyer checkout incl. manual-capture) |
| Unit | **Exists** — backend Vitest (30 unit files), web Vitest (24 files incl. utils) |
| Integration | **Exists** — backend `vitest.integration.config.ts` (26 files; replica set only, Stripe mocked) and `npm run test:contracts` |
| Component | **Exists** — web RTL (refund components) and Flutter widget tests (36 files) |
| Patrol keys | **Partial** — `auth`, `products`, `orders`, `seller`, `cart.checkoutButton` exist; refund screens, saved-address/payment-methods, offline have none |

**Key strategy choices:**
- Push pricing, auth, status codes, and coupon rules to **API** layer (shared web + mobile)
- Push **state machines and money rules** (acceptance, capture, cancellation, refund allocation, webhooks) to **Integration**: they need real transactions and races that HTTP cannot reproduce
- Push **presentation rules** (payment notices, button visibility, chips, tabs, deadlines) to **Unit/Component**; keep one E2E journey per flow
- Keep multi-page buyer/seller journeys at **E2E** (Playwright web / Patrol mobile); smoke flows S5–S7 get exactly one E2E leg each
- **Multi-layer** for revenue-critical flows (multi-seller orders, card authorization, capture, cancellation, refunds)
- Treat existing test files as **candidates**: a file with a matching name exists, but its assertions were not compared with the scenario; check before claiming coverage
- Playwright and Patrol steps are the owner's work (AGENTS.md rule 1); the app-side layers can be done by an agent

---

## 2. Pyramid distribution

Counts are recomputed from the assignment tables in §4–§4d (256 scenarios, each counted once by its primary layer). Run times were not measured for this update.

| Layer | Count | Focus | Tool |
|-------|-------|-------|------|
| Unit | 10 | Pure rules: payment notices, deadlines, button visibility, refund validators and shipping, query rules | Vitest (backend, web) |
| Integration | 7 | Acceptance deadline, races, seller-cancel edge shapes, refund eligibility, webhooks, flag off | Vitest, `vitest.integration.config.ts` (replica set, Stripe mocked) |
| API | 51 | Orders, coupons, auth, reviews, rate limiting, cancellation, refund and checkout-session contracts, isolation | Playwright `request` |
| Component / widget | 13 | Refund panels, chips, tabs, notices, offline banner, seller dialogs | Vitest + RTL, `flutter_test` |
| E2E Web | 72 | Auth, cart, checkout, seller wizard, catalog, pagination, saved addresses, Stripe checkout | Playwright `page` |
| E2E Mobile | 59 | Auth gate, cart checkbox, checkout, 7-step wizard, seller CRUD, new settings screens | Patrol |
| Multi (≥ 2 layers) | 37 | Web 17 · Mobile 8 · API 12: card authorization, capture, cancellation, refunds, multi-seller | Mixed |
| Manual / Blocked | 7 | Manual: TC-052, TC-178, TC-189, TC-604, TC-605 · Blocked: TC-062, TC-603 | — |

*E2E is 131 of 256 scenarios (51%) before counting the E2E legs inside the 37 Multi rows, so the pyramid is still top-heavy. The 95 scenarios added in 2026-10 are better shaped: 10 E2E, 30 Multi, 23 API, 13 Component, 10 Unit, 7 Integration, 2 Manual. The older E2E-heavy block is a candidate for pushing logic down; see §8.*

---

## 3. Smoke assignments (S1–S7)

| ID | Scenario | Final layer | Tool | Platform | Priority | Source | Rationale |
|----|----------|-------------|------|----------|----------|--------|-----------|
| S1 | Login → cart → checkout COD → order history | Multi | Playwright + Playwright-API | Web | P0 | TC-001, TC-016, TC-022, TC-098; `checkout.spec.ts`, `variant-checkout.spec.ts` | P0 buyer smoke; variant path in TC-098 |
| S2 | Mobile login → browse → cart | E2E | Patrol | Mobile | P0 | TC-067, TC-072, TC-073; `login_test.dart` | Extend existing Patrol; keys partial |
| S3 | Become seller → simple + variant listing | Multi | Playwright + Patrol | Both | P0 | Web: TC-041, TC-042, TC-064 · Mobile: TC-089, TC-090, TC-091 | Divergent wizards (6 vs 7 steps) |
| S4 | 2-seller cart → 2 orders | Multi | Playwright-API + Playwright/Patrol | Both | P0 | API: TC-025 · Web E2E: TC-021/025 · Mobile E2E: TC-083 | API proves split; platform E2E confirms UI |
| S5 | Card checkout reserves the amount → seller accepts → payment captured | Multi | Integration + Playwright-API + Playwright + Patrol | Both | P0 | Web: TC-143, TC-155 · Mobile: TC-176, TC-182 · API: TC-199 · Integration: `orderCapture.integration.test.ts` | Money-critical: integration proves exact capture; one E2E per platform; needs `CHECKOUT_FLOW=manual_capture` |
| S6 | Pending order cancelled by buyer and by seller; hold released | Multi | Integration + Playwright-API + Playwright + Patrol | Both | P0 | Web: TC-152, TC-157 · Mobile: TC-180, TC-183 · API: TC-205, TC-209 | Release and restore-once are backend rules; E2E shows dialogs and notices |
| S7 | Delivered order → refund requested → seller approves → refund settles | Multi | Integration + Playwright-API + Playwright + Patrol | Both | P0 | Web: TC-162, TC-164 · Mobile: TC-185, TC-186 · API: TC-223 · Integration: `deliveredRefund.integration.test.ts` | Allocation and settlement are backend; one E2E (Stripe test mode) per platform; needs `DELIVERED_REFUNDS_ENABLED=true` |

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
| TC-023 | Checkout saved card | E2E | Playwright | Web | P1 | `payment-section` | Saved payment; result depends on `CHECKOUT_FLOW` (legacy charges, `manual_capture` holds, see TC-144) | |
| TC-024 | Checkout new card | E2E | Playwright | Web | P1 | `payment-section` | Card validation UX; Stripe `CardElement`; under `manual_capture` see TC-143 | |
| TC-098 | Checkout COD with variant product | E2E | Playwright | Web | P0 | `variant-value-*`, `variant-checkout.spec.ts` | API setup + buyer COD; order variant assert | |
| TC-025 | Multi-seller → 2 orders | Multi | Playwright-API + Playwright | Web | P0 | `POST /api/orders` | API split + E2E history | |
| TC-026 | Order total formula | API | Playwright-API | Web | P0 | `POST /api/orders`, `orderService.ts` | Pricing truth source | |
| TC-027 | Shipping $9.99 under $50 | API | Playwright-API | Web | P1 | `POST /api/orders` | Default shipping rule | |
| TC-028 | Free shipping ≥ $50 | API | Playwright-API | Web | P1 | `POST /api/orders` | Shipping threshold | |
| TC-029 | Missing address blocked | E2E | Playwright | Web | P1 | `shipping-section` | Form validation | |
| TC-030 | Order history tabs | E2E | Playwright | Web | P1 | `order-tab-{key}` | Status filters; tabs now include Return/Refund and All; filter logic already unit-tested (`utils/orderTabs.test.ts`), so keep one E2E | |
| TC-031 | Confirm receipt | E2E | Playwright | Web | P1 | `confirm-received-btn` | Buyer action | |
| TC-032 | Buyer cancel pending | Multi | Playwright + Playwright-API + Integration | Web | P1 | `PUT /api/orders/:id/status`; `orderCancellation.integration.test.ts` | E2E UX + API stock restore; pending-only, confirm dialog; card/COD detail in TC-152, TC-153 | |
| TC-033 | Cancel processing blocked | API | Playwright-API | Web | P1 | `PUT /api/orders/:id/status` | Pending-only rule: 400 on legacy-shape orders, 409 `cancellation_conflict` on manual-capture/COD (see TC-206) | |
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
| TC-047 | Order status pipeline | E2E | Playwright | Web | P0 | `seller-order-action-btn` | Seller smoke; `pending → preparing` is now the acceptance/capture step (TC-155) | |
| TC-048 | Invalid status transition | API | Playwright-API | Web | P1 | `PUT /api/seller/orders/:id/status` | Transition matrix; `shipped → cancelled` removed (TC-212); unit exists (`sellerTransitions.test.ts`) | |
| TC-049 | Seller cancel order | Multi | Playwright + Playwright-API + Integration | Web | P1 | `seller-cancel-order-btn`; TC-209–213 | Rule is split by state (pending needs a reason and the server flag; later COD only); backend rules go to API/integration | yes |
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
| TC-096 | Checkout with saved credit card | E2E | Patrol | Mobile | P1 | `keys.orders.paymentOption` | Saved card path; under `manual_capture` it holds, not charges (TC-176) | |
| TC-097 | Checkout with new card entry | E2E | Patrol | Mobile | P1 | `keys.orders.checkoutCardNumberField` | New card path; authorization disclosure shown (TC-176) | |
| TC-101 | COD checkout with variant product | E2E | Patrol | Mobile | P1 | `keys.products.variantValue` | Variant + COD | |
| TC-103 | Checkout new CC — variant product | E2E | Patrol | Mobile | P1 | `keys.orders.checkoutCardNumberField` | Variant + new card | |
| TC-104 | Checkout saved CC — variant product | E2E | Patrol | Mobile | P1 | `keys.orders.paymentOption` | Variant + saved card | |
| TC-083 | Multi-seller → 2 orders | Multi | Patrol + Playwright-API | Mobile | P0 | `POST /api/orders` + checkout UI | S4 mobile leg; API shared with TC-025 | |
| TC-084 | Order history + detail | E2E | Patrol | Mobile | P1 | `/orders`, `/orders/:id` | Buyer orders — **keys missing**; tabs now include Return/Refund (unit/widget tests exist: TC-187) | |
| TC-085 | Confirm receipt | E2E | Patrol | Mobile | P1 | `PUT /api/orders/:id/confirm-received` | Buyer action — **keys missing**; also starts the refund window (TC-227) | |
| TC-612 | Invalid login error | E2E | Patrol | Mobile | P1 | `auth_loginButton` | Error display | |
| TC-613 | Variant required | E2E | Patrol | Mobile | P1 | Product detail | Validation UX | |
| TC-614 | Qty stock cap | E2E | Patrol | Mobile | P1 | Qty increment | Stock UI cap | |
| TC-086 | Wishlist add/remove | E2E | Patrol | Mobile | P1 | `WishlistBloc`, `/wishlist` | Mobile-only — **keys missing** | |
| TC-087 | Wishlist clear all | E2E | Patrol | Mobile | P2 | `WishlistCleared` | In-memory clear | |
| TC-088 | Follow/unfollow seller | E2E | Patrol | Mobile | P2 | `/seller-profile/:sellerId` | Social UX — **keys missing** | |
| TC-089 | Become seller | E2E | Patrol | Mobile | P0 | `PATCH /api/users/me/seller` | S3 mobile leg | |
| TC-090 | Simple product 7-step wizard | E2E | Patrol | Mobile | P0 | `/seller/add`, `_WizardStepper` | S3 mobile leg — **keys missing** | |
| TC-091 | Variant product 7-step wizard | E2E | Patrol | Mobile | P0 | Variant step 4 | Variant listing — **keys missing** | |
| TC-615 | Seller views simple product in dashboard (Read) | E2E | Patrol | Mobile | P1 | `keys.seller.productTile(id)` (exists) | Parity TC-045 (divergent) | |
| TC-616 | Seller edits simple product from dashboard (Update) | E2E | Patrol | Mobile | P1 | `keys.seller.editProductButton(id)` (exists) | Parity TC-044 (divergent) | |
| TC-617 | Seller deletes simple product from dashboard (Delete) | E2E | Patrol | Mobile | P1 | `keys.seller.deleteProductButton(id)` (exists) | Parity TC-046 (both) | |
| TC-618 | Seller views variant product in dashboard (Read) | E2E | Patrol | Mobile | P1 | `keys.seller.productTile(id)` (exists); `SellerApiClient.createVariantProduct()` — **method missing** | Divergent (no web equivalent) | |
| TC-619 | Seller edits variant product from dashboard (Update) | E2E | Patrol | Mobile | P1 | `keys.seller.editProductButton(id)` (exists); `keys.seller.wizardVariantPriceField(label)` (exists) | Parity TC-120 (both) | |
| TC-620 | Seller deletes variant product from dashboard (Delete) | E2E | Patrol | Mobile | P1 | `keys.seller.deleteProductButton(id)` (exists) | Parity TC-046 (both) | |
| TC-092 | Seller order pipeline | E2E | Patrol | Mobile | P0 | `/seller?tab=orders`; `keys.seller.acceptOrderButton(id)` | Seller smoke; first step is now "Accept & start preparing" (TC-182) | |
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

## 4c. Scenarios added 2026-10-24 and previously unassigned scenarios

> **Layers:** Unit and Component run in Vitest (backend/web) or `flutter_test`; **Integration** is the backend suite in `vitest.integration.config.ts` (replica set, Stripe mocked, never the 27017 database); API is Playwright `request`; E2E is Playwright (web) or Patrol (mobile).
> **Existing coverage** lists files that exist in the repo and look relevant by name. They are *candidates*: their assertions were not compared with the scenario and none were run for this update. "Exists (tagged)" means the spec references the `TC-` id. "None" means no matching file was found.
> **Override** `yes` means the layer differs from the scenario's `Suggested Layer`/`Automation`; the reason is in §6.

### 4c-1. Web (TC-137–171)

| ID | Scenario | Final layer | Tool | Platform | Priority | Source | Rationale | Override | Existing coverage |
|----|----------|-------------|------|----------|----------|--------|-----------|----------|-------------------|
| TC-137 | Save a new address at checkout | E2E | Playwright | Web | P1 | `Checkout.tsx` save-address checkbox; `POST /api/auth/saved-addresses` | Cross-page (checkout → profile); API leg is TC-190 |  | None |
| TC-138 | Edit a saved address in the profile | Multi | Playwright + Playwright-API | Web | P1 | `Profile.tsx` edit form; `PUT /api/auth/saved-addresses/:id` | API proves persistence (TC-190); one E2E proves the UI |  | None |
| TC-139 | Saved address edit requires street and city | E2E | Playwright | Web | P2 | `Profile.tsx` inline error | Edit form is private to `Profile.tsx`, so no isolated component test; API leg TC-191 |  | None |
| TC-140 | Set a default address; checkout preselects it | Multi | Playwright + Playwright-API | Web | P2 | `PUT /saved-addresses/:id/default`; checkout preselect | One default rule at API; preselect needs the UI |  | None |
| TC-141 | Delete a saved address (web removes it without a dialog) | E2E | Playwright | Web | P2 | delete control title "Delete address" | Parity record: web has no confirm dialog (mobile TC-174) |  | None |
| TC-142 | Saved cards on the profile — list, set default, delete | Multi | Playwright + Playwright-API | Web | P1 | `SavedCardsCard`; `/api/auth/payment-methods` | Ownership and default at API (TC-192); list UI at E2E |  | None |
| TC-143 | Card checkout with a new card reserves the amount without charging | E2E | Playwright (Stripe test mode) | Web | P0 | `card-authorization-panel`, `place-order-btn`; `/api/checkout/sessions` | Core S5 leg; Stripe Elements needs a real browser |  | Candidate: `web/buyer/card-checkout-authorization.spec.ts`, `stripe-checkout.spec.ts` (untagged) |
| TC-144 | Card checkout with a saved card reserves the amount | E2E | Playwright (Stripe test mode) | Web | P1 | saved-card branch of `Checkout.tsx` | Saved card path differs from new card |  | Candidate: same specs (untagged) |
| TC-145 | Checkout explains the reservation before the buyer pays | Component | Vitest + RTL | Web | P1 | `card-authorization-panel` text | Static copy; assert once in E2E TC-143, not a separate journey | yes | None (no Checkout page test) |
| TC-146 | Declined card places no order and loses nothing | Multi | Vitest (integration) + Playwright | Web | P0 | `checkoutCompensation.integration.test.ts` | Compensation (release, stock restore) is backend logic; E2E only shows the message |  | Candidate: `checkoutCompensation.integration.test.ts` |
| TC-147 | 3-D Secure card completes only after authentication | E2E | Playwright (Stripe test mode) | Web | P1 | Stripe 3DS challenge; `/api/checkout/sessions/:id/confirm` | Needs the Stripe challenge iframe |  | None |
| TC-148 | Multi-seller card checkout holds each seller's amount separately | Multi | Vitest (integration) + Playwright-API + Playwright | Web | P0 | `checkoutAuthorization.integration.test.ts`, `checkoutFinalization.integration.test.ts` | Per-seller intents and all-or-nothing are revenue-critical: integration + API + one E2E |  | Candidate: the two integration files |
| TC-149 | Buyer order detail shows the payment state accurately | Unit | Vitest | Web | P1 | `utils/orderPayment.ts` `paymentStatusNotice` | Pure mapping from payment state to notice text | yes | Candidate: `utils/orderPayment.test.ts` |
| TC-150 | Short card authorization window is disclosed | Unit | Vitest | Web | P3 | `hasShortAcceptanceWindow` | Pure date rule; cannot be reproduced by hand | yes | Candidate: `utils/orderPayment.test.ts` (hasShortAcceptanceWindow cases) |
| TC-151 | Interrupted checkout resumes without a second authorization | Unit | Vitest + Manual | Web | P2 | `utils/checkoutAttempt.ts`, `checkoutSession.ts` | Resume logic is pure; end-to-end interruption stays manual | yes | Candidate: `checkoutAttempt.test.ts`, `checkoutSession.test.ts` |
| TC-152 | Buyer cancels a pending card order — the hold is released | Multi | Vitest (integration) + Playwright-API + Playwright | Web | P0 | `orderCancellation.integration.test.ts`; `PUT /api/orders/:id/status` | Hold release + stock restore once is revenue-critical: integration + API (TC-205) + one E2E |  | Candidate: `orderCancellation.integration.test.ts` |
| TC-153 | Buyer cancels a pending COD order | Multi | Vitest (integration) + Playwright | Web | P1 | `orderService.cod.integration.test.ts` | COD cancel shares the atomic claim; E2E shows dialog and result |  | Candidate: `orderService.cod.integration.test.ts` |
| TC-154 | Cancel is unavailable once the seller accepts; "Keep Order" cancels nothing | Unit | Vitest + Playwright | Web | P1 | `canBuyerCancel` in `orderPayment.ts` | Button visibility is a pure function; keep one E2E for the dialog | yes | Candidate: `utils/orderPayment.test.ts` (canBuyerCancel) |
| TC-155 | Seller accepts a pending card order — payment is captured | Multi | Vitest (integration) + Playwright-API + Playwright | Web | P0 | `orderAcceptance.integration.test.ts`, `orderCapture.integration.test.ts` | Capture of exactly the held amount is money-critical; S5 needs one E2E |  | Candidate: the two integration files |
| TC-156 | Seller sees the acceptance deadline only while the order is pending | Unit | Vitest | Web | P2 | `utils/sellerAcceptance.ts`, `acceptanceDeadline` | Pure deadline presentation | yes | Candidate: `sellerAcceptance.test.ts`, `orderPayment.test.ts` |
| TC-157 | Seller cancels a pending card order with a reason — hold released, buyer sees why | Multi | Vitest (integration) + Playwright-API + Playwright | Web | P0 | `sellerCancellation.integration.test.ts`; `seller-cancel-*` ids | Release + audit fields are backend; S6 needs one E2E |  | Candidate: `sellerCancellation.integration.test.ts` |
| TC-158 | Seller pending cancellation needs a valid reason | API | Playwright-API | Web | P1 | `PUT /api/seller/orders/:id/status` (TC-210) | Reason rule (1–1000) is server-enforced; dialog message is covered by the mobile/web unit tests | yes | Candidate: `sellerCancellation.integration.test.ts`, `services/sellerService.test.ts` |
| TC-159 | Seller cancels a pending COD order without any Stripe request | Multi | Vitest (integration) + Playwright | Web | P1 | `sellerCancellation.integration.test.ts` (COD) | Zero-Stripe-call guarantee is backend; E2E confirms the UI path |  | Candidate: `sellerCancellation.integration.test.ts` |
| TC-160 | Seller cannot cancel from shipped, and cannot cancel card orders after pending | Unit | Vitest + Playwright-API | Web | P1 | `canSellerCancel`; `VALID_TRANSITIONS` | Visibility is pure; the rule itself is API (TC-212) | yes | Candidate: `orderPayment.test.ts`, `sellerTransitions.test.ts` |
| TC-161 | Refund request is offered for a delivered card order inside the 7-day window | Component | Vitest + RTL | Web | P1 | `RefundRequestPanel.tsx`; `GET /refund-eligibility` | Panel states are component logic; eligibility is API (TC-214) | yes | Candidate: `components/orders/RefundRequestPanel.test.tsx` |
| TC-162 | Buyer submits a partial refund request | Multi | Vitest (integration) + Playwright-API + Playwright | Web | P0 | `refundRequest.integration.test.ts`, `refundAllocation.test.ts` | Server-side amount allocation is money-critical; S7 needs one E2E |  | Candidate: `refundRequest.integration.test.ts`, `refundAllocation.test.ts`, `RefundRequestForm.test.tsx` |
| TC-163 | Refund form validation | Component | Vitest + RTL | Web | P1 | `RefundRequestForm.tsx` | Form validation is component logic | yes | Candidate: `RefundRequestForm.test.tsx`, `refundValidators.test.ts` |
| TC-164 | Seller approves a refund request — refund settles | Multi | Vitest (integration) + Playwright-API + Playwright | Web | P0 | `deliveredRefund.integration.test.ts`; `refund-group-*` | Settlement and aggregates are backend; S7 needs one E2E (Stripe test mode) |  | Candidate: `deliveredRefund.integration.test.ts`, `RefundRequestReview.test.tsx` |
| TC-165 | Seller rejects a refund request with a required explanation | Component | Vitest + RTL | Web | P1 | `RefundRequestReview.tsx` | Reject-needs-reason is component state; API leg TC-224 | yes | Candidate: `components/seller/RefundRequestReview.test.tsx` |
| TC-166 | Only one active request per order; a second request follows resolution | API | Playwright-API | Web | P1 | `POST /api/orders/:id/refund-requests` (TC-218) | Active-request rule is server-side | yes | Candidate: `refundRequest.integration.test.ts` |
| TC-167 | Shipping is refunded only with the last paid unit for a seller-fault reason | Unit | Vitest | Web | P2 | `refundShipping.ts`; `utils/refund.ts` `refundShippingQuote` | Pure rule over reason and selection | yes | Candidate: `refundShipping.test.ts`, `utils/refund.test.ts` |
| TC-168 | Refund chips and order tabs reflect refund state | Component | Vitest + RTL | Web | P1 | `RefundChip`, `OrderRefundBadge`, `utils/orderTabs.ts` | Presentation and tab filter are pure/component logic | yes | Candidate: `RefundPresentation.test.tsx`, `OrderRefundBadge.test.tsx`, `RefundItemMark.test.tsx`, `orderTabs.test.ts`, `refund.test.ts` |
| TC-169 | Refund is unavailable when the order is not eligible | API | Playwright-API | Web | P1 | `refund-eligibility` reasons (TC-215, TC-219) | Ineligibility is a server decision; UI text is covered by `refund.test.ts` | yes | Candidate: `refundEligibility.integration.test.ts` |
| TC-170 | Seller Return/Refund tab groups requests and shows a badge | Component | Vitest + RTL | Web | P2 | `RefundRequestReview.tsx` groups and badge | Grouping is component logic | yes | Candidate: `RefundRequestReview.test.tsx` |
| TC-171 | Offline banner appears when the connection drops | Component | Vitest + RTL | Web | P2 | `OfflineBanner.tsx`, `useOnlineStatus` | Small component; Playwright `setOffline` optional | yes | None |

### 4c-2. Mobile (TC-172–189)

| ID | Scenario | Final layer | Tool | Platform | Priority | Source | Rationale | Override | Existing coverage |
|----|----------|-------------|------|----------|----------|--------|-----------|----------|-------------------|
| TC-172 | Save a new address at checkout (mobile) | E2E | Patrol | Mobile | P1 | `orders_checkoutNewAddressOption`; save toggle (key missing) | Cross-screen; needs a key on the toggle |  | None |
| TC-173 | Edit a saved address (mobile) | E2E | Patrol | Mobile | P1 | address bottom sheet (keys missing) | Sheet is private to `profile_screen.dart` |  | None |
| TC-174 | Deleting a saved address asks for confirmation (mobile) | E2E | Patrol | Mobile | P2 | delete confirm dialog (key missing) | Parity record vs web TC-141 |  | None |
| TC-175 | Payment Methods screen — list, set default, delete a card (mobile) | E2E | Patrol | Mobile | P1 | `payment_methods_screen.dart` | Needs real saved cards; no widget test exists |  | None |
| TC-176 | Card checkout reserves the amount and explains it (mobile) | Multi | flutter_test + Patrol | Mobile | P0 | `payment_bloc_checkout_session_test.dart`; `keys.orders.paymentSubmitButton` | Session payload and bloc are unit-testable; one Patrol per card mode |  | Candidate: `payment_bloc_checkout_session_test.dart`, `checkout_session_payload_test.dart`, Patrol `manual_capture_*_card_verification_test.dart` (untagged) |
| TC-177 | Declined card places no order (mobile) | Component | flutter_test | Mobile | P1 | `payment_bloc.dart` error state | Decline handling is bloc logic; no E2E needed beyond TC-146 | yes | Candidate: `payment_bloc_test.dart` |
| TC-178 | 3-D Secure card on mobile | Manual | Manual | Mobile | P1 | Stripe native 3DS sheet | Open item M4: no Patrol flow; native sheet |  | None |
| TC-179 | Buyer order detail shows payment notices (mobile) | Component | flutter_test | Mobile | P1 | `order_payment_notice.dart`, `order_payment_notice_card.dart` | Notice mapping is pure | yes | Candidate: `order_payment_notice_test.dart`, `order_payment_notice_card_test.dart`, `cancelled_by_seller_notice_test.dart` |
| TC-180 | Buyer cancels a pending order (mobile) | Multi | Playwright-API + Patrol | Mobile | P0 | `orders_cancelOrderButton` (exists); TC-205 | API proves release/restore; Patrol proves the dialog |  | None (key exists) |
| TC-181 | No cancel after the seller accepts (mobile) | Component | flutter_test | Mobile | P2 | `OrderEntity` cancel eligibility | Visibility rule; no separate journey | yes | Candidate: `order_model_payment_test.dart` (verify) |
| TC-182 | Seller accepts a pending card order (mobile) | Multi | flutter_test + Patrol | Mobile | P0 | `seller_acceptOrderButton_<id>`, `seller_acceptDeadlineText_<id>` | Widget tests cover states; one Patrol is the S5 mobile leg |  | Candidate: `seller_dashboard_accept_test.dart`, `seller_acceptance_test.dart` |
| TC-183 | Seller cancels a pending order with a required reason (mobile) | Multi | flutter_test + Patrol | Mobile | P0 | `seller_cancelOrderButton_<id>`, `seller_cancelReasonField` | Dialog validation is widget-level; one Patrol is the S6 mobile leg |  | Candidate: `seller_dashboard_cancel_test.dart`, `seller_cancellation_test.dart`, `seller_bloc_cancel_test.dart` |
| TC-184 | Cancel is hidden when the seller may not cancel (mobile) | Component | flutter_test | Mobile | P2 | `SellerOrderData.canCancel` | Pure visibility rule | yes | Candidate: `seller_cancellation_test.dart` |
| TC-185 | Buyer requests a refund for a delivered order (mobile) | Multi | flutter_test + Patrol | Mobile | P0 | `refunds/presentation/refund_request_panel.dart` (keys missing) | Form states are widget-level; one Patrol is the S7 mobile leg |  | Candidate: `refund_request_form_test.dart`, `refund_widgets_test.dart`, `refund_bloc_test.dart` |
| TC-186 | Seller approves or rejects a refund request (mobile) | Multi | flutter_test + Patrol | Mobile | P0 | `refund_review_panel.dart` (keys missing) | Decision UI is widget-level; one Patrol for S7 |  | Candidate: `seller_dashboard_refund_tab_test.dart`, `refund_lists_scroll_test.dart` |
| TC-187 | Return/Refund tab and Complete tab behaviour (mobile) | Component | flutter_test | Mobile | P1 | `ordersForTab`, `orders_screen.dart` tabs | Tab filter is pure | yes | Candidate: `order_tabs_test.dart`, `orders_screen_tabs_test.dart` |
| TC-188 | Offline banner (mobile) | Component | flutter_test + Manual | Mobile | P2 | `ConnectivityCubit`, `offline_banner.dart` | Cubit and banner are unit-testable; airplane-mode check stays manual | yes | None |
| TC-189 | Interrupted card checkout resumes (mobile) | Manual | Manual | Mobile | P2 | `checkout_attempt_store.dart` | Kill/restart timing; store logic is covered indirectly |  | Candidate: `payment_bloc_checkout_session_test.dart` (indirect) |

### 4c-3. API (TC-190–231)

| ID | Scenario | Final layer | Tool | Platform | Priority | Source | Rationale | Override | Existing coverage |
|----|----------|-------------|------|----------|----------|--------|-----------|----------|-------------------|
| TC-190 | Saved address create, update, default and delete | API | Playwright-API | API | P1 | `/api/auth/saved-addresses` | Contract and default rule |  | None |
| TC-191 | Saved address requires street and city | API | Playwright-API | API | P2 | `/api/auth/saved-addresses` | Validation |  | None |
| TC-192 | Saved addresses and cards are scoped to their owner | API | Playwright-API | API | P0 | `/api/auth/saved-addresses/:id`, `/payment-methods/:id` | Ownership (IDOR) |  | None |
| TC-193 | Card order through the old endpoint is refused with 426 | API | Playwright-API + Vitest | API | P0 | `checkoutFlowGuard.ts` `rejectLegacyCardOrder` | Guard unit-tested; API proves wiring on the route |  | Candidate: `middleware/__tests__/checkoutFlowGuard.test.ts` |
| TC-194 | Client-trusted payment intent is refused with 426 | API | Playwright-API + Vitest | API | P0 | `rejectLegacyCardIntent` | Same guard on `create-intent` |  | Candidate: `checkoutFlowGuard.test.ts` |
| TC-195 | Checkout session prices from the server, never from the client | Multi | Vitest + Playwright-API | API | P0 | `checkoutPricing.ts`, `checkoutRequestValidation.ts` | Pricing is pure; API proves the client cannot override |  | Candidate: `checkoutPricing.test.ts`, `checkoutRequestValidation.test.ts` |
| TC-196 | Checkout session is idempotent | Multi | Vitest (integration) + Playwright-API | API | P1 | `checkoutService.integration.test.ts` | Idempotency needs real transactions; one API replay |  | Candidate: `checkoutService.integration.test.ts`, `checkoutFinalization.integration.test.ts` |
| TC-197 | Checkout sessions and saved cards are owner-only | API | Playwright-API | API | P0 | `checkoutRoutes.ts` owner checks | IDOR on sessions and saved cards |  | Candidate: `checkoutSessionRead.integration.test.ts`, `checkoutController.test.ts` |
| TC-198 | Insufficient stock aborts the whole session | API | Playwright-API | API | P1 | `POST /api/checkout/sessions` stock | Extends TC-056 to sessions |  | Candidate: `checkoutCompensation.integration.test.ts` |
| TC-199 | Seller accept captures exactly the held amount | Multi | Vitest (integration) + Playwright-API | API | P0 | `orderCapture.integration.test.ts` | Exact-amount capture; API in Stripe test mode |  | Candidate: `orderCapture.integration.test.ts`, `orderAcceptance.integration.test.ts` |
| TC-200 | Repeat or late accept returns 409 `order_not_pending` | API | Playwright-API | API | P1 | `orderAcceptance.ts` `order_not_pending` | Status code and code string |  | Candidate: `orderAcceptance.test.ts` |
| TC-201 | Another seller cannot accept or cancel the order | API | Playwright-API | API | P0 | `not_order_seller` | Seller IDOR |  | Candidate: `orderAcceptance.integration.test.ts` |
| TC-202 | Accept after the deadline is refused | Integration | Vitest | API | P1 | `orderAcceptance.integration.test.ts` (clock control) | Needs a controlled clock, which the integration suite has; downgraded from Blocked because the harness exists | yes | Candidate: `orderAcceptance.integration.test.ts` |
| TC-203 | Unaccepted orders are cancelled automatically at the deadline | Integration | Vitest | API | P1 | `acceptanceScanner.integration.test.ts` | Scanner and catch-up need real DB state; keep a manual run with a short interval | yes | Candidate: `acceptanceScanner.integration.test.ts` |
| TC-204 | Accept racing cancel has exactly one winner | Integration | Vitest | API | P1 | `orderCancellation.integration.test.ts`, `orderAcceptance.integration.test.ts` | Races need controlled concurrency; not reproducible through HTTP | yes | Candidate: both files |
| TC-205 | Buyer cancels a pending order; the result is idempotent | Multi | Vitest (integration) + Playwright-API | API | P0 | `PUT /api/orders/:id/status` | Idempotency + release; API in Stripe test mode |  | Candidate: `orderCancellation.integration.test.ts`, `orderService.cod.integration.test.ts` |
| TC-206 | Buyer cancel after acceptance is a conflict | API | Playwright-API | API | P0 | `cancellation_conflict` | Extends TC-033 for the new flow |  | Candidate: `orderCancellation.integration.test.ts` |
| TC-207 | Buyer cancel reason is limited to 500 characters | API | Playwright-API | API | P2 | `invalid_cancel_reason` (500) | Validation |  | Candidate: `controllers/__tests__/*` |
| TC-208 | Buyer cannot cancel someone else's order | API | Playwright-API | API | P0 | `PUT /api/orders/:id/status` 403 | Ownership |  | None |
| TC-209 | Seller cancels a pending order — 200 with the payment operation | Multi | Vitest (integration) + Playwright-API | API | P0 | `sellerCancellation.integration.test.ts` | Response envelope + audit fields |  | Candidate: `sellerCancellation.integration.test.ts` |
| TC-210 | Seller cancel validation and ownership errors | API | Playwright-API | API | P1 | `invalid_cancel_reason`, `not_order_seller`, `order_not_found` | Status codes |  | Candidate: `sellerCancellation.integration.test.ts` |
| TC-211 | Seller cancel conflicts and unsupported order shapes | Integration | Vitest | API | P1 | `sellerCancellation.integration.test.ts` | Legacy-shaped and no-`sellerId` orders cannot be built through the public API | yes | Candidate: `sellerCancellation.integration.test.ts` |
| TC-212 | Seller cannot cancel a shipped order | API | Playwright-API + Vitest | API | P1 | `VALID_TRANSITIONS` | Rule change; unit exists |  | Candidate: `sellerTransitions.test.ts` |
| TC-213 | `canSellerCancelPending` is derived by the server | API | Playwright-API | API | P1 | `canSellerCancelPending` in `GET /api/seller/orders` | Server-derived capability |  | Candidate: `controllers/__tests__/sellerController.test.ts` |
| TC-214 | Refund eligibility for a delivered, captured card order | Multi | Vitest (integration) + Playwright-API | API | P0 | `refundEligibility.integration.test.ts` | Allocation sums + API envelope |  | Candidate: `refundEligibility.integration.test.ts`, `refundAllocation.test.ts` |
| TC-215 | Ineligible refund reasons | Integration | Vitest | API | P1 | `refundEligibility.integration.test.ts` | Most reasons need seeded states (old delivery date, review-needed) that the API cannot create | yes | Candidate: `refundEligibility.integration.test.ts` |
| TC-216 | Refund request body validation | Unit | Vitest | API | P1 | `refundValidators.ts` | Request-body rules are pure; one API smoke is enough | yes | Candidate: `validators/__tests__/refundValidators.test.ts` |
| TC-217 | Refund request idempotency | Multi | Vitest (integration) + Playwright-API | API | P1 | `refundRequest.integration.test.ts` | Idempotency needs real storage; one API replay |  | Candidate: `refundRequest.integration.test.ts` |
| TC-218 | One unresolved refund request per order | API | Playwright-API | API | P1 | `refund_conflict` | Active-request rule |  | Candidate: `refundRequest.integration.test.ts` |
| TC-219 | Refunds can be switched off | Integration | Vitest | API | P1 | `deliveredRefundsEnabled()`; `delivered_refunds_disabled` | Needs a backend started with the flag off; config and controller are unit/integration-testable | yes | Candidate: `config/__tests__/checkout.test.ts`, `refundRequestController.test.ts` |
| TC-220 | Refund amount is never taken from the client | Multi | Vitest + Playwright-API | API | P0 | `refundAllocation.ts` | Allocation math is unit; API proves tampered input is ignored |  | Candidate: `refundAllocation.test.ts`, `refundRequest.integration.test.ts` |
| TC-221 | Buyer isolation on refund endpoints | API | Playwright-API | API | P0 | `/api/orders/:id/refund-*` | Buyer IDOR |  | Candidate: `refundRequestController.test.ts` |
| TC-222 | Seller isolation and role checks on refund decisions | API | Playwright-API | API | P0 | `/api/seller/refund-requests*` | Seller IDOR and role |  | Candidate: `sellerOrderRefunds.integration.test.ts` |
| TC-223 | Approve starts one refund; repeat and races converge | Multi | Vitest (integration) + Playwright-API | API | P0 | `deliveredRefund.integration.test.ts` | Races/duplicates need integration; API in Stripe test mode |  | Candidate: `deliveredRefund.integration.test.ts` |
| TC-224 | Rejection needs an explanation | Multi | Vitest + Playwright-API | API | P1 | `refundValidators.ts` decide rules | Validation unit + status code at API |  | Candidate: `refundValidators.test.ts` |
| TC-225 | A refund does not undo fulfillment | API | Playwright-API | API | P1 | order after settled refund | State assertions across order, product, coupon |  | Candidate: `deliveredRefund.integration.test.ts` |
| TC-226 | Seller refund list pagination and filters | Unit | Vitest | API | P2 | `sellerRefundListRules` | Query rules are pure | yes | Candidate: `refundValidators.test.ts` |
| TC-227 | Delivery records `deliveredAt` and the 7-day deadline on every path | Multi | Vitest (integration) + Playwright-API | API | P1 | `orderDelivery.ts`, `jobs/autoCompleteOrders.ts` | Three delivery paths; the auto-complete path needs the job harness |  | Candidate: `orderDelivery.integration.test.ts`, `jobs/__tests__/autoCompleteOrders.test.ts` |
| TC-228 | API documentation is served outside production only | Unit | Vitest | API | P2 | `swagger.ts`, `swaggerUi.ts` (`npm run test:contracts`) | Contract tests already guard drift | yes | Candidate: `config/__tests__/swagger.test.ts`, `swaggerUi.test.ts` |
| TC-229 | Stripe webhook rejects an invalid signature | API | Playwright-API | API | P1 | `paymentController.ts` signature check | Security |  | Candidate: `api/stripe-webhook.api.spec.ts` (untagged), `paymentController.test.ts` |
| TC-230 | Payment events never advance fulfillment | Integration | Vitest | API | P1 | `checkoutWebhook.integration.test.ts`, `stripeInboxWorker.integration.test.ts` | Needs signed events; integration suite has them; downgraded from Blocked because the harness exists | yes | Candidate: both files |
| TC-231 | Draft (`awaiting_payment`) orders stay hidden | Multi | Vitest + Playwright-API | API | P1 | `orderVisibility.ts` | Visibility rule is unit; API proves routes honour it |  | Candidate: `orderVisibility.test.ts`, `orderVisibility.integration.test.ts` |

### 4d. Previously unassigned scenarios (23)

| ID | Scenario | Final layer | Tool | Platform | Priority | Source | Rationale | Override | Existing coverage |
|----|----------|-------------|------|----------|----------|--------|-----------|----------|-------------------|
| TC-099 | Variant checkout — insufficient stock (web) | Multi | Playwright-API + Playwright | Web | P1 | `POST /api/orders` variant stock | Stock rule at API (as TC-056); E2E for the message |  | None |
| TC-100 | Cart holds two variants of same product (web) | E2E | Playwright | Web | P1 | `cart-item-*` variant lines | Cart line identity needs the UI |  | None |
| TC-102 | Add to cart blocked without variant — mobile guard (Patrol) | E2E | Patrol | Mobile | P1 | add-to-cart guard on product detail | Overlaps TC-613; implement once |  | None |
| TC-105 | Checkout with new card — variant product (web) | E2E | Playwright | Web | P1 | `web/buyer/variant-checkout.spec.ts` | Variant + new card |  | Exists: `variant-checkout.spec.ts` (tagged) |
| TC-106 | Checkout with saved card — variant product (web) | E2E | Playwright | Web | P1 | `web/buyer/variant-checkout.spec.ts` | Variant + saved card |  | Exists: `variant-checkout.spec.ts` (tagged) |
| TC-123 | Products page — navigate to next page loads different products | E2E | Playwright | Web | P1 | `Pagination.tsx` on `/products` | Server-side numbered pagination |  | None |
| TC-124 | Products page — category filter resets to page 1 | E2E | Playwright | Web | P1 | category filter resets page | Page-reset is UI state |  | None |
| TC-125 | Products page — sort change resets to page 1 | E2E | Playwright | Web | P1 | sort change resets page | Page-reset is UI state |  | None |
| TC-126 | Products page — count label shows total across all pages | E2E | Playwright | Web | P1 | count label | Display |  | None |
| TC-127 | Products page — pagination hidden when results fit on one page | E2E | Playwright | Web | P1 | pagination hidden on one page | Display |  | None |
| TC-128 | MyProducts page — navigate to next page | E2E | Playwright | Web | P1 | `/my-products` client-side pages | Paging maths covered by `pagedList.test.ts` |  | Candidate: `utils/pagedList.test.ts` |
| TC-129 | MyProducts page — category filter resets to page 1 | E2E | Playwright | Web | P1 | `/my-products` filter | Page-reset |  | Candidate: `pagedList.test.ts` |
| TC-130 | MyProducts page — next button disabled on last page | E2E | Playwright | Web | P1 | next disabled on last page | Display |  | Candidate: `pagedList.test.ts` |
| TC-131 | MyProducts page — pagination hidden when products fit on one page | E2E | Playwright | Web | P1 | pagination hidden | Display |  | Candidate: `pagedList.test.ts` |
| TC-132 | Protected routes return 401 with no token | API | Playwright-API | API | P1 | `security.api.spec.ts` | 401 on protected routes |  | Exists: `api/security.api.spec.ts` (tagged) |
| TC-133 | Tampered JWT returns 401 | API | Playwright-API | API | P1 | `security.api.spec.ts` | Tampered JWT |  | Exists (tagged) |
| TC-134 | Seller order list is scoped to own account (IDOR) | API | Playwright-API | API | P1 | `GET /api/seller/orders` | IDOR |  | Exists (tagged) |
| TC-135 | Buyer blocked from all key seller routes | API | Playwright-API | API | P1 | seller routes as buyer | 403 |  | Exists (tagged) |
| TC-136 | Weak password on signup returns 400 | API | Playwright-API | API | P1 | signup weak password | 400 |  | Exists (tagged) |
| TC-621 | Initial product list loads first 20 products | E2E | Patrol | Mobile | P1 | `keys.products.productList` | Divergent from web TC-123 |  | None |
| TC-622 | Scrolling to the bottom loads more products | E2E | Patrol | Mobile | P1 | `keys.products.productList` | Divergent from web TC-123 |  | None |
| TC-623 | Loading spinner visible while fetching more products | E2E | Patrol | Mobile | P1 | `keys.products.loadMoreSpinner` (key may be missing) | Divergent |  | None |
| TC-624 | No further fetch when all products are loaded | E2E | Patrol | Mobile | P1 | `keys.products.loadMoreSpinner` (absent check) | Divergent |  | None |

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

### Phase 8 — 2026-10 features: app-side layers (unit, integration, widget)

These need no Playwright or Patrol and can be done by an agent under AGENTS.md. Run only the file being changed until the owner asks for the full suites.

42. **Verify the candidates.** For each "Existing coverage" file in §4c, check that it really asserts the scenario, then add the `TC-` id to the test name so the strategy traces to it. Start with the P0 rows: `orderCapture`, `orderAcceptance`, `orderCancellation`, `sellerCancellation`, `deliveredRefund`, `refundRequest`, `refundEligibility` integration tests.
43. **Integration (backend):** confirm cases exist for TC-202 (deadline boundary), TC-204 (accept/cancel races), TC-211 (legacy-shaped and no-`sellerId` orders), TC-215 (every ineligible reason), TC-219 (flag off), TC-230 (duplicate, late, out-of-order events). Add the missing ones.
44. **Component (web, Vitest + RTL):** new tests for TC-145 (`card-authorization-panel` copy) and TC-171 (`OfflineBanner`, `useOnlineStatus`). Optional: extract the saved-address edit card from `Profile.tsx` so TC-139 can be tested without a browser.
45. **Widget (mobile, `flutter_test`):** new tests for TC-188 (`ConnectivityCubit`, `offline_banner.dart`) and optionally TC-175 (`payment_methods_screen.dart`) and the saved-address sheet (TC-173).

### Phase 9 — 2026-10 features: API (Playwright-API) — owner

Needs the matching backend flags (see the master scenarios file) and a Stripe test-mode key; never the 27017 database.

46. **P0 security and contract:** TC-193, TC-194 (426 guards), TC-195 (server pricing), TC-197, TC-201, TC-208, TC-221, TC-222 (IDOR/role), TC-192
47. **P0 flows:** TC-199 (capture), TC-205, TC-206 (buyer cancel), TC-209 (seller cancel), TC-214, TC-220, TC-223 (refund)
48. **P1:** TC-190, TC-191, TC-196, TC-198, TC-200, TC-207, TC-210, TC-212, TC-213, TC-217, TC-218, TC-224, TC-225, TC-227, TC-229, TC-231; **P2:** TC-226

### Phase 10 — 2026-10 smoke S5–S7 (E2E) — owner

49. **Web (Playwright):** S5 TC-143 → TC-155; S6 TC-152 → TC-157; S7 TC-162 → TC-164. Tag the existing untagged specs (`card-checkout-authorization.spec.ts`, `stripe-checkout.spec.ts`, `local-payment-settlement.spec.ts`) where they already cover these.
50. **Mobile (Patrol):** first add `ValueKey`s for the refund request and review screens, the save-address toggle, and the payment-methods screen; then S5 TC-176 → TC-182; S6 TC-180 → TC-183; S7 TC-185 → TC-186. The Android build is blocked until the Gradle loopback issue is fixed by the owner.

### Phase 11 — 2026-10 remainder — owner

51. **E2E P1/P2:** saved addresses and cards TC-137–142 (web), TC-172–175 (mobile); TC-146, TC-147, TC-148 (declined, 3DS, multi-seller card); TC-153, TC-154, TC-159, TC-160; TC-161–170 thin E2E only where no component test covers the screen
52. **Manual:** TC-178 (3DS on mobile; open item M4), TC-189 (kill/restart resume), TC-188 airplane-mode check
53. **Previously unassigned (§4d):** pagination TC-123–131 and TC-621–624, variant TC-099, TC-100, TC-102; security TC-132–136 and TC-105/106 are already automated (see §10)

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
| TC-145, TC-149, TC-150, TC-154, TC-156, TC-160 | Playwright / Manual | **Unit / Component** (Vitest) | Pure presentation and visibility rules; `orderPayment.test.ts` and `sellerAcceptance.test.ts` already hold the cases. TC-150 was Manual only because it cannot be reproduced by hand |
| TC-161, TC-163, TC-165, TC-167, TC-168, TC-170 | Playwright | **Component / Unit** | The refund components have RTL tests; keep S7 (TC-162, TC-164) as the E2E legs |
| TC-158, TC-166, TC-169 | Playwright | **API** | The reason, active-request and eligibility rules are server-enforced; the UI only displays them |
| TC-202, TC-204, TC-230 | Blocked | **Integration** | They needed clock control, concurrency or signed Stripe events; the integration suite supplies all three. Not downgraded to Manual |
| TC-203, TC-211, TC-215, TC-219 | Playwright-API / Manual | **Integration** | They need seeded or time-shifted state, orders of an unsupported shape, or a backend started with a flag off; the public API cannot create these |
| TC-216, TC-226, TC-228 | Playwright-API | **Unit** | Validator rules and the OpenAPI contract are pure; `npm run test:contracts` already guards drift |
| TC-177, TC-179, TC-181, TC-184, TC-187 | Patrol | **Component** (`flutter_test`) | Bloc and presentation logic; Patrol only for the S5–S7 legs |
| TC-171, TC-188 | Playwright / Manual | **Component** | Small banner components; a Playwright `setOffline` run is optional, an airplane-mode check stays manual |
| TC-139 | Component would be better | **E2E** | The edit form is private to `Profile.tsx`; extract it (Phase 8, item 44) to move this down |
| TC-143, TC-144 | Playwright | Keep E2E (Stripe test mode) | Stripe Elements needs a real browser; amount and capture rules sit in integration |

---

## 7. Gaps

Rules or behaviours with no assigned or verified test. "Harness exists" means the layer is available in the repo; the test itself still has to be written.

| Rule / behaviour | Domain ref | Suggested layer | Status / unblocker |
|------------------|------------|-----------------|--------------------|
| Offline banner (web `OfflineBanner`, `useOnlineStatus`; mobile `ConnectivityCubit`) | Offline spec 2026-08-06 | Component | **No test found on either platform**; harness exists (TC-171, TC-188) |
| Checkout authorization panel copy (web) | Authorize-capture §Clients | Component | No page-level test for `Checkout.tsx`; harness exists (TC-145) |
| Saved-address and saved-card screens (web `Profile.tsx`, mobile `profile_screen.dart`, `payment_methods_screen.dart`) | §8 Profile | Component / E2E | No component or widget tests; the web edit form is private to the page (TC-139, TC-173, TC-175) |
| Coupon discount amount math | §6 | Unit + API | No backend coupon unit test file was found; only the API check TC-057 exists. Unit-test the percentage cap and fixed `min` rule |
| Sale strikethrough component | §5 Display | Component | Harness now exists; no `ProductCard` test found (TC-012 is E2E only) |
| Seller revenue subtracts confirmed refunds only | Delivered-item refund spec §Clients | Integration / Component | Not tied to a scenario; check `sellerOrderRefunds.integration.test.ts` and add a TC if missing |
| Seller cancel of `preparing`/`processing` COD orders restores product-level stock only | §13 | API / Integration | Known limitation (domain gap 10); document it with a test or fix it |
| Cancellation spec vs code for seller cancel in `preparing` | Seller cancellation spec | Decision | The spec says 409 `cancellation_conflict`; code allows COD and answers `cancellation_unavailable` for cards (TC-160, TC-211). Owner decision needed first |
| `legacy_payment_review` shown to the user | Authorize-capture open items | Component | No client shows a specific message; product gap, not only a test gap |
| Stripe inbox retries forever (no attempt cap) | Open items §9 | Integration | Decision needed (cap or dead-letter) before a test can assert behaviour |
| COD buyers are not told about the 24-hour deadline on mobile (web hides it for any non-manual-capture order) | Open items §9 | Component | Decide intended behaviour; TC-179 records it |
| Test traceability for the Stripe/manual-capture specs | — | — | `card-checkout-authorization.spec.ts`, `stripe-checkout.spec.ts`, `local-payment-settlement.spec.ts`, `stripe-webhook.api.spec.ts` and the Patrol `manual_capture_*` and `local_payment_settlement` tests carry no `TC-` ids (§10) |
| Patrol keys for refund screens, save-address toggle, payment-methods, offline banner | §11 | E2E Mobile | Add `ValueKey`s before any Patrol test for TC-172–175, TC-185–188 |

Closed since the last version: pure 8% tax and pricing math (candidate `checkoutPricing.test.ts`), auto-complete shipped→delivered (candidates `jobs/__tests__/autoCompleteOrders.test.ts`, `orderDelivery.integration.test.ts`), and the "no unit or component harness" blocker.

---

## 8. Anti-patterns

| Issue | Status | Action |
|-------|--------|--------|
| E2E is 131 of 256 scenarios (51%), above the share the pyramid allows | **Risk** | Treat the older E2E block as candidates to push down (TC-001–066 validation and display rules); no new logic-only scenario should be E2E |
| Money state machines (capture, release, refund, webhooks) tested only through the UI | Avoid | Integration first; one E2E per smoke flow (S5–S7) |
| Flag-dependent scenarios run without declaring the flag | **Risk** | Every S5–S7 and TC-143–231 run states `CHECKOUT_FLOW`, `SELLER_SEES_MANUAL_CAPTURE`, `DELIVERED_REFUNDS_ENABLED` (see the scenarios master) |
| Specs with no `TC-` ids | Existing | Tag them (§10) so coverage can be traced to scenarios |
| Pricing tested only at E2E | Avoid | TC-026/027/028 at API; TC-195 at unit + API |
| Playwright for TC-062/086 wishlist | N/A | Patrol for TC-086; TC-062 Blocked on web |
| Patrol without keys | **Risk** | Refund, saved-address, payment-methods and offline screens need keys first |
| API coupon logic in Patrol | Avoid | TC-082 UI only; TC-057 at API |
| Stripe test-mode E2E for rules that integration tests already prove | Avoid | Keep Stripe test mode for S5–S7, TC-146, TC-147 only |

---

## 9. Blocked items

| ID | Reason | Unblocker |
|----|--------|-----------|
| TC-062 | No web wishlist route | Patrol TC-086 when keys added |
| TC-603 | Wishlist in-memory only | Manual restart test; no API |
| TC-178 | No Patrol flow for the Stripe 3DS sheet (open item M4) | Manual until a native-sheet Patrol flow is written |
| Patrol on Android | Build blocked by a Gradle loopback error (per `docs/authorize-capture-open-items.md`) | A system/network change that only the owner can make; an agent must not attempt it |
| Mobile Patrol for refunds, saved addresses, payment methods, offline | Missing `ValueKey`s | Add keys in `lib/features/*/keys.dart` (Phase 10, item 50) |
| Flag-dependent E2E and API runs | Need a replica set and the manual-capture stack (backend 5055, web 5174, database `tokomart_manual` on 27018) | Start that stack as described in `docs/authorize-capture-open-items.md`; never touch 5000/5173 or the 27017 database |
| Stripe webhook scenarios (TC-229, TC-230) in a hosted run | The endpoint must subscribe to `payment_intent.canceled` | Stripe dashboard setup by the owner |
| TC-052 automation | Polling timing | Manual QA or Playwright with long timeout |
| TC-605 automation | Native notification + poll | Manual primary; Patrol with device permissions optional |

Removed from this list: the unit and component harness blockers (both exist now) and TC-202, TC-204, TC-230 (moved to Integration).

---

## 10. Automation status (2026-10-24)

Read-only grep of `TC-` ids in the existing specs. This is a traceability map, not a test result: nothing was run.

| Suite | File | Scenario ids it references |
|-------|------|----------------------------|
| Playwright web | `buyer/login.spec.ts` | TC-001 |
| | `buyer/product-browse.spec.ts` | TC-010, TC-011 |
| | `buyer/product-detail.spec.ts` | TC-012, TC-013, TC-014 |
| | `buyer/checkout.spec.ts` | TC-022, TC-023, TC-024 |
| | `buyer/variant-checkout.spec.ts` | TC-098, TC-105, TC-106 |
| | `mixed/cart-isolation.spec.ts` | TC-109 |
| | `mixed/order-isolation.spec.ts` | TC-112 |
| | `mixed/product-catalog-visibility.spec.ts` | TC-008, TC-065 |
| | `seller/seller-access.spec.ts` | TC-054 |
| | `seller/seller-product-wizard.spec.ts` | TC-064 |
| | `seller/seller-simple-product-crud.spec.ts` | TC-042, TC-044, TC-045, TC-046, TC-122 |
| | `seller/seller-variant-product-crud.spec.ts` | TC-046, TC-120, TC-121 |
| Playwright API | `api/cart.api.spec.ts` | TC-107, TC-108 (also references TC-109) |
| | `api/coupons.api.spec.ts` | TC-057 |
| | `api/order-isolation.api.spec.ts` | TC-110, TC-111 |
| | `api/orders.api.spec.ts` | TC-025, TC-026, TC-027, TC-028, TC-033, TC-056 |
| | `api/rate-limit.api.spec.ts` | TC-114 to TC-119 |
| | `api/reviews.api.spec.ts` | TC-035, TC-036 |
| | `api/security.api.spec.ts` | TC-053, TC-132 to TC-136 |
| | `api/seller-access.api.spec.ts` | TC-048, TC-053, TC-054 |
| | `api/users.api.spec.ts` | TC-113 |
| Patrol | `0_auth/login_test.dart` | TC-067 |
| | `0_auth/signup_test.dart` | tagged TC-068, but its comment describes signup with valid data, which is TC-070; TC-068 (auth-gate redirect) is not covered by this file. Fix the tag |
| | `1_seller/*` (8 files) | TC-090, TC-091, TC-615 to TC-620 |
| | `2_buyer/simple_cod`, `simple_new_credit`, `simple_saved_credit` | TC-095, TC-097, TC-096 |
| | `2_buyer/variant_cod`, `variant_new_credit`, `variant_saved_credit` | TC-101, TC-103, TC-104 |

**Untagged automation (no `TC-` id found):** web `buyer/card-checkout-authorization.spec.ts`, `buyer/stripe-checkout.spec.ts`, `buyer/local-payment-settlement.spec.ts`, `mixed/role-switch.smoke.spec.ts`; API `auth.api.spec.ts`, `health.api.spec.ts`, `stripe-webhook.api.spec.ts`; Patrol `2_buyer/local_payment_settlement_test.dart`, `manual_capture_new_card_verification_test.dart`, `manual_capture_saved_card_verification_test.dart`. The first three web and the two `manual_capture` Patrol files are the likely homes for TC-143, TC-144, TC-176 once checked.

**Not yet automated at E2E or API:** all of TC-137–231 except where the untagged files above already cover them, plus the pagination, mobile browse/cart/wishlist and most P1 mobile scenarios listed in §4b.

---

## Downstream

| Skill | Input |
|-------|-------|
| `/generate-tests` | This file + filtered views. Phases 1–7 are the original plan; the 2026-10 work starts at **Phase 8** (app-side layers, agent-doable) then Phases 9–11 (API and E2E, owner) |
| `/review-tests` | Strategy + `docs/test-cases/test-scenarios.md` |
