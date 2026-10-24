# TokoMart Test Scenarios — Mobile

> **Platform:** Flutter (`frontend-mobile/`). Mobile E2E automated with Patrol.  
> Full master index: [test-scenarios.md](test-scenarios.md) · Web scenarios: [test-scenarios-web.md](test-scenarios-web.md)

---

## Mobile — Authentication & Session

### TC-067: Mobile login smoke (Patrol baseline)
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/0_auth/login_test.dart`  
**Preconditions**: Seeded user; env vars `EMAIL`, `TEST_PASSWORD` for Patrol  
**Steps**:
1. Reuse `patrol_test/modules/auth.dart` login flow (see `patrol_test/login_test.dart`)
2. Assert home screen and search field visible

**Expected Results**:
- `keys.products.homeScreen` and `keys.products.searchField` visible
- User authenticated; bottom nav shell visible
**Business Rule**: §1 Authentication  
**Selectors/API**: `auth_loginEmailField`, `auth_loginPasswordField`, `auth_loginButton`, `products_homeScreen`, `products_searchField`  
**Suggested Layer**: E2E Mobile

---

### TC-068: Auth gate redirects unauthenticated user to login
**Category**: Security  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Divergent (mobile gates all routes; web allows guest browse)  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/0_auth/signup_test.dart`  
**Preconditions**: Fresh app launch; no stored session  
**Steps**:
1. Launch app (cold start)
2. Attempt deep link or router navigation to `/`, `/cart`, `/orders`, `/wishlist`

**Expected Results**:
- GoRouter redirect sends user to `/login` for any non-auth route
- Products home not visible until login succeeds
**Business Rule**: §9 Platform — mobile auth gate (`app_router.dart` redirect)  
**Selectors/API**: Route `/login`; `auth_loginButton`  
**Suggested Layer**: E2E Mobile

---

### TC-069: Authenticated user redirected away from login/signup
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: User logged in  
**Steps**:
1. Navigate to `/login` or `/signup` while authenticated

**Expected Results**:
- Redirect to `/` (products home)
**Business Rule**: §1 Authentication  
**Selectors/API**: `products_homeScreen`  
**Suggested Layer**: E2E Mobile

---

### TC-070: Mobile signup with minimum password rules
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Divergent (mobile min 6 chars; web requires 8 + upper + lower + number)  
**Automation**: Patrol  
**Preconditions**: Unique email not in DB  
**Steps**:
1. From `/login`, navigate to signup
2. Fill name, email, password (6+ chars, e.g. `abc123`), confirm password
3. Submit

**Expected Results**:
- Account created; redirected to products home
- User role = buyer
**Business Rule**: §1 Roles, §10 Mobile signup validation  
**Selectors/API**: `POST /api/auth/signup` — **keys missing** for signup fields  
**Suggested Layer**: E2E Mobile

---

### TC-071: Mobile logout clears session and returns to login
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: User logged in  
**Steps**:
1. Open profile tab → sign out
2. Attempt to open orders tab

**Expected Results**:
- Redirect to `/login`
- Cart cleared locally (server cart preserved for re-login)
**Business Rule**: §1 Session & cart  
**Selectors/API**: Profile sign-out — **keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-607: Cart restored after re-login (mobile)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: User had server-synced cart items before logout  
**Steps**:
1. Add product to cart while logged in
2. Logout → login again
3. Open `/cart`

**Expected Results**:
- Cart items restored from server via `GET /api/cart`
**Business Rule**: §1 Session & cart, §3 Cart sync  
**Selectors/API**: `GET /api/cart` — cart screen keys missing  
**Suggested Layer**: E2E Mobile

---

## Mobile — Browse & Product Detail

### TC-072: Browse products home after login
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Logged-in buyer; seeded products  
**Steps**:
1. Complete TC-067 login
2. Verify products grid/list loads on `/`

**Expected Results**:
- Product cards visible with name and price
- Search field and cart icon in app bar
**Business Rule**: §2 Product catalog  
**Selectors/API**: `products_homeScreen`, `products_searchField`  
**Suggested Layer**: E2E Mobile

---

### TC-073: Open cart from products screen (S2 smoke)
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Logged-in buyer  
**Steps**:
1. From products home, tap cart icon in app bar

**Expected Results**:
- Navigates to `/cart`
- Cart screen loads (empty or with items)
**Business Rule**: §3 Cart  
**Selectors/API**: Semantics label `AppStrings.openCart` — **Patrol key missing**  
**Suggested Layer**: E2E Mobile

---

### TC-074: Search products by keyword
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Seeded product with known name  
**Steps**:
1. Enter keyword in search field on home
2. Submit search

**Expected Results**:
- Results filtered to matching products
- Empty state if no matches
**Business Rule**: §2 Search  
**Selectors/API**: `products_searchField`  
**Suggested Layer**: E2E Mobile

---

### TC-075: Filter products by category
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Products in multiple categories  
**Steps**:
1. Open category filter chips or sheet on home
2. Select a category

**Expected Results**:
- Only products in selected category shown
**Business Rule**: §2 Category filter  
**Selectors/API**: Category chips — **keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-076: Product detail — select variant and add to cart
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Product with variants in stock  
**Steps**:
1. Tap product card → `/products/:id`
2. Select required variant attributes
3. Tap add to cart

**Expected Results**:
- Selected variant price/stock reflected
- Cart badge increments
**Business Rule**: §2 Variants, §3 Add to cart  
**Selectors/API**: `/products/:id` — **keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-608: Buyer sees new seller listing in catalog (mobile)
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Seller created product via TC-090 or TC-091; buyer is different user  
**Steps**:
1. Login as buyer
2. Browse home grid or search for product name

**Expected Results**:
- New listing visible; seller's own listing hidden when logged in as that seller (TC-610)
**Business Rule**: §2 Catalog visibility  
**Selectors/API**: `products_homeScreen`  
**Suggested Layer**: E2E Mobile

---

### TC-609: Sale price strikethrough on product detail (mobile)
**Category**: UI State  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Product or variant with active discount  
**Steps**:
1. Open discounted product detail

**Expected Results**:
- Original price shown with strikethrough; sale price prominent
**Business Rule**: §4 Pricing — discounts  
**Selectors/API**: Price widgets — **keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-610: Seller's own products hidden from buyer catalog (mobile)
**Category**: Business Rule  
**Priority**: P1  
**Role**: Seller  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Seller logged in with own active products  
**Steps**:
1. Browse products home as seller

**Expected Results**:
- Own products excluded from public listing
**Business Rule**: §2 Seller catalog filter  
**Selectors/API**: `GET /api/products` filters sellerId  
**Suggested Layer**: E2E Mobile

---

## Mobile — Cart & Checkout

### TC-077: Add, update quantity, and remove cart item (mobile)
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Product in stock; logged-in buyer  
**Steps**:
1. Add item via product detail
2. Open `/cart`; increment/decrement quantity
3. Remove item

**Expected Results**:
- Quantity updates respect stock cap
- Remove clears line item; empty state when last item removed
**Business Rule**: §3 Cart operations  
**Selectors/API**: Cart tile qty controls — **keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-078: Cart checkbox subset checkout
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Mobile-only selection UX (web sends all items)  
**Automation**: Patrol  
**Preconditions**: Cart with ≥2 items (same or different sellers)  
**Steps**:
1. Open `/cart`
2. Uncheck one item; leave another checked
3. Tap checkout

**Expected Results**:
- Checkout receives route `extra`: `{ selected: Set<productId>, deliverySelections, voucherSelections }`
- Only checked items appear on checkout screen
**Business Rule**: §3 Mobile cart selection (`cart_screen.dart`, `app_router.dart`)  
**Selectors/API**: Checkbox per `cart_item_tile`; checkout route `extra['selected']`  
**Suggested Layer**: E2E Mobile

---

### TC-079: Checkout button disabled when no items selected
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Mobile-only  
**Automation**: Patrol  
**Preconditions**: Cart with items; all checkboxes unchecked  
**Steps**:
1. Open cart and deselect all items
2. Attempt checkout

**Expected Results**:
- Checkout action disabled or shows zero selected count
- No navigation to `/checkout` with empty selection
**Business Rule**: §3 Cart selection  
**Selectors/API**: `selectedCount == 0` → `onCheckout: null` in `cart_screen.dart`  
**Suggested Layer**: E2E Mobile

---

### TC-080: Select all / deselect all cart checkboxes
**Category**: Edge Case  
**Priority**: P2  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Mobile-only  
**Automation**: Patrol  
**Preconditions**: Cart with multiple items  
**Steps**:
1. Tap header "select all" checkbox
2. Tap again to deselect all

**Expected Results**:
- All item checkboxes sync with header tri-state
- Summary subtotal reflects selected subset only
**Business Rule**: §3 Cart selection  
**Selectors/API**: Seller-group header checkbox in `cart_screen.dart`  
**Suggested Layer**: E2E Mobile

---

### TC-081: Per-seller delivery option on cart (mobile)
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Cart with items from one seller; multiple delivery options  
**Steps**:
1. On cart, select delivery option for seller group
2. Proceed to checkout with item selected

**Expected Results**:
- Selected delivery passed in `extra['deliverySelections']`
- Shipping fee on checkout matches selection
**Business Rule**: §3 Per-seller delivery  
**Selectors/API**: Delivery chips per seller group — **keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-082: Voucher selection passed via route extra
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Valid seller voucher; cart items from that seller  
**Steps**:
1. From cart, open voucher picker for seller
2. Apply voucher → checkout

**Expected Results**:
- `extra['voucherSelections']` populated on `/checkout`
- Discount reflected in checkout summary
**Business Rule**: §5 Vouchers  
**Selectors/API**: `SelectVoucherScreen`; **keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-083: Multi-seller checkout creates separate orders (mobile)
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Cart with items from 2 sellers; all selected  
**Steps**:
1. Checkout with both seller groups selected
2. Complete payment (COD)

**Expected Results**:
- Two distinct orders in history (one per seller)
- Independent shipping/voucher per seller group
**Business Rule**: §6 Multi-seller split  
**Selectors/API**: `POST /api/orders` (batch)  
**Suggested Layer**: E2E Mobile

---

### TC-095: COD checkout complete flow (mobile)
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/2_buyer/simple_cod_checkout_test.dart`  
**Preconditions**: Buyer logged in (`b@test.com`); product in cart; saved or new shipping address  
**Steps**:
1. Open product detail → add to cart → tap product-detail cart icon (`products_productDetailCartIconButton`)
2. From cart with checked items → checkout
3. Fill/confirm address; select Cash on Delivery
4. Place order

**Expected Results**:
- Order created; checked-out items removed from cart
- Order visible in `/orders` history
**Business Rule**: §6 Checkout, §7 Orders  
**Selectors/API**: `products_productDetailCartIconButton`, `cart_checkoutButton`, `orders_paymentOption_cash-on-delivery`, `orders_placeOrderButton`, `orders_ordersScreen`

---

### TC-096: Checkout with saved credit card (mobile)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both (web TC-023)  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/2_buyer/simple_saved_credit_checkout_test.dart`  
**Preconditions**: Buyer logged in (`b@test.com`); ≥ 1 saved card on profile (`GET /api/auth/payment-methods`); cart with checked items; shipping address saved or entered on checkout  
**Steps**:
1. From cart with checked items → tap checkout (`cart_checkoutButton`)
2. Fill/confirm shipping address if not saved
3. In **Payment Method**, verify **Saved Card** mode is active (default when saved cards exist)
4. Select a saved card from the list
5. Tap place order (`orders_placeOrderButton`)

**Expected Results**:
- `POST /api/orders` succeeds; order status `pending`
- Order payment shows saved card type + last4 on order detail
- *Updated 2026-10-24:* under `CHECKOUT_FLOW=manual_capture` card checkout uses `/api/checkout/sessions` and only holds the amount (`authorized`); `POST /api/orders` with a card returns 426. See TC-176
- Checked-out items removed from cart; order visible on `/orders` (`orders_ordersScreen`)
**Business Rule**: §4 Payment methods, §8 Saved cards  
**Selectors/API**: `cart_checkoutButton`, `orders_checkoutStreetField`, `orders_paymentNewCardTab`, `orders_placeOrderButton`, `orders_ordersScreen`, `POST /api/orders` — **saved card row keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-097: Checkout with new card entry (mobile)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both (web TC-024)  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/2_buyer/simple_new_credit_checkout_test.dart`  
**Preconditions**: Buyer logged in; cart with checked items; no saved card selected (tap **+ New Card** if saved cards exist)  
**Steps**:
1. From cart → checkout (`cart_checkoutButton`)
2. Fill/confirm shipping address
3. In **Payment Method**, select **Credit Card** (`orders_paymentOption_credit-card`); if saved cards exist, tap **+ New Card** (`orders_paymentNewCardTab`) first
4. Enter card number (16 digits), cardholder name, expiry month/year
5. Tap place order (`orders_placeOrderButton`)

**Expected Results**:
- Client validation passes for card fields before submit
- Order created successfully; payment method persisted on order
- Order visible in `/orders` history
- *Updated 2026-10-24:* Stripe test card `4242 4242 4242 4242`; the payment screen shows the authorization disclosure ("Your money is reserved now and charged when each seller starts preparing your order"). See TC-176, TC-177, TC-178
**Business Rule**: §4 Payment methods, §10 Checkout card validation  
**Selectors/API**: `cart_checkoutButton`, `orders_paymentOption_credit-card`, `orders_paymentNewCardTab`, `orders_placeOrderButton`, `orders_ordersScreen` — **card field keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-101: COD checkout with variant product (mobile)
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both (web TC-098)  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/2_buyer/variant_cod_checkout_test.dart`  
**Preconditions**: Buyer logged in (`b@test.com`); variant product in catalog (from TC-091 or seeded); cart empty  
**Steps**:
1. Open product detail → select required variant attributes (e.g. Size M)
2. Verify variant price updates on detail screen
3. Tap add to cart → open cart (checked items)
4. Checkout → confirm address → select Cash on Delivery
5. Place order → open order detail

**Expected Results**:
- Variant selection required before add succeeds (see TC-613)
- Order item persists `variantId` and attributes; correct variant price on order detail
- Variant stock decrements for selected size only
- Order visible in `/orders`; checked-out items removed from cart
**Business Rule**: §2 Variants, §6 Checkout, §7 Orders  
**Selectors/API**: Product detail variant chips — **keys missing**; `cart_checkoutButton`, `orders_paymentOption_cash-on-delivery`, `orders_placeOrderButton`, `orders_ordersScreen`, `POST /api/orders`  
**Suggested Layer**: E2E Mobile

---

### TC-102: Add to cart blocked without variant — mobile guard (Patrol)
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both (web TC-014)  
**Automation**: Patrol  
**Preconditions**: Product requiring variant selection (same catalog as TC-101)  
**Steps**:
1. Open variant product detail without selecting size/color
2. Attempt add to cart

**Expected Results**:
- Add blocked: disabled button, snackbar, or prompt to select variant
- No cart line added; cart badge unchanged
**Business Rule**: §2 Variant pricing — selection required  
**Selectors/API**: Add-to-cart control on `/products/:id` — **keys missing**  
**Suggested Layer**: E2E Mobile (implements TC-613 with Patrol automation)

---

### TC-103: Checkout with new credit card — variant product (mobile)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both (web TC-024 + TC-098 combined)  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/2_buyer/variant_new_credit_checkout_test.dart`  
**Preconditions**: Buyer logged in (`b@test.com`); variant product in catalog (from TC-091 or seeded `E2E Test Variant Tee`); cart empty; no saved card selected  
**Steps**:
1. Open variant product detail → select required variant attributes (e.g. Size M)
2. Tap add to cart → navigate to cart → proceed to checkout
3. Fill/confirm shipping address
4. In **Payment Method**, select **Credit Card** (`orders_paymentOption_credit-card`); tap **+ New Card** if saved cards exist
5. Enter card number (16 digits), cardholder name, expiry month/year
6. Tap place order (`orders_placeOrderButton`)

**Expected Results**:
- Order created successfully with correct variant attributes and variant-specific price
- Payment method shows card type on order detail
- Order visible in `/orders` history; cart items removed
**Business Rule**: §2 Variants, §4 Payment methods, §6 Checkout, §10 Checkout card validation  
**Selectors/API**: `products_variantValue_{attr}_{value}`, `cart_checkoutButton`, `orders_paymentOption_credit-card`, `orders_paymentNewCardTab`, `orders_placeOrderButton`, `orders_ordersScreen`, `POST /api/orders`  
**Suggested Layer**: E2E Mobile

---

### TC-104: Checkout with saved credit card — variant product (mobile)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both (web TC-023 + TC-098 combined)  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/2_buyer/variant_saved_credit_checkout_test.dart`  
**Preconditions**: Buyer logged in (`b@test.com`); ≥ 1 saved card on profile (`GET /api/auth/payment-methods`); variant product in catalog (from TC-091 or seeded `E2E Test Variant Tee`); cart empty  
**Steps**:
1. Open variant product detail → select required variant attributes (e.g. Size M)
2. Tap add to cart → navigate to cart → proceed to checkout
3. Fill/confirm shipping address
4. In **Payment Method**, verify **Saved Card** mode is active; select a saved card
5. Tap place order (`orders_placeOrderButton`)

**Expected Results**:
- Order created successfully with correct variant attributes and variant-specific price
- Order payment shows saved card type + last4 on order detail
- Checked-out items removed from cart; order visible in `/orders`
**Business Rule**: §2 Variants, §4 Payment methods, §6 Checkout, §8 Saved cards  
**Selectors/API**: `products_variantValue_{attr}_{value}`, `cart_checkoutButton`, `orders_paymentOption_credit-card`, `orders_placeOrderButton`, `orders_ordersScreen`, `POST /api/orders` — **saved card row keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-612: Invalid login shows error (mobile)
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: None  
**Steps**:
1. Enter valid email with wrong password on login screen
2. Submit

**Expected Results**:
- Error message shown; remain on `/login`
**Business Rule**: §1 Authentication  
**Selectors/API**: `auth_loginButton`, error snackbar/dialog — **keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-613: Add to cart blocked without variant (mobile)
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Product requiring variant selection  
**Steps**:
1. Open product detail without selecting variant
2. Attempt add to cart

**Expected Results**:
- Action blocked or prompt to select variant
**Business Rule**: §2 Variant required  
**Selectors/API**: Product detail — **keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-614: Cart quantity capped at stock (mobile)
**Category**: Edge Case  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Item with known stock limit  
**Steps**:
1. Increment quantity beyond available stock

**Expected Results**:
- Quantity stops at effective stock (variant or product level)
**Business Rule**: §3 Stock cap  
**Selectors/API**: Qty increment — **keys missing**  
**Suggested Layer**: E2E Mobile

---

## Mobile — Orders & Reviews

### TC-084: Order history tabs and detail (mobile)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Buyer with orders in multiple statuses  
**Steps**:
1. Open orders tab
2. Switch status tabs; open an order detail

**Expected Results**:
- Tabs filter orders correctly
- Detail shows items, totals, status badge
- *Updated 2026-10-24:* tabs are Pending, Preparing, To Ship, To Receive, Complete, **Return/Refund**, Cancelled (no "All" tab on mobile). A fully refunded order is hidden from Complete (TC-187). Detail also shows the payment notice (TC-179) and the "Cancelled by the seller" notice with reason (TC-183)
**Business Rule**: §7 Order history  
**Selectors/API**: `/orders`, `/orders/:id` — **keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-085: Confirm receipt when order shipped (mobile)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Order in `shipped` status  
**Steps**:
1. Open order detail
2. Tap confirm received

**Expected Results**:
- Status advances to delivered (or buyer-confirmed state per API)
- Review action becomes available
**Business Rule**: §7 Confirm receipt  
**Selectors/API**: `PUT /api/orders/:id/confirm-received` — **keys missing** *(corrected 2026-10-24: the endpoint was listed as `PATCH .../confirm`; confirming also records `deliveredAt` and starts the 7-day refund window, TC-227)*  
**Suggested Layer**: E2E Mobile

---

## Mobile — Wishlist (Mobile-only)

### TC-086: Add and remove product from wishlist
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Mobile-only  
**Automation**: Patrol  
**Preconditions**: Logged-in buyer; product on home or detail  
**Steps**:
1. Tap favorite/wishlist icon on product
2. Open `/wishlist` tab
3. Remove item from wishlist

**Expected Results**:
- Item appears on wishlist screen with product info
- Remove toggles favorite off; empty state when cleared
**Business Rule**: §9 Wishlist — in-memory `WishlistBloc`  
**Selectors/API**: `/wishlist`, `WishlistToggled` event — **keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-087: Wishlist clear all
**Category**: Happy Path  
**Priority**: P2  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Mobile-only  
**Automation**: Patrol  
**Preconditions**: Wishlist with multiple items  
**Steps**:
1. Open wishlist → tap Clear all

**Expected Results**:
- All items removed; empty state shown
- Wishlist not persisted to API (session-only)
**Business Rule**: §9 Wishlist in-memory  
**Selectors/API**: `WishlistCleared` — **Blocked** for API persistence tests  
**Suggested Layer**: E2E Mobile

---

## Mobile — Follow & Profile

### TC-088: Follow and unfollow seller from seller profile
**Category**: Happy Path  
**Priority**: P2  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Divergent (mobile route `/seller-profile/:sellerId` vs web `/users/:id`)  
**Automation**: Patrol  
**Preconditions**: Buyer logged in; target seller exists  
**Steps**:
1. Navigate to `/seller-profile/:sellerId`
2. Tap follow → unfollow

**Expected Results**:
- Follow state toggles; follower count updates
**Business Rule**: §8 Follow  
**Selectors/API**: `GET/POST /api/users/:id/follow` — **keys missing**  
**Suggested Layer**: E2E Mobile

---

## Mobile — Seller

### TC-089: Become a seller (mobile)
**Category**: Happy Path  
**Priority**: P0  
**Role**: Seller  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Buyer account  
**Steps**:
1. Profile → become seller / start selling
2. Confirm promotion

**Expected Results**:
- Role promoted to seller (one-way)
- Seller tab appears in bottom navigation
**Business Rule**: §11 Become seller  
**Selectors/API**: `PATCH /api/users/me/seller` — **keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-090: Seller creates simple product — mobile 7-step wizard
**Category**: Happy Path  
**Priority**: P0  
**Role**: Seller  
**Platform**: Mobile  
**Parity**: Divergent (7 steps: Basic → Pricing → Description → Images → Variants → Shipping → Review)  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/1_seller/add_product_simple_test.dart`  
**Preconditions**: Seller logged in  
**Steps**:
1. Seller tab → add product (`/seller/add`)
2. Complete steps 0–6: basic info, pricing (no variants), description, images, skip/empty variants, shipping, review
3. Publish

**Expected Results**:
- Product saved; visible on seller dashboard
- 7 wizard steps with `_WizardStepper` (steps: Basic, Pricing, Description, Images, Shipping, Review — variants on step 4)
**Business Rule**: §2 Seller product wizard  
**Selectors/API**: `/seller/add`, `add_edit_product_screen.dart` — **keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-091: Seller creates variant product — mobile 7-step wizard
**Category**: Happy Path  
**Priority**: P0  
**Role**: Seller  
**Platform**: Mobile  
**Parity**: Divergent (variants on dedicated step 4, separate from web combined pricing step)  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/1_seller/add_product_variant_test.dart`  
**Preconditions**: Seller logged in  
**Steps**:
1. Start add product wizard
2. On Variants step (4): define attributes, per-variant price/stock/discount/images
3. Complete shipping + review → publish

**Expected Results**:
- Variant product live; buyer can select variants on detail (TC-076)
**Business Rule**: §2 Variants, §2 Wizard steps  
**Selectors/API**: Variant editor in step 4 — **keys missing**; media picker may request permission  
**Suggested Layer**: E2E Mobile

---

### TC-092: Seller advances order through status pipeline (mobile)
**Category**: Happy Path  
**Priority**: P0  
**Role**: Seller  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Pending buyer order for this seller  
**Steps**:
1. Open seller dashboard → orders tab (`/seller?tab=orders`)
2. Advance order: pending → preparing → processing → shipped

**Expected Results**:
- Each transition accepted; status badge updates
- *Updated 2026-10-24:* `pending → preparing` is the acceptance step, labelled "Accept & start preparing" (`seller_acceptOrderButton_<id>`); it shows the acceptance deadline (`seller_acceptDeadlineText_<id>`) and a charging state while a card is captured (`seller_capturePendingText_<id>`), see TC-182. No cancel is offered from `shipped`
**Business Rule**: §12 Order pipeline  
**Selectors/API**: `PATCH /api/seller/orders/:id/status` — **keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-093: Seller voucher CRUD and buyer apply (mobile)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
**Preconditions**: Seller account  
**Steps**:
1. Seller → vouchers tab → create voucher
2. As buyer, apply at cart (TC-082)

**Expected Results**:
- Voucher listed on seller dashboard; validation rules enforced at apply time
**Business Rule**: §5 Vouchers  
**Selectors/API**: `/seller?tab=vouchers` — **keys missing**  
**Suggested Layer**: E2E Mobile

---

### TC-094: Preview product as buyer from seller dashboard
**Category**: Happy Path  
**Priority**: P2  
**Role**: Seller  
**Platform**: Mobile  
**Parity**: Divergent (mobile uses `/products/:id?hideEdit=1`; web uses `/my-products`)  
**Automation**: Patrol  
**Preconditions**: Seller with published product  
**Steps**:
1. From seller product list, tap preview/view as buyer

**Expected Results**:
- Opens product detail with edit hidden (`hideEdit=1`)
**Business Rule**: §2 Preview as buyer  
**Selectors/API**: `/products/:id?hideEdit=1`  
**Suggested Layer**: E2E Mobile

---

### TC-611: Buyer blocked from seller routes (mobile auth gate + role)
**Category**: Security  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol + Playwright-API  
**Preconditions**: Buyer-only account  
**Steps**:
1. Attempt `/seller/add` or seller-only API as buyer

**Expected Results**:
- UI blocks or API returns 403 for seller-only actions
**Business Rule**: §11 Role enforcement  
**Selectors/API**: `GET /api/seller/*` → 403  
**Suggested Layer**: E2E Mobile + API

---

### TC-615: Seller views simple product in seller dashboard (mobile Read)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Mobile  
**Parity**: Divergent (mobile: tap product tile → `/products/:id?hideEdit=1`; web TC-045: `/my-products` list with separate Preview button)  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/1_seller/read_product_simple_test.dart`  
**Preconditions**: Seller logged in; simple product exists (created via API before test)  
**Steps**:
1. Seller tab → seller dashboard loads
2. Product tile is visible with correct name and price
3. Tap product tile → product detail screen opens

**Expected Results**:
- Product tile shows correct name and price on dashboard
- Product detail screen loads at `/products/:id?hideEdit=1`; edit controls hidden
**Business Rule**: §2 Seller product listing  
**Selectors/API**: `keys.seller.productTile(productId)` — **key missing**; `keys.seller.dashboardScreen` exists  
**Suggested Layer**: E2E Mobile

---

### TC-616: Seller edits simple product from dashboard (mobile Update)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Mobile  
**Parity**: Divergent (mobile: 7-step wizard re-opens pre-filled; web TC-044: 6-step wizard)  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/1_seller/edit_product_simple_test.dart`  
**Preconditions**: Seller logged in; simple product exists (created via API before test)  
**Steps**:
1. Seller tab → product tile visible on dashboard
2. Tap edit icon on product tile → wizard opens with current values pre-filled
3. Change product name and price
4. Advance through remaining steps → publish

**Expected Results**:
- Wizard opens in edit mode with current values populated
- After publish, dashboard product tile reflects updated name and price
**Business Rule**: §2 Seller product wizard (edit mode)  
**Selectors/API**: `keys.seller.editProductButton(productId)` — **key missing**; wizard keys exist  
**Suggested Layer**: E2E Mobile

---

### TC-617: Seller deletes simple product from dashboard (mobile Delete)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Mobile  
**Parity**: Both (TC-046 — same delete+confirm pattern; different UI chrome)  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/1_seller/delete_product_simple_test.dart`  
**Preconditions**: Seller logged in; simple product exists (created via API before test)  
**Steps**:
1. Seller tab → product tile visible on dashboard
2. Tap delete icon on product tile → confirmation dialog appears
3. Confirm deletion

**Expected Results**:
- Confirmation dialog shown before deletion
- Product tile no longer visible on dashboard after confirm
- `DELETE /api/seller/products/:id` returns 200
**Business Rule**: §2 Product delete  
**Selectors/API**: `keys.seller.deleteProductButton(productId)` — **key missing**; `keys.widgets.dialogConfirmButton` exists  
**Suggested Layer**: E2E Mobile

---

### TC-618: Seller views variant product in dashboard (mobile Read)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Mobile  
**Parity**: Divergent (no web equivalent — web uses `/my-products` TC-121 with a Preview button)  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/1_seller/read_product_variant_test.dart`  
**Preconditions**: Seller logged in; variant product exists (created via `SellerApiClient.createVariantProduct()` before test)  
**Steps**:
1. Seller tab → seller dashboard loads
2. Product tile is visible with correct name
3. Tap product tile → product detail screen opens

**Expected Results**:
- Variant product tile shows on dashboard
- Product detail screen loads; variant selectors visible
**Business Rule**: §2 Seller product listing; §2 Variants  
**Selectors/API**: `keys.seller.productTile(productId)` (exists); `SellerApiClient.createVariantProduct()` — **method missing**  
**Suggested Layer**: E2E Mobile

---

### TC-619: Seller edits variant product from dashboard (mobile Update)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Mobile  
**Parity**: Both (web equivalent: TC-120 — edit variant product)  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/1_seller/edit_product_variant_test.dart`  
**Preconditions**: Seller logged in; variant product exists (created via API before test)  
**Steps**:
1. Seller tab → product tile visible on dashboard
2. Tap edit icon → wizard opens with current values pre-filled
3. Navigate to Variants step (step 4)
4. Change price on one variant (e.g. Size M: $29.99 → $34.99)
5. Advance through remaining steps → publish

**Expected Results**:
- Wizard opens in edit mode with variant values populated
- After publish, product tile still present on dashboard
- Variant price update persisted (`PUT /api/seller/products/:id`)
**Business Rule**: §2 Variant price/stock are per-option; §2 Wizard edit mode  
**Selectors/API**: `keys.seller.editProductButton(productId)` (exists); `keys.seller.wizardVariantPriceField(label)` (exists); `PUT /api/seller/products/:id`  
**Suggested Layer**: E2E Mobile

---

### TC-620: Seller deletes variant product from dashboard (mobile Delete)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Mobile  
**Parity**: Both (web equivalent: TC-046 — delete product, covers both simple and variant)  
**Automation**: Patrol  
**Test File**: `frontend-mobile/patrol_test/1_seller/delete_product_variant_test.dart`  
**Preconditions**: Seller logged in; variant product exists (created via API before test)  
**Steps**:
1. Seller tab → product tile visible on dashboard
2. Tap delete icon on product tile → confirmation dialog appears
3. Confirm delete

**Expected Results**:
- Dialog confirms intent; product removed
- Product tile no longer visible on dashboard
- `DELETE /api/seller/products/:id` returns 200
**Business Rule**: §2 Product delete  
**Selectors/API**: `keys.seller.deleteProductButton(productId)` (exists); `keys.widgets.dialogConfirmButton` (exists); no API teardown — UI deleted  
**Suggested Layer**: E2E Mobile

---

### TC-621: Initial product list loads first 20 products
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Divergent (web uses numbered pagination — TC-123)  
**Automation**: Patrol  
**Preconditions**: Buyer logged in; 60+ products in seed  
**Steps**:
1. Navigate to the product list screen (Products tab)
2. Wait for initial load to complete
3. Count the product cards rendered in the widget tree without scrolling

**Expected Results**:
- Exactly 20 product cards are in the widget tree on initial load (first BLoC page)
- No loading spinner at bottom of list (initial fetch complete)
**Business Rule**: §1 Product browse — mobile infinite scroll, 20 per fetch  
**Selectors/API**: `keys.products.productList`, `keys.products.productCard(name)`, `GET /api/products?page=1&limit=20`  
**Suggested Layer**: E2E Mobile

---

### TC-622: Scrolling to the bottom loads more products
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Divergent (web uses next-page button — TC-123)  
**Automation**: Patrol  
**Preconditions**: Buyer logged in; more than 20 products in seed  
**Steps**:
1. Navigate to the product list screen
2. Wait for initial 20 products to load
3. Scroll to the bottom of the list (`keys.products.productList`)
4. Wait for the next batch to resolve
5. Count product cards in the widget tree again

**Expected Results**:
- More than 20 product cards are now in the widget tree
- No error state visible
**Business Rule**: §1 Product browse — `ProductsLoadMoreRequested` triggered within 300px of bottom  
**Selectors/API**: `keys.products.productList`, `keys.products.productCard(name)`, `GET /api/products?page=2&limit=20`  
**Suggested Layer**: E2E Mobile

---

### TC-623: Loading spinner visible while fetching more products
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Divergent  
**Automation**: Patrol  
**Preconditions**: Buyer logged in; more than 20 products in seed  
**Steps**:
1. Navigate to the product list screen; wait for initial load
2. Scroll to the bottom of the product list to trigger load-more
3. Before the next batch finishes, assert the load-more spinner key is visible

**Expected Results**:
- `CircularProgressIndicator` (keyed as the load-more spinner) is visible at the bottom of the list during the fetch
**Business Rule**: §1 Product browse — BLoC `ProductsLoading` state while fetching next page  
**Selectors/API**: `keys.products.loadMoreSpinner` — **key may be missing; add to `lib/features/products/keys.dart`**  
**Suggested Layer**: E2E Mobile

---

### TC-624: No further fetch when all products are loaded
**Category**: Edge Case  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Divergent  
**Automation**: Patrol  
**Preconditions**: Buyer logged in; total product count in seed is finite and known  
**Steps**:
1. Navigate to the product list screen
2. Scroll to the bottom repeatedly until no new product cards appear
3. Record the final product count
4. Scroll to the bottom one more time and wait

**Expected Results**:
- Product count remains unchanged on the final scroll
- No loading spinner appears
- `GET /api/products` is not called again for a next page
**Business Rule**: §1 Product browse — BLoC stops dispatching `ProductsLoadMoreRequested` when `hasReachedMax` is true  
**Selectors/API**: `keys.products.productList`, `keys.products.loadMoreSpinner` (absent)  
**Suggested Layer**: E2E Mobile

---

## Mobile — Platform Parity

### TC-600: Mobile auth gate vs web guest browse
**Category**: Platform Parity  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Divergent  
**Automation**: Patrol  
**Preconditions**: Not logged in  
**Steps**:
1. Cold launch app

**Expected Results**:
- Cannot reach `/` without login (contrast TC-008 web guest browse)
**Business Rule**: §9 Platform auth  
**Selectors/API**: `app_router.dart` redirect  
**Suggested Layer**: E2E Mobile

---

### TC-601: Mobile 7-step seller wizard step count
**Category**: Platform Parity  
**Priority**: P2  
**Role**: Seller  
**Platform**: Mobile  
**Parity**: Divergent (vs TC-061 web 6-step)  
**Automation**: Patrol  
**Preconditions**: Seller on `/seller/add`  
**Steps**:
1. Count wizard steps in `_WizardStepper`

**Expected Results**:
- 7 content pages (0–6): Basic, Pricing, Description, Images, Variants, Shipping, Review
- Variants on separate step (unlike web combined in pricing)
**Business Rule**: §9 Platform wizard  
**Selectors/API**: `add_edit_product_screen.dart`  
**Suggested Layer**: E2E Mobile

---

### TC-602: Mobile cart checkbox subset (parity assertion)
**Category**: Platform Parity  
**Priority**: P2  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Divergent (vs TC-063 web all-items checkout)  
**Automation**: Patrol  
**Preconditions**: Multi-item cart  
**Steps**:
1. Select subset → checkout

**Expected Results**:
- Unchecked items remain in cart after order
**Business Rule**: §3 Cart selection  
**Selectors/API**: TC-078  
**Suggested Layer**: E2E Mobile

---

### TC-603: Wishlist in-memory only — no API persistence
**Category**: Platform Parity  
**Priority**: P3  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Mobile-only  
**Automation**: Blocked (no wishlist API)  
**Preconditions**: Items in wishlist  
**Steps**:
1. Force-quit and relaunch app

**Expected Results**:
- Wishlist empty after restart (in-memory bloc only)
**Business Rule**: §9 Wishlist  
**Selectors/API**: N/A — **Blocked** for Playwright-API  
**Suggested Layer**: Manual

---

### TC-604: Notifications bell is UI stub (no-op)
**Category**: UI State  
**Priority**: P3  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Mobile-only  
**Automation**: Manual  
**Preconditions**: On products home  
**Steps**:
1. Tap notifications icon in app bar

**Expected Results**:
- `onPressed: () {}` — no navigation, no dialog (stub)
**Business Rule**: §9 Notifications stub  
**Selectors/API**: Semantics `AppStrings.notifications`  
**Suggested Layer**: Manual

---

### TC-605: Seller local order notification and deep link
**Category**: Happy Path  
**Priority**: P2  
**Role**: Seller  
**Platform**: Mobile  
**Parity**: Mobile-only (web uses in-app toast TC-052)  
**Automation**: Manual / Patrol (device notifications)  
**Preconditions**: Seller logged in; polling active in `MainShell`  
**Steps**:
1. Place new order as buyer for this seller
2. Wait for poll interval; observe local notification
3. Tap notification

**Expected Results**:
- `NotificationService.showOrderNotification` fires
- Tap payload `seller_orders_tab` navigates to `/seller?tab=orders`
**Business Rule**: §9 Seller notifications  
**Selectors/API**: `NotificationService.onTap`, `main_shell.dart` polling  
**Suggested Layer**: Manual / E2E Mobile

---

### TC-606: Mobile signup accepts 6-character password
**Category**: Platform Parity  
**Priority**: P2  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Divergent (contrast TC-004 web weak password rejection)  
**Automation**: Patrol  
**Preconditions**: Unique email  
**Steps**:
1. Signup with password `abc123` (6 chars, no uppercase)

**Expected Results**:
- Succeeds on mobile; would fail on web signup
**Business Rule**: §10 Password rules  
**Selectors/API**: Signup form — **keys missing**  
**Suggested Layer**: E2E Mobile

---
## Added 2026-10-24 — features shipped since the last review

> **Environment flags** (same as the web section): `CHECKOUT_FLOW=manual_capture`, `SELLER_SEES_MANUAL_CAPTURE=true`, `DELIVERED_REFUNDS_ENABLED=true`; MongoDB replica set; Stripe **test mode** only (`4242 4242 4242 4242` success, `4000 0000 0000 0002` declined, `4000 0025 0000 3155` 3DS).
> Keys listed exist in `lib/features/*/keys.dart` on 2026-10-24. "keys missing" means the widget has no `ValueKey` yet; add one before automating. Per `docs/authorize-capture-open-items.md` the Android Patrol build was blocked by a Gradle loopback error, so Patrol coverage here depends on that being fixed by the owner.

---

## Mobile — Saved Addresses & Payment Methods

### TC-172: Save a new address at checkout (mobile)
**Category**: Happy Path
**Priority**: P1
**Role**: Buyer
**Platform**: Mobile
**Parity**: Both (web TC-137)
**Automation**: Patrol
**Preconditions**: Buyer logged in; cart with checked items; no matching saved address
**Steps**:
1. Cart → checkout; choose the new-address option (`orders_checkoutNewAddressOption`) and fill street, city, state, ZIP
2. Turn on the save-address toggle
3. Place the order (COD)
4. Open Profile → Saved Addresses

**Expected Results**:
- The order is placed; the address appears once in Saved Addresses
- With the toggle off nothing is saved
**Business Rule**: §8 Saved addresses
**Selectors/API**: `orders_checkoutNewAddressOption`, `orders_checkoutStreetField`, `orders_checkoutCityField`, `orders_checkoutStateField`, `orders_checkoutZipField`, `orders_placeOrderButton`; save toggle — **key missing**
**Suggested Layer**: E2E Mobile

---

### TC-173: Edit a saved address (mobile)
**Category**: Happy Path
**Priority**: P1
**Role**: Buyer
**Platform**: Mobile
**Parity**: Both (web TC-138)
**Automation**: Patrol
**Preconditions**: Buyer has ≥ 1 saved address
**Steps**:
1. Profile → Saved Addresses → edit an address (bottom sheet)
2. Change street/city and save; try saving with the street empty

**Expected Results**:
- The list shows the new values; an empty street/city is rejected with a message and nothing is sent
**Business Rule**: §8 Saved addresses (`street` + `city` required)
**Selectors/API**: address sheet — **keys missing**; `PUT /api/auth/saved-addresses/:id`
**Suggested Layer**: E2E Mobile

---

### TC-174: Deleting a saved address asks for confirmation (mobile)
**Category**: Platform Parity
**Priority**: P2
**Role**: Buyer
**Platform**: Mobile
**Parity**: Divergent (web deletes without a dialog, TC-141)
**Automation**: Patrol
**Preconditions**: Buyer has ≥ 2 saved addresses
**Steps**:
1. Tap delete on an address; read the dialog; tap Cancel
2. Tap delete again and confirm

**Expected Results**:
- The dialog shows "Delete address" and the address text; Cancel keeps it, confirming removes it (PR #77)
**Business Rule**: §8 Saved addresses
**Selectors/API**: confirm dialog — **keys missing**; `DELETE /api/auth/saved-addresses/:id`
**Suggested Layer**: E2E Mobile

---

### TC-175: Payment Methods screen — list, set default, delete a card (mobile)
**Category**: Happy Path
**Priority**: P1
**Role**: Buyer
**Platform**: Mobile
**Parity**: Both (web TC-142)
**Automation**: Patrol
**Preconditions**: Buyer has ≥ 2 saved cards; route `/payment-methods`
**Steps**:
1. Profile → Payment Methods
2. Tap "Set as default" on the non-default card
3. Delete a card and confirm; open the screen with no cards saved

**Expected Results**:
- Each row shows brand, `•••• last4` and expiry; exactly one "Default" label
- Delete asks to confirm ("Delete card" with brand and last4), then shows "card deleted" feedback
- No cards: the empty state "no saved cards" is shown; a load failure shows a Retry button
**Business Rule**: §8 Saved cards
**Selectors/API**: `ValueKey(method.id)` rows; buttons by tooltip; `GET/DELETE /api/auth/payment-methods`, `PATCH .../:id/default`
**Suggested Layer**: E2E Mobile

---

## Mobile — Authorize-at-Checkout

### TC-176: Card checkout reserves the amount and explains it (mobile)
**Category**: Happy Path
**Priority**: P0
**Role**: Buyer
**Platform**: Mobile
**Parity**: Both (web TC-143, TC-144, TC-145)
**Automation**: Patrol
**Preconditions**: Manual-capture flow; cart with checked items; Stripe test mode
**Steps**:
1. Cart → checkout; fill/confirm the address
2. Pay with a new card (`orders_paymentNewCardTab`, test card `4242…`) in one run and with a saved card (`orders_paymentSavedCardsTab`, `orders_savedPaymentCard_<id>`) in another
3. Read the authorization disclosure; tap place order / `orders_paymentSubmitButton`
4. Open the order detail

**Expected Results**:
- Disclosure: "Your money is reserved now and charged when each seller starts preparing your order. Orders a seller does not accept within 24 hours are cancelled…"
- Order `pending` / `authorized`; Stripe PaymentIntent `requires_capture`, nothing captured
- Detail shows the "Payment reserved" notice (`orders_paymentNoticeTitle_Payment reserved`)
- Multi-seller carts get one order and one hold per seller
**Business Rule**: Authorize-capture §Checkout and authorization
**Selectors/API**: `orders_paymentOption_credit-card`, `orders_paymentNewCardTab`, `orders_paymentSavedCardsTab`, `orders_paymentSubmitButton`, `orders_placeOrderButton`, `POST /api/checkout/sessions`
**Suggested Layer**: E2E Mobile (Stripe test mode)

---

### TC-177: Declined card places no order (mobile)
**Category**: Negative
**Priority**: P1
**Role**: Buyer
**Platform**: Mobile
**Parity**: Both (web TC-146)
**Automation**: Patrol
**Preconditions**: Manual-capture flow; cart with checked items
**Steps**:
1. Pay with `4000 0000 0000 0002` and submit

**Expected Results**:
- A readable decline message is shown (not a raw exception); no order is created
- The cart items stay checked; stock is unchanged after the draft is released
**Business Rule**: Authorize-capture §Checkout (compensation)
**Selectors/API**: `orders_paymentSubmitButton` — error text **key missing**
**Suggested Layer**: E2E Mobile

---

### TC-178: 3-D Secure card on mobile
**Category**: Edge Case
**Priority**: P1
**Role**: Buyer
**Platform**: Mobile
**Parity**: Both (web TC-147)
**Automation**: Manual (open item M4: 3DS Patrol flow not written)
**Preconditions**: Manual-capture flow; Stripe test mode
**Steps**:
1. Pay with `4000 0025 0000 3155`; complete the challenge in one run, abandon it in another

**Expected Results**:
- Completed: order `pending` / `authorized`. Abandoned: no order, cart kept, retry possible, no hold left after expiry
**Business Rule**: Authorize-capture §Checkout step 4
**Selectors/API**: Stripe SDK native sheet
**Suggested Layer**: Manual

---

### TC-179: Buyer order detail shows payment notices (mobile)
**Category**: UI State
**Priority**: P1
**Role**: Buyer
**Platform**: Mobile
**Parity**: Both (web TC-149)
**Automation**: Patrol / Widget test
**Preconditions**: Orders in `authorized`, `capture_pending`, `captured`, `release_pending`, `released`, `refund_pending`, `refunded`, `partially_refunded` and `failed` payment states
**Steps**:
1. Open each order's detail screen

**Expected Results**:
- Titles read "Payment reserved", "Charging payment", "Payment charged", "Releasing reservation", "Reservation released", "Refund in progress", "Refunded", "Partially refunded", "Payment problem"
- A cancelled-by-seller order shows "Cancelled by the seller" and the reason
- Known gap (open items): the 24-hour acceptance notice is hidden for COD orders
**Business Rule**: Authorize-capture §Recovery and Stripe events
**Selectors/API**: `orders_paymentNoticeTitle_<title>` (`OrdersKeys.paymentNoticeTitle`)
**Suggested Layer**: Widget / E2E Mobile

---

### TC-189: Interrupted card checkout resumes (mobile)
**Category**: Edge Case
**Priority**: P2
**Role**: Buyer
**Platform**: Mobile
**Parity**: Both (web TC-151)
**Automation**: Manual
**Preconditions**: Manual-capture flow; `CheckoutAttemptStore` holds the attempt
**Steps**:
1. Submit a card checkout, then kill the app or drop the network before the confirmation returns
2. Reopen the app and retry checkout

**Expected Results**:
- The same session is resumed; one order and one hold per seller, never duplicates
**Business Rule**: Authorize-capture §Checkout (idempotency, resume)
**Selectors/API**: `lib/features/checkout/data/checkout_attempt_store.dart`
**Suggested Layer**: Manual

---

## Mobile — Cancelling a Pending Order

### TC-180: Buyer cancels a pending order (mobile)
**Category**: Happy Path
**Priority**: P0
**Role**: Buyer
**Platform**: Mobile
**Parity**: Both (web TC-152, TC-153)
**Automation**: Patrol
**Preconditions**: A `pending` order (run once with a card hold, once with COD)
**Steps**:
1. Orders → Pending tab → open the order
2. Tap Cancel (`orders_cancelOrderButton`); read the dialog; choose "Keep order" first, then cancel with a reason

**Expected Results**:
- "Keep order" changes nothing; confirming moves the order to the Cancelled tab with stock restored once
- Card order: notice goes to "Releasing reservation" then "Reservation released"; COD: no payment notice
**Business Rule**: Authorize-capture §Buyer cancellation
**Selectors/API**: `orders_cancelOrderButton`, `orders_orderCard_<id>`, `PUT /api/orders/:id/status`
**Suggested Layer**: E2E Mobile

---

### TC-181: No cancel after the seller accepts (mobile)
**Category**: UI State
**Priority**: P2
**Role**: Buyer
**Platform**: Mobile
**Parity**: Both (web TC-154)
**Automation**: Patrol
**Preconditions**: A `preparing` order and a `capture_pending` order
**Steps**:
1. Open each order's detail

**Expected Results**:
- `orders_cancelOrderButton` is absent for both; a conflict from a stale screen is shown as a message, never as "cancelled"
**Business Rule**: §5 Buyer cancel (pending only)
**Selectors/API**: `orders_cancelOrderButton` (absent)
**Suggested Layer**: E2E Mobile

---

## Mobile — Seller Acceptance and Cancellation

### TC-182: Seller accepts a pending card order (mobile)
**Category**: Happy Path
**Priority**: P0
**Role**: Seller
**Platform**: Mobile
**Parity**: Both (web TC-155, TC-156)
**Automation**: Patrol
**Preconditions**: Manual-capture flow; `SELLER_SEES_MANUAL_CAPTURE=true`; a `pending` / `authorized` card order for this seller
**Steps**:
1. Seller dashboard → Orders; read the deadline text
2. Tap "Accept & start preparing" and wait for the charging state

**Expected Results**:
- `seller_acceptDeadlineText_<id>` is visible while pending; `seller_capturePendingText_<id>` shows during capture
- The order becomes `preparing`; the exact held amount is captured; the buyer's notice reads "Payment charged"
**Business Rule**: Authorize-capture §Seller acceptance and capture
**Selectors/API**: `seller_acceptOrderButton_<id>`, `seller_acceptDeadlineText_<id>`, `seller_capturePendingText_<id>`, `seller_ordersTab`
**Suggested Layer**: E2E Mobile

---

### TC-183: Seller cancels a pending order with a required reason (mobile)
**Category**: Happy Path
**Priority**: P0
**Role**: Seller
**Platform**: Mobile
**Parity**: Both (web TC-157, TC-158)
**Automation**: Patrol
**Preconditions**: A `pending` order with `canSellerCancelPending: true`
**Steps**:
1. Tap Cancel (`seller_cancelOrderButton_<id>`); try to confirm with an empty reason (the dialog stays open and shows an error)
2. Enter a reason and confirm
3. Open the order as the buyer

**Expected Results**:
- Empty/blank reasons are rejected in the dialog; a valid reason cancels once
- Card order: hold released; COD: no Stripe call
- The buyer sees "Cancelled by the seller" and `Reason: …` on the detail screen
**Business Rule**: Seller pending cancellation spec §Approved policy, §Client experience
**Selectors/API**: `seller_cancelOrderButton_<id>`, `seller_cancelReasonField`
**Suggested Layer**: E2E Mobile

---

### TC-184: Cancel is hidden when the seller may not cancel (mobile)
**Category**: Business Rule
**Priority**: P2
**Role**: Seller
**Platform**: Mobile
**Parity**: Both (web TC-160)
**Automation**: Patrol / Widget test
**Preconditions**: A `shipped` order, a `preparing` card order, a `preparing` COD order, a `pending` order with `canSellerCancelPending: false`
**Steps**:
1. Open the seller order list

**Expected Results**:
- No Cancel for `shipped`, the `preparing` card order, or the pending order the server flags as not cancellable; Cancel with an optional reason for the `preparing` COD order
**Business Rule**: Seller pending cancellation spec; `SellerOrderData.canCancel`
**Selectors/API**: `seller_cancelOrderButton_<id>` (absent)
**Suggested Layer**: Widget / E2E Mobile

---

## Mobile — Delivered-Item Refunds

### TC-185: Buyer requests a refund for a delivered order (mobile)
**Category**: Happy Path
**Priority**: P0
**Role**: Buyer
**Platform**: Mobile
**Parity**: Both (web TC-161, TC-162, TC-163, TC-169)
**Automation**: Patrol — **keys missing** for the refund screens
**Preconditions**: `DELIVERED_REFUNDS_ENABLED=true`; a delivered, captured card order inside 7 days
**Steps**:
1. Order detail → "Request a refund"
2. Select an item and quantity, a reason (default prompt "Select a reason"), enter a description
3. Try submitting with nothing selected / no description, then submit properly

**Expected Results**:
- Validation messages "Select an item to refund." and "Describe the issue to continue."; the policy block explains the 7-day window, no return, and shipping rule
- After submit the request shows as awaiting the seller; the order stays `delivered`
- Ineligible orders (COD, window closed, flag off) show "This order is not eligible for a refund request." or "New refund requests are currently unavailable."
**Business Rule**: Delivered-item refund spec
**Selectors/API**: refund request panel — **keys missing**; `POST /api/orders/:id/refund-requests`
**Suggested Layer**: E2E Mobile

---

### TC-186: Seller approves or rejects a refund request (mobile)
**Category**: Happy Path
**Priority**: P0
**Role**: Seller
**Platform**: Mobile
**Parity**: Both (web TC-164, TC-165, TC-170)
**Automation**: Patrol — **keys missing**
**Preconditions**: A requested refund
**Steps**:
1. Seller dashboard → Return/Refund → In Progress; open the request
2. Approve (button "Approve and refund" after the "Approval starts the refund immediately. The buyer keeps the item." notice), in one run
3. Reject in another run: leave the reason empty, then enter one and confirm

**Expected Results**:
- Approve: request becomes processing, then refunded; shows under Approved; the Return/Refund badge decrements
- Reject: an empty reason is blocked; the request moves to Rejected and the buyer sees the reason
**Business Rule**: Delivered-item refund spec §API and concurrency
**Selectors/API**: `RefundReviewPanel` — **keys missing**; `PUT /api/seller/refund-requests/:id/decision`
**Suggested Layer**: E2E Mobile

---

### TC-187: Return/Refund tab and Complete tab behaviour (mobile)
**Category**: UI State
**Priority**: P1
**Role**: Buyer
**Platform**: Mobile
**Parity**: Both (web TC-168)
**Automation**: Patrol / Widget test (`ordersForTab`)
**Preconditions**: Fully refunded, partially refunded and normal delivered orders
**Steps**:
1. Orders → Complete; then Return/Refund

**Expected Results**:
- A fully refunded order is not listed under Complete; approved refunds are listed under Return/Refund with "Fully refunded" / "Partially refunded"
- Partially refunded orders stay under Complete with refund chips on their items
**Business Rule**: Delivered-item refund spec §Clients; PR #86, #87
**Selectors/API**: `orders_ordersScreen`, tab labels — **keys missing**
**Suggested Layer**: Widget / E2E Mobile

---

## Mobile — Offline handling

### TC-188: Offline banner (mobile)
**Category**: UI State
**Priority**: P2
**Role**: Both
**Platform**: Mobile
**Parity**: Both (web TC-171)
**Automation**: Manual (airplane mode) / Widget test (`ConnectivityCubit`)
**Preconditions**: App running while online
**Steps**:
1. Turn the device network off, then on

**Expected Results**:
- The offline banner appears; network errors read "No internet connection." and disappear when back online
**Business Rule**: Offline handling spec 2026-08-06
**Selectors/API**: `core/widgets/offline_banner.dart`, `ConnectivityCubit`
**Suggested Layer**: Widget + Manual

---
