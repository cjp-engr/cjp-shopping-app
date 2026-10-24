# TokoMart Test Strategy — Mobile (Filtered)

*Filtered view of `docs/test-strategies/test-strategy.md` — do not edit independently.*

**Platform filter:** Mobile (78 scenarios in `docs/test-cases/test-scenarios-mobile.md`)  
**Updated:** 2026-10-24

---

## Pyramid (Mobile, 78)

| Layer | Count | Focus | Tool |
|-------|-------|-------|------|
| E2E Mobile | 59 | Auth, cart checkbox, checkout, wizard, orders, seller CRUD, settings screens | Patrol |
| Multi (widget + Patrol, or API + Patrol) | 8 | TC-083, TC-611 (older); TC-176, 180, 182, 183, 185, 186 (new S5–S7 legs) | `flutter_test` + Patrol |
| Component / widget | 6 | TC-177, 179, 181, 184, 187, 188 | `flutter_test` |
| Manual | 4 | TC-178, TC-189, TC-604, TC-605 | Manual |
| Blocked | 1 | TC-603 | — |

**Keys status (2026-10-24):** `auth`, `products`, `orders`, `seller` and `cart.checkoutButton` keys exist (including seller accept/cancel and the orders payment notice). Refund request and review screens, the save-address toggle, the payment-methods screen and the offline banner have **no keys** yet. Android Patrol is blocked by the Gradle loopback error until the owner fixes it.

---

## P0 smoke — Mobile

| ID | Flow | Layer | Tool | Target file | Status |
|----|------|-------|------|-------------|--------|
| S2 | Login → browse → cart | E2E | Patrol | `patrol_test/login_test.dart` | **Partial** — login only (TC-067) |
| S3 | Become seller → simple + variant listing | E2E | Patrol | `seller/product_wizard_test.dart` | Blocked on keys |
| S4 | 2-seller cart → 2 orders | Multi | Patrol + API | `multi_seller_checkout_test.dart` + `orders.api.spec.ts` | Blocked on keys |
| S5 | Card checkout reserves → seller accepts → captured | Multi | `flutter_test` + Patrol | TC-176, TC-182 | Keys exist (`orders_*`, `seller_acceptOrderButton_<id>`); candidates: `manual_capture_*_card_verification_test.dart` |
| S6 | Pending order cancelled by buyer and by seller | Multi | `flutter_test` + Patrol | TC-180, TC-183 | Keys exist (`orders_cancelOrderButton`, `seller_cancelOrderButton_<id>`) |
| S7 | Delivered order → refund requested → approved | Multi | `flutter_test` + Patrol | TC-185, TC-186 | **Keys missing** for the refund screens |

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
| TC-621 | Initial product list loads 20 products | E2E | Patrol | P1 | `keys.products.productList` | Divergent (web: TC-123) |
| TC-622 | Scroll to bottom loads more products | E2E | Patrol | P1 | `keys.products.productList` | Divergent (web: TC-123) |
| TC-623 | Loading spinner visible while fetching more | E2E | Patrol | P1 | `keys.products.loadMoreSpinner` — **key may be missing** | Divergent |
| TC-624 | No fetch when all products loaded | E2E | Patrol | P1 | `keys.products.loadMoreSpinner` (absent check) | Divergent |
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
| Patrol tests for cart, orders detail, wishlist and the new refund / saved-address / payment-methods / offline screens lack keys | Phase M1 — add `ValueKey`s before any new Patrol file; `orders`, `seller` and `auth`/`products` keys already exist (checkout, seller CRUD and accept/cancel are keyed) |
| Android Patrol build blocked (Gradle loopback error) | Owner-only system change; see `docs/authorize-capture-open-items.md` |
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

## Added 2026-10-24 — Mobile scenarios (23)

Layers, sources, rationale and existing-coverage candidates for every row are in **`test-strategy.md` §4c–§4d**. Included: scenarios added on 2026-10-24 and older scenarios the strategy had never assigned.

| ID | Scenario | Final layer | Tool | Priority |
|----|----------|-------------|------|----------|
| TC-102 | Add to cart blocked without variant — mobile guard (Patrol) | E2E | Patrol | P1 |
| TC-172 | Save a new address at checkout (mobile) | E2E | Patrol | P1 |
| TC-173 | Edit a saved address (mobile) | E2E | Patrol | P1 |
| TC-174 | Deleting a saved address asks for confirmation (mobile) | E2E | Patrol | P2 |
| TC-175 | Payment Methods screen — list, set default, delete a card (mobile) | E2E | Patrol | P1 |
| TC-176 | Card checkout reserves the amount and explains it (mobile) | Multi | flutter_test + Patrol | P0 |
| TC-177 | Declined card places no order (mobile) | Component | flutter_test | P1 |
| TC-178 | 3-D Secure card on mobile | Manual | Manual | P1 |
| TC-179 | Buyer order detail shows payment notices (mobile) | Component | flutter_test | P1 |
| TC-180 | Buyer cancels a pending order (mobile) | Multi | Playwright-API + Patrol | P0 |
| TC-181 | No cancel after the seller accepts (mobile) | Component | flutter_test | P2 |
| TC-182 | Seller accepts a pending card order (mobile) | Multi | flutter_test + Patrol | P0 |
| TC-183 | Seller cancels a pending order with a required reason (mobile) | Multi | flutter_test + Patrol | P0 |
| TC-184 | Cancel is hidden when the seller may not cancel (mobile) | Component | flutter_test | P2 |
| TC-185 | Buyer requests a refund for a delivered order (mobile) | Multi | flutter_test + Patrol | P0 |
| TC-186 | Seller approves or rejects a refund request (mobile) | Multi | flutter_test + Patrol | P0 |
| TC-187 | Return/Refund tab and Complete tab behaviour (mobile) | Component | flutter_test | P1 |
| TC-188 | Offline banner (mobile) | Component | flutter_test + Manual | P2 |
| TC-189 | Interrupted card checkout resumes (mobile) | Manual | Manual | P2 |
| TC-621 | Initial product list loads first 20 products | E2E | Patrol | P1 |
| TC-622 | Scrolling to the bottom loads more products | E2E | Patrol | P1 |
| TC-623 | Loading spinner visible while fetching more products | E2E | Patrol | P1 |
| TC-624 | No further fetch when all products are loaded | E2E | Patrol | P1 |

Full master strategy: **`docs/test-strategies/test-strategy.md`**
