# TokoMart — Feature Roadmap & Testing Showcase

> Features selected to demonstrate depth in **Patrol** (mobile E2E) and **Playwright** (web E2E),
> plus a **Chat with Auto-Reply** system planned for both platforms.

---

## Table of Contents

1. [Chat Feature with Auto-Reply](#1-chat-feature-with-auto-reply)
2. [Feature Enhancements — Testing Showcase](#2-feature-enhancements--testing-showcase)
   - [Mobile-first (Patrol)](#mobile-first-patrol)
   - [Web-first (Playwright)](#web-first-playwright)
   - [Both Platforms](#both-platforms)
3. [Why Each Feature is Good for Testing](#3-why-each-feature-is-good-for-testing)

---

## 1. Chat Feature with Auto-Reply

### Overview

A **buyer–seller in-app messaging system** where buyers can ask questions about a product
and an **auto-reply bot** responds instantly with relevant answers when the seller is offline.

### User Flow

```
Buyer opens Product Detail → taps "Ask Seller" button
  → Chat screen opens (buyer ↔ seller thread)
  → Buyer types a message and sends
  → If seller is online: seller sees the message and replies manually
  → If seller is offline: auto-reply bot responds within 2 seconds
```

### Auto-Reply Logic

The bot matches the buyer's message against keyword categories and returns a preset answer.

| Keyword Category | Sample Trigger Phrases | Auto-Reply |
|---|---|---|
| **Price / Discount** | "price", "discount", "cheaper", "offer" | "The listed price is our best offer. We occasionally run promos — follow our store to get notified!" |
| **Availability / Stock** | "stock", "available", "in stock", "left" | "Stock levels are updated daily. If it shows available, you're good to order!" |
| **Shipping / Delivery** | "ship", "deliver", "arrival", "how long" | "We ship within 1–2 business days. Delivery takes 3–7 days depending on your location." |
| **Return / Refund** | "return", "refund", "exchange", "warranty" | "We accept returns within 7 days of delivery. Please message us with your order ID to start the process." |
| **Product details** | "size", "color", "material", "weight", "spec" | "Check the product description for full specs. Feel free to ask if something is missing!" |
| **Payment** | "pay", "payment", "cash on delivery", "cod", "card" | "We accept all major cards, GCash, and Cash on Delivery." |
| **Fallback** | *(no keyword matched)* | "Thanks for your message! Our seller will get back to you soon. 🙂" |

### Feature Scope

#### Backend
- `POST /api/chat/messages` — send a message
- `GET /api/chat/threads/:threadId` — fetch messages in a thread
- `GET /api/chat/threads` — list all threads for current user
- Auto-reply service: triggered server-side when seller has not been active in the last 5 minutes

#### Web (React)
- Chat icon in Navbar with unread badge count
- Chat inbox page (`/chat`) listing all threads
- Thread page (`/chat/:threadId`) with scrollable message history
- Real-time feel via polling every 5 seconds (no WebSocket required)
- Auto-reply shown with a "Bot" avatar label

#### Mobile (Flutter)
- "Ask Seller" button on Product Detail screen
- Chat screen with message bubbles (sent right, received left)
- Unread badge on bottom nav icon
- Auto-reply displayed with a bot indicator chip
- `StreamBuilder` or polling for new messages

### Testing Scenarios

**Patrol (Mobile)**
```dart
// buyer sends a price question and bot auto-replies
patrolTest('auto-reply triggers on price keyword', ($) async {
  await $.pumpWidgetAndSettle(app);
  // login as buyer, open product, open chat
  await $(#askSellerButton).tap();
  await $(#chatInput).enterText('Do you have a discount?');
  await $(#sendButton).tap();
  await $.waitUntilVisible(find.textContaining('best offer'));
});
```

**Playwright (Web)**
```typescript
test('auto-reply responds to shipping question', async ({ page }) => {
  await loginAsBuyer(page);
  await page.goto('/products/some-id');
  await page.getByRole('button', { name: 'Ask Seller' }).click();
  await page.getByTestId('chat-input').fill('How long does delivery take?');
  await page.getByTestId('send-button').click();
  await expect(page.getByText('3–7 days')).toBeVisible({ timeout: 5000 });
});
```

---

## 2. Feature Enhancements — Testing Showcase

---

### Mobile-first (Patrol)

These features are ideal for showcasing **Patrol** because they involve native interactions,
system permissions, deep app states, and complex gestures.

---

#### 2.1 Product Image Upload (Seller)

**What:** Sellers can upload product images from the camera or photo gallery when adding/editing a product.

**Why great for Patrol:**
- Exercises **native permission dialogs** (camera, photo library access)
- Patrol can handle `$.native.grantPermissionWhenInUse()` / `$.native.tapOnSystemAlertIfPresent()`
- Tests file picker integration

**Test scenarios:**
- Grant camera permission and capture a photo → image preview appears
- Deny permission → graceful error message shown, no crash
- Select from gallery → image appears in upload preview
- Upload with no image → validation error shown

---

#### 2.2 Push Notification Deep Link (Seller Order Alert)

**What:** When a seller taps the new-order push notification, the app opens directly to the Seller Orders screen.

**Why great for Patrol:**
- Patrol can interact with the **iOS/Android notification drawer** natively
- Tests deep linking from outside the app
- Validates notification payload handling

**Test scenarios:**
- App in foreground: banner notification tapped → navigates to orders screen
- App in background: notification tapped → app opens on orders screen
- App killed: cold-start via notification → correct screen shown

---

#### 2.3 Biometric / PIN Authentication (Login)

**What:** After first login, the user can enable fingerprint or Face ID for subsequent logins.

**Why great for Patrol:**
- Uses `$.native` to simulate biometric prompts
- Tests `local_auth` plugin integration
- Edge case: biometric fails → fallback to password

**Test scenarios:**
- Enable biometric in settings → system prompt appears and is granted
- Log out → log back in with biometric → home screen reached
- Biometric fails 3 times → password fallback screen shown

---

#### 2.4 Pull-to-Search on Products Screen

**What:** Pulling down past the top of the products list reveals a search bar (Instagram-style).

**Why great for Patrol:**
- Tests **scroll gestures** past bounds
- Keyboard interaction + input typing
- Dynamic list filtering

**Test scenarios:**
- Scroll down, type "shirt" → only shirt products visible
- Clear search → full list restored
- Search with no results → empty state shown with "Try a different keyword"
- Keyboard dismiss by tapping outside → search bar hides

---

#### 2.5 Offline Mode with Local Cache

**What:** Products and orders load from a local cache when there is no internet.

**Why great for Patrol:**
- Patrol can toggle **Wi-Fi/mobile data off** via native settings
- Tests app resilience without network
- Validates cache-first strategy

**Test scenarios:**
- Load products online → disable Wi-Fi → reopen app → cached products visible
- Place order offline → error banner shown with retry button
- Restore Wi-Fi → retry succeeds → order placed

---

### Web-first (Playwright)

These features highlight **Playwright** strengths: multi-tab flows, API mocking, auth state,
visual regression, and network interception.

---

#### 2.6 Product Comparison

**What:** Buyer can select up to 3 products and view a side-by-side comparison table (price, rating, category, stock).

**Why great for Playwright:**
- Multi-step selection flow with state tracking
- `page.waitForResponse()` for comparison data fetch
- Keyboard navigation and table assertions
- Visual snapshot of comparison table

**Test scenarios:**
- Select 2 products → compare table appears with correct columns
- Select 4th product → tooltip "Max 3 products" appears
- Remove one product from comparison → table updates in real time
- Page reload → comparison selection is lost (stateless)

---

#### 2.7 Coupon / Promo Code at Checkout

**What:** At checkout, users can enter a promo code for a percentage or fixed discount.

**Why great for Playwright:**
- Form interaction + API interception (`page.route()` to mock coupon endpoint)
- Tests valid, invalid, and expired codes
- Price recalculation assertion
- Network failure fallback

**Test scenarios:**
- Enter valid code `SAVE10` → 10% off shown in order summary
- Enter invalid code → inline error "Invalid promo code"
- Enter expired code → inline error "This code has expired"
- Remove code → original price restored
- Network timeout on code validation → spinner then error with retry

---

#### 2.8 Admin / Seller Analytics Dashboard

**What:** Sellers see a dashboard with total sales, revenue chart (last 30 days), top products, and order status breakdown.

**Why great for Playwright:**
- Page Object Model (POM) for complex dashboard
- `page.route()` to mock chart data responses
- `expect(locator).toHaveText()` for KPI tile values
- Visual regression with `expect(page).toHaveScreenshot()`

**Test scenarios:**
- Dashboard loads with correct total sales figure
- Date range filter changes chart data (mocked API response)
- Top products list sorts by revenue descending
- Export CSV button triggers file download (`page.waitForEvent('download')`)

---

#### 2.9 Multi-Step Checkout with Address Autocomplete

**What:** Checkout is a 3-step wizard: (1) address with autocomplete, (2) payment method, (3) review & confirm.

**Why great for Playwright:**
- Multi-page / multi-step flow
- Input autocomplete interaction (`page.getByRole('option')`)
- Back-button mid-flow preserves previous inputs
- API mock for address suggestions

**Test scenarios:**
- Complete all 3 steps → order placed confirmation shown
- Go back from step 2 → step 1 data still filled
- Skip address → step 2 blocked with validation error
- Payment method "Cash on Delivery" selected → credit card fields hidden
- Submit with no items in cart (edge case) → redirect to cart

---

#### 2.10 Seller Store Page (Public Storefront)

**What:** Each seller has a public `/stores/:sellerId` page showing their profile, all products, ratings, and follower count.

**Why great for Playwright:**
- SEO-relevant, so test meta tags (`page.locator('meta[name="description"]')`)
- Pagination / infinite scroll
- Follow/Unfollow button state sync
- Unauthenticated vs authenticated views

**Test scenarios:**
- Logged-out user sees store but "Follow" requires login → redirect to login
- Logged-in user follows seller → button changes to "Unfollow"
- Product pagination: scroll to bottom → next page loads
- Product filter by category on store page
- Share store URL → correct OG meta tags rendered

---

### Both Platforms

These features have meaningful test coverage on both mobile (Patrol) and web (Playwright).

---

#### 2.11 Order Status Real-Time Updates

**What:** Order status changes (e.g., "Processing" → "Shipped" → "Delivered") update on the Orders screen without a manual refresh.

**Patrol:**
- Test seller updates status → buyer sees new status via polling
- Native notification received when status changes

**Playwright:**
- Mock WebSocket / polling response to simulate status change
- Assert badge color changes per status

---

#### 2.12 Product Review & Rating System

**What:** After an order is marked "Delivered", buyers can submit a star rating + text review for each product in the order.

**Patrol:**
- Tap stars with finger gestures → correct rating selected
- Submit review → appears under product detail
- Cannot review before order is delivered (button hidden)

**Playwright:**
- Star widget keyboard accessible (arrow keys)
- Review form submits → review visible on product page
- Edit / delete own review
- Report a review (moderation)
- Average rating recalculates after new review

---

#### 2.13 Wishlist Sharing

**What:** Users can generate a shareable link to their wishlist. Recipients see the products but cannot modify the list.

**Patrol:**
- Share sheet appears with correct URL
- Recipient opens share link → read-only wishlist view
- Add to cart from shared wishlist (if authenticated)

**Playwright:**
- Shared link accessible without login (public read)
- Shared wishlist shows correct items
- "Add to my wishlist" button visible when logged in
- Expired or invalid share link → 404 page

---

## 3. Why Each Feature is Good for Testing

| Feature | Platform | Key Testing Concepts |
|---|---|---|
| Chat with Auto-Reply | Both | Async messages, bot keyword matching, real-time polling |
| Image Upload | Mobile (Patrol) | Native permissions, file picker, camera API |
| Push Notification Deep Link | Mobile (Patrol) | Notification drawer, cold start, deep linking |
| Biometric Auth | Mobile (Patrol) | `$.native` system dialogs, fallback flows |
| Pull-to-Search | Mobile (Patrol) | Scroll gestures, keyboard, dynamic filtering |
| Offline Mode | Mobile (Patrol) | Wi-Fi toggle, cache assertions, retry flows |
| Product Comparison | Web (Playwright) | Multi-step selection, visual snapshots |
| Coupon / Promo Code | Web (Playwright) | `page.route()` API mocking, price math |
| Analytics Dashboard | Web (Playwright) | POM, visual regression, file download |
| Multi-Step Checkout | Web (Playwright) | Wizard navigation, back-button, validation |
| Seller Storefront | Web (Playwright) | Meta tags, pagination, auth gating |
| Order Status Updates | Both | Polling simulation, status badges |
| Review & Rating | Both | Star gestures (mobile), keyboard nav (web), average calc |
| Wishlist Sharing | Both | Share sheet (mobile), public URL access (web) |

---

> **Suggested order of implementation:**
> 1. Chat with Auto-Reply (most impactful, covers both platforms)
> 2. Product Review & Rating (completes the buyer journey)
> 3. Coupon / Promo Code (common interview demo scenario)
> 4. Push Notification Deep Link (showcases Patrol's native strength)
> 5. Analytics Dashboard (showcases Playwright visual regression)
