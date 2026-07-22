# TokoMart - Full-Stack E-Commerce Application

A full-featured multi-seller e-commerce application with a React web frontend, Flutter mobile app, and Node.js/MongoDB backend, built with TypeScript, Tailwind CSS, Express, and Dart.

## Features

### Shopping
- **Product Browsing**: Browse products across multiple categories with real-time search, category, price range, and rating filters
- **Multi-Seller Support**: Products are grouped by seller; each seller has an independent shipping and tax calculation
- **Shopping Cart**: Add/remove items, update quantities — cart persists to MongoDB and is restored on re-login
- **Per-Seller Order Computation**: Each seller's subtotal, shipping ($9.99 or free over $50), and tax (8%) are shown separately
- **Checkout Flow**: Multi-step checkout (shipping → payment → review) with saved addresses and saved cards
- **Order History**: View past orders with status tracking and per-item detail
- **Product Reviews**: Leave a star rating and written review after receiving an order

### Users & Accounts
- **Authentication**: JWT-based login and signup (bcryptjs-hashed passwords)
- **User Profile**: Edit personal info, upload avatar, manage saved addresses and payment cards
- **Seller Dashboard**: Sellers can list, edit, and delete their own products

### Technical
- **Cart Persistence**: Cart is synced to MongoDB on every change and restored from the server on login — survives logout/re-login
- **Cross-Account Isolation**: Cart is cleared locally on logout; each user loads only their own cart on login
- **Dark Mode**: System-preference-aware theme with manual toggle
- **Responsive Design**: Mobile-first layout that works on all screen sizes
- **Flutter Mobile App**: Full-featured Android/iOS app with Patrol E2E tests

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
| E2E Tests | Patrol |

### Backend (`backend/`)
| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Security | Helmet, CORS |

## Project Structure

```
shopping-app-automation/
├── frontend/                   # React web app
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Button, Card, Input, Badge, Spinner
│   │   │   └── layout/         # Navbar, Layout
│   │   ├── pages/              # Cart, Checkout, Home, Login, Signup,
│   │   │                       # Products, ProductDetails, OrderHistory,
│   │   │                       # OrderDetail, Profile, SellerDashboard
│   │   ├── context/            # AuthContext, CartContext, ThemeContext
│   │   ├── services/           # authService, cartService, orderService,
│   │   │                       # productService, sellerService, storageService
│   │   ├── types/              # TypeScript interfaces (cart, product, order, user)
│   │   ├── utils/              # constants, formatters
│   │   └── config/             # API endpoint definitions
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── frontend-mobile/            # Flutter mobile app
│   ├── lib/
│   │   ├── core/               # Theme, constants, routing
│   │   └── features/
│   │       ├── auth/           # Login, Signup screens + Bloc
│   │       ├── products/       # Product list + detail screens
│   │       ├── cart/           # Cart screen + Bloc
│   │       ├── orders/         # Checkout + order history + Bloc
│   │       ├── profile/        # Profile screen
│   │       ├── seller/         # Seller dashboard
│   │       └── wishlist/       # Wishlist feature
│   ├── patrol_test/            # Patrol E2E tests
│   └── pubspec.yaml
│
├── backend/                    # Express API
│   ├── src/
│   │   ├── config/             # Database connection
│   │   ├── controllers/        # auth, cart, order, product, review, seller
│   │   ├── middleware/         # JWT auth guard
│   │   ├── models/             # User, Product, Order, Cart, Review
│   │   ├── routes/             # Route definitions
│   │   └── server.ts
│   ├── .env
│   └── package.json
│
└── README.md
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

### 3. Mobile App Setup

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
flutter run           # Run on connected device/emulator
flutter build apk     # Build Android APK
patrol test           # Run E2E tests
```

## Test Credentials

| Field | Value |
|---|---|
| Email | `test@example.com` |
| Password | `password123` |

Or register a new account via the Sign Up page.

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
| POST | `/api/seller/products` | Create product |
| PUT | `/api/seller/products/:id` | Update product |
| DELETE | `/api/seller/products/:id` | Delete product |
| GET | `/api/seller/orders` | Seller's orders |
| PUT | `/api/seller/orders/:id/status` | Update order status |

## Cart Behaviour

- Items are synced to MongoDB 600 ms after any change (debounced)
- On login, the user's cart is loaded from MongoDB — items added in a previous session are restored
- On logout, only the local (in-memory + localStorage) cart is cleared; the server-side cart is preserved
- Different users always see their own cart because the backend scopes carts by `userId`

## Shipping & Tax Rules

- Shipping: **$9.99 per seller** whose items total less than $50; free otherwise
- Tax: **8%** of the order subtotal, calculated per seller
- Both are shown as a per-seller breakdown in the cart and checkout screens

## Troubleshooting

**Port already in use**
```bash
cd frontend && npm run dev -- --port 3000
```

**MongoDB not connecting**
- Check that `MONGODB_URI` in `backend/.env` is correct
- Confirm MongoDB is running: `mongosh --eval "db.runCommand({ ping: 1 })"`

**Cart not loading after login**
- Open DevTools → Network tab and check `GET /api/cart` returns 200
- Verify the backend is running and `VITE_API_BASE_URL` points to it

**Clear local session**
- DevTools → Application → Local Storage → delete all `shopping_app_*` keys

## License

Open source — available for educational and demonstration purposes.

## Acknowledgments

- Icons: [Lucide](https://lucide.dev)
- Styling: [Tailwind CSS](https://tailwindcss.com)
- Build: [Vite](https://vitejs.dev) + [React](https://react.dev)
- Mobile: [Flutter](https://flutter.dev)
