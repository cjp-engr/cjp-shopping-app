# TokoMart Backend API

Backend REST API for the TokoMart multi-seller e-commerce application built with Node.js, Express, TypeScript, and MongoDB with Stripe payment processing.

## 🚀 Features

- **Authentication**: JWT-based user authentication with bcrypt password hashing
- **Payment Processing**: Stripe integration for credit/debit card payments with saved card support
- **Product Management**: Full CRUD with multi-step wizard support, variants, images, and per-seller configuration
- **Order Management**: Multi-seller orders, per-seller shipping/tax calculation, status tracking
- **Cart Management**: Persistent shopping cart synced to MongoDB with debouncing
- **Saved Payment Methods**: Create, list, set default, and delete saved cards
- **Seller Features**: Dashboard, product management, order management, inventory control
- **Reviews & Ratings**: Product reviews with star ratings after order delivery
- **TypeScript**: Fully typed codebase for type safety and IDE support
- **Security**: Helmet, CORS, input validation, JWT protection, rate limiting
- **Error Handling**: Centralized error middleware with mobile-friendly responses

## 🛠️ Tech Stack

- **Runtime**: Node.js v18+
- **Framework**: Express.js 4
- **Language**: TypeScript 5
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) + bcryptjs
- **Payments**: Stripe API (stripe package)
- **File Upload**: Multer for image handling
- **Validation**: express-validator, Mongoose schema validation
- **Security**: Helmet (security headers), CORS, rate-limiting
- **Error Handling**: Centralized middleware with structured responses

## 📋 Prerequisites

- **Node.js** v18 or higher
- **MongoDB** (local installation or [MongoDB Atlas](https://www.mongodb.com/atlas) cloud)
- **npm** or **yarn**
- **Stripe Account** (for payment processing) — [Sign up](https://stripe.com)

## ⚙️ Installation

### 1. Clone and Navigate
```bash
cd backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create Environment File
```bash
cp .env.example .env
```

### 4. Configure `.env`
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/tokomart

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Stripe (get from https://stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# File Upload
MAX_FILE_SIZE=5242880  # 5MB in bytes
```

## 🚄 Running the Application

### Development Mode (with hot-reload)
```bash
npm run dev
```

Runs at `http://localhost:5000`

### Production Build
```bash
npm run build
npm start
```

### Seed Database
Populate with initial products and test users:
```bash
npm run seed
```

Creates:
- 40 products across multiple categories
- Test buyer user: `b@test.com` / `Test750!!`
- Test seller user: `s@test.com` / `Test750!!`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts              # MongoDB connection setup
│   ├── controllers/
│   │   ├── authController.ts        # Signup, login, profile, payment methods
│   │   ├── productController.ts     # Product listing, detail, categories
│   │   ├── orderController.ts       # Order creation, history, status updates
│   │   ├── cartController.ts        # Cart sync and management
│   │   ├── reviewController.ts      # Product reviews
│   │   ├── paymentController.ts     # Stripe payment intent creation & confirmation
│   │   └── sellerController.ts      # Seller dashboard, products, orders
│   ├── middleware/
│   │   ├── auth.ts                  # JWT verification & auth guard
│   │   ├── errorHandler.ts          # Centralized error handling
│   │   ├── multer.ts                # Image upload configuration
│   │   └── validation.ts            # Request validation middleware
│   ├── models/
│   │   ├── User.ts                  # User schema with auth & payment methods
│   │   ├── Product.ts               # Product schema with variants & images
│   │   ├── Order.ts                 # Order schema with multi-seller support
│   │   ├── Cart.ts                  # Shopping cart schema
│   │   ├── Review.ts                # Product review schema
│   │   ├── PaymentMethod.ts         # Saved payment method schema
│   │   └── Coupon.ts                # Coupon/voucher schema
│   ├── routes/
│   │   ├── authRoutes.ts            # Auth & payment method endpoints
│   │   ├── productRoutes.ts         # Product endpoints
│   │   ├── orderRoutes.ts           # Order endpoints
│   │   ├── cartRoutes.ts            # Cart endpoints
│   │   ├── reviewRoutes.ts          # Review endpoints
│   │   ├── paymentRoutes.ts         # Stripe payment endpoints
│   │   └── sellerRoutes.ts          # Seller-specific endpoints
│   ├── services/
│   │   ├── stripeService.ts         # Stripe API wrapper
│   │   ├── paymentService.ts        # Payment business logic
│   │   ├── emailService.ts          # Email notifications (optional)
│   │   └── seedService.ts           # Database seeding
│   ├── utils/
│   │   ├── jwt.ts                   # JWT token generation/verification
│   │   ├── apiResponse.ts           # Response formatting utilities
│   │   ├── validators.ts            # Validation helper functions
│   │   └── errorCodes.ts            # Structured error code definitions
│   └── server.ts                    # Express app setup & middleware
├── .env.example                     # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 🔑 API Endpoints

All protected endpoints require: `Authorization: Bearer <token>`

### Authentication

#### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { ... }
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Upload Avatar
```http
POST /api/auth/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
- avatar: <image file>
```

### Payment Methods

#### List Saved Cards
```http
GET /api/auth/payment-methods
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "paymentMethods": [
      {
        "_id": "...",
        "brand": "visa",
        "last4": "4242",
        "expiryMonth": 12,
        "expiryYear": 2025,
        "isDefault": true,
        "stripePaymentMethodId": "pm_..."
      }
    ]
  }
}
```

#### Save New Card
```http
POST /api/auth/payment-methods
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "credit-card",
  "brand": "visa",
  "last4": "4242",
  "cardHolder": "John Doe",
  "expiryMonth": "12",
  "expiryYear": "2025",
  "stripePaymentMethodId": "pm_...",
  "setAsDefault": false
}
```

#### Set Default Card
```http
PATCH /api/auth/payment-methods/:id/default
Authorization: Bearer <token>
```

#### Delete Card
```http
DELETE /api/auth/payment-methods/:id
Authorization: Bearer <token>
```

### Products

#### List Products (with filters)
```http
GET /api/products?search=laptop&category=Electronics&minPrice=100&maxPrice=1000&rating=4&sort=newest&page=1&limit=20
```

Query Parameters:
- `search` — Search in name/description
- `category` — Filter by category
- `minPrice` — Minimum price
- `maxPrice` — Maximum price
- `rating` — Minimum rating (1-5)
- `sort` — `newest`, `price-asc`, `price-desc`, `rating`
- `page` — Page number (default: 1)
- `limit` — Items per page (default: 20)

#### Get Single Product
```http
GET /api/products/:id
```

#### Get All Categories
```http
GET /api/products/categories/all
```

### Cart (Protected)

#### Get Cart
```http
GET /api/cart
Authorization: Bearer <token>
```

#### Sync Cart
```http
PUT /api/cart
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "product_id",
      "quantity": 2,
      "variantId": "variant_id" (optional)
    }
  ]
}
```

#### Clear Cart
```http
DELETE /api/cart
Authorization: Bearer <token>
```

### Orders (Protected)

#### Create Order
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "product_id",
      "quantity": 2,
      "variantId": "variant_id" (optional),
      "selectedAttributes": { "size": "M", "color": "blue" } (optional)
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "paymentMethod": {
    "type": "credit-card" | "cash-on-delivery",
    "last4": "4242",
    "cardHolder": "John Doe"
  },
  "paymentIntentId": "pi_..." (for card payments),
  "deliverySelections": {
    "seller_id": "standard" | "express" | "pickup"
  },
  "couponCodes": {
    "seller_id": "PROMO10"
  }
}

Response:
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "order_id",
        "userId": "user_id",
        "items": [...],
        "total": 99.99,
        "status": "pending",
        "paymentIntentId": "pi_..."
      }
    ]
  }
}
```

#### Get Order History
```http
GET /api/orders
Authorization: Bearer <token>
```

#### Get Order Detail
```http
GET /api/orders/:id
Authorization: Bearer <token>
```

#### Update Order Status
```http
PUT /api/orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "pending" | "preparing" | "processing" | "shipped" | "delivered" | "cancelled",
  "cancelReason": "optional reason for cancellation"
}

Valid Transitions:
pending → preparing → processing → shipped → delivered
Any status can be cancelled (until delivered)
```

#### Confirm Order Received
```http
PUT /api/orders/:id/confirm-received
Authorization: Bearer <token>
```

### Payments (Protected)

#### Create Payment Intent
```http
POST /api/payments/create-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "amountInCents": 9999
}

Response:
{
  "success": true,
  "data": {
    "clientSecret": "pi_..._secret_...",
    "paymentIntentId": "pi_..."
  }
}
```

#### Confirm Payment
```http
POST /api/payments/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentIntentId": "pi_...",
  "clientSecret": "pi_..._secret_..."
}
```

### Reviews (Protected)

#### Submit Review
```http
POST /api/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_id",
  "productId": "product_id",
  "rating": 5,
  "comment": "Great product!"
}
```

#### Get Product Reviews
```http
GET /api/reviews/product/:productId
```

#### Check if User Reviewed Product
```http
GET /api/reviews/check/:productId
Authorization: Bearer <token>
```

### Seller Endpoints (Protected — seller role only)

#### Get Seller's Products
```http
GET /api/seller/products
Authorization: Bearer <token>
```

#### Create Product
```http
POST /api/seller/products
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
- name: "Product Name"
- description: "Description"
- price: 99.99
- category: "Electronics"
- brand: "Brand" (optional)
- condition: "new" | "used" (optional)
- sku: "SKU" (optional)
- stock: 50
- discount: 10 (optional, 0-100)
- tags: '["tag1", "tag2"]' (JSON string)
- shippingOptions: '["standard", "express"]' (JSON string array, required)
- shippingFee: "free" | "buyer_pays" (required)
- shippingFeeAmounts: '{"standard": 10, "express": 15}' (JSON string, if buyer_pays)
- images: <file1>, <file2>, ... (multipart files, at least 1 required)
```

#### Update Product
```http
PUT /api/seller/products/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data

(same fields as create, can omit unchanged fields)
```

#### Delete Product
```http
DELETE /api/seller/products/:id
Authorization: Bearer <token>
```

#### Get Seller's Orders
```http
GET /api/seller/orders
Authorization: Bearer <token>
```

#### Update Order Status (seller)
```http
PUT /api/seller/orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "preparing" | "processing" | "shipped" | "delivered" | "cancelled",
  "cancelReason": "optional"
}
```

## 📊 Database Models

### User
```typescript
{
  _id: ObjectId
  email: string (unique)
  password: string (hashed)
  firstName: string
  lastName: string
  avatar: string (URL, optional)
  phone: string (optional)
  isSeller: boolean
  savedAddresses: [{
    _id: ObjectId
    label: string
    street: string
    city: string
    state: string
    zipCode: string
    country: string
    isDefault: boolean
  }]
  savedCards: [{
    _id: ObjectId
    brand: string
    last4: string
    expiryMonth: number
    expiryYear: number
    cardHolder: string
    stripePaymentMethodId: string
    isDefault: boolean
  }]
  createdAt: Date
  updatedAt: Date
}
```

### Product
```typescript
{
  _id: ObjectId
  sellerId: ObjectId (reference to User)
  name: string
  description: string (max 200 chars)
  price: number
  discount: number (0-100, optional)
  category: string (enum)
  brand: string (optional)
  condition: "new" | "used" (optional)
  sku: string (optional)
  stock: number
  images: string[] (URLs)
  tags: string[] (optional)
  shippingOptions: ["standard", "express", "pickup"]
  shippingFee: "free" | "buyer_pays"
  shippingFeeAmounts: { standard: number, express: number, pickup: number }
  rating: number (0-5, calculated)
  reviewCount: number
  createdAt: Date
  updatedAt: Date
}
```

### Order
```typescript
{
  _id: ObjectId
  userId: ObjectId (reference to User)
  items: [{
    productId: ObjectId
    variantId: ObjectId (optional)
    productName: string
    variantSku: string (optional)
    selectedAttributes: { [key]: value } (optional)
    quantity: number
    price: number
    discount: number
  }]
  sellerId: ObjectId (for multi-seller orders)
  shippingAddress: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  paymentMethod: {
    type: "credit-card" | "cash-on-delivery"
    last4: string (optional)
    cardHolder: string (optional)
  }
  paymentIntentId: string (Stripe, for card payments)
  deliveryOption: "standard" | "express" | "pickup"
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  status: "pending" | "preparing" | "processing" | "shipped" | "delivered" | "cancelled"
  estimatedDelivery: Date
  cancelledAt: Date (optional)
  cancelReason: string (optional)
  createdAt: Date
  updatedAt: Date
}
```

### PaymentMethod
```typescript
{
  _id: ObjectId
  userId: ObjectId
  brand: string
  last4: string
  expiryMonth: number
  expiryYear: number
  cardHolder: string
  stripePaymentMethodId: string
  isDefault: boolean
  createdAt: Date
}
```

## 🔐 Security Features

- **Password Hashing**: bcryptjs with salt rounds (10)
- **JWT Authentication**: Secure token-based auth with expiration
- **Helmet**: Security headers (X-Frame-Options, X-Content-Type-Options, CSP, etc.)
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: Mongoose schema validation + express-validator
- **Error Handling**: Centralized error middleware (no sensitive data leak)
- **Auth Guard**: JWT verification on protected endpoints
- **Rate Limiting**: Optional rate limiting for abuse prevention
- **Stripe Verification**: Server-side PaymentIntent verification before order creation

## 🌍 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 5000 | No |
| `NODE_ENV` | Environment mode | development | No |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/tokomart | No |
| `JWT_SECRET` | Secret key for JWT signing | - | **Yes** |
| `JWT_EXPIRES_IN` | Token expiration time | 7d | No |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:5173 | No |
| `STRIPE_SECRET_KEY` | Stripe API secret key | - | **Yes** |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key | - | **Yes** |
| `MAX_FILE_SIZE` | Max upload file size in bytes | 5242880 (5MB) | No |

## 🧪 Testing the API

Use any of these tools to test endpoints:

- **Postman** — Desktop app for API testing
- **Insomnia** — REST/GraphQL client
- **Thunder Client** — VS Code extension
- **cURL** — Command line tool

Example with cURL:
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"b@test.com","password":"Test750!!"}'

# Get token from response, then use it
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <token_from_login>"
```

## 🚀 Production Deployment

1. **Environment**:
   ```env
   NODE_ENV=production
   JWT_SECRET=<use strong random key>
   MONGODB_URI=<production MongoDB Atlas URI>
   STRIPE_SECRET_KEY=<live stripe key>
   CORS_ORIGIN=<your production domain>
   ```

2. **Security**:
   - Enable HTTPS only
   - Use strong JWT secret (32+ characters)
   - Set restrictive CORS origins
   - Enable rate limiting on public endpoints
   - Use MongoDB Atlas with IP whitelist

3. **Monitoring**:
   - Set up error logging (e.g., Sentry)
   - Monitor API response times
   - Track payment failures
   - Set up alerts for auth failures

4. **Performance**:
   - Enable database indexing on frequently queried fields
   - Use CDN for image assets
   - Consider caching layer (Redis)
   - Monitor MongoDB connection pool

## 📝 Recent Fixes & Improvements

- ✅ **Nested API Response Handling** — Backend returns `{ success, data }` format, frontends properly extract nested data
- ✅ **Stripe Payment Verification** — Server-side verification before order creation
- ✅ **Payment Method Validation** — Ensures `stripePaymentMethodId` is valid (starts with `pm_`)
- ✅ **Mobile-Friendly Error Codes** — Structured error responses with retry hints
- ✅ **Cart Persistence** — Synced to MongoDB with debouncing and per-user isolation

## 📚 Documentation

- **Main README**: [`../README.md`](../README.md) — Full project overview
- **Implementation Summary**: [`../IMPLEMENTATION_SUMMARY.md`](../IMPLEMENTATION_SUMMARY.md) — Recent fixes
- **Feature Roadmap**: [`../FEATURE_ROADMAP.md`](../FEATURE_ROADMAP.md) — Planned features

## 📜 License

Open source — available for educational and demonstration purposes.
