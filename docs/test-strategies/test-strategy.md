# TokoMart Test Strategy

> **Input mode:** A — from `docs/test-cases/test-scenarios.md` (web-only suite, 66 TCs)  
> **Date:** 2026-08-03  
> **Platform scope:** Web primary; S2 mobile smoke referenced; mobile suite not yet generated

---

## 1. Summary

Test strategy for the **web-only scenario suite** (TC-001–TC-066). Assigns pyramid layers, tools, and implementation order for `/generate-tests`.

**Tooling status:**
| Tool | Status |
|------|--------|
| Playwright web | `e2e-testing/tests/web/` — scaffold + sample `login.spec.ts` |
| Playwright API | `e2e-testing/tests/api/` — scaffold + health/auth samples |
| Patrol mobile | `frontend-mobile/patrol_test/login_test.dart` only |
| Unit (Vitest/Jest) | **Blocked** — no backend unit harness |
| Component (RTL) | **Blocked** — no frontend component harness |

**Key strategy choices:**
- Push pricing, auth, status codes, and coupon rules to **API** layer
- Keep multi-page buyer/seller journeys at **E2E Web**
- **Multi-layer** for revenue-critical flows (multi-seller orders, voucher validation, cancel + stock)
- **Unit/Component** deferred — document unblock steps in §8

---

## 2. Pyramid distribution

| Layer | Count | Focus | Est. run time | Tool |
|-------|-------|-------|---------------|------|
| Unit | 0 | Tax/discount pure math | — | Vitest/Jest (**Blocked**) |
| API | 15 | Orders, coupons, auth, reviews, products | ~2–4 min | Playwright `request` |
| Component | 0 | Sale strikethrough tiles | — | Vitest/RTL (**Blocked**) |
| E2E Web | 49 | Auth, cart, checkout, seller wizard, catalog | ~15–25 min | Playwright `page` |
| E2E Mobile | 1 | Login smoke (S2) | ~1 min | Patrol |
| Multi (API + E2E) | 3 | TC-020, TC-025, TC-032 | +3 min | Both |
| Manual / Blocked | 2 | TC-052 toast, TC-062 wishlist | — | Manual / N/A |

*Counts: 49 pure E2E Web + 3 Multi (also need E2E leg) + 15 API-only.*

---

## 3. Smoke assignments (S1–S4)

| ID | Scenario | Final layer | Tool | Platform | Priority | Source | Rationale |
|----|----------|-------------|------|----------|----------|--------|-----------|
| S1 | Login → cart → checkout COD → order history | Multi | Playwright + Playwright-API | Web | P0 | TC-001, TC-016, TC-022; `e2e-testing/tests/web/checkout.spec.ts` | P0 buyer smoke; API optional for order assert |
| S2 | Mobile login → browse → cart | E2E | Patrol | Mobile | P0 | `login_test.dart` | Partial — extend Patrol; **out of web suite** |
| S3 | Become seller → simple + variant listing | E2E | Playwright | Web | P0 | TC-041, TC-042, TC-064; `seller/product-wizard.spec.ts` | P0 seller smoke |
| S4 | 2-seller cart → 2 orders | Multi | Playwright-API + Playwright | Web | P0 | TC-021, TC-025; `orders.api.spec.ts` + `checkout.spec.ts` | API proves split; E2E proves UI |

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
| TC-045 | My Products preview | E2E | Playwright | Web | P2 | `/my-products` | Web-only | |
| TC-046 | Delete product | E2E | Playwright | Web | P2 | `delete-product-{id}` | Seller CRUD | |
| TC-047 | Order status pipeline | E2E | Playwright | Web | P0 | `seller-order-action-btn` | Seller smoke | |
| TC-048 | Invalid status transition | API | Playwright-API | Web | P1 | `PUT /api/seller/orders/:id/status` | Transition matrix | |
| TC-049 | Seller cancel order | E2E | Playwright | Web | P1 | `seller-cancel-order-btn` | Cancel UX | |
| TC-050 | Voucher create + apply E2E | E2E | Playwright | Web | P1 | `POST /api/coupons` | End-to-end coupon | |
| TC-051 | Payment/delivery labels | E2E | Playwright | Web | P1 | `seller-order-detail-page` | Display formatting | |
| TC-052 | New order toast | Manual | Manual | Web | P2 | `seller-dashboard` polling | Timing-sensitive; optional Playwright | yes |
| TC-053 | Buyer blocked seller API | API | Playwright-API | Web | P0 | `PUT /api/seller/orders/:id/status` | 403 requireSeller | |
| TC-054 | Cross-seller edit blocked | API | Playwright-API | Web | P1 | `PUT /api/products/:id` | 403 ownership | |
| TC-055 | Protected routes auth | E2E | Playwright | Web | P0 | `/orders`, `/profile`, `/seller` | Auth gate | |
| TC-056 | Insufficient stock 400 | API | Playwright-API | Web | P1 | `POST /api/orders` | Stock validation | |
| TC-057 | Coupon min order 400 | API | Playwright-API | Web | P1 | `POST /api/coupons/validate` | Coupon rules | |
| TC-058 | Description max 200 | API | Playwright-API | Web | P2 | `POST /api/products` | Field validation | |
| TC-059 | Stale cart cleanup | E2E | Playwright | Web | P2 | `cart-page` | Web stale removal | |
| TC-060 | Guest catalog access | E2E | Playwright | Web | P1 | public routes | Overlaps TC-008 | |
| TC-061 | Web 6-step wizard parity | E2E | Playwright | Web | P2 | `add-product-btn` | Parity doc only | |
| TC-062 | Wishlist N/A on web | Blocked | — | Web | P3 | N/A | Mobile-only feature | |
| TC-063 | All cart items checkout | E2E | Playwright | Web | P2 | `checkout-btn` | Web vs mobile parity | |

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

### Phase 6 — Mobile (when mobile scenarios generated)
22. **Patrol:** Extend `login_test.dart` → S2; add cart/browse flows

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

---

## 7. Gaps

| Rule / behavior | Domain ref | Suggested layer | Unblocker |
|-----------------|------------|-----------------|-----------|
| 8% tax pure calculation | §4 Pricing | Unit + API | Extract `calculateTax()` in `orderService.ts`; add Vitest |
| Coupon discount amount math | §6 | Unit + API | Unit test `applyCoupon()` |
| Sale strikethrough component | §5 Display | Component | Add Vitest + RTL in `frontend/` |
| Auto-complete shipped→delivered | §5 Cron | API / Manual | Seed shipped order + mock time or cron integration test |
| Mobile 7-step wizard | §9 | E2E Mobile | Run `/create-scenarios mobile` then assign Patrol |
| Wishlist | §9 | E2E Mobile | Mobile scenarios + Patrol keys |
| Seller cancel variant stock restore | §13 edge | API | API test documenting product-level-only restore |

---

## 8. Anti-patterns

| Issue | Status | Action |
|-------|--------|--------|
| `login_test.dart` only covers mobile login | Existing | Extend Patrol per Phase 6 |
| Pricing tested only at E2E | Avoid | TC-026/027/028 at API first |
| All scenarios at E2E | Avoid | 15 API-only assignments |
| Playwright for TC-062 wishlist | N/A | Keep Blocked — mobile only |
| No seller product E2E | **Gap closing** | TC-042, TC-064 in Phase 2 |

---

## 9. Blocked items

| ID | Reason | Unblocker |
|----|--------|-----------|
| TC-062 | No web wishlist route | Mobile Patrol when mobile suite exists |
| Unit layer (all) | No Vitest/Jest in backend | `npm install -D vitest` + `backend/src/__tests__/` |
| Component layer | No RTL setup | Vitest + `@testing-library/react` in frontend |
| S2 full flow | Mobile scenarios not generated | `/create-scenarios mobile` |
| TC-052 automation | Polling timing | Manual QA or Playwright with long timeout |

---

## Downstream

| Skill | Input |
|-------|-------|
| `/generate-tests` | This file + filtered views; start **Phase 1** |
| `/review-tests` | Strategy + `docs/test-cases/test-scenarios.md` |
