# TokoMart Test Strategy — Mobile (Filtered)

*Filtered view of `docs/test-strategies/test-strategy.md` — do not edit independently.*

**Platform filter:** Mobile | Both  
**Input:** 50 mobile-native TCs from `docs/test-cases/test-scenarios-mobile.md`

---

## Pyramid (Mobile)

| Layer | Count | Focus | Est. run time | Tool |
|-------|-------|-------|---------------|------|
| API (shared) | 3 | TC-025, TC-053, TC-057 legs used by mobile | ~1 min | Playwright-API |
| E2E Mobile | 38 | Auth, cart checkbox, checkout, wizard, orders | ~20–30 min | Patrol |
| Multi (API + Patrol) | 2 | TC-083, TC-611 | +2 min | Both |
| Manual | 2 | TC-604, TC-605 | — | Manual |
| Blocked | 1 | TC-603 | — | — |

**Keys status:** 2 TCs key-ready (TC-067, TC-074 partial) · 36 TCs need `ValueKey`s before Patrol implementation

---

## P0 smoke — Mobile

| ID | Flow | Layer | Tool | Target file | Status |
|----|------|-------|------|-------------|--------|
| S2 | Login → browse → cart | E2E | Patrol | `patrol_test/login_test.dart` | **Partial** — login only (TC-067) |
| S3 | Become seller → simple + variant listing | E2E | Patrol | `seller/product_wizard_test.dart` | Blocked on keys |
| S4 | 2-seller cart → 2 orders | Multi | Patrol + API | `multi_seller_checkout_test.dart` + `orders.api.spec.ts` | Blocked on keys |

---

## Scenario assignments (Mobile)

| ID | Scenario | Final layer | Tool | Priority | Source | Rationale |
|----|----------|-------------|------|----------|--------|-----------|
| TC-067 | Mobile login smoke | E2E | Patrol | P0 | `login_test.dart`, `keys.auth.*`, `keys.products.*` | **Exists** |
| TC-068 | Auth gate redirect | E2E | Patrol | P0 | `app_router.dart` redirect | No guest browse |
| TC-069 | Redirect from login when authed | E2E | Patrol | P1 | `products_homeScreen` | Auth guard |
| TC-070 | Mobile signup | E2E | Patrol | P1 | `POST /api/auth/signup` | 6-char password OK |
| TC-071 | Mobile logout | E2E | Patrol | P1 | Profile sign-out | Session clear |
| TC-607 | Cart restored on re-login | E2E | Patrol | P1 | `GET /api/cart` | Server sync |
| TC-072 | Browse products home | E2E | Patrol | P0 | `products_homeScreen` | S2 browse |
| TC-073 | Open cart from products | E2E | Patrol | P0 | `AppStrings.openCart` | S2 cart — key needed |
| TC-074 | Search products | E2E | Patrol | P1 | `products_searchField` | Search |
| TC-075 | Filter by category | E2E | Patrol | P1 | Category chips | Filter — keys needed |
| TC-076 | Variant + add to cart | E2E | Patrol | P0 | `/products/:id` | P0 buyer path |
| TC-609 | Sale strikethrough | E2E | Patrol | P1 | Price widgets | UI display |
| TC-608 | Buyer sees seller listing | E2E | Patrol | P0 | `products_homeScreen` | Catalog visibility |
| TC-610 | Own products hidden | E2E | Patrol | P1 | `GET /api/products` | Listing rule |
| TC-077 | Cart add/update/remove | E2E | Patrol | P0 | `cart_screen.dart` | Cart ops |
| TC-078 | **Cart checkbox subset** | E2E | Patrol | P0 | Checkbox + `extra['selected']` | Mobile-only critical |
| TC-079 | Checkout disabled — zero selected | E2E | Patrol | P1 | `selectedCount == 0` | Negative |
| TC-080 | Select all / deselect all | E2E | Patrol | P2 | Header checkbox | Edge |
| TC-081 | Per-seller delivery | E2E | Patrol | P0 | `extra['deliverySelections']` | Multi-seller |
| TC-082 | Voucher via route extra | E2E | Patrol | P1 | `extra['voucherSelections']` | Coupon UI |
| TC-095 | **COD checkout** | E2E | Patrol | P0 | `CheckoutScreen` | P0 checkout smoke |
| TC-101 | **COD checkout — variant product** | E2E | Patrol | P0 | `products_variantValue_*` | Variant path smoke |
| TC-083 | Multi-seller → 2 orders | Multi | Patrol + API | P0 | `POST /api/orders` + checkout | S4 mobile |
| TC-096 | Saved card checkout | E2E | Patrol | P1 | Saved card selector | Card payment |
| TC-097 | New card checkout | E2E | Patrol | P1 | Card entry fields | Card entry |
| TC-103 | New card checkout — variant | E2E | Patrol | P1 | `products_variantValue_*` + card entry | Variant + new card |
| TC-104 | Saved card checkout — variant | E2E | Patrol | P1 | `products_variantValue_*` + saved card | Variant + saved card |
| TC-084 | Order history + detail | E2E | Patrol | P1 | `/orders`, `/orders/:id` | Buyer orders |
| TC-085 | Confirm receipt | E2E | Patrol | P1 | Confirm action | Post-shipped |
| TC-612 | Invalid login | E2E | Patrol | P1 | `auth_loginButton` | Error UX |
| TC-613 | Variant required | E2E | Patrol | P1 | Product detail | Validation |
| TC-614 | Qty stock cap | E2E | Patrol | P1 | Qty increment | Stock cap |
| TC-086 | **Wishlist add/remove** | E2E | Patrol | P1 | `WishlistBloc`, `/wishlist` | Mobile-only |
| TC-087 | Wishlist clear all | E2E | Patrol | P2 | `WishlistCleared` | In-memory |
| TC-088 | Follow/unfollow seller | E2E | Patrol | P2 | `/seller-profile/:sellerId` | Social |
| TC-089 | Become seller | E2E | Patrol | P0 | Seller promotion API | S3 mobile |
| TC-090 | **Simple 7-step wizard** | E2E | Patrol | P0 | `/seller/add` | S3 mobile |
| TC-091 | **Variant 7-step wizard** | E2E | Patrol | P0 | Variant step 4 | Variant listing |
| TC-615 | Seller views simple product (Read) | E2E | Patrol | P1 | `keys.seller.productTile(id)` (exists) | Parity TC-045 (divergent) |
| TC-616 | Seller edits simple product (Update) | E2E | Patrol | P1 | `keys.seller.editProductButton(id)` (exists) | Parity TC-044 (divergent) |
| TC-617 | Seller deletes simple product (Delete) | E2E | Patrol | P1 | `keys.seller.deleteProductButton(id)` (exists) | Parity TC-046 (both) |
| TC-618 | Seller views variant product (Read) | E2E | Patrol | P1 | `keys.seller.productTile(id)` (exists); `SellerApiClient.createVariantProduct()` — **method missing** | Divergent (no web equivalent) |
| TC-619 | Seller edits variant product (Update) | E2E | Patrol | P1 | `keys.seller.editProductButton(id)` (exists); `keys.seller.wizardVariantPriceField(label)` (exists) | Parity TC-120 (both) |
| TC-620 | Seller deletes variant product (Delete) | E2E | Patrol | P1 | `keys.seller.deleteProductButton(id)` (exists) | Parity TC-046 (both) |
| TC-092 | Seller order pipeline | E2E | Patrol | P0 | `/seller?tab=orders` | Seller smoke |
| TC-093 | Seller voucher CRUD | E2E | Patrol | P1 | `/seller?tab=vouchers` | Coupon E2E |
| TC-094 | Preview as buyer | E2E | Patrol | P2 | `?hideEdit=1` | vs web TC-045 |
| TC-611 | Buyer blocked seller routes | Multi | Patrol + API | P0 | `GET /api/seller/*` → 403 | Security |
| TC-600 | Auth gate vs web guest | E2E | Patrol | P1 | Cold launch | Parity doc |
| TC-601 | 7-step wizard count | E2E | Patrol | P2 | `_WizardStepper` | vs TC-061 |
| TC-602 | Checkbox parity | E2E | Patrol | P2 | TC-078 | vs TC-063 |
| TC-603 | Wishlist in-memory | Blocked | — | P3 | No API | No persistence test |
| TC-604 | Notifications bell stub | Manual | Manual | P3 | `onPressed: () {}` | No-op UI |
| TC-605 | Seller order notification | Manual | Manual/Patrol | P2 | `NotificationService` | Native + poll |
| TC-606 | 6-char password signup | E2E | Patrol | P2 | Signup form | vs TC-004 |

---

## Implementation order (Mobile — for `/generate-tests`)

### Phase M1 — Keys + P0 smoke (unblock all Patrol)

1. Add `keys.dart` for: cart, checkout, orders, seller, wishlist → register in `lib/keys.dart`
2. Wire keys in screen widgets per `ui-selectors.md`
3. Extend `login_test.dart` → **S2**: TC-067, TC-072, TC-073

### Phase M2 — P0 buyer checkout

4. `auth_gate_test.dart` — TC-068
5. `product_detail_test.dart` — TC-076
6. `cart_checkbox_test.dart` — TC-078, TC-079
7. `checkout_cod_test.dart` — TC-095

### Phase M3 — P0 seller

8. `seller/onboarding_test.dart` — TC-089
9. `seller/product_wizard_test.dart` — **S3**: TC-090, TC-091
10. `seller/orders_test.dart` — TC-092

### Phase M4 — P0 multi-seller + catalog

11. `multi_seller_checkout_test.dart` — **S4**: TC-083 (+ shared API TC-025)
12. `catalog_test.dart` — TC-608, TC-610

### Phase M4b — P1 variant checkout + card payments

13. `checkout_variant_cod_test.dart` — TC-101
14. `checkout_saved_credit_test.dart` — TC-096
15. `checkout_new_credit_test.dart` — TC-097
16. `checkout_variant_new_credit_test.dart` — TC-103
17. `checkout_variant_saved_credit_test.dart` — TC-104

### Phase M5 — P1 Patrol remainder

18. `auth_test.dart` — TC-069, TC-070, TC-071, TC-607, TC-612, TC-606
19. `browse_test.dart` — TC-074, TC-075, TC-609
20. `cart_delivery_voucher_test.dart` — TC-077, TC-081, TC-082
21. `orders_test.dart` — TC-084, TC-085, TC-613, TC-614
22. `wishlist_test.dart` — TC-086, TC-087
18. `seller/vouchers_test.dart` — TC-093
19. `follow_test.dart` — TC-088
20. `security_test.dart` — TC-611 (Patrol leg)

### Phase M6 — P2/P3 + manual

21. Parity: TC-600, TC-601, TC-602, TC-094, TC-080
22. **Manual:** TC-604 (bell stub), TC-605 (local notifications)
23. **Blocked:** TC-603 (wishlist persistence)

---

## Shared API tests (web implements; mobile consumes)

| ID | API file | Mobile use |
|----|----------|------------|
| TC-025 | `orders.api.spec.ts` | TC-083 multi-seller split proof |
| TC-026–028 | `orders.api.spec.ts` | Pricing truth — no Patrol duplicate |
| TC-053 | `seller/orders.api.spec.ts` | TC-611 security leg |
| TC-057 | `coupons.api.spec.ts` | TC-082 voucher validation backend |

---

## Gaps & unblockers

| Gap | Unblocker |
|-----|-----------|
| 36 Patrol tests blocked on keys | Phase M1 — add `ValueKey`s before any new Patrol file |
| TC-603 wishlist persistence | Manual only — no backend API |
| TC-605 native notifications | Device permissions + poll timing; Manual primary |
| Variant image permission flow | Patrol native dialog in TC-091 — document in test module |

---

## Anti-patterns (mobile)

| Avoid | Do instead |
|-------|------------|
| Patrol for tax/shipping math | API TC-026–028 |
| Patrol for coupon validation codes | API TC-057 + TC-082 UI only |
| Playwright for mobile flows | Patrol only |
| Skipping TC-078 checkbox tests | Highest mobile-specific value |

Full master strategy: **`docs/test-strategies/test-strategy.md`**
