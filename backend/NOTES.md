# Backend — Status Codes & Error Messages Reference

Complete reference of every HTTP status code and its exact response message from the TokoMart backend.
All error responses follow the shape: `{ success: false, message: "..." }`.
All success responses follow the shape: `{ success: true, ... }`.

---

## Quick Reference

| Code | Category | Meaning |
|------|----------|---------|
| `200` | Success | Request succeeded; data returned |
| `201` | Success | Resource created successfully |
| `400` | Client error | Invalid input, business rule violation, or bad state |
| `401` | Client error | Missing, invalid, or expired token |
| `403` | Client error | Authenticated but not permitted (wrong role or not owner) |
| `404` | Client error | Resource not found |
| `409` | Client error | Conflict — duplicate resource |
| `500` | Server error | Unexpected server-side failure |

> **401 vs 403:** `401` = "who are you?" (no/bad token). `403` = "I know who you are, but you can't do this."

---

## Middleware

### `middleware/auth.ts` — Token guard (`protect`)

| Status | Message | Trigger |
|--------|---------|---------|
| `401` | `"Not authorized to access this route"` | No `Authorization` header, header doesn't start with `Bearer`, or token verification fails |
| `401` | `"User not found"` | Token valid but user deleted from DB |

### `middleware/seller.ts` — Role guard (`requireSeller`)

| Status | Message | Trigger |
|--------|---------|---------|
| `403` | `"Seller account required"` | Authenticated user has role `buyer`, not `seller` |

### `middleware/errorHandler.ts` — Global error handler

These fire automatically for unhandled errors thrown anywhere in the app:

| Status | Message | Trigger |
|--------|---------|---------|
| `400` | `"{field} already exists"` | MongoDB duplicate key error (`code 11000`) |
| `400` | Mongoose validation messages joined by `, ` | Mongoose `ValidationError` |
| `400` | `"Invalid resource ID"` | Mongoose `CastError` (malformed MongoDB ObjectId) |
| `401` | `"Invalid token"` | JWT `JsonWebTokenError` |
| `401` | `"Token expired"` | JWT `TokenExpiredError` |
| `404` | `"Not Found — {req.originalUrl}"` | Route not matched (catch-all `notFound` middleware) |
| `500` | Error message or `"Server Error"` | Unhandled exception |

---

## Auth — `POST /api/auth/signup`

| Status | Message | Trigger |
|--------|---------|---------|
| `201` | *(success — returns `token` + `user`)* | Account created |
| `400` | `"User already exists with this email"` | Email already registered |

## Auth — `POST /api/auth/login`

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns `token` + `user`)* | Credentials valid |
| `401` | `"Invalid credentials"` | Email not found or password wrong |

## Auth — `GET /api/auth/me`

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns `user`)* | Token valid |
| `401` | `"Not authorized to access this route"` | No token |
| `404` | `"User not found"` | Token valid but user deleted |

## Auth — `PUT /api/auth/profile`

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns updated `user`)* | Profile updated |
| `400` | `"Email already in use by another account"` | New email already taken by another user |
| `404` | `"User not found"` | User not found in DB |

## Auth — `POST /api/auth/avatar`

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns updated `user`)* | Avatar uploaded |
| `400` | `"No image provided"` | Multipart request sent without a file |

## Auth — Payment Methods (`/api/auth/payment-methods`)

| Status | Message | Trigger |
|--------|---------|---------|
| `201` | *(success — returns `paymentMethods`)* | Card added |
| `400` | `"Missing required card fields"` | `type`, `last4`, `cardHolder`, `expiryMonth`, or `expiryYear` missing |
| `404` | `"User not found"` | User deleted |
| `404` | `"Card not found"` | Card ID not in user's saved cards (on DELETE) |

## Auth — Saved Addresses (`/api/auth/addresses`)

| Status | Message | Trigger |
|--------|---------|---------|
| `201` | *(success — returns `savedAddresses`)* | Address added |
| `400` | `"street and city are required"` | Address submitted without `street` or `city` |
| `404` | `"User not found"` | User deleted |
| `404` | `"Address not found"` | Address ID not in user's saved addresses (on DELETE) |

---

## Cart — `/api/cart`

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns `sellers` array)* | `GET` cart (scoped to authenticated user's `userId`) |
| `200` | *(success — returns updated `sellers`)* | `PUT` sync cart |
| `200` | *(success)* | `DELETE` clear cart |
| `401` | `"Not authorized to access this route"` | No token on any cart route |
| `500` | Error message or `"Server error"` | Unexpected DB failure |

> Cart isolation is silent — a second buyer gets `200` with an empty `sellers` array, not a 403.

---

## Orders — `/api/orders`

### `POST /api/orders` — Create order

| Status | Message | Trigger |
|--------|---------|---------|
| `201` | *(success — returns `orders` array)* | Orders created (one per seller) |
| `400` | `"Insufficient stock for: {product.name}"` | Product-level stock less than requested quantity |
| `400` | `"Insufficient stock for variant of: {product.name}"` | Variant-level stock less than requested quantity |
| `404` | `"Product not found: {productId}"` | Product ID in cart doesn't exist |
| `404` | `"Variant not found for: {product.name}"` | Variant ID doesn't match any variant on the product |

### `GET /api/orders` — List buyer's orders

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns `orders` array)* | Returns only the authenticated buyer's own orders |

### `GET /api/orders/:id` — Get single order

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns `order`)* | Order belongs to authenticated user |
| `403` | `"Not authorized to access this order"` | Order exists but belongs to a different user |
| `404` | `"Order not found"` | Order ID doesn't exist |

### `PUT /api/orders/:id/status` — Buyer cancel order

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns updated `order`)* | Order cancelled; stock restored |
| `400` | `"You can only cancel pending or preparing orders"` | Order is in `processing`, `shipped`, `delivered`, or already `cancelled` |
| `403` | `"Not authorized"` | Order belongs to a different user |
| `404` | `"Order not found"` | Order ID doesn't exist |

### `PUT /api/orders/:id/confirm` — Buyer confirm received

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns updated `order` with status `delivered`)* | Confirmed |
| `400` | `"Order must be shipped before confirming receipt"` | Order status is not `shipped` |
| `403` | `"Not authorized"` | Order belongs to a different user |
| `404` | `"Order not found"` | Order ID doesn't exist |

---

## Seller Orders — `/api/seller/orders`

### `PUT /api/seller/orders/:id/status` — Seller advance order status

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns updated `order`)* | Status advanced |
| `400` | `"Cannot transition order from '{current}' to '{requested}'"` | Invalid status transition (see table below) |
| `403` | `"Seller account required"` | Caller is a buyer, not a seller |
| `403` | `"Not authorized to update this order"` | Order contains none of this seller's products |
| `404` | `"Order not found"` | Order ID doesn't exist |

**Valid status transitions:**

| From | Allowed next statuses |
|------|-----------------------|
| `pending` | `preparing`, `cancelled` |
| `preparing` | `processing`, `cancelled` |
| `processing` | `shipped`, `cancelled` |
| `shipped` | `delivered`, `cancelled` |
| `delivered` | *(none — terminal)* |
| `cancelled` | *(none — terminal)* |

---

## Products — `/api/products`

### Public routes (no auth)

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns paginated `products`)* | `GET /api/products` |
| `200` | *(success — returns `product`)* | `GET /api/products/:id` |
| `404` | `"Product not found"` | Product ID doesn't exist |
| `404` | `"Seller not found"` | `GET /api/products/seller/:id` with unknown seller ID |

### Seller product routes (auth + seller role required)

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns updated `product`)* | `PUT /api/products/:id` |
| `200` | `"Product deleted successfully"` | `DELETE /api/products/:id` |
| `201` | *(success — returns `product`)* | `POST /api/products` |
| `400` | `"No image file provided"` | Image upload routes called without a file |
| `403` | `"Not authorized to update this product"` | `PUT` — seller doesn't own the product |
| `403` | `"Not authorized to delete this product"` | `DELETE` — seller doesn't own the product |
| `403` | `"Not authorised to update this product"` | `POST /api/products/:id/image` — ownership check on image upload |
| `404` | `"Product not found"` | Product ID doesn't exist |

### Seller dashboard routes — `/api/seller/products`

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns `products`)* | List seller's own products |
| `200` | *(success — returns updated `product`)* | Update product |
| `200` | `"Product deleted"` | Delete product |
| `201` | *(success — returns `product`)* | Create product |
| `400` | `"name, description, price, and category are required"` | Required fields missing on create |
| `403` | `"Seller account required"` | Caller is a buyer |
| `403` | `"Not authorized to update this product"` | Seller doesn't own the product |
| `403` | `"Not authorized to delete this product"` | Seller doesn't own the product |
| `404` | `"Product not found"` | Product ID doesn't exist |

---

## Reviews — `/api/reviews`

### `POST /api/reviews` — Submit review

| Status | Message | Trigger |
|--------|---------|---------|
| `201` | *(success — returns `review`)* | Review submitted |
| `400` | `"productId, orderId, rating, and comment are required"` | Any required field missing |
| `400` | `"Rating must be between 1 and 5"` | `rating` outside valid range |
| `403` | `"You can only review products from delivered orders"` | Order not in `delivered` status |
| `403` | `"This product is not in the specified order"` | Product ID not found in the order's items |
| `409` | `"You have already reviewed this product"` | Duplicate review (unique index violation or pre-check) |

### `PUT /api/reviews/:id` — Update review

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns updated `review`)* | Updated |
| `400` | `"Provide rating or comment to update"` | Neither `rating` nor `comment` supplied |
| `400` | `"Rating must be between 1 and 5"` | `rating` outside valid range |
| `404` | `"Review not found or not yours"` | Review ID doesn't exist or belongs to another user |

---

## Coupons — `/api/coupons`

### `POST /api/coupons` — Seller create coupon

| Status | Message | Trigger |
|--------|---------|---------|
| `201` | *(success — returns `coupon`)* | Coupon created |
| `400` | `"code, discountType, and discountValue are required"` | Required fields missing |
| `403` | `"Seller account required"` | Caller is a buyer |
| `409` | `"Coupon code already exists"` | Duplicate coupon code |

### `PUT /api/coupons/:id` — Seller update coupon

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns `coupon`)* | Updated |
| `403` | `"Seller account required"` | Caller is a buyer |
| `404` | `"Coupon not found"` | Coupon doesn't exist or belongs to another seller |

### `DELETE /api/coupons/:id` — Seller delete coupon

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | `"Coupon deleted"` | Deleted |
| `403` | `"Seller account required"` | Caller is a buyer |
| `404` | `"Coupon not found"` | Coupon doesn't exist or belongs to another seller |

### `POST /api/coupons/validate` — Buyer validate coupon

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns `coupon` + `discountAmount`)* | Valid coupon |
| `400` | `"code and sellerId are required"` | Missing required fields |
| `400` | `"This voucher is no longer active"` | Coupon `isActive` is `false` |
| `400` | `"This voucher has expired"` | `expiresAt` is in the past |
| `400` | `"This voucher has reached its usage limit"` | `usedCount >= usageLimit` |
| `400` | `"Minimum order amount is $XX.XX"` | `orderAmount` is below `minOrderAmount` (formatted to 2 decimal places) |
| `404` | `"Invalid voucher code"` | Code + sellerId combo doesn't match any coupon |

### `GET /api/coupons` — Buyer list available coupons for a seller

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns `coupons`)* | Returns only active, unexpired, under-limit coupons |
| `400` | `"sellerId is required"` | `sellerId` query param missing |

---

## Users — `/api/users`

### `GET /api/users/search`

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns `users`)* | Search results (may be empty array) |

### `GET /api/users/:id` — Get public profile

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns `user`)* | Profile found |
| `400` | `"Invalid user id"` | `:id` is not a valid MongoDB ObjectId |
| `404` | `"User not found"` | Valid ID but user doesn't exist |

### `POST /api/users/:id/follow`

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns `isFollowing`, `followersCount`)* | Followed |
| `400` | `"Cannot follow yourself"` | `targetId === currentUserId` |
| `400` | `"Invalid user id"` | `:id` not a valid ObjectId |
| `404` | `"User not found"` | Target user doesn't exist |

### `DELETE /api/users/:id/follow`

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns `isFollowing`, `followersCount`)* | Unfollowed (always succeeds even if not following) |
| `400` | `"Invalid user id"` | `:id` not a valid ObjectId |

### `GET /api/users/:id/followers` / `GET /api/users/:id/following`

| Status | Message | Trigger |
|--------|---------|---------|
| `200` | *(success — returns `users`)* | List returned |
| `400` | `"Invalid user id"` | `:id` not a valid ObjectId |
| `404` | `"User not found"` | User doesn't exist (following endpoint only) |

---

## Notes for Test Authors

- **Exact message matching** — use `expect(body.message).toBe("...")` for exact matches or `/pattern/i` regex for dynamic messages (e.g. stock errors that include the product name).
- **Dynamic messages** — `"Insufficient stock for: {name}"`, `"Cannot transition order from '{a}' to '{b}'"`, `"Minimum order amount is $XX.XX"`, and `"Not Found — {url}"` contain runtime values — test with regex: `/insufficient stock/i`, `/cannot transition/i`, `/minimum order amount/i`.
- **`success` field** — always present; `true` on success, `false` on error. Can use as a quick boolean check before inspecting `message`.
- **`500` in tests** — do not assert on 500 unless testing server fault injection. A 500 in a test usually means the test's setup data is wrong.
- **Cart isolation** — returns `200` with an empty array, not `403`. Isolation is enforced by MongoDB query scoping, not by a permission check.
