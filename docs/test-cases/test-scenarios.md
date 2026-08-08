# TokoMart Test Scenarios — Master Suite

> **Scope:** Web (`frontend/` — React) + Mobile (`frontend-mobile/` — Flutter).  
> Web-only TCs: TC-008–009, TC-038, TC-045, TC-052, TC-059–060. Mobile-only TCs: TC-086–087, TC-604–605.  
> Filtered views: `test-scenarios-web.md`, `test-scenarios-mobile.md`, `test-scenarios-buyer.md`, `test-scenarios-seller.md`.

---

## P0 Smoke Block

| # | Platform | Flow | Automation |
|---|----------|------|------------|
| S1 | Web | Login → add to cart → checkout COD → order appears in history | Playwright — TC-001, TC-016, TC-022, TC-098 |
| S2 | Mobile | Login (reference `frontend-mobile/patrol_test/login_test.dart`) → browse → cart visible | Patrol — TC-067, TC-072, TC-073 |
| S3 | Both | Become seller → create simple product → create variant product | Web: TC-041, TC-042, TC-064 · Mobile: TC-089, TC-090, TC-091 |
| S4 | Both | Cart with items from 2 sellers → checkout → 2 separate orders in history | Web: TC-021, TC-025 · Mobile: TC-083 |

---

## Buyer — Authentication & Session

### TC-001: Successful login with valid credentials
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent (web password rules stricter than mobile)  
**Automation**: Playwright  
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
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent (mobile accepts min 6 only)  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Security  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent (mobile auth-gates all routes)  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Playwright  
**Preconditions**: Not logged in  
**Steps**:
1. Navigate to `/products`
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: UI State  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Business Rule  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent (mobile passes via route extra)  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Business Rule  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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

### TC-107: GET /api/cart returns authenticated buyer's own items
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: N/A  
**Automation**: Playwright-API  
**Preconditions**: Buyer1 logged in; at least one product added to their server-side cart  
**Steps**:
1. `DELETE /api/cart` to clear buyer1's cart
2. `PUT /api/cart` with one product item
3. `GET /api/cart` with buyer1's token
**Expected Results**:
- Response 200; `sellers` array contains the added `productId`
**Business Rule**: §3 Cart — server-side, scoped to `userId`  
**Selectors/API**: `GET /api/cart`, `PUT /api/cart`, `DELETE /api/cart`  
**Suggested Layer**: API

---

### TC-108: Cart isolation — buyer2 cannot access buyer1's cart contents (API)
**Category**: Security / Isolation  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Web (TC-109)  
**Automation**: Playwright-API  
**Preconditions**: Buyer1 has items in cart; buyer2 is a different account with an empty cart  
**Steps**:
1. Login as buyer2 (fresh account)
2. `GET /api/cart` with buyer2's token
**Expected Results**:
- Response 200; returned `sellers` array does NOT contain buyer1's product ID
- Buyer2 sees only their own (empty) cart
**Business Rule**: §3 Cart — server-side cart scoped to authenticated `userId`  
**Selectors/API**: `GET /api/cart`  
**Suggested Layer**: API

---

### TC-109: Cart isolation — buyer2 sees own empty cart in UI, not buyer1's items (Web)
**Category**: Security / Isolation  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: API (TC-108)  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Business Rule**: §4 Payment methods, §4 Post-checkout  
**Selectors/API**: `checkout-page`, `shipping-section`, `payment-section`, `place-order-btn`, `POST /api/orders`  
**Suggested Layer**: E2E Web

---

### TC-023: Checkout with saved credit card
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Preconditions**: User has saved card in profile  
**Steps**:
1. Checkout with items
2. Select saved card payment
3. Place order
**Expected Results**:
- Order created; card last4 shown on order detail
**Business Rule**: §4 Payment methods, §8 Saved cards  
**Selectors/API**: `payment-section`, `place-order-btn`  
**Suggested Layer**: E2E Web

---

### TC-024: Checkout with new card entry
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Preconditions**: Logged in; no saved card selected  
**Steps**:
1. Checkout; choose credit card
2. Enter card number, holder, expiry, CVV
3. Place order
**Expected Results**:
- Client validation passes for 16-digit card, 3–4 digit CVV
- Order created successfully
**Business Rule**: §10 Web checkout card validation  
**Selectors/API**: `payment-section`, `place-order-btn`  
**Suggested Layer**: E2E Web

---

### TC-098: Checkout COD with variant product (web)
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both (mobile TC-101)  
**Automation**: Playwright  
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
**Category**: Edge Case  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright / Playwright-API  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Business Rule  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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

### TC-026: Order total matches pricing formula
**Category**: Business Rule  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright-API  
**Preconditions**: Known product price, discount, coupon, delivery  
**Steps**:
1. Place order via API or UI with controlled inputs
2. Assert persisted `subtotal`, `productDiscount`, `discount`, `tax`, `shipping`, `total`
**Expected Results**:
- `tax` = 8% of after-discount subtotal
- `total` = afterDiscounts + tax + shipping (2 decimal places)
**Business Rule**: §4 Price calculation  
**Selectors/API**: `POST /api/orders`, order response body  
**Suggested Layer**: API

---

### TC-027: Default shipping $9.99 when subtotal after discounts < $50
**Category**: Business Rule  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright-API  
**Preconditions**: Seller without custom shipping; cart subtotal < $50 after discounts  
**Steps**:
1. Place order meeting conditions
**Expected Results**:
- `shipping` = 9.99 on order record
**Business Rule**: §4 Shipping default  
**Selectors/API**: `POST /api/orders`  
**Suggested Layer**: API

---

### TC-028: Free shipping when subtotal after discounts ≥ $50
**Category**: Business Rule  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright-API  
**Preconditions**: Default shipping rules; effective subtotal ≥ $50  
**Steps**:
1. Place qualifying order
**Expected Results**:
- `shipping` = 0
**Business Rule**: §4 Shipping default  
**Selectors/API**: `POST /api/orders`  
**Suggested Layer**: API

---

### TC-029: Checkout blocked with missing address fields
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent (mobile uses different tab labels)  
**Automation**: Playwright  
**Preconditions**: User with orders in multiple statuses  
**Steps**:
1. Open `/orders`
2. Click status tabs
**Expected Results**:
- Each tab shows only matching orders
**Business Rule**: §5 Order lifecycle  
**Selectors/API**: `orders-page`, `order-tabs`, `order-tab-{key}`, `order-card-{id}`  
**Suggested Layer**: E2E Web

---

### TC-031: Confirm receipt when order shipped
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Preconditions**: Order status `pending`  
**Steps**:
1. Cancel order from detail or history
**Expected Results**:
- Status → `cancelled`; stock restored (variant-aware)
**Business Rule**: §5 Buyer cancel, §5 Stock restore  
**Selectors/API**: `order-detail-page`, `PUT /api/orders/:id/status`  
**Suggested Layer**: E2E Web + Playwright-API

---

### TC-033: Buyer cannot cancel processing order
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright-API  
**Preconditions**: Order status `processing`  
**Steps**:
1. Attempt cancel via API
**Expected Results**:
- **400** — cancel not allowed
**Business Rule**: §5 Buyer cancel — pending/preparing only  
**Selectors/API**: `PUT /api/orders/:id/status`  
**Suggested Layer**: API

---

### TC-110: GET /api/orders returns only the authenticated buyer's own orders
**Category**: Security / Isolation  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: Web (TC-112)  
**Automation**: Playwright-API  
**Preconditions**: Buyer1 has at least one placed order; buyer2 is a different account with no orders  
**Steps**:
1. Buyer1 places an order via `POST /api/orders`
2. `GET /api/orders` with buyer2's token
**Expected Results**:
- Response 200; returned orders array does NOT contain buyer1's order ID
- Buyer2 sees only their own orders (empty array if none)
**Business Rule**: §5 Order lifecycle — orders scoped to authenticated `userId`  
**Selectors/API**: `GET /api/orders`, `POST /api/orders`  
**Suggested Layer**: API

---

### TC-111: GET /api/orders/:id returns 403 when buyer2 requests buyer1's order
**Category**: Security / Isolation  
**Priority**: P1  
**Role**: Buyer  
**Platform**: API  
**Parity**: N/A (API-only enforcement)  
**Automation**: Playwright-API  
**Preconditions**: Buyer1 has a placed order; buyer2 is a different authenticated account  
**Steps**:
1. Buyer1 places an order; capture `orderId`
2. `GET /api/orders/:orderId` with buyer2's token
**Expected Results**:
- Response 403 or 404 — buyer2 cannot read buyer1's order detail
**Business Rule**: §5 Order ownership — order detail scoped to order's `userId`  
**Selectors/API**: `GET /api/orders/:id`  
**Suggested Layer**: API

---

### TC-112: Buyer2's order history page shows only their own orders, not buyer1's
**Category**: Security / Isolation  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: API (TC-110)  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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

### TC-035: Duplicate review blocked
**Category**: Negative  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright-API  
**Preconditions**: User already reviewed product  
**Steps**:
1. POST second review for same product
**Expected Results**:
- **409** duplicate review
**Business Rule**: §7 Unique (userId, productId)  
**Selectors/API**: `POST /api/reviews`  
**Suggested Layer**: API

---

### TC-036: Review blocked before delivery
**Category**: Security  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright-API  
**Preconditions**: Order status `shipped` (not delivered)  
**Steps**:
1. Attempt create review via API
**Expected Results**:
- **403** — not eligible
**Business Rule**: §7 Eligibility  
**Selectors/API**: `POST /api/reviews`  
**Suggested Layer**: API

---

### TC-113: User cannot follow themselves (API)
**Category**: Security  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright-API  
**Preconditions**: Authenticated user  
**Steps**:
1. `POST /api/users/:id/follow` using own user ID as `:id`
**Expected Results**:
- **400** — `"Cannot follow yourself"`
**Business Rule**: §8 Follow system  
**Selectors\API**: `POST /api/users/:id/follow`  
**Suggested Layer**: API

---

### TC-037: Follow and unfollow seller from public profile
**Category**: Happy Path  
**Priority**: P2  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both (mobile route `/seller-profile/:id`)  
**Automation**: Playwright  
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
**Category**: UI State  
**Priority**: P2  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Playwright  
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
**Category**: UI State  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: UI State  
**Priority**: P2  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P0  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P0  
**Role**: Seller  
**Platform**: Web  
**Parity**: Divergent (mobile 7-step — Variants separate)  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P0  
**Role**: Seller  
**Platform**: Web  
**Parity**: Divergent (mobile 7-step — dedicated Variants step + permission flow)  
**Automation**: Playwright  
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
**Category**: Negative  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P2  
**Role**: Seller  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P2  
**Role**: Seller  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Playwright  
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

### TC-046: Delete product from seller dashboard
**Category**: Happy Path  
**Priority**: P2  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P0  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Preconditions**: New buyer order in `pending`  
**Steps**:
1. Seller dashboard → orders tab
2. Advance: pending → preparing → processing → shipped
**Expected Results**:
- Each transition succeeds; status badge updates
- `shippedAt` set on shipped
**Business Rule**: §5 Seller transitions  
**Selectors/API**: `seller-order-card-{id}`, `order-action-{id}`, `seller-order-action-btn`  
**Suggested Layer**: E2E Web

---

### TC-048: Seller invalid status transition rejected
**Category**: Negative  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright-API  
**Preconditions**: Order in `pending`  
**Steps**:
1. Attempt pending → shipped via API
**Expected Results**:
- **400** `"Cannot transition order from 'pending' to 'shipped'"`
**Business Rule**: §5 Invalid transition  
**Selectors/API**: `PUT /api/seller/orders/:id/status`  
**Suggested Layer**: API

---

### TC-049: Seller cancel order with reason
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
**Preconditions**: Order in `pending` or `preparing`  
**Steps**:
1. Cancel from seller order detail
2. Provide reason
**Expected Results**:
- Status → `cancelled`
**Business Rule**: §5 Cancellation  
**Selectors/API**: `seller-cancel-order-btn`, `seller-order-detail-page`  
**Suggested Layer**: E2E Web

---

### TC-050: Create and apply seller voucher end-to-end
**Category**: Happy Path  
**Priority**: P1  
**Role**: Both  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: UI State  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright  
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
**Category**: UI State  
**Priority**: P2  
**Role**: Seller  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Manual | Playwright (timing-sensitive)  
**Preconditions**: Seller logged in; buyer places new order  
**Steps**:
1. Keep seller dashboard open
2. Place order as buyer in separate session
**Expected Results**:
- In-app toast appears for new order (polling)
**Business Rule**: §9 Platform — web toast polling  
**Selectors/API**: `seller-dashboard`  
**Suggested Layer**: E2E Web (optional — flaky)

---

## Security & Access Control

### TC-053: Buyer blocked from seller API routes
**Category**: Security  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright-API  
**Preconditions**: Buyer JWT  
**Steps**:
1. Call `PUT /api/seller/orders/:id/status` as buyer
**Expected Results**:
- **403** forbidden
**Business Rule**: §1 requireSeller  
**Selectors/API**: `PUT /api/seller/orders/:id/status`  
**Suggested Layer**: API

---

### TC-054: Seller cannot edit another seller's product
**Category**: Security  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright-API  
**Preconditions**: Two seller accounts  
**Steps**:
1. Seller A attempts update/delete Seller B product
**Expected Results**:
- **403** forbidden
**Business Rule**: §1 Authorization  
**Selectors/API**: `PUT /api/products/:id`  
**Suggested Layer**: API

---

### TC-055: Protected routes require authentication
**Category**: Security  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent (mobile gates more routes)  
**Automation**: Playwright  
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

### TC-056: Insufficient stock at checkout returns 400
**Category**: Edge Case  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright-API  
**Preconditions**: Cart qty exceeds stock at order time  
**Steps**:
1. Submit order when stock depleted
**Expected Results**:
- **400** `"Insufficient stock for..."`
**Business Rule**: §4 Stock validation  
**Selectors/API**: `POST /api/orders`  
**Suggested Layer**: API

---

### TC-057: Coupon below minimum order amount rejected
**Category**: Edge Case  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright-API  
**Preconditions**: Coupon with `minOrderAmount` > cart subtotal  
**Steps**:
1. Validate coupon via API
**Expected Results**:
- **400** minimum not met
**Business Rule**: §6 Validation  
**Selectors/API**: `POST /api/coupons/validate`  
**Suggested Layer**: API

---

### TC-058: Product description max 200 characters enforced
**Category**: Edge Case  
**Priority**: P2  
**Role**: Seller  
**Platform**: Web  
**Parity**: Both  
**Automation**: Playwright-API  
**Preconditions**: Seller token  
**Steps**:
1. Create/update product with description > 200 chars
**Expected Results**:
- **400** validation error
**Business Rule**: §2 description max 200  
**Selectors/API**: `POST /api/products`  
**Suggested Layer**: API

---

### TC-059: Stale product removed from cart on load (web)
**Category**: Edge Case  
**Priority**: P2  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Web-only (web stale cleanup)  
**Automation**: Playwright  
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
**Category**: Platform Parity  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Web-only  
**Automation**: Playwright  
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
**Category**: Platform Parity  
**Priority**: P2  
**Role**: Seller  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
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
**Category**: Platform Parity  
**Priority**: P3  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Mobile-only feature  
**Automation**: Blocked (no web wishlist)  
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
**Category**: Platform Parity  
**Priority**: P2  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
**Preconditions**: Cart with multiple items  
**Steps**:
1. Proceed to checkout from cart without per-item selection
**Expected Results**:
- All cart items included in checkout (unlike mobile checkbox subset)
**Business Rule**: §3 Web vs mobile cart selection  
**Selectors/API**: `checkout-btn`, `checkout-page`  
**Suggested Layer**: E2E Web

---

## Mobile — Authentication & Session

### TC-067: Mobile login smoke (Patrol baseline)
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
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

### TC-095: COD checkout complete flow (mobile)
**Category**: Happy Path  
**Priority**: P0  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both  
**Automation**: Patrol  
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

### TC-103: Checkout with new credit card — variant product (mobile)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Mobile  
**Parity**: Both (web TC-024 + TC-098 combined)  
**Automation**: Patrol  
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

### TC-105: Checkout with new card — variant product (web)
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: TC-103 (mobile)  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: TC-104 (mobile)  
**Automation**: Playwright  
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
**Selectors/API**: `PATCH /api/orders/:id/confirm` — **keys missing**  
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

## Security & Infrastructure — Rate Limiting

### TC-114: Auth route response includes rate limit headers
**Category**: Happy Path
**Priority**: P1
**Role**: Any
**Platform**: Web
**Parity**: Web (backend shared with mobile)
**Automation**: Playwright-API
**Preconditions**: Backend running with rate limiting middleware active
**Steps**:
1. `POST /api/auth/login` with any credentials
**Expected Results**:
- Response includes `RateLimit-Limit` header
- Response includes `RateLimit-Remaining` header
- Response includes `RateLimit-Reset` header
**Business Rule**: §12 Rate Limiting
**Selectors/API**: `POST /api/auth/login`
**Suggested Layer**: API

---

### TC-115: API route response includes rate limit headers
**Category**: Happy Path
**Priority**: P1
**Role**: Any
**Platform**: Web
**Parity**: Web (backend shared with mobile)
**Automation**: Playwright-API
**Preconditions**: Backend running with rate limiting middleware active
**Steps**:
1. `GET /api/products`
**Expected Results**:
- Response includes `RateLimit-Limit` header
- Response includes `RateLimit-Remaining` header
- Response includes `RateLimit-Reset` header
**Business Rule**: §12 Rate Limiting
**Selectors/API**: `GET /api/products`
**Suggested Layer**: API

---

### TC-116: RateLimit-Remaining decrements with each request
**Category**: Happy Path
**Priority**: P1
**Role**: Any
**Platform**: Web
**Parity**: Web (backend shared with mobile)
**Automation**: Playwright-API
**Preconditions**: Backend running; window not exhausted
**Steps**:
1. `GET /api/products` — record `RateLimit-Remaining` value
2. `GET /api/products` again immediately
**Expected Results**:
- `RateLimit-Remaining` on second response is exactly 1 less than first
**Business Rule**: §12 Rate Limiting
**Selectors/API**: `GET /api/products`
**Suggested Layer**: API

---

### TC-117: Auth route returns 429 after limit is exhausted
**Category**: Negative
**Priority**: P1
**Role**: Any
**Platform**: Web
**Parity**: Web (backend shared with mobile)
**Automation**: Playwright-API
**Preconditions**: Backend started with `RATE_LIMIT_AUTH_MAX=3` (low-limit mode)
**Steps**:
1. `POST /api/auth/login` with bad credentials — repeat until limit reached (3×)
2. `POST /api/auth/login` one more time (4th request)
**Expected Results**:
- **429** on the 4th request
- `body.success` → `false`
- `body.message` → `"Too many requests, please try again later."`
**Business Rule**: §12 Rate Limiting
**Selectors/API**: `POST /api/auth/login`
**Suggested Layer**: API

---

### TC-118: 429 response includes Retry-After header
**Category**: Negative
**Priority**: P1
**Role**: Any
**Platform**: Web
**Parity**: Web (backend shared with mobile)
**Automation**: Playwright-API
**Preconditions**: Backend started with `RATE_LIMIT_AUTH_MAX=3` (low-limit mode)
**Steps**:
1. Exhaust the auth limit (3 requests)
2. Send one more `POST /api/auth/login`
**Expected Results**:
- **429** status
- Response includes `Retry-After` header with a positive integer value
**Business Rule**: §12 Rate Limiting
**Selectors/API**: `POST /api/auth/login`
**Suggested Layer**: API

---

### TC-119: General API route returns 429 after limit is exhausted
**Category**: Negative
**Priority**: P1
**Role**: Any
**Platform**: Web
**Parity**: Web (backend shared with mobile)
**Automation**: Playwright-API
**Preconditions**: Backend started with `RATE_LIMIT_API_MAX=5` (low-limit mode)
**Steps**:
1. `GET /api/products` — repeat until limit reached (5×)
2. `GET /api/products` one more time (6th request)
**Expected Results**:
- **429** on the 6th request
- `body.success` → `false`
- `body.message` → `"Too many requests, please try again later."`
**Business Rule**: §12 Rate Limiting
**Selectors/API**: `GET /api/products`
**Suggested Layer**: API

---

## Domain Doc Gaps

| Gap | Code behavior | Doc location |
|-----|---------------|--------------|
| Web testid coverage is extensive | 70+ `data-testid`s in `frontend/src/` | `business-rules.md` §11 still says "sparse" — use `ui-selectors.md` as canonical |
| Mobile wizard is 7 steps | Variants on separate step in Flutter (`add_edit_product_screen.dart`) | `business-rules.md` §2 lists 6 steps for web+mobile |
| Mobile Patrol keys sparse | Only `auth_*` and `products_*` keys exist | Cart, checkout, orders, seller, wishlist need keys before Patrol automation |
| Seller cancel stock restore | Product-level only, not variant-aware | Documented in §13 known edge cases — verify in API tests |

---

## Summary

| Range | Count | Focus |
|-------|-------|-------|
| TC-001–040 | 40 | Buyer auth, browse, cart, checkout, orders, reviews, UI (web) |
| TC-041–052 | 12 | Seller orders, vouchers, wizard (web) |
| TC-053–055 | 3 | Security (web/API) |
| TC-114–119 | 6 | Rate limiting — headers, decrement, 429 enforcement |
| TC-056–059 | 4 | Edge cases (web) |
| TC-060–063 | 4 | Platform parity (web perspective) |
| TC-064–066 | 3 | Seller variant listing + buyer catalog (web) |
| TC-098–100 | 3 | Buyer variant checkout + cart (web) |
| TC-067–094, TC-095–097 | 31 | Mobile happy path — auth, browse, cart, checkout, orders, wishlist, seller |
| TC-101–102 | 2 | Buyer variant checkout + guard (mobile) |
| TC-607–614 | 6 | Mobile session, UI, negative, edge |
| TC-600–606, TC-608–611 | 11 | Mobile platform parity & security |
| TC-604–605 | (in above) | Mobile-only notifications |
| **Total** | **123** | Web (75) + Mobile-native (48) |

**Automation split:** Playwright E2E (~51 web), Patrol E2E (~38 mobile, many blocked on missing keys), Playwright-API (~15), Manual/Blocked (~5)
