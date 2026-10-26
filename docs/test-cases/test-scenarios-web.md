# TokoMart Test Scenarios — Web

> **Platform:** React frontend (`frontend/`). Web E2E automated with Playwright.  
> Full master index: [test-scenarios.md](test-scenarios.md) · API scenarios: [test-scenarios-api.md](test-scenarios-api.md) · Mobile scenarios: [test-scenarios-mobile.md](test-scenarios-mobile.md)

Tracking fields follow [the master index conventions](test-scenarios.md#how-to-track-these-cases). Tool labels and existing script references are not proof of implemented or passing automation; aliases retain historical IDs without adding independent coverage.

---

## Buyer — Authentication & Session

### TC-001: Successful login with valid credentials
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/buyer/login.spec.ts`  
**Preconditions**: Seeded user exists (`test@example.com` / `password123`)  
**Steps**:
1. Navigate to `/login`
2. Enter valid email and password
3. Click Sign in

**Expected Results**:
- Redirect to home or prior `?redirect=` URL
- Navbar shows user menu; `nav-signin-link` hidden
**Business Rule**: §1 Authentication  
**Selectors/API**: `login-form`, `login-submit-btn`, `getByRole('textbox', { name: 'Email' })`, `nav-link-products`  
**Suggested Layer**: E2E Web

---

### TC-002: Login failure with invalid credentials
**Scenario status**: Active
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: None  
**Steps**:
1. Navigate to `/login`
2. Enter valid email with wrong password
3. Submit form

**Expected Results**:
- Stay on `/login`
- `login-error-alert` visible with error message
- No auth token stored
**Business Rule**: §1 Authentication  
**Selectors/API**: `login-error-alert`, `POST /api/auth/login` → 401  
**Suggested Layer**: E2E Web

---

### TC-003: Successful signup as new buyer
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent (web password rules stricter than mobile)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Unique email not in DB  
**Steps**:
1. Navigate to `/signup`
2. Fill first name, last name, email, password (8+ chars, upper, lower, number), confirm password
3. Accept terms checkbox
4. Submit

**Expected Results**:
- Account created; redirected to authenticated state
- User role = buyer
**Business Rule**: §1 Roles, §10 Web signup validation  
**Selectors/API**: `signup-form`, `terms-checkbox`, `signup-submit-btn`, `POST /api/auth/signup`  
**Suggested Layer**: E2E Web

---

### TC-004: Signup blocked by weak password (web rules)
**Scenario status**: Active
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent (mobile accepts min 6 only)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: None  
**Steps**:
1. Navigate to `/signup`
2. Enter password failing web rules (e.g. `abc123` — no uppercase)
3. Submit

**Expected Results**:
- Client validation prevents submit or shows inline error
- No account created
**Business Rule**: §10 Web signup — min 8, uppercase + lowercase + number  
**Selectors/API**: `signup-form`  
**Suggested Layer**: E2E Web

---

### TC-005: Logout clears local session
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: User logged in  
**Steps**:
1. Open user menu → Sign out
2. Attempt to visit `/orders`

**Expected Results**:
- Redirect to `/login?redirect=/orders`
- Cart cleared locally (server cart preserved)
**Business Rule**: §1 Session & cart  
**Selectors/API**: `user-menu-btn`, `nav-signout-btn`  
**Suggested Layer**: E2E Web

---

### TC-006: Cart restored after re-login
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: User had items in cart before logout  
**Steps**:
1. Add product to cart while logged in
2. Logout
3. Login again
4. Open `/cart`

**Expected Results**:
- Cart items restored from server
**Business Rule**: §1 Session & cart, §3 Cart sync  
**Selectors/API**: `cart-page`, `GET /api/cart`  
**Suggested Layer**: E2E Web

---

### TC-007: Checkout redirect when unauthenticated
**Scenario status**: Active
**Category**: Security  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent (mobile auth-gates all routes)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Guest (not logged in)  
**Steps**:
1. Navigate directly to `/checkout`

**Expected Results**:
- Redirect to `/login?redirect=/checkout`
**Business Rule**: §3 Checkout gate  
**Selectors/API**: URL assertion  
**Suggested Layer**: E2E Web

---


## Buyer — Guest Browse (Web-only)

### TC-008: Guest can browse products without login
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/mixed/product-catalog-visibility.spec.ts`  
**Preconditions**: Not logged in  
**Steps**:
1. Open `/` and `/products` without a stored session
2. Click a product card

**Expected Results**:
- Products page loads; `products-page` visible
- Product detail accessible without auth
- Sign in link visible in navbar
**Business Rule**: §9 Platform — guest browsing  
**Selectors/API**: `products-page`, `product-card-{id}`, `nav-signin-link`  
**Suggested Layer**: E2E Web

---

### TC-009: Guest can view cart page
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Guest with local cart items (if supported) or empty cart  
**Steps**:
1. Navigate to `/cart` as guest

**Expected Results**:
- Cart page loads (`cart-page` or `cart-empty`)
- Checkout requires login when items present
**Business Rule**: §9 Platform — guest cart  
**Selectors/API**: `cart-page`, `cart-empty`, `checkout-btn`  
**Suggested Layer**: E2E Web

---


## Buyer — Browse & Product Detail

### TC-010: Search products by keyword
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/buyer/product-browse.spec.ts`  
**Preconditions**: Seeded products exist  
**Steps**:
1. Navigate to `/products`
2. Type keyword in search input

**Expected Results**:
- Grid filters to matching products
- Empty state if no matches (`products-empty`)
**Business Rule**: §2 Product catalog  
**Selectors/API**: `product-search-input`, `products-grid`, `products-empty`  
**Suggested Layer**: E2E Web

---

### TC-011: Filter products by category
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/buyer/product-browse.spec.ts`  
**Preconditions**: Products in multiple categories seeded  
**Steps**:
1. Open filters panel
2. Select a category (e.g. Electronics)

**Expected Results**:
- Only products in selected category shown
**Business Rule**: §2 Categories enum  
**Selectors/API**: `filters-panel`, `category-filter-{slug}`  
**Suggested Layer**: E2E Web

---

### TC-012: Product detail shows sale price with strikethrough
**Scenario status**: Active
**Category**: UI State  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/buyer/product-detail.spec.ts`  
**Preconditions**: Product or variant with discount > 0  
**Steps**:
1. Open discounted product detail

**Expected Results**:
- Original price struck through; discounted price displayed
- `product-price` reflects discounted amount
**Business Rule**: §2 Variant pricing, §5 Order display — sale strikethrough  
**Selectors/API**: `product-detail-page`, `product-price`  
**Suggested Layer**: E2E Web

---

### TC-013: Select variant before add to cart
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/buyer/product-detail.spec.ts`  
**Preconditions**: Product with variants (e.g. size/color)  
**Steps**:
1. Open product detail
2. Select each required variant attribute
3. Click Add to cart

**Expected Results**:
- Variant-specific price and image update
- Item added with selected attributes
**Business Rule**: §2 Variant pricing  
**Selectors/API**: `variant-value-{attr}-{value}`, `add-to-cart-btn`, `product-main-image`  
**Suggested Layer**: E2E Web

---

### TC-014: Add to cart blocked when variant not selected
**Scenario status**: Active
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/buyer/product-detail.spec.ts`  
**Preconditions**: Product with required variants  
**Steps**:
1. Open variant product without selecting options
2. Attempt add to cart

**Expected Results**:
- Error toast or button disabled; no cart add
**Business Rule**: §2 Variant pricing  
**Selectors/API**: `add-to-cart-btn`  
**Suggested Layer**: E2E Web

---

### TC-015: Seller's own products hidden from public listing
**Scenario status**: Active
**Category**: Business Rule  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Logged in as seller who owns listed products  
**Steps**:
1. Navigate to `/products`
2. Search for seller's own product name

**Expected Results**:
- Own products not shown in public grid
- Product accessible via direct URL or seller dashboard
**Business Rule**: §2 Listing visibility  
**Selectors/API**: `products-grid`, `seller-dashboard`, `product-item-{id}`  
**Suggested Layer**: E2E Web

---

### TC-065: Buyer sees new seller listing in public catalog
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/mixed/product-catalog-visibility.spec.ts`  
**Preconditions**: Seller account created product via TC-042 or TC-064; **different** buyer account logged in (not the seller)  
**Steps**:
1. As Seller: create product with unique name (e.g. `E2E Catalog Widget {timestamp}`)
2. Logout seller; login as Buyer B (`test@example.com` or second seeded buyer)
3. Navigate to `/products`
4. Locate product card in grid (`product-card-{id}`) — scroll/search if paginated
5. Click product card → open detail page
6. Verify name, price, and Add to cart (`add-to-cart-btn`) visible

**Expected Results**:
- Product visible to other buyers on public catalog (not hidden like seller's own listing — see TC-015)
- `products-page` → `product-card-{id}` → `product-detail-page`
- Buyer can view listing without being the seller
**Business Rule**: §2 Listing visibility (others see seller products)  
**Selectors/API**: `products-page`, `products-grid`, `product-card-{id}`, `product-detail-page`, `GET /api/products`  
**Suggested Layer**: E2E Web

---

### TC-066: Buyer finds new listing via search and category filter
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Seller published product with known unique name and category (e.g. `Electronics`)  
**Steps**:
1. As Buyer (not seller): open `/products`
2. Enter unique product name in `product-search-input`; submit/search
3. Verify matching `product-card-{id}` in results
4. Clear search; open `filters-panel`
5. Select category filter matching product (e.g. `category-filter-electronics`)
6. Verify product still discoverable in filtered grid

**Expected Results**:
- Search returns the new listing by name
- Category filter includes the new listing when category matches
- No false empty state (`products-empty`) when product exists
**Business Rule**: §2 Product catalog, §2 Categories enum  
**Selectors/API**: `product-search-input`, `products-grid`, `product-card-{id}`, `filters-panel`, `category-filter-{slug}`  
**Suggested Layer**: E2E Web

---


## Buyer — Cart

### TC-016: Add, update quantity, and remove cart item
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Logged in; product in stock  
**Steps**:
1. Add product to cart
2. Open `/cart`; increment quantity
3. Decrement quantity; remove item

**Expected Results**:
- Quantity updates; line total recalculates
- Remove deletes line; empty state when cart empty
**Business Rule**: §3 Cart rules  
**Selectors/API**: `cart-page`, `cart-item-{id}`, `qty-increment`, `qty-decrement`, `remove-item-btn`  
**Suggested Layer**: E2E Web

---

### TC-017: Cart quantity capped at available stock
**Scenario status**: Active
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Product with known stock (e.g. stock = 3)  
**Steps**:
1. Add to cart; increment qty beyond stock

**Expected Results**:
- Increment disabled or error shown; qty ≤ stock
**Business Rule**: §3 Quantity rules  
**Selectors/API**: `qty-increment` scoped to `cart-item-{id}`  
**Suggested Layer**: E2E Web

---

### TC-018: Per-seller delivery option selection
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent (mobile passes via route extra)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Cart with items from one seller offering standard + express  
**Steps**:
1. Open `/cart`
2. Scope to `cart-seller-group-{sellerId}`
3. Select express delivery

**Expected Results**:
- Delivery selection persisted per seller group
- Shipping fee updates in summary if buyer_pays
**Business Rule**: §3 Per-seller delivery, §4 Shipping rules  
**Selectors/API**: `cart-seller-group-{sellerId}`, `delivery-select-{sellerId}`  
**Suggested Layer**: E2E Web

---

### TC-019: Apply valid seller voucher at cart
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Active seller coupon; cart meets min order  
**Steps**:
1. Open cart for seller group
2. Click select voucher; apply valid code

**Expected Results**:
- Discount reflected in cart summary for that seller
**Business Rule**: §6 Coupons — one per seller  
**Selectors/API**: `select-voucher-btn-{sellerId}`, `POST /api/coupons/validate`  
**Suggested Layer**: E2E Web

---

### TC-020: Invalid voucher shows validation error
**Scenario status**: Active
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Cart with items  
**Steps**:
1. Apply expired or wrong-seller coupon code

**Expected Results**:
- Error message; no discount applied
**Business Rule**: §6 Validation failures  
**Selectors/API**: `select-voucher-btn-{sellerId}`, `POST /api/coupons/validate` → 400/404  
**Suggested Layer**: E2E Web + Playwright-API

---

### TC-021: Multi-seller cart displays separate seller groups
**Scenario status**: Active
**Category**: Business Rule  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Cart items from 2+ sellers  
**Steps**:
1. Open `/cart`

**Expected Results**:
- Separate `cart-seller-group-{sellerId}` per seller
- Independent delivery/voucher controls per group
**Business Rule**: §3 Structure — grouped by seller  
**Selectors/API**: `cart-seller-group-{sellerId}`  
**Suggested Layer**: E2E Web

---

### TC-109: Cart isolation — buyer2 sees own empty cart in UI, not buyer1's items (Web)
**Scenario status**: Active
**Category**: Security / Isolation  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: API (TC-108)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/mixed/cart-isolation.spec.ts`  
**Preconditions**: Buyer1 has items in server-side cart; buyer2 is a fresh account with empty cart  
**Steps**:
1. Inject buyer2's auth token into `localStorage`
2. Reload page; wait for authenticated navbar
3. Navigate to `/cart`

**Expected Results**:
- `cart-empty` testid is visible
- `cart-item-{buyer1ProductId}` is NOT visible
**Business Rule**: §3 Cart — CartContext fetches server-side cart for the authenticated user  
**Selectors/API**: `cart-empty`, `cart-item-{id}`, `GET /api/cart`  
**Suggested Layer**: E2E Web

---


## Buyer — Checkout & Orders

### TC-022: Complete checkout with Cash on Delivery
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/buyer/checkout.spec.ts`  
**Preconditions**: Logged in; cart with items; saved or new address  
**Steps**:
1. Proceed from cart to `/checkout`
2. Complete shipping address
3. Select Cash on Delivery
4. Place order

**Expected Results**:
- Redirect to order confirmation / orders
- Order status `pending`; payment shows "Cash on Delivery"
- Cart cleared
- COD always uses `POST /api/orders` (never a checkout session); order carries `paymentStatus: not_required`, a persisted `sellerId` and a 24-hour `acceptBy`, under both `CHECKOUT_FLOW` values
- *Updated 2026-10-24:* no Stripe call is made (see TC-153, TC-159 for COD cancellation)
**Business Rule**: §4 Payment methods, §4 Post-checkout  
**Selectors/API**: `checkout-page`, `shipping-section`, `payment-section`, `place-order-btn`, `POST /api/orders`  
**Suggested Layer**: E2E Web

---

### TC-023: Checkout with saved credit card
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/buyer/checkout.spec.ts`  
**Preconditions**: User has saved card in profile  
**Steps**:
1. Checkout with items
2. Select saved card payment
3. Place order

**Expected Results**:
- Order created; card last4 shown on order detail
- *Updated 2026-10-24:* result depends on `CHECKOUT_FLOW`. `legacy`: `POST /api/orders` with the card, payment captured at once. `manual_capture`: checkout session, hold only (`requires_capture`), order `pending` / `authorized`, see TC-144
**Business Rule**: §4 Payment methods, §8 Saved cards  
**Selectors/API**: `payment-section`, `place-order-btn`  
**Suggested Layer**: E2E Web

---

### TC-024: Checkout with new card entry
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/buyer/checkout.spec.ts`  
**Preconditions**: Logged in; no saved card selected  
**Steps**:
1. Checkout; choose credit card
2. Enter card number, holder, expiry, CVV
3. Place order

**Expected Results**:
- Client validation passes for 16-digit card, 3–4 digit CVV
- Order created successfully
- *Updated 2026-10-24:* the card is entered in the Stripe `CardElement`; use Stripe test card `4242 4242 4242 4242`. Under `manual_capture` the card is authorized, not charged, see TC-143. Declined and 3DS cards: TC-146, TC-147
**Business Rule**: §10 Web checkout card validation  
**Selectors/API**: `payment-section`, `place-order-btn`  
**Suggested Layer**: E2E Web

---

### TC-098: Checkout COD with variant product (web)
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both (mobile TC-101)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/buyer/variant-checkout.spec.ts`  
**Preconditions**: Buyer logged in; variant product in catalog with known attributes (e.g. Size S/M/L from TC-064 or API seed); cart empty  
**Steps**:
1. Open variant product detail `/products/{id}` (not seller's own listing — use buyer session or TC-065 flow)
2. Select variant (e.g. `variant-value-Size-M`)
3. Verify price/image update for selected variant
4. Click Add to cart (`add-to-cart-btn`)
5. Open cart → proceed to checkout
6. Complete shipping address; select Cash on Delivery
7. Place order
8. Open order detail for created order

**Expected Results**:
- Cart line shows selected variant attributes and **variant-specific price** (not base product price)
- `POST /api/orders` succeeds; order item includes `variantId`, `selectedAttributes` (e.g. `{ Size: 'M' }`)
- Order detail displays variant label (e.g. `Size: M`) and correct unit price
- Order item image uses variant cover image when variant has images
- **Only selected variant stock** decrements (other sizes unchanged)
- Cart cleared for checked-out items; order status `pending`, payment COD
**Business Rule**: §2 Variant pricing, §4 Checkout, §4 Stock validation (variant-aware)  
**Selectors/API**: `variant-value-{attr}-{value}`, `add-to-cart-btn`, `cart-page`, `checkout-page`, `place-order-btn`, `order-detail-page`, `GET /api/orders/:id`, `GET /api/products/:id`  
**Suggested Layer**: E2E Web

---

### TC-099: Variant checkout — insufficient stock (web)
**Scenario status**: Active
**Category**: Edge Case  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright / Playwright-API  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Variant product with Size L stock = 1 in cart; L stock depleted before checkout (second session, API, or concurrent order)  
**Steps**:
1. Add Size L variant to cart as Buyer A
2. Deplete Size L stock (place order as Buyer B or `PATCH` via API)
3. Attempt checkout as Buyer A

**Expected Results**:
- Order rejected with **400** `"Insufficient stock for variant of: ..."`
- Cart item remains or user sees clear error; L stock not negative
**Business Rule**: §4 Stock validation — variant-level  
**Selectors/API**: `POST /api/orders`, `variants.$.stock`  
**Suggested Layer**: E2E Web + API (extends TC-056)

---

### TC-100: Cart holds two variants of same product (web)
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Variant product with Size S and M in stock  
**Steps**:
1. Open product detail → select Size S → add to cart
2. Select Size M → add to cart again
3. Open cart — verify **two separate line items** (same product, different variants)
4. Complete COD checkout
5. Open created order detail

**Expected Results**:
- Cart shows 2 lines: S and M with distinct prices/attributes
- Single order (one seller) with **2 items**, each with distinct `variantId` and `selectedAttributes`
- Totals reflect sum of both variant line prices (+ tax/shipping)
- Stock decremented for **both** S and M
**Business Rule**: §2 Variants, §3 Cart line identity (product + variant key)  
**Selectors/API**: `variant-value-Size-S`, `variant-value-Size-M`, `cart-page`, `POST /api/orders`  
**Suggested Layer**: E2E Web

---

### TC-025: Multi-seller checkout creates separate orders
**Scenario status**: Active
**Category**: Business Rule  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/api/orders.api.spec.ts`  
**Preconditions**: Cart with items from 2 sellers  
**Steps**:
1. Complete checkout for full cart
2. Open `/orders`

**Expected Results**:
- Two distinct orders (`order-card-{id}` each)
- Independent subtotal, tax (8%), shipping, total per order
**Business Rule**: §4 Multi-seller checkout  
**Selectors/API**: `orders-page`, `order-card-{id}`, `POST /api/orders`  
**Suggested Layer**: E2E Web + Playwright-API

---

### TC-029: Checkout blocked with missing address fields
**Scenario status**: Active
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: New address form shown  
**Steps**:
1. Leave required fields empty (street, city, state, zip)
2. Attempt place order

**Expected Results**:
- Validation errors; order not submitted
**Business Rule**: §4 Shipping address, §10 Web checkout  
**Selectors/API**: `shipping-section`, `place-order-btn`  
**Suggested Layer**: E2E Web

---

### TC-030: Order history tabs filter by status
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent (mobile uses different tab labels)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: User with orders in multiple statuses  
**Steps**:
1. Open `/orders`
2. Click status tabs

**Expected Results**:
- Each tab shows only matching orders
- *Updated 2026-10-24:* tabs are All, Pending, Preparing, To Ship, To Receive, Complete, **Return/Refund**, Cancelled. A fully refunded order leaves Complete (its refund is under Return/Refund) but stays under All. See TC-168
**Business Rule**: §5 Order lifecycle  
**Selectors/API**: `orders-page`, `order-tabs`, `order-tab-{key}`, `order-card-{id}`  
**Suggested Layer**: E2E Web

---

### TC-031: Confirm receipt when order shipped
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Order in `shipped` status  
**Steps**:
1. Open order detail
2. Click confirm received

**Expected Results**:
- Status → `delivered`
- Review button becomes available
**Business Rule**: §5 Buyer confirm receipt  
**Selectors/API**: `order-detail-page`, `confirm-received-btn`, `PUT /api/orders/:id/confirm-received`  
**Suggested Layer**: E2E Web

---

### TC-032: Buyer cancel order in pending status
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Order status `pending`  
**Steps**:
1. Cancel order from detail or history

**Expected Results**:
- Status → `cancelled`; stock restored (variant-aware)
- *Updated 2026-10-24:* the buyer can cancel **pending orders only** (the Cancel button was removed for `preparing`). Cancel opens a "Cancel Order" dialog with an optional reason (max 500 characters); "Keep Order" closes it without cancelling, "Yes, Cancel Order" confirms. Card orders: see TC-152; COD orders: TC-153; no cancel once the seller accepts: TC-154
**Business Rule**: §5 Buyer cancel, §5 Stock restore  
**Selectors/API**: `order-detail-page`, `PUT /api/orders/:id/status`  
**Suggested Layer**: E2E Web + Playwright-API

---

### TC-112: Buyer2's order history page shows only their own orders, not buyer1's
**Scenario status**: Active
**Category**: Security / Isolation  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: API (TC-110)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/mixed/order-isolation.spec.ts`  
**Preconditions**: Buyer1 has a placed order; buyer2 is a fresh account with no orders  
**Steps**:
1. Inject buyer2's auth into localStorage; reload
2. Navigate to `/orders`

**Expected Results**:
- `orders-page` is visible
- Buyer1's `order-card-{orderId}` is NOT visible
- Buyer2 sees empty order history or only their own orders
**Business Rule**: §5 Order lifecycle — order history scoped to authenticated `userId`  
**Selectors/API**: `orders-page`, `order-card-{id}`, `GET /api/orders`  
**Suggested Layer**: E2E Web

---


## Buyer — Reviews & Social

### TC-034: Leave review after order delivered
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Delivered order containing product; no existing review  
**Steps**:
1. Open order detail
2. Click review button for product
3. Submit rating 1–5 and comment

**Expected Results**:
- Review saved; product rating updated
**Business Rule**: §7 Reviews  
**Selectors/API**: `review-btn-{productId}`, `POST /api/reviews`  
**Suggested Layer**: E2E Web

---

### TC-037: Follow and unfollow seller from public profile
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P2  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both (mobile route `/seller-profile/:id`)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Two users; target is seller  
**Steps**:
1. Navigate to `/users/:id`
2. Click Follow; then Unfollow

**Expected Results**:
- Follower count updates; cannot follow self
**Business Rule**: §8 Follow system  
**Selectors/API**: `GET /api/users/:id`, follow endpoints  
**Suggested Layer**: E2E Web

---


## Buyer — UI & Web-only

### TC-038: Toggle dark mode persists across navigation
**Scenario status**: Active
**Category**: UI State  
**Priority**: P2  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: None  
**Steps**:
1. Click theme toggle in navbar
2. Navigate to products and back

**Expected Results**:
- Dark class applied to document/root
- Preference persists in session/local storage
**Business Rule**: §9 Platform — dark mode  
**Selectors/API**: `theme-toggle-btn`, `navbar`  
**Suggested Layer**: E2E Web

---

### TC-039: Order card displays persisted total not raw sum
**Scenario status**: Active
**Category**: UI State  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Order with product discount + coupon applied  
**Steps**:
1. View order in history

**Expected Results**:
- Displayed total matches `order.total` from API (includes tax, shipping, discounts)
**Business Rule**: §5 Order display rules  
**Selectors/API**: `order-card-{id}`  
**Suggested Layer**: E2E Web

---

### TC-040: Loading and empty states on products page
**Scenario status**: Active
**Category**: UI State  
**Priority**: P2  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: None  
**Steps**:
1. Load `/products`; observe loading spinner
2. Search nonsense string

**Expected Results**:
- `products-loading` during fetch
- `products-empty` when no results
**Business Rule**: §2 Catalog  
**Selectors/API**: `products-loading`, `products-empty`  
**Suggested Layer**: E2E Web

---


## Seller — Onboarding & Products

### TC-041: Become a seller (one-way promotion)
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P0  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Logged in as buyer  
**Steps**:
1. Profile → Become a Seller
2. Confirm promotion

**Expected Results**:
- Role → seller; seller nav link appears
- Cannot demote back to buyer
**Business Rule**: §1 Roles — one-way  
**Selectors/API**: `nav-profile-link`, `PUT /api/auth/profile { role: "seller" }`, `nav-seller-link`  
**Suggested Layer**: E2E Web

---

### TC-042: Seller creates simple product listing (web 6-step wizard)
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P0  
**Role**: Seller  
**Platform**: Web  
**Parity**: Divergent (mobile 7-step — Variants separate)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/seller/seller-simple-product-crud.spec.ts`  
**Preconditions**: Seller logged in (`test@example.com` promoted, or dedicated seller account)  
**Steps**:
1. Navigate to `/seller` — verify `seller-dashboard` visible
2. Click **Add product** (`add-product-btn`)
3. **Step 1 — Basic Info:** enter product name (e.g. `E2E Simple Lamp`), select category (e.g. `Home & Garden`), optional brand/condition; click Next
4. **Step 2 — Pricing:** enter price `29.99`, stock `10` (no variant rows); click Next
5. **Step 3 — Description:** enter description ≤ 200 chars; add ≥ 3 tags (e.g. `lamp`, `home-decor`, `lighting`); click Next
6. **Step 4 — Images:** upload ≥ 1 product image; click Next
7. **Step 5 — Shipping:** enable all delivery options (`standard`, `express`, `pickup`); select **Buyer pays**; enter fees — standard `$10`, express `$15`, pickup `$5`; click Next
8. **Step 6 — Review:** confirm summary; submit create
9. Verify new card on seller dashboard (`product-item-{id}`)
10. Open `/products/{id}` directly — product detail loads

**Expected Results**:
- `POST /api/products` (or update) succeeds; product persisted with correct name, price, stock, category
- Product appears on seller dashboard with `product-item-{id}`
- Product detail page reachable at `/products/{id}` (`product-detail-page`, `product-name`)
- Product has **no variants** — single price/stock on detail page
- Shipping persisted: all three delivery options; `shippingFee` = `buyer_pays`; fee amounts standard `10`, express `15`, pickup `5`
- Tags persisted: at least 3 tags saved on product (e.g. `lamp`, `home-decor`, `lighting`)
**Business Rule**: §2 Product wizard (web 6-step), §2 Product fields  
**Selectors/API**: `seller-dashboard`, `add-product-btn`, `wizard-tags-input`, `wizard-tags-add-btn`, `wizard-tag-{name}`, `product-item-{id}`, `product-detail-page`, `POST /api/products`  
**Suggested Layer**: E2E Web

---

### TC-064: Seller creates product listing with variants (web)
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P0  
**Role**: Seller  
**Platform**: Web  
**Parity**: Divergent (mobile 7-step — dedicated Variants step + permission flow)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/seller/seller-product-wizard.spec.ts`  
**Preconditions**: Seller logged in; backend image upload available  
**Steps**:
1. Open `/seller` → **Add product** (`add-product-btn`)
2. **Step 1 — Basic Info:** name `E2E Variant Hoodie`, category `Clothing`; Next
3. **Step 2 — Pricing:** enable variants → attribute `Size` with `S`, `M`, `L`; set per-variant price/stock; upload **2 images per variant row** via `wizard-variant-row-{i}-image-input`; on row 0 reorder cover with `wizard-variant-row-0-image-0-move-right`; Next
4. **Step 3 — Description:** fill description; Next
5. **Step 4 — Images:** add base product image (URL tab); Next
6. **Step 5 — Shipping:** all delivery options + buyer pays (standard `$10`, express `$15`, pickup `$5`); Next
7. **Step 6 — Review:** submit
8. Open product detail `/products/{id}` → **Preview as Buyer** (`preview-as-buyer-btn`)
9. Select each size (`variant-value-Size-{S|M|L}`)

**Expected Results**:
- Product created with `variants[]` persisted (attributes, price, stock, **2 images per variant**)
- API: `variants[i].images.length === 2` for each row
- Seller dashboard shows `product-item-{id}`
- Detail page: price updates per variant; **main image src changes** when size changes; **2 gallery thumbnails** per selection
- Add to cart available after variant selected (`add-to-cart-btn`)
**Business Rule**: §2 Variant pricing, §2 Product wizard, variant image gallery  
**Selectors/API**: `wizard-variant-row-{i}-image-input`, `wizard-variant-row-{i}-image-{j}`, `wizard-variant-row-{i}-image-{j}-cover`, `wizard-variant-row-{i}-image-{j}-move-right`, `preview-as-buyer-btn`, `product-main-image`, `variant-value-{attr}-{value}`, `POST /api/products`, `POST /api/products/variant-image`  
**Suggested Layer**: E2E Web

---

### TC-043: Wizard validation — missing required fields
**Scenario status**: Active
**Category**: Negative  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Seller on add product wizard  
**Steps**:
1. Attempt next/submit without name, images, or shipping options

**Expected Results**:
- Step blocked with validation messages
**Business Rule**: §2 Product fields, wizard steps  
**Selectors/API**: `add-product-btn`  
**Suggested Layer**: E2E Web

---

### TC-044: Edit product price and stock
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/seller/seller-simple-product-crud.spec.ts`  
**Preconditions**: Existing seller product  
**Steps**:
1. Edit product from dashboard
2. Update price and stock; save

**Expected Results**:
- Changes persisted; reflected on product detail
**Business Rule**: §2 Product fields  
**Selectors/API**: `edit-product-{id}`, `product-detail-page`, `product-price`  
**Suggested Layer**: E2E Web

---

### TC-120: Edit variant product — update variant price, stock, and options
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/seller/seller-variant-product-crud.spec.ts`  
**Preconditions**: Seller has an existing variant product (e.g. created via TC-064 or TC-091)  
**Steps**:
1. Open seller dashboard → locate the variant product card
2. Click **Edit** (`edit-product-{id}`)
3. Navigate to the **Variants** step
4. Change price on one variant (e.g. Size M: $54.99 → $57.99)
5. Change stock on another variant (e.g. Size L: 15 → 20)
6. Add a new variant option (e.g. Size XL with price $59.99, stock 5)
7. Save changes
8. Open the product detail page as buyer

**Expected Results**:
- Updated prices and stock values are reflected on the product detail page
- The new variant option (XL) is selectable via `variant-value-Size-XL`
- `PUT /api/products/:id` returns 200 with persisted variant data
**Business Rule**: §2 Product fields — variant price and stock are per-option  
**Selectors/API**: `edit-product-{id}`, `wizard-variant-row-{i}-price`, `wizard-variant-row-{i}-stock`, `variant-value-{attr}-{value}`, `PUT /api/products/:id`  
**Suggested Layer**: E2E Web

---

### TC-045: Preview simple product as buyer via My Products page
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P2  
**Role**: Seller  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/seller/seller-simple-product-crud.spec.ts`  
**Preconditions**: Seller has an existing simple product (no variants)  
**Steps**:
1. Navigate to `/my-products` (`nav-link-my-products`)
2. Click preview on a simple product card

**Expected Results**:
- Product detail page renders in buyer view (no edit controls visible)
- Product name, price, and description are displayed correctly
- Add to cart button is not functional for the seller's own product
**Business Rule**: §9 Platform — `/my-products` web-only  
**Selectors/API**: `my-products-page`, `nav-link-my-products`, `product-detail-page`  
**Suggested Layer**: E2E Web

---

### TC-121: Preview variant product as buyer via My Products page
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P2  
**Role**: Seller  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/seller/seller-variant-product-crud.spec.ts`  
**Preconditions**: Seller has an existing variant product (e.g. created via TC-064)  
**Steps**:
1. Navigate to `/my-products` (`nav-link-my-products`)
2. Click preview on a variant product card
3. Select each available variant option

**Expected Results**:
- Product detail page renders in buyer view
- Variant selectors are present and selectable (`variant-value-{attr}-{value}`)
- Price and stock update correctly when switching variants
- Add to cart button is not functional for the seller's own product
**Business Rule**: §9 Platform — `/my-products` web-only; §2 Variant display  
**Selectors/API**: `my-products-page`, `product-detail-page`, `variant-value-{attr}-{value}`, `product-price`  
**Suggested Layer**: E2E Web

---

### TC-122: Seller views product list on My Products page
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/seller/seller-simple-product-crud.spec.ts`  
**Preconditions**: Seller has at least one simple and one variant product  
**Steps**:
1. Navigate to `/my-products` (`nav-link-my-products`)
2. Verify the product list loads
3. Confirm each product card shows the correct name and price
4. Confirm edit and delete actions are present on each card

**Expected Results**:
- `my-products-page` is visible
- All seller-owned products appear as `product-item-{id}` cards
- Each card shows product name and price
- `edit-product-{id}` and `delete-product-{id}` controls are present on each card
- Products not owned by this seller are not listed
**Business Rule**: §2 Product catalog — seller sees only own products  
**Selectors/API**: `my-products-page`, `nav-link-my-products`, `product-item-{id}`, `edit-product-{id}`, `delete-product-{id}`  
**Suggested Layer**: E2E Web

---

### TC-123: Products page — navigate to next page loads different products
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent (mobile uses infinite scroll)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: More than one page of products exists in seed (60+ products); buyer logged in  
**Steps**:
1. Navigate to `/products`
2. Wait for products grid to load; collect all visible product names on page 1
3. Click the next page button (`data-testid="pagination-next"`)
4. Wait for products grid to reload; collect all visible product names on page 2

**Expected Results**:
- Page 2 product names differ from page 1
- Active page indicator shows page 2 (`data-testid="pagination-page-2"` has active styling)
**Business Rule**: §1 Product browse — paginated at 20/page server-side  
**Selectors/API**: `pagination-next`, `pagination-page-2`, `[data-testid^="product-card-"]`, `GET /api/products?page=2&limit=N`  
**Suggested Layer**: E2E Web

---

### TC-124: Products page — category filter resets to page 1
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: More than one page of products; buyer logged in  
**Steps**:
1. Navigate to `/products` and navigate to page 2
2. Click a category filter button (e.g. `category-filter-electronics`)
3. Wait for products grid to reload

**Expected Results**:
- Page resets to 1 (`pagination-page-1` is active)
- Products shown belong to the selected category
**Business Rule**: §1 Product browse — filter change resets pagination  
**Selectors/API**: `pagination-next`, `pagination-page-1`, `category-filter-{slug}`, `products-loading`  
**Suggested Layer**: E2E Web

---

### TC-125: Products page — sort change resets to page 1
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: More than one page of products; buyer logged in  
**Steps**:
1. Navigate to `/products` and navigate to page 2
2. Change the sort select (`sort-select`) to a different value
3. Wait for products grid to reload

**Expected Results**:
- Page resets to 1 (`pagination-page-1` is active)
**Business Rule**: §1 Product browse — sort change resets pagination  
**Selectors/API**: `pagination-next`, `pagination-page-1`, `sort-select`, `products-loading`  
**Suggested Layer**: E2E Web

---

### TC-126: Products page — count label shows total across all pages
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: More than one page of products; buyer logged in  
**Steps**:
1. Navigate to `/products` with no filters
2. Read the product count label text (e.g. "X products found")
3. Navigate to page 2
4. Read the product count label text again

**Expected Results**:
- Count label shows the same total on both pages
- Total is greater than the number of products visible on a single page (i.e. reflects the full dataset)
**Business Rule**: §1 Product browse — count reflects server total, not current page slice  
**Selectors/API**: `products-page` subtitle text, `pagination-next`  
**Suggested Layer**: E2E Web

---

### TC-127: Products page — pagination hidden when results fit on one page
**Scenario status**: Active
**Category**: Edge Case  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Buyer logged in  
**Steps**:
1. Navigate to `/products`
2. Enter a specific product name in the search field that returns only one result
3. Wait for results to load

**Expected Results**:
- Products grid shows the single matching product
- `pagination` container is not present in the DOM
**Business Rule**: §1 Product browse — pagination hidden when total ≤ page size  
**Selectors/API**: `product-search-input`, `pagination` (absent), `products-loading`  
**Suggested Layer**: E2E Web

---

### TC-128: MyProducts page — navigate to next page
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Seller has more products than the page size (requires seeded seller with 10+ products); seller logged in  
**Steps**:
1. Navigate to `/my-products`
2. Collect product names visible on page 1
3. Click the next page button (`pagination-next`)
4. Collect product names visible on page 2

**Expected Results**:
- Page 2 product names differ from page 1
- Active page indicator shows page 2
**Business Rule**: §2 Product catalog — My Products paginated client-side  
**Selectors/API**: `my-products-page`, `pagination-next`, `pagination-page-2`, `[data-testid^="product-card-"]`  
**Suggested Layer**: E2E Web

---

### TC-129: MyProducts page — category filter resets to page 1
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Seller has more products than the page size across multiple categories; seller logged in  
**Steps**:
1. Navigate to `/my-products` and navigate to page 2
2. Click a category chip

**Expected Results**:
- Page resets to 1 (`pagination-page-1` is active)
- Products shown belong to the selected category
**Business Rule**: §2 Product catalog — category filter resets pagination  
**Selectors/API**: `my-products-page`, `pagination-next`, `my-products-category-filter-{slug}`, `pagination-page-1`  
**Suggested Layer**: E2E Web

---

### TC-130: MyProducts page — next button disabled on last page
**Scenario status**: Active
**Category**: Edge Case  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Seller has more than one page of products; seller logged in  
**Steps**:
1. Navigate to `/my-products`
2. Click the last page number button to jump to the final page

**Expected Results**:
- `pagination-next` button is disabled
**Business Rule**: §2 Product catalog — pagination boundary  
**Selectors/API**: `my-products-page`, `pagination-next` (disabled), last `pagination-page-{n}` button  
**Suggested Layer**: E2E Web

---

### TC-131: MyProducts page — pagination hidden when products fit on one page
**Scenario status**: Active
**Category**: Edge Case  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Seller has fewer products than the page size; seller logged in  
**Steps**:
1. Navigate to `/my-products`

**Expected Results**:
- All products are visible
- `pagination` container is not present in the DOM
**Business Rule**: §2 Product catalog — pagination hidden when total ≤ page size  
**Selectors/API**: `my-products-page`, `pagination` (absent)  
**Suggested Layer**: E2E Web

---

### TC-046: Delete product from seller dashboard
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P2  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/seller/seller-simple-product-crud.spec.ts`  
**Preconditions**: Deletable product (no blocking orders)  
**Steps**:
1. Click delete on product card
2. Confirm deletion

**Expected Results**:
- Product removed from dashboard and catalog
**Business Rule**: §2 Product catalog  
**Selectors/API**: `delete-product-{id}`, `DELETE /api/products/:id`  
**Suggested Layer**: E2E Web

---


## Seller — Orders & Vouchers

### TC-047: Seller advances order through valid status pipeline
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P0  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: New buyer order in `pending`  
**Steps**:
1. Seller dashboard → orders tab
2. Advance: pending → preparing → processing → shipped

**Expected Results**:
- Each transition succeeds; status badge updates
- `shippedAt` set on shipped
- *Updated 2026-10-24:* `pending → preparing` is the **acceptance** step: the action is labelled "Accept & start preparing", is rejected after `acceptBy`, and for a card order captures the held amount (TC-155). From `shipped` a seller can only move to `delivered`; `shipped → cancelled` is no longer allowed (TC-160, TC-212)
**Business Rule**: §5 Seller transitions  
**Selectors/API**: `seller-order-card-{id}`, `order-action-{id}`, `seller-order-action-btn`  
**Suggested Layer**: E2E Web

---

### TC-049: Seller cancel order with reason
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Order in `pending` or `preparing`  
**Steps**:
1. Cancel from seller order detail
2. Provide reason

**Expected Results**:
- Status → `cancelled`
- *Updated 2026-10-24:* split by state. **Pending** orders (card or COD) are cancelled with a **required** reason of 1–1000 characters and only when the server sets `canSellerCancelPending` (TC-157, TC-158, TC-159). **Preparing/processing** orders can be cancelled by the seller for COD only, with an optional reason; card orders show no Cancel button (TC-160)
**Business Rule**: §5 Cancellation  
**Selectors/API**: `seller-cancel-order-btn`, `seller-order-detail-page`  
**Suggested Layer**: E2E Web

---

### TC-050: Create and apply seller voucher end-to-end
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Both  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Seller account  
**Steps**:
1. Seller creates voucher in dashboard
2. Buyer applies at cart/checkout
3. Complete order

**Expected Results**:
- Discount on order; `usedCount` incremented
**Business Rule**: §6 Coupons  
**Selectors/API**: `select-voucher-btn-{sellerId}`, `POST /api/coupons`  
**Suggested Layer**: E2E Web

---

### TC-051: Seller order detail shows formatted payment and delivery labels
**Scenario status**: Active
**Category**: UI State  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Order with COD and express delivery  
**Steps**:
1. Open `/seller/orders/:id`

**Expected Results**:
- Payment shows "Cash on Delivery" (not slug)
- Delivery option label resolved from `deliverySelections`
**Business Rule**: §5 Order display rules  
**Selectors/API**: `seller-order-detail-page`  
**Suggested Layer**: E2E Web

---

### TC-052: New order toast notification (web polling)
**Scenario status**: Active
**Category**: UI State  
**Priority**: P2  
**Role**: Seller  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Manual | Playwright (timing-sensitive)  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Seller logged in with the app active; the initial successful seller-orders poll has established its baseline; a separate buyer session is ready
**Steps**:
1. Keep the seller app active after the baseline response; existing orders must not produce an alert
2. Place a new order for this seller from the separate buyer session
3. Observe the toast after the next successful poll with a bounded condition-based wait allowing the 30-second interval, rather than a fixed sleep; click it

**Expected Results**:
- A new-order toast appears; clicking opens `/seller?tab=orders`. Orders belonging only to another seller do not produce this seller's alert
**Business Rule**: §9 Platform — web toast polling  
**Selectors/API**: `seller-dashboard`  
**Suggested Layer**: E2E Web (baseline synchronization and bounded polling required)

---


## Security & Access Control

### TC-055: Protected routes require authentication
**Scenario status**: Active
**Category**: Security  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent (mobile gates more routes)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Guest session  
**Steps**:
1. Visit `/orders`, `/profile`, `/seller` without login

**Expected Results**:
- Redirect to login with redirect param
**Business Rule**: §1 Authentication  
**Selectors/API**: URL assertions  
**Suggested Layer**: E2E Web

---


## Edge Cases

### TC-059: Stale product removed from cart on load (web)
**Scenario status**: Active
**Category**: Edge Case  
**Priority**: P2  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Web-only (web stale cleanup)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Cart contains deleted product  
**Steps**:
1. Load `/cart` after product deleted

**Expected Results**:
- Stale item removed from display
**Business Rule**: §3 Stale cleanup (web)  
**Selectors/API**: `cart-page`  
**Suggested Layer**: E2E Web

---


## Platform Parity (Web perspective)

### TC-060: Web guest browse — no login required for catalog
**Scenario status**: Alias
**Canonical case**: TC-008
**Alias note**: Retained for historical references. Execute and count under TC-008, including `/`, `/products` and `/products/:id` as route variants.
**Category**: Platform Parity  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Guest  
**Steps**:
1. Browse `/`, `/products`, `/products/:id` without auth

**Expected Results**:
- All public catalog routes accessible
**Business Rule**: §9 Guest browsing  
**Selectors/API**: `products-page`, `product-detail-page`  
**Suggested Layer**: E2E Web

---

### TC-061: Web 6-step seller wizard vs mobile 7-step
**Scenario status**: Active
**Category**: Platform Parity  
**Priority**: P2  
**Role**: Seller  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Seller on web  
**Steps**:
1. Count wizard steps on web add product flow

**Expected Results**:
- Web = 6 steps (variants within pricing step)
- Document divergence; do not assert mobile step count in web test
**Business Rule**: §9 Platform — wizard steps  
**Selectors/API**: `add-product-btn`  
**Suggested Layer**: E2E Web

---

### TC-062: Wishlist not available on web
**Scenario status**: Active
**Category**: Platform Parity  
**Priority**: P3  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Mobile-only feature  
**Automation**: Blocked (no web wishlist)  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: N/A  
**Steps**:
1. Confirm no `/wishlist` route on web

**Expected Results**:
- No wishlist nav or page on web
- Tag Blocked for Playwright — mobile-only
**Business Rule**: §9 Wishlist mobile-only  
**Selectors/API**: N/A  
**Suggested Layer**: Manual

---

### TC-063: Web cart includes all items — no checkbox selection
**Scenario status**: Active
**Category**: Platform Parity  
**Priority**: P2  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Cart with multiple items  
**Steps**:
1. Proceed to checkout from cart without per-item selection

**Expected Results**:
- All cart items included in checkout (unlike mobile checkbox subset)
**Business Rule**: §3 Web vs mobile cart selection  
**Selectors/API**: `checkout-btn`, `checkout-page`  
**Suggested Layer**: E2E Web

---

### TC-105: Checkout with new card — variant product (web)
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: TC-103 (mobile)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/buyer/variant-checkout.spec.ts`  
**Preconditions**: Buyer logged in (`test@example.com`); variant product in catalog (seeded or created via API); cart empty; no saved card selected  
**Steps**:
1. Navigate to product detail; select a size variant (e.g. Size M)
2. Add to cart; open cart; proceed to checkout
3. Fill shipping address
4. In **Payment Method**, select **Credit Card** from the type dropdown; if saved cards exist, click **New Card** first
5. Enter card number `4111111111111111`, holder name, expiry, CVV
6. Click **Review Order**, then **Place Order**

**Expected Results**:
- Order created with correct variant attributes (`selectedAttributes.Size = 'M'`) and variant price
- Order detail shows card type and last 4 digits
- Cart cleared; order visible in `/orders`
**Business Rule**: §2 Variants, §4 Payment methods, §6 Checkout, §10 Web checkout card validation  
**Selectors/API**: `variant-value-Size-M`, `checkout-btn`, `payment-section`, `place-order-btn`, `POST /api/orders`  
**Suggested Layer**: E2E Web

---

### TC-106: Checkout with saved card — variant product (web)
**Scenario status**: Active
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: TC-104 (mobile)  
**Automation**: Playwright  
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: `e2e-testing/tests/web/buyer/variant-checkout.spec.ts`  
**Preconditions**: Buyer logged in; ≥ 1 saved card on profile (`GET /api/auth/payment-methods`); variant product in catalog; cart empty  
**Steps**:
1. Navigate to product detail; select a size variant (e.g. Size M)
2. Add to cart; open cart; proceed to checkout
3. Fill or confirm shipping address
4. In **Payment Method**, verify **Saved Card** mode is active (default when saved cards exist); select a saved card
5. Click **Review Order**, then **Place Order**

**Expected Results**:
- Order created with correct variant attributes and variant-specific price
- Order detail shows saved card type + last4
- Cart cleared; order visible in `/orders`
**Business Rule**: §2 Variants, §4 Payment methods, §6 Checkout, §8 Saved cards  
**Selectors/API**: `variant-value-Size-M`, `checkout-btn`, `payment-section`, `place-order-btn`, `POST /api/orders`  
**Suggested Layer**: E2E Web

---

## Added 2026-10-24 — features shipped since the last review

> **Environment flags used by these scenarios** (set on the backend and web build under test; see `docs/authorize-capture-open-items.md`):
> `CHECKOUT_FLOW=manual_capture` + web `VITE_CHECKOUT_FLOW=manual_capture` (authorize at checkout, capture on seller acceptance) · `SELLER_SEES_MANUAL_CAPTURE=true` (sellers can see manual-capture orders) · `DELIVERED_REFUNDS_ENABLED=true` (refund requests and decisions).
> Needs a MongoDB **replica set** and Stripe **test mode** only. Stripe test cards: success `4242 4242 4242 4242`, declined `4000 0000 0000 0002`, 3DS `4000 0025 0000 3155`.
> Selectors listed are `data-testid` values found in `frontend/src` on 2026-10-24; scenarios without one say so.

---

## Buyer — Saved Addresses & Saved Cards (Web)

### TC-137: Save a new address at checkout
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-172)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Buyer logged in; cart with items; choose "new address" at checkout
**Steps**:
1. Open `/checkout`; choose the new-address option and fill street, city, state, ZIP, email and phone
2. Tick "Save this address to my profile"
3. Place the order (COD)
4. Open `/profile` → Saved Addresses

**Expected Results**:
- The order is placed with the entered address
- The address appears once in Saved Addresses; leaving the box unticked saves nothing
**Business Rule**: §8 Saved addresses
**Selectors/API**: `shipping-section`, `place-order-btn`, checkbox label "Save this address to my profile", `POST /api/auth/saved-addresses`
**Suggested Layer**: E2E Web

---

### TC-138: Edit a saved address in the profile
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-173)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Buyer has ≥ 1 saved address
**Steps**:
1. Open `/profile` → Saved Addresses
2. Click the edit (pencil, title "Edit address") control on an address
3. Change the street and city; click Save

**Expected Results**:
- The address row shows the new values; the default flag is unchanged
- A page reload and the checkout address picker show the same values
**Business Rule**: §8 Saved addresses
**Selectors/API**: title "Edit address", `PUT /api/auth/saved-addresses/:id`
**Suggested Layer**: E2E Web

---

### TC-139: Saved address edit requires street and city
**Scenario status**: Active
**Category**: Negative
**Priority**: P2
**Role**: Buyer
**Platform**: Web
**Parity**: Both
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Buyer has ≥ 1 saved address
**Steps**:
1. Open the edit form for an address
2. Clear the street (then repeat with the city) and click Save
3. Click Cancel on a second edit after changing a field

**Expected Results**:
- The text "Street and city are required" is shown; no request is sent and the address is unchanged
- Cancel discards the edit
**Business Rule**: §8 Saved addresses (`street` + `city` required)
**Selectors/API**: inline error text, `PUT /api/auth/saved-addresses/:id` (see TC-191)
**Suggested Layer**: E2E Web + Component

---

### TC-140: Set a default address; checkout preselects it
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P2
**Role**: Buyer
**Platform**: Web
**Parity**: Both
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Buyer has ≥ 2 saved addresses, the first is default
**Steps**:
1. In `/profile`, set the second address as default
2. Open `/checkout`

**Expected Results**:
- Exactly one address carries the "Default" badge (the second); the first loses it
- Checkout preselects the default address
**Business Rule**: §8 Saved addresses (one default)
**Selectors/API**: "Default" badge, `PUT /api/auth/saved-addresses/:id/default`
**Suggested Layer**: E2E Web

---

### TC-141: Delete a saved address (web removes it without a dialog)
**Scenario status**: Active
**Category**: Platform Parity
**Priority**: P2
**Role**: Buyer
**Platform**: Web
**Parity**: Divergent (mobile asks for confirmation, TC-174)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Buyer has ≥ 2 saved addresses
**Steps**:
1. In `/profile`, click the delete control (title "Delete address") on a non-default address

**Expected Results**:
- The address is removed immediately; no confirmation dialog appears on web
- The other addresses are unchanged
**Business Rule**: §8 Saved addresses
**Selectors/API**: title "Delete address", `DELETE /api/auth/saved-addresses/:id`
**Suggested Layer**: E2E Web

---

### TC-142: Saved cards on the profile — list, set default, delete
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-175)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Buyer has ≥ 2 saved cards (add through checkout with "save card", or `POST /api/auth/payment-methods`)
**Steps**:
1. Open `/profile` → Saved Cards
2. Set the non-default card as default
3. Delete one card

**Expected Results**:
- Each card shows brand, last 4 digits and expiry; only one card is default
- The deleted card disappears and is no longer offered in checkout
- Duplicate cards (same last4 + expiry) are never listed twice
**Business Rule**: §8 Saved cards
**Selectors/API**: `PATCH /api/auth/payment-methods/:id/default`, `DELETE /api/auth/payment-methods/:id`
**Suggested Layer**: E2E Web

---

## Buyer — Authorize-at-Checkout (Web, `CHECKOUT_FLOW=manual_capture`)

### TC-143: Card checkout with a new card reserves the amount without charging
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P0
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-176)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Manual-capture flow enabled; buyer logged in; cart with one seller's items; Stripe test mode
**Steps**:
1. Open `/checkout`; fill the address; choose credit card; enter `4242 4242 4242 4242` with a future expiry and any CVC in the card element
2. Click Review Order, then Place Order
3. Open the new order's detail page

**Expected Results**:
- The order is placed with status `pending` and `paymentStatus: authorized`; the cart is cleared
- Stripe shows the PaymentIntent as `requires_capture` with nothing captured (hold only)
- Order detail shows the "Payment reserved" notice and the seller's acceptance deadline
- No client-supplied amount is used; the amount equals the order total
**Business Rule**: Authorize-capture §Checkout and authorization
**Selectors/API**: `payment-section`, `card-authorization-panel`, `place-order-btn`, `payment-status-notice`, `acceptance-deadline`, `POST /api/checkout/sessions`, `POST /api/checkout/sessions/:id/confirm`
**Suggested Layer**: E2E Web (Stripe test mode)

---

### TC-144: Card checkout with a saved card reserves the amount
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-176)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: As TC-143; buyer has a saved card
**Steps**:
1. Checkout; keep "Saved Card" mode; select the saved card
2. Review Order → Place Order

**Expected Results**:
- Same outcome as TC-143: `pending` / `authorized`, hold only
- The saved card must belong to the logged-in buyer (see TC-197 for the API check)
**Business Rule**: Authorize-capture §Checkout and authorization; §8 Saved cards
**Selectors/API**: `payment-section`, `place-order-btn`
**Suggested Layer**: E2E Web

---

### TC-145: Checkout explains the reservation before the buyer pays
**Scenario status**: Active
**Category**: UI State
**Priority**: P1
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-176)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Manual-capture flow; card payment selected
**Steps**:
1. Reach the Review step of `/checkout` with a card payment

**Expected Results**:
- `card-authorization-panel` shows "Your money is reserved now and charged when each seller starts preparing your order."
- The panel also tells the buyer unaccepted orders cancel after 24 hours; for COD the panel is not shown
**Business Rule**: Authorize-capture §API and client contracts
**Selectors/API**: `card-authorization-panel`
**Suggested Layer**: E2E Web + Component

---

### TC-146: Declined card places no order and loses nothing
**Scenario status**: Active
**Category**: Negative
**Priority**: P0
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-177)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Manual-capture flow; cart with items; note the product stock first
**Steps**:
1. Checkout with test card `4000 0000 0000 0002`
2. Place Order

**Expected Results**:
- An actionable card-declined error is shown; no raw exception text
- No order appears in `/orders`; the cart is intact
- Product stock and coupon usage are back to their starting values once the draft is released
**Business Rule**: Authorize-capture §Checkout (compensation on definitive failure)
**Selectors/API**: `payment-section`, `place-order-btn`
**Suggested Layer**: E2E Web + Playwright-API

---

### TC-147: 3-D Secure card completes only after authentication
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P1
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-178)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Manual-capture flow; Stripe test mode
**Steps**:
1. Checkout with `4000 0025 0000 3155`; Place Order
2. In the Stripe challenge, complete authentication (run 1) or abandon it (run 2)

**Expected Results**:
- Run 1: order placed `pending` / `authorized`
- Run 2: no order is placed, the cart is kept, and the user can retry; no hold is left over after the draft expires (15 minutes)
**Business Rule**: Authorize-capture §Checkout step 4
**Selectors/API**: Stripe challenge iframe, `POST /api/checkout/sessions/:id/confirm`
**Suggested Layer**: E2E Web (Stripe test mode)

---

### TC-148: Multi-seller card checkout holds each seller's amount separately
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P0
**Role**: Buyer
**Platform**: Web
**Parity**: Both
**Automation**: Playwright + Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Manual-capture flow; cart with items from 2 sellers
**Steps**:
1. Checkout with a card and place the order
2. Open `/orders`; check both orders and their PaymentIntents in Stripe

**Expected Results**:
- Two orders, each `pending` / `authorized`, each with its own PaymentIntent for exactly that order's total
- If one seller's authorization fails, every hold obtained for the session is released and no order is shown (all-or-nothing placement)
**Business Rule**: Authorize-capture §Checkout (multi-seller), §Data and invariants
**Selectors/API**: `order-card-{id}`, `POST /api/checkout/sessions`
**Suggested Layer**: E2E Web + Playwright-API

---

### TC-149: Buyer order detail shows the payment state accurately
**Scenario status**: Active
**Category**: UI State
**Priority**: P1
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-179)
**Automation**: Playwright (with seeded orders) / Component
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Orders in these payment states: `authorized`, `capture_pending`, `captured`, `release_pending`, `released`, `refund_pending`, `refunded`, `partially_refunded`, `failed`
**Steps**:
1. Open each order's detail page

**Expected Results**:
- `payment-status-notice` shows, in order: "Payment reserved", "Charging payment", "Payment charged", "Releasing reservation", "Reservation released", "Refund in progress", "Refunded", "Partially refunded", "Payment problem"
- Money is never described as returned until the release/refund is verified ("Releasing reservation" says you will not be charged, not that it is done)
**Business Rule**: Authorize-capture §Recovery and Stripe events
**Selectors/API**: `payment-status-notice`
**Suggested Layer**: Component / E2E Web

---

### TC-150: Short card authorization window is disclosed
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P3
**Role**: Buyer
**Platform**: Web
**Parity**: Both
**Automation**: Manual (needs a card whose authorization expires in under 24 hours)
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A placed order whose `acceptBy` is earlier than `placedAt + 24 h`
**Steps**:
1. Open the order detail

**Expected Results**:
- `short-authorization-note` explains the seller window is shorter than 24 hours for this card
**Business Rule**: Authorize-capture §Checkout step 7
**Selectors/API**: `short-authorization-note`
**Suggested Layer**: Component + Manual

---

### TC-151: Interrupted checkout resumes without a second authorization
**Scenario status**: Active
**Category**: Edge Case
**Priority**: P2
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-189)
**Automation**: Manual (Playwright candidate)
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Manual-capture flow; card checkout in progress
**Steps**:
1. Place the order and reload the page / lose connection before the confirmation returns
2. Return to `/checkout` and place the order again

**Expected Results**:
- The same checkout session is reused (same idempotency key); the buyer ends with one order per seller and one hold each, never duplicates
**Business Rule**: Authorize-capture §Checkout (idempotency, resume)
**Selectors/API**: `checkoutAttempt` storage, `POST /api/checkout/sessions`
**Suggested Layer**: Manual + API (TC-196)

---

## Buyer — Cancelling a Pending Order (Web)

### TC-152: Buyer cancels a pending card order — the hold is released
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P0
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-180)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Manual-capture flow; a `pending` / `authorized` card order not yet accepted
**Steps**:
1. Open `/orders`; click Cancel on the order
2. In the "Cancel Order" dialog enter a reason (optional) and click "Yes, Cancel Order"
3. Open the order detail

**Expected Results**:
- Status `cancelled`; stock (and variant stock) and coupon use restored exactly once
- Payment notice goes from "Releasing reservation" to "Reservation released"; the PaymentIntent in Stripe is `canceled` with nothing captured
- The Cancelled tab lists the order
**Business Rule**: Authorize-capture §Buyer cancellation
**Selectors/API**: dialog title "Cancel Order", `payment-status-notice`, `PUT /api/orders/:id/status`
**Suggested Layer**: E2E Web + Playwright-API (TC-205)

---

### TC-153: Buyer cancels a pending COD order
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Buyer
**Platform**: Web
**Parity**: Both
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A `pending` COD order
**Steps**:
1. Cancel the order from `/orders` or the detail page without entering a reason

**Expected Results**:
- Status `cancelled` (reason optional); stock restored once
- No payment notice is shown and no Stripe request is made
- A second click or a repeated request does not restore stock again
**Business Rule**: Authorize-capture §Buyer cancellation (COD)
**Selectors/API**: `PUT /api/orders/:id/status`
**Suggested Layer**: E2E Web + Playwright-API

---

### TC-154: Cancel is unavailable once the seller accepts; "Keep Order" cancels nothing
**Scenario status**: Active
**Category**: UI State
**Priority**: P1
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-181)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: One `pending` order and one `preparing` order
**Steps**:
1. On the pending order open the cancel dialog and click "Keep Order"
2. Look for a Cancel control on the `preparing` order and on a `capture_pending` order

**Expected Results**:
- "Keep Order" closes the dialog; the order stays `pending`
- No Cancel button is offered for `preparing` (removed, PR #80) or for orders whose payment is being captured
- A stale page that still sends the cancel gets a conflict message (TC-206), never a false "cancelled"
**Business Rule**: §5 Buyer cancel (pending only)
**Selectors/API**: `order-detail-page`, `order-card-{id}`
**Suggested Layer**: E2E Web

---

## Seller — Acceptance and Cancellation (Web)

### TC-155: Seller accepts a pending card order — payment is captured
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P0
**Role**: Seller
**Platform**: Web
**Parity**: Both (mobile TC-182)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Manual-capture flow with `SELLER_SEES_MANUAL_CAPTURE=true`; a `pending` / `authorized` card order for this seller, before `acceptBy`
**Steps**:
1. Open `/seller` → Orders (or `/seller/orders/:id`)
2. Click "Accept & start preparing"; wait for the charging state to finish
3. Open the same order as the buyer

**Expected Results**:
- The button stays busy while capturing (`seller-order-charging`); the order becomes `preparing`
- Stripe shows the PaymentIntent `succeeded` for exactly the held amount; order `paymentStatus: captured`
- The buyer sees "Payment charged"; the buyer's Cancel button is gone
**Business Rule**: Authorize-capture §Seller acceptance and capture
**Selectors/API**: `seller-order-action-btn`, `order-action-{id}`, `seller-order-charging`, `order-charging-{id}`, `PUT /api/seller/orders/:id/status`
**Suggested Layer**: E2E Web + Playwright-API (TC-199)

---

### TC-156: Seller sees the acceptance deadline only while the order is pending
**Scenario status**: Active
**Category**: UI State
**Priority**: P2
**Role**: Seller
**Platform**: Web
**Parity**: Both
**Automation**: Playwright / Component
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A pending manual-capture order and an already accepted one
**Steps**:
1. Open the seller order list and the order detail for each

**Expected Results**:
- The pending order shows its deadline (`order-accept-deadline-{id}` in the list, `seller-order-accept-deadline` on detail)
- The accepted order shows no deadline
- Buyer view shows `acceptance-deadline` for the pending order only
**Business Rule**: Authorize-capture §Seller acceptance
**Selectors/API**: `order-accept-deadline-{id}`, `seller-order-accept-deadline`, `acceptance-deadline`
**Suggested Layer**: Component / E2E Web

---

### TC-157: Seller cancels a pending card order with a reason — hold released, buyer sees why
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P0
**Role**: Seller
**Platform**: Web
**Parity**: Both (mobile TC-183)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Manual-capture flow; a `pending` / `authorized` card order for this seller (`canSellerCancelPending: true`)
**Steps**:
1. Open the seller order detail; click Cancel order
2. Enter a reason (e.g. "Out of stock") and confirm
3. Open the order as the buyer

**Expected Results**:
- Response succeeds even if the release is still processing; the seller sees the release as pending, then completed
- The PaymentIntent is `canceled`, nothing captured; stock, sold count and coupon use restored once
- Buyer detail shows `order-cancelled-by-seller`: "The seller cancelled this order. Reason: Out of stock"
- Repeating the cancel returns the same cancelled order with the original actor
**Business Rule**: Seller pending cancellation spec §Approved policy
**Selectors/API**: `seller-cancel-order-btn`, `seller-cancel-reason`, `seller-cancel-confirm`, `order-cancelled-by-seller`, `PUT /api/seller/orders/:id/status`
**Suggested Layer**: E2E Web + Playwright-API (TC-209)

---

### TC-158: Seller pending cancellation needs a valid reason
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Seller
**Platform**: Web
**Parity**: Both (mobile TC-183)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A cancellable pending order
**Steps**:
1. Open the cancel dialog; confirm with an empty reason, then with spaces only
2. Enter 1001 characters and confirm
3. Double-click Confirm with a valid reason

**Expected Results**:
- Empty/blank and over-1000 reasons show `seller-cancel-error` and the order is not cancelled
- A valid reason cancels once; the double click does not send two requests
**Business Rule**: Seller pending cancellation spec §Approved policy (1–1000 chars)
**Selectors/API**: `seller-cancel-reason`, `seller-cancel-error`, `seller-cancel-confirm`
**Suggested Layer**: E2E Web + Playwright-API (TC-210)

---

### TC-159: Seller cancels a pending COD order without any Stripe request
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P1
**Role**: Seller
**Platform**: Web
**Parity**: Both (mobile TC-184)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A `pending` COD order (`paymentStatus: not_required`)
**Steps**:
1. Cancel it with a reason
2. Check the buyer's order and the Stripe dashboard

**Expected Results**:
- Order `cancelled`; stock restored once; no payment operation in the response and no payment notice for the buyer
- Stripe's PaymentIntent list is unchanged
**Business Rule**: Seller pending cancellation spec §Approved policy
**Selectors/API**: `seller-cancel-order-btn`, `seller-cancel-confirm`
**Suggested Layer**: E2E Web + Playwright-API

---

### TC-160: Seller cannot cancel from shipped, and cannot cancel card orders after pending
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Seller
**Platform**: Web
**Parity**: Both (mobile TC-184)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A `shipped` order; a `preparing` card order; a `preparing` COD order
**Steps**:
1. Open each order's seller detail page

**Expected Results**:
- `shipped`: no Cancel button (only the move to delivered)
- `preparing` card order: no Cancel button
- `preparing` COD order: Cancel is available with an optional reason
**Business Rule**: Authorize-capture §Seller cancellation (pending/preparing/processing only; no `shipped`); Seller pending cancellation spec
**Selectors/API**: `seller-cancel-order-btn` (absent), `PUT /api/seller/orders/:id/status` (see TC-212)
**Suggested Layer**: E2E Web + Playwright-API

---

## Delivered-Item Refunds (Web, `DELIVERED_REFUNDS_ENABLED=true`)

### TC-161: Refund request is offered for a delivered card order inside the 7-day window
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-185)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A `delivered` card order with `paymentStatus: captured`, delivered less than 7 days ago
**Steps**:
1. Open the order detail

**Expected Results**:
- The refund request panel lists each item with how many units are still available, the deadline (delivery + 7 days) and the policy text ("Request within seven days of recorded delivery", "No return is needed")
- No "Change of mind" reason is offered after delivery
**Business Rule**: Delivered-item refund spec §Delivery time and eligibility
**Selectors/API**: `GET /api/orders/:id/refund-eligibility`, refund panel, `#refund-reason`
**Suggested Layer**: E2E Web

---

### TC-162: Buyer submits a partial refund request
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P0
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-185)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A delivered, captured card order with ≥ 2 units
**Steps**:
1. Open the refund panel; use the quantity stepper to select 1 unit of one item
2. Choose reason "Damaged item"; enter a description
3. Check the quote, then submit

**Expected Results**:
- The quote equals the paid price of that unit after product and coupon discounts plus its share of the original tax (shipping excluded for a partial selection); the amount is computed by the server, not typed by the buyer
- The request shows "Awaiting seller review" (`refund-card-{id}`); the order stays `delivered` and its total does not change
**Business Rule**: Delivered-item refund spec §Refund amount allocation
**Selectors/API**: `QuantityStepper` labels "Increase refund quantity for …", `#refund-reason`, `#refund-description`, `POST /api/orders/:id/refund-requests`
**Suggested Layer**: E2E Web + Playwright-API

---

### TC-163: Refund form validation
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-185)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Same as TC-162
**Steps**:
1. Try to submit with no item selected
2. Select an item but leave the description empty or spaces only
3. Type 1001 characters into the description

**Expected Results**:
- Submit stays blocked; the form says an item must be selected and the issue described
- The description counter stops at 1000 (`maxLength`)
- Nothing is sent to the API
**Business Rule**: Delivered-item refund spec §Approved first-version policy (1–1000 characters)
**Selectors/API**: `#refund-description`, character counter "n/1000"
**Suggested Layer**: E2E Web + Component

---

### TC-164: Seller approves a refund request — refund settles
**Scenario status**: Active
**Category**: Happy Path
**Priority**: P0
**Role**: Seller
**Platform**: Web
**Parity**: Both (mobile TC-186)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A requested refund (TC-162); Stripe test mode
**Steps**:
1. Seller opens `/seller` → Return/Refund → In Progress
2. Review the items and exact amount; click Approve
3. Open the buyer's order later and the Stripe refund

**Expected Results**:
- The request moves to "Refund processing" (amber), then "Refunded" once Stripe confirms; it moves to the Approved group
- Stripe shows one refund for exactly the quoted amount; order `paymentStatus: partially_refunded` (or `refunded` if everything was refunded)
- Fulfillment stays `delivered`; stock, sold counters and coupon use are not restored; the order total is unchanged
- Seller revenue subtracts confirmed refunds only
**Business Rule**: Delivered-item refund spec §API and concurrency
**Selectors/API**: `refund-group-in_progress`, `refund-group-approved`, `refund-card-{id}`, `PUT /api/seller/refund-requests/:id/decision`
**Suggested Layer**: E2E Web + Playwright-API (TC-223)

---

### TC-165: Seller rejects a refund request with a required explanation
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Seller
**Platform**: Web
**Parity**: Both (mobile TC-186)
**Automation**: Playwright
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A requested refund
**Steps**:
1. Click Reject; leave the reason empty and try to confirm
2. Enter a reason and confirm
3. Open the buyer's order

**Expected Results**:
- Confirming with an empty reason is blocked
- The request goes to Rejected; the buyer sees "The seller rejected this request." with the reason
- The rejected units remain refundable (a new request is allowed within the 7-day window)
**Business Rule**: Delivered-item refund spec §Approved first-version policy
**Selectors/API**: `refund-group-rejected`, label "Rejection reason for <id>"
**Suggested Layer**: E2E Web + Playwright-API (TC-224)

---

### TC-166: Only one active request per order; a second request follows resolution
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P1
**Role**: Buyer
**Platform**: Web
**Parity**: Both
**Automation**: Playwright + Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A delivered, captured order with ≥ 2 units, inside the window
**Steps**:
1. Submit a request for 1 unit (TC-162); try to open another while it is unresolved
2. Seller approves it (TC-164); verify that a second request remains blocked while the first is `processing` or `needs_review`
3. Wait for confirmed `refunded`, then request the remaining unit within the original refund window
4. Wait for the second refund to complete and check when nothing is left. In a separate fresh-order subcase, reject the first request and verify its units become requestable again

**Expected Results**:
- While the first is unresolved the panel says a request is in progress; the API answers 409 `refund_conflict`
- Approval alone does not release the active-request guard. A second request is available after confirmed completion or rejection within the original window; refunded units cannot be selected again, while rejected units remain refundable
- With no units left the panel says there is nothing left to refund
**Business Rule**: Delivered-item refund spec §Approved first-version policy
**Selectors/API**: `POST /api/orders/:id/refund-requests`, `GET /api/orders/:id/refund-eligibility` (reasons `active_request`, `no_units_left`)
**Suggested Layer**: E2E Web + Playwright-API (TC-218)

---

### TC-167: Shipping is refunded only with the last paid unit for a seller-fault reason
**Scenario status**: Active
**Category**: Business Rule
**Priority**: P2
**Role**: Buyer
**Platform**: Web
**Parity**: Both
**Automation**: Playwright-API / Component
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A fresh eligible delivered/captured order per subcase, each with at least two paid units, known nonzero shipping and no prior refunds. Only sequential subcases reuse their own order
**Steps**:
1. TC-167-A: On order A, request fewer than all paid units for "Damaged item"
2. TC-167-B: On order B, request every paid unit for "Other"
3. TC-167-C: On order C, request every paid unit for "Wrong item"
4. TC-167-D: On order D, refund one unit for "Damaged item" and wait for completion; request all remaining units for "Wrong item", then approve and wait for completion
5. TC-167-E: On order E, refund one unit for "Other" and wait for completion; request all remaining units for "Wrong item"

**Expected Results**:
- A and B: shipping is excluded; the form explains when it would be included
- C: the quote includes the original allocated shipping and the form shows "Shipping (…) is included in your refund."
- D: only the final selection includes shipping, because every earlier completed refund was also for seller fault. Shipping is refunded once, including on retries
- E: shipping stays excluded because an earlier refund used "Other"; covering all remaining units alone is insufficient
- Record subcases independently; the parent passes only when all required subcases pass. Never reuse an unresolved request's order for independent quote examples
**Business Rule**: Delivered-item refund spec §Approved first-version policy (shipping amendment)
**Selectors/API**: refund breakdown "Shipping refund"
**Suggested Layer**: Playwright-API + Component

---

### TC-168: Refund chips and order tabs reflect refund state
**Scenario status**: Active
**Category**: UI State
**Priority**: P1
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-187)
**Automation**: Playwright / Component
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Orders that are fully refunded, partially refunded, refund-processing and refund-requested
**Steps**:
1. Open `/orders` tabs All, Complete and Return/Refund
2. Open a partially refunded order and look at the item chips

**Expected Results**:
- Chips: "Fully refunded", "Partially refunded" (outlined), "Refund processing" (amber), "Refund requested" / "Awaiting seller review"
- A fully refunded order is missing from Complete but present under All; Return/Refund lists approved refunds (`CompletedRefunds`)
- Item marks read "Refunded", "1 of 2 refunded" or "1 refunded, 1 processing"; the chips differ by fill and icon, not only by colour (also in dark mode)
**Business Rule**: Delivered-item refund spec §Clients; PR #86, #87
**Selectors/API**: `order-tab-refunds`, `order-card-{id}`, `view-refund-order-btn`
**Suggested Layer**: Component / E2E Web

---

### TC-169: Refund is unavailable when the order is not eligible
**Scenario status**: Active
**Category**: Negative
**Priority**: P1
**Role**: Buyer
**Platform**: Web
**Parity**: Both (mobile TC-185)
**Automation**: Playwright / Playwright-API
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: A delivered COD order; a delivered card order older than 7 days; a run with `DELIVERED_REFUNDS_ENABLED=false`
**Steps**:
1. Open the detail of each order

**Expected Results**:
- COD: not eligible (unsupported payment); older than 7 days: "window closed"; flag off: new requests are unavailable but existing requests stay readable
- No request form is submitted successfully in any of these cases
**Business Rule**: Delivered-item refund spec §Approved first-version policy
**Selectors/API**: `GET /api/orders/:id/refund-eligibility` (`unsupported_payment`, `window_closed`, `requestsEnabled: false`)
**Suggested Layer**: Playwright-API + Component (TC-215, TC-219)

---

### TC-170: Seller Return/Refund tab groups requests and shows a badge
**Scenario status**: Active
**Category**: UI State
**Priority**: P2
**Role**: Seller
**Platform**: Web
**Parity**: Both (mobile TC-186)
**Automation**: Playwright / Component
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Requests in progress, approved and rejected
**Steps**:
1. Open `/seller` and look at the Return/Refund tab badge
2. Switch between In Progress, Approved and Rejected

**Expected Results**:
- The badge counts requests still waiting for the seller
- Empty groups say "No refund requests in progress.", "No approved refunds yet.", "No rejected requests."
- Each card shows the buyer's reason, description, items and exact amount
**Business Rule**: Delivered-item refund spec §Clients
**Selectors/API**: `seller-tab-refunds`, `refund-group-in_progress`, `refund-group-approved`, `refund-group-rejected`
**Suggested Layer**: Component / E2E Web

---

## Cross-cutting — Offline handling (Web)

### TC-171: Offline banner appears when the connection drops
**Scenario status**: Active
**Category**: UI State
**Priority**: P2
**Role**: Both
**Platform**: Web
**Parity**: Both (mobile TC-188)
**Automation**: Playwright (`context.setOffline`)
**Automation status**: Needs review
**Script mapping**: Unverified
**Latest result**: Not recorded
**Last run**: Not recorded
**Run evidence**: Not recorded
**Run baseline**: Not recorded
**Test File**: Unmapped
**Preconditions**: Any page loaded while online
**Steps**:
1. Switch the browser context offline
2. Switch it back online

**Expected Results**:
- `offline-banner` shows "You're offline. Check your connection."; it disappears when the connection returns
- Failed actions while offline show a friendly message, not a raw network error
**Business Rule**: Offline handling spec 2026-08-06
**Selectors/API**: `offline-banner`
**Suggested Layer**: E2E Web

---
