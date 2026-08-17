# TokoMart Test Scenarios — Web

> **Platform:** React frontend (`frontend/`). Web E2E automated with Playwright; API layer with Playwright-API.  
> Full master index: [test-scenarios.md](test-scenarios.md) · Mobile scenarios: [test-scenarios-mobile.md](test-scenarios-mobile.md)

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

### TC-123: Products page — navigate to next page loads different products
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent (mobile uses infinite scroll)  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
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
**Category**: Edge Case  
**Priority**: P1  
**Role**: Buyer  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
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
**Category**: Happy Path  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
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
**Category**: Edge Case  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
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
**Category**: Edge Case  
**Priority**: P1  
**Role**: Seller  
**Platform**: Web  
**Parity**: Divergent  
**Automation**: Playwright  
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
