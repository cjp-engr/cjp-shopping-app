<div align="center">

# TokoMart - Full-Stack E-Commerce Application

A full-featured multi-seller e-commerce application with a React web frontend, Flutter mobile app, and Node.js/MongoDB backend, built with TypeScript, Tailwind CSS, Express, and Dart.

  <img src="docs/images/toko-mart-read-me.png" alt="TokoMart" width="800" />

</div>



## Features

### Shopping
- **Product Browsing**: Browse products across multiple categories with real-time search, category, price range, and rating filters; sellers do not see their own listings in the buyer-facing catalog
- **Multi-Seller Support**: Products are grouped by seller; each seller has an independent shipping and tax calculation
- **Shopping Cart**: Add/remove items, update quantities — cart persists to MongoDB and is restored on re-login
- **Per-Seller Order Computation**: Each seller's subtotal, shipping (free or buyer-pays as configured by the seller), and tax (8%) are shown separately
- **Checkout Flow**: Multi-step checkout (shipping → payment → review) with saved addresses and saved cards
- **Order History**: View past orders with status tracking and per-item detail
- **Product Reviews**: Leave a star rating and written review after receiving an order
- **Wishlist**: Save products for later; wishlist count shown in bottom navigation

### Seller Dashboard
- **Multi-Step Product Wizard**: 7-step form (Basic Info → Pricing → Description → Variants → Images → Shipping → Review) for creating and editing listings on both web and mobile
- **Multi-Select Delivery Options**: Sellers pick Standard, Express, and/or Pickup — buyers choose one at checkout
- **Required Shipping Fee**: Sellers must choose Free Shipping or Buyer Pays before publishing a product; when Buyer Pays is selected, a fee amount is required for each selected delivery option
- **Seller-Configured Shipping**: Shipping cost shown to buyers is determined entirely by what the seller configured — no platform-wide flat rate or threshold
- **Required Product Fields**: Name, Category, Description, at least one image, Shipping Options, and Shipping Fee are enforced as required on both the frontend forms and the backend API
- **Product Fields**: Name, Category, Brand, Condition (New/Used), Price, Stock, SKU, Discount %, Description, Tags, and Images
- **Pricing Computed Card**: Real-time breakdown showing unit price, discount, final price, and total stock value
- **Order Management**: View and update order status (Pending → Preparing → Processing → Shipped → Delivered); cancel with reason
- **New Order Notifications**: Push notification when a new order arrives (polled every 30 s)

### Users & Accounts
- **Authentication**: JWT-based login and signup (bcryptjs-hashed passwords)
- **User Profile**: Edit personal info, upload avatar, manage saved addresses and payment cards
- **Role-Based Navigation**: Bottom nav adapts to buyer vs seller role; sellers get a Storefront tab

### Technical
- **Cart Persistence**: Cart is synced to MongoDB on every change and restored from the server on login — survives logout/re-login
- **Cross-Account Isolation**: Cart is cleared locally on logout; each user loads only their own cart on login
- **Offline Handling**: Yellow banner on web and mobile when network is lost; checkout shows a friendly "No internet connection" message instead of a raw fetch error
- **Dark Mode**: System-preference-aware theme with manual toggle
- **Responsive Design**: Mobile-first layout that works on all screen sizes
- **Flutter Mobile App**: Full-featured Android/iOS app with Bloc state management, GoRouter navigation, and Patrol E2E tests

## Tech Stack

### Web Frontend (`frontend/`)
| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| State | React Context API |
| Icons | Lucide React |

### Mobile App (`frontend-mobile/`)
| Layer | Technology |
|---|---|
| Framework | Flutter 3 + Dart |
| State | Bloc / Cubit |
| Navigation | GoRouter |
| HTTP | Dio |
| Connectivity | connectivity_plus |
| E2E Tests | Patrol |

### Backend (`backend/`)
| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| File Upload | Multer |
| Security | Helmet, CORS |

## Project Structure

```
shopping-app-automation/
├── frontend/                   # React web app
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Button, Card, Input, Badge, Spinner, OfflineBanner
│   │   │   ├── layout/         # Navbar, Layout
│   │   │   └── seller/         # ProductWizard (multi-step form)
│   │   ├── hooks/              # useOnlineStatus (network state)
│   │   ├── pages/              # Cart, Checkout, Home, Login, Signup,
│   │   │                       # Products, ProductDetails, OrderHistory,
│   │   │                       # OrderDetail, Profile, SellerDashboard
│   │   ├── context/            # AuthContext, CartContext, ThemeContext
│   │   ├── services/           # authService, cartService, orderService,
│   │   │                       # productService, sellerService, storageService
│   │   ├── types/              # TypeScript interfaces (cart, product, order, user)
│   │   ├── utils/              # constants, formatters, network (formatNetworkError)
│   │   └── config/             # API endpoint definitions
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── frontend-mobile/            # Flutter mobile app
│   ├── lib/
│   │   ├── core/
│   │   │   ├── network/        # ConnectivityCubit (connectivity_plus stream)
│   │   │   ├── widgets/        # OfflineBanner (animated, shown when offline)
│   │   │   └── ...             # Theme, constants, routing
│   │   └── features/
│   │       ├── auth/           # Login, Signup screens + Bloc
│   │       ├── products/       # Product list + detail screens + Bloc
│   │       ├── cart/           # Cart screen + Bloc
│   │       ├── orders/         # Checkout + order history + Bloc
│   │       ├── profile/        # Profile screen
│   │       ├── seller/         # Seller dashboard + AddEditProductScreen
│   │       └── wishlist/       # Wishlist feature + Bloc
│   │   └── shared/
│   │       ├── widgets/        # MainShell, AppButton, AppTextField
│   │       └── services/       # NotificationService, MediaPermissionService
│   ├── patrol_test/            # Patrol E2E tests
│   └── pubspec.yaml
│
├── backend/                    # Express API
│   ├── src/
│   │   ├── config/             # Database connection
│   │   ├── controllers/        # auth, cart, order, product, review, seller
│   │   ├── middleware/         # JWT auth guard, error handler, multer upload
│   │   ├── models/             # User, Product, Order, Cart, Review
│   │   ├── routes/             # Route definitions
│   │   └── server.ts
│   ├── .env
│   └── package.json
│
├── e2e-testing/                # Playwright test suite
│   ├── fixtures/               # base-fixture.ts (page object fixtures)
│   ├── helpers/                # api-client.ts (login, authHeaders, signupFreshUser)
│   │                           # product-factory.ts (createSimpleProduct, createDiscountedProduct)
│   │                           # test-data.ts (randomShipping, randomShippingMultipart)
│   ├── pages/                  # Page Object Model classes
│   │   ├── cart.page.ts
│   │   ├── checkout.page.ts
│   │   ├── login.page.ts
│   │   ├── product-detail.page.ts
│   │   ├── product-list.page.ts
│   │   └── seller-dashboard/   # Seller wizard + orders + vouchers POMs
│   ├── tests/
│   │   ├── auth/               # buyer.setup.ts, seller.setup.ts (storageState fixtures)
│   │   ├── api/                # *.api.spec.ts (HTTP layer tests)
│   │   └── web/                # *.spec.ts (browser E2E tests)
│   ├── playwright.config.ts
│   └── package.json
│
└── README.md
```

## How This Was Built

This project was built using an AI-assisted workflow powered by Claude Code. Each feature started with a structured design session, was broken into a step-by-step implementation plan, then executed by fresh subagents — one per task — with automated review gates between them. The same pipeline drives the test suite: scenario design → strategy → code generation → review.

### Agent Skills

Invoked as slash commands to perform specific tasks:

| Skill | What it did |
|---|---|
| `superpowers:brainstorming` | Turned feature ideas into reviewed design docs before any code was written |
| `superpowers:writing-plans` | Produced detailed step-by-step implementation plans from approved specs |
| `superpowers:subagent-driven-development` | Dispatched a fresh subagent per task with automated per-task review gates |
| `superpowers:using-git-worktrees` | Created isolated worktrees so feature branches never touched `main` directly |
| `superpowers:finishing-a-development-branch` | Verified tests, then pushed branches and opened GitHub PRs |
| `ui-ux-pro-max` | Guided UI design decisions — color, layout, component patterns, and accessibility |
| `frontend-patterns` | Applied React/TypeScript best practices during web feature development |
| `frontend-code-review` | Reviewed React/TypeScript code for quality, correctness, and performance |
| `backend-patterns` | Applied Node.js/Express architecture patterns during API development |
| `flutter-dev` | Guided Flutter development — Bloc, GoRouter, Dio, and widget patterns |
| `flutter-dart-code-review` | Reviewed Flutter/Dart code against widget, state, and performance best practices |
| `create-scenarios` | Generated test scenarios across 7 lenses from domain knowledge |
| `test-strategy` | Assigned each scenario to the correct test pyramid layer (Unit / API / E2E / Patrol) |
| `generate-tests` | Generated Playwright and Patrol test files from strategy docs |
| `review-tests` | Reviewed and refactored tests against scenarios, strategy, and domain rules |
| `patrol-write-test` | Step-by-step guide for writing and running Patrol mobile E2E tests |
| `patrol-test-architecture` | Defined structure, module patterns, and locator rules for the Patrol suite |
| `playwright-best-practices` | Enforced locator strategy, assertion patterns, and anti-patterns for web tests |

### Knowledge Skill

Always-on reference loaded automatically by testing and review skills:

| Skill | What it contains |
|---|---|
| `tokomart-domain` | Business rules, API reference, user flows, UI selectors, and error scenarios — the single source of truth consulted by all testing and review skills |

---

## Agent Skills

Skills (slash commands for Claude Code, Cursor, and Codex) live in a **separate private repo**:

| Property | Value |
|----------|-------|
| Repo | [`cjp-engr/cjp-skills`](https://github.com/cjp-engr/cjp-skills) (private) |
| Clone path | `D:\Files\aiSkills` |

**First-time setup** (after cloning this project):
1. Clone the skills repo: `git clone https://github.com/cjp-engr/cjp-skills.git "D:\Files\aiSkills"`
2. Run `.\scripts\setup-skills-links.ps1` to wire the junctions

**Keeping skills up to date:**
```powershell
cd D:\Files\aiSkills
git pull
```

## Getting Started

### Prerequisites
- Node.js v18+
- npm or yarn
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- Flutter SDK 3.x (mobile app only)

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```
MONGODB_URI=mongodb://localhost:27017/tokomart
JWT_SECRET=your_secret_key_here
PORT=5000
```

Start MongoDB, then seed the database:
```bash
# Start MongoDB (Windows service)
net start MongoDB

# Or with Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Seed products and a test user
cd backend
npm run seed
```

Start the backend:
```bash
cd backend
npm run dev
```

Backend runs at `http://localhost:5000`.

### 2. Web Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 3. E2E Test Suite Setup

```bash
cd e2e-testing
npm install
npx playwright install chromium
```

Create `e2e-testing/.env` (optional — defaults shown):
```
API_URL=http://localhost:5000
WEB_URL=http://localhost:5173
BUYER_EMAIL=b@test.com
SELLER_EMAIL=s@test.com
TEST_PASSWORD=Test750!!
```

Run all tests (requires backend + frontend running):
```bash
cd e2e-testing
npm test               # all projects
npm run test:web       # browser E2E only
npm run test:api       # API tests only
npm run test:ui        # interactive Playwright UI
npm run report         # open last HTML report
```

### 4. Mobile App Setup

```bash
cd frontend-mobile
flutter pub get
flutter run
```

Run Patrol E2E tests:
```bash
cd frontend-mobile
patrol test
```

### Available Scripts

#### E2E Tests
```bash
cd e2e-testing
npm test               # Run all Playwright projects
npm run test:web       # Browser E2E (Chrome)
npm run test:api       # API tests (no browser)
npm run test:ui        # Playwright interactive UI mode
npm run report         # Show last HTML report
```

#### Web Frontend
```bash
cd frontend
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint
```

#### Backend
```bash
cd backend
npm run dev       # Start with hot-reload
npm run build     # Compile TypeScript
npm start         # Run compiled build
npm run seed      # Seed database
```

#### Mobile
```bash
cd frontend-mobile
flutter run                          # Run on connected device/emulator
flutter build apk                    # Build Android APK
patrol test                          # Run all Patrol E2E tests
patrol test --target patrol_test/login_test.dart \
  --dart-define=EMAIL=b@test.com \
  --dart-define=TEST_PASSWORD=Test750!!   # Run a single test
```

## Test Credentials

| Role | Email | Password |
|---|---|---|
| Buyer | `b@test.com` | `Test750!!` |
| Seller | `s@test.com` | `Test750!!` |

Or register a new account via the Sign Up page. To create a seller account, register and toggle the seller role in Profile.

> **E2E tests** use these same credentials. The seller account is promoted automatically by the `seller-setup` Playwright project before web tests run.

## E2E Test Coverage

### Playwright (web + API)

| File | TC IDs | Layer |
|---|---|---|
| `tests/web/buyer/login.spec.ts` | TC-001 | E2E Web |
| `tests/web/buyer/product-browse.spec.ts` | TC-010, TC-011 | E2E Web |
| `tests/web/buyer/product-detail.spec.ts` | TC-012, TC-013, TC-014 | E2E Web |
| `tests/web/buyer/checkout.spec.ts` | TC-022, TC-023, TC-024 | E2E Web |
| `tests/web/buyer/variant-checkout.spec.ts` | TC-098, TC-105, TC-106 | E2E Web |
| `tests/web/seller/seller-product-wizard.spec.ts` | TC-064 | E2E Web |
| `tests/web/seller/seller-simple-product-crud.spec.ts` | TC-042, TC-044, TC-045, TC-046, TC-122 | E2E Web |
| `tests/web/seller/seller-variant-product-crud.spec.ts` | TC-120, TC-121, TC-046 | E2E Web |
| `tests/web/seller/seller-access.spec.ts` | TC-054 | E2E Web |
| `tests/web/mixed/cart-isolation.spec.ts` | TC-109 | E2E Web |
| `tests/web/mixed/order-isolation.spec.ts` | TC-112 | E2E Web |
| `tests/web/mixed/product-catalog-visibility.spec.ts` | TC-008, TC-065 | E2E Web |
| `tests/web/mixed/role-switch.smoke.spec.ts` | — | E2E Web |
| `tests/api/auth.api.spec.ts` | — | API |
| `tests/api/health.api.spec.ts` | — | API |
| `tests/api/orders.api.spec.ts` | TC-025, TC-026, TC-027, TC-028, TC-033, TC-056 | API |
| `tests/api/seller-access.api.spec.ts` | TC-048, TC-053, TC-054 | API |
| `tests/api/reviews.api.spec.ts` | TC-035, TC-036 | API |
| `tests/api/coupons.api.spec.ts` | TC-057 | API |
| `tests/api/cart.api.spec.ts` | TC-107, TC-108, TC-109 | API |
| `tests/api/order-isolation.api.spec.ts` | TC-110, TC-111 | API |
| `tests/api/rate-limit.api.spec.ts` | TC-114–TC-119 | API |
| `tests/api/users.api.spec.ts` | TC-113 | API |

Full coverage details: [`e2e-testing/README.md`](e2e-testing/README.md)

### Patrol (mobile)

| File | TC ID | Description |
|---|---|---|
| `0_auth/login_test.dart` | S2 | Mobile login smoke |
| `0_auth/signup_test.dart` | TC-068 | Signup with valid data |
| `1_seller/add_product_simple_test.dart` | TC-090 | Seller creates simple product |
| `1_seller/add_product_variant_test.dart` | TC-091 | Seller creates variant product |
| `2_buyer/simple_cod_checkout_test.dart` | TC-095 | COD checkout — simple product |
| `2_buyer/simple_saved_credit_checkout_test.dart` | TC-096 | Saved card checkout — simple product |
| `2_buyer/simple_new_credit_checkout_test.dart` | TC-097 | New card checkout — simple product |
| `2_buyer/variant_cod_checkout_test.dart` | TC-101 | COD checkout — variant product |
| `2_buyer/variant_new_credit_checkout_test.dart` | TC-103 | New card checkout — variant product |
| `2_buyer/variant_saved_credit_checkout_test.dart` | TC-104 | Saved card checkout — variant product |

Full coverage details: [`frontend-mobile/patrol_test/README.md`](frontend-mobile/patrol_test/README.md)

### Page Object Model (`e2e-testing/pages/`)

| Page Object | Wraps |
|---|---|
| `LoginPage` | `/login` form |
| `ProductListPage` | `/products` grid + search |
| `ProductDetailPage` | `/products/:id` + variant picker |
| `CartPage` | `/cart` + checkout trigger |
| `CheckoutPage` | `/checkout` 3-step wizard |
| `SellerDashboardPage` | Seller dashboard + product wizard |

## API Reference

All protected endpoints require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| PUT | `/api/auth/profile` | Update profile |
| POST | `/api/auth/avatar` | Upload avatar |
| GET | `/api/auth/payment-methods` | List saved cards |
| POST | `/api/auth/payment-methods` | Save a card |
| DELETE | `/api/auth/payment-methods/:id` | Delete a card |

### Products
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | List with filters (`search`, `category`, `sortBy`, `page`) |
| GET | `/api/products/:id` | Single product |
| GET | `/api/products/categories/all` | All categories |

### Cart (Protected)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/cart` | Get current user's cart |
| PUT | `/api/cart` | Sync cart (`{ items: [{ productId, quantity }] }`) |
| DELETE | `/api/cart` | Clear cart |

### Orders (Protected)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/orders` | Place order |
| GET | `/api/orders` | Order history |
| GET | `/api/orders/:id` | Order detail |
| PUT | `/api/orders/:id/status` | Update status |
| PUT | `/api/orders/:id/confirm-received` | Confirm delivery |

### Reviews (Protected)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/reviews` | Submit review |
| GET | `/api/reviews/product/:productId` | Product reviews |
| GET | `/api/reviews/check/:productId` | Check if reviewed |

### Seller (Protected — seller role)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/seller/products` | Seller's products |
| POST | `/api/seller/products` | Create product (multipart/form-data) |
| PUT | `/api/seller/products/:id` | Update product (multipart/form-data) |
| DELETE | `/api/seller/products/:id` | Delete product |
| GET | `/api/seller/orders` | Seller's orders |
| PUT | `/api/seller/orders/:id/status` | Update order status |

#### Product Fields (create / update)
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | |
| `description` | string | yes | max 200 chars |
| `price` | number | yes | |
| `category` | string | yes | must match enum |
| `stock` | number | yes | |
| `brand` | string | no | |
| `condition` | `new` \| `used` | no | |
| `sku` | string | no | |
| `discount` | number | no | 0–100 (%) |
| `tags` | JSON string array | no | e.g. `'["sale","new"]'` |
| `shippingOptions` | JSON string array | **yes** | one or more of `standard`, `express`, `pickup` |
| `shippingFee` | `free` \| `buyer_pays` | **yes** | |
| `shippingFeeAmounts` | JSON object | conditional | required when `shippingFee=buyer_pays`; keys are the selected options, values are numbers e.g. `{"standard":10,"express":15}` |
| `images` | file(s) | **yes** | multipart field name `images`; at least one required |

## Cart Behaviour

- Items are synced to MongoDB 600 ms after any change (debounced)
- On login, the user's cart is loaded from MongoDB — items added in a previous session are restored
- On logout, only the local (in-memory + localStorage) cart is cleared; the server-side cart is preserved
- Different users always see their own cart because the backend scopes carts by `userId`

## Shipping & Tax Rules

- Shipping: determined entirely by the seller's configuration — **Free** or **Buyer Pays** with per-option fee amounts (Standard / Express / Pickup). There is no platform-wide flat rate or minimum-order free shipping threshold.
- When a seller has not configured shipping, the cart shows "At checkout" as the shipping cost; the exact amount is resolved when the buyer selects a delivery option.
- Tax: **8%** of the order subtotal, calculated per seller
- Both are shown as a per-seller breakdown in the cart and checkout screens

## Order Status Flow

`pending → preparing → processing → shipped → delivered`

Cancellation is allowed by buyer or seller up through `processing`; seller-only after that. Stock is restored automatically when an order is cancelled. Once `delivered`, no further transitions are allowed.

## Troubleshooting

**Port already in use**
```bash
# Web frontend
cd frontend && npm run dev -- --port 3000

# Kill Vite on port 5173 (Windows)
Get-NetTCPConnection -LocalPort 5173 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

**MongoDB not connecting**
- Check that `MONGODB_URI` in `backend/.env` is correct
- Confirm MongoDB is running: `mongosh --eval "db.runCommand({ ping: 1 })"`

**Cart not loading after login**
- Open DevTools → Network tab and check `GET /api/cart` returns 200
- Verify the backend is running and `VITE_API_BASE_URL` points to it

**Flutter 401 errors on launch**
- The app guards API calls behind `AuthStatus.authenticated` — errors on first launch indicate a stale token; log out and log back in

**Clear local session**
- DevTools → Application → Local Storage → delete all `shopping_app_*` keys

## License

Open source — available for educational and demonstration purposes.

## Acknowledgments

- Icons: [Lucide](https://lucide.dev)
- Styling: [Tailwind CSS](https://tailwindcss.com)
- Build: [Vite](https://vitejs.dev) + [React](https://react.dev)
- Mobile: [Flutter](https://flutter.dev)
