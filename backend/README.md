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

- **Runtime**: Node.js v20.19+
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

- **Node.js** v20.19 or higher
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
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary (required for uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Upload sizes are configured in src/middleware/upload.ts (5 MiB product, 2 MiB avatar)
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

```text
backend/
├── src/
│   ├── config/            # Database, Cloudinary and Swagger configuration
│   ├── controllers/       # Endpoint handlers and controller tests
│   ├── middleware/        # Auth, seller guard, uploads and error handling
│   ├── models/            # User, Product, Order, Cart, Review and Coupon
│   ├── routes/            # Express route registrations
│   ├── services/          # Auth, users, orders, seller and Stripe/payment logic
│   ├── validators/        # Auth/order validation rules and middleware
│   ├── jobs/              # Automatic order completion
│   ├── utils/             # JWT, response utilities, validation helpers and seed
│   └── server.ts          # Middleware, route mounting and startup
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## API documentation

Start the backend with `npm run dev`, then open:

- [Swagger UI](http://localhost:5000/api-docs/) — browse schemas and run requests.
- [OpenAPI JSON](http://localhost:5000/api-docs.json) — import into Postman or use for client generation.
- [Health check](http://localhost:5000/health) — served at the server root.

Replace port 5000 if you configured `PORT`. UI and JSON documentation are available whenever `NODE_ENV` is not `production`, including when it is unset. Both return 404 in production. The production build alone does not set `NODE_ENV`; set it explicitly when deploying.

### Log in and authorize Swagger

1. Expand **Auth → POST /auth/signup** and create your own account, or use an existing account.
2. Expand **POST /auth/login**, click **Try it out**, enter the same email/password, and click **Execute**.
3. Copy the **top-level `token`** from the response.
4. Click **Authorize**, paste the token alone (without `Bearer `), and authorize. Swagger adds the Bearer prefix.
5. Try **GET /auth/me**. Use **Logout** in the authorization dialog when finished. Authorization is not persisted across reloads.

Signup request:

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "ExamplePassword123!"
}
```

Login request:

```json
{
  "email": "jane@example.com",
  "password": "ExamplePassword123!"
}
```

Login returns HTTP 200 with `success`, `token`, and `user` at the top level. To use a seller-only operation, update your profile with `{"role":"seller"}`; promotion is one-way.

PowerShell example using an account you created:

```powershell
$loginBody = @{
  email = 'jane@example.com'
  password = 'ExamplePassword123!'
} | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri 'http://localhost:5000/api/auth/login' -ContentType 'application/json' -Body $loginBody
$apiHeaders = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/me' -Headers $apiHeaders
```

### Cart and checkout

Resource IDs in examples are illustrative. Replace them with existing product/seller IDs from **GET /products**. Variant IDs must belong to the chosen product; reviews require an owned, delivered order.

**PUT /api/cart** replaces the entire cart:

```json
{
  "items": [
    { "productId": "507f1f77bcf86cd799439011", "quantity": 1, "isSelected": true }
  ]
}
```

**POST /api/orders** creates one order per seller. This example uses cash on delivery:

```json
{
  "items": [
    { "productId": "507f1f77bcf86cd799439011", "quantity": 1 }
  ],
  "shippingAddress": {
    "street": "1 Main St",
    "city": "Taipei",
    "state": "Taipei",
    "zipCode": "100",
    "country": "TW"
  },
  "paymentMethod": { "type": "cash-on-delivery" }
}
```

Optional `couponCodes`, `sellerMessages`, and `deliverySelections` are maps keyed by seller ID. Buyer **PUT /orders/{id}/status** only cancels an owned pending order; its body may contain `cancelReason`. Sellers use **PUT /seller/orders/{id}/status** for fulfillment transitions. Buyer receipt confirmation requires a shipped order.

### Response formats

Use the schema shown on each operation; there is no single response envelope.

| Operation | Success response fields |
|---|---|
| Signup/login | `success`, `token`, `user` |
| Current user/profile/avatar | `success`, `user` |
| Saved cards | `success`, `data.paymentMethods` |
| Saved addresses | `success`, `savedAddresses` |
| Product list | `success`, `products`, `count`, `total`, `page`, `pages` |
| Product detail/create/update | `success`, `product` |
| Checkout | `success`, `orders` |
| Buyer order list | `success`, `count`, `orders` |
| Order detail/status/receipt | `success`, `order` |
| Cart fetch/sync | `success`, `sellers` |
| Review create/update | `success`, `data` |
| Product reviews | `success`, `data`, `total`, `page`, `pages` |
| Coupons | `success`, `coupons` or `coupon`, depending on operation |
| Payment intent | `success`, `data.clientSecret`, `data.paymentIntentId` |
| Signed webhook | `received` |

Most errors use `success: false` and `message`; validation middleware also returns `errors`. Payment handlers can return `error.code`, `error.message`, and `error.retryable`. Authentication failures on payment routes still use `success/message`. Webhook signature failures return `{"error":"Invalid signature"}`.

### Payments and uploads

Create a payment intent with **POST /api/payments/create-intent** using `{"amountInCents":1500}`. A server cart must exist. Confirm the intent through the Stripe client SDK using `data.clientSecret`, then supply the succeeded `paymentIntentId` during card checkout. There is no backend payment-confirm endpoint. The existing saved/mock-card checkout path permits an omitted intent.

**POST /api/payments/save-card** attaches `stripePaymentMethodId` to the customer and returns HTTP 200. **POST /api/auth/payment-methods** saves profile card details and returns HTTP 201; its expiry month/year are strings. Never submit raw card numbers through these endpoints.

Use **POST /api/seller/products** for product creation with stored images. It accepts up to 10 optional image files at 5 MiB each, or JSON-encoded `imageUrls`. JSON-encode `shippingOptions`, `shippingFeeAmounts`, `variantAttributes`, and `variants` in multipart requests; repeat `tags` for multiple tags. Avatar uploads allow one file at 2 MiB. Supported storage formats are JPG/JPEG, PNG and WebP. The JSON **POST /api/products** route currently validates an image URL without persisting it.

Stripe webhooks require the original raw JSON bytes and the `stripe-signature` header. Configure `STRIPE_WEBHOOK_SECRET`; unsigned requests made from Swagger return 400. Use Stripe's webhook tooling to exercise signature verification.

### Maintain the specification

- [swagger.ts](src/config/swagger.ts): paths, explicit operation IDs, parameters and response bindings.
- [swaggerSchemas.ts](src/config/swaggerSchemas.ts): reusable wire/request schemas.
- [swaggerExamples.ts](src/config/swaggerExamples.ts): editable request examples.
- [swaggerUi.ts](src/config/swaggerUi.ts): environment gating and UI security/configuration.

Keep operation IDs stable when summaries or tags change. Update schemas and examples alongside controller/validator changes. Mongoose model definitions under `src/models/` describe persistence; the OpenAPI schemas describe serialized API payloads.

Run from `backend/`:

```bash
npm run test:contracts
npm test
npm run build
```

Contract tests validate OpenAPI references, registered API route coverage, authentication/rate-limit declarations, examples, and representative real controller/model payloads. HTTP tests check docs headers, UI assets, and production availability. Database and Stripe boundaries are mocked; these tests run through the existing CI backend test step.

## 🔐 Security Features

- **Password Hashing**: bcryptjs with salt rounds (10)
- **JWT Authentication**: Secure token-based auth with expiration
- **Helmet**: Security headers (X-Frame-Options, X-Content-Type-Options, CSP, etc.)
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: Mongoose schema validation + express-validator
- **Error Handling**: Endpoint-specific errors; development mode may include stack traces
- **Auth Guard**: JWT verification on protected endpoints
- **Rate Limiting**: Auth defaults to 10 requests/minute; other limited API groups default to 100/minute. Payment routes are not behind these limiters.
- **Stripe Verification**: A supplied card PaymentIntent is checked before order creation; saved/mock-card checkout permits omission.

## 🌍 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 5000 | No |
| `NODE_ENV` | Mode; production disables docs | Unset; example file sets development | No |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/shopping-app | No |
| `JWT_SECRET` | Secret key for JWT signing | - | **Yes** |
| `JWT_EXPIRES_IN` | Token expiration time | 7d | No |
| `CORS_ORIGIN` | Allowed origin outside development | No runtime default; example file sets http://localhost:5173 | Outside development |
| `STRIPE_SECRET_KEY` | Stripe API secret key | - | For Stripe operations |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | - | For uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key | - | For uploads |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | - | For uploads |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | - | For webhooks |
| `RATE_LIMIT_AUTH_MAX` | Auth requests per minute; 0 disables | 10 | No |
| `RATE_LIMIT_API_MAX` | Other limited API requests per minute; 0 disables | 100 | No |

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

- ✅ **API Response Contracts** — OpenAPI documents each endpoint’s actual response envelope
- ✅ **Stripe Payment Verification** — Supplied card PaymentIntents are checked before order creation
- ✅ **Payment Method Attachment** — Stripe validates IDs when payment methods are attached
- ✅ **Mobile-Friendly Error Codes** — Structured error responses with retry hints
- ✅ **Cart Persistence** — Synced to MongoDB with debouncing and per-user isolation

## 📚 Documentation

- **Main README**: [`../README.md`](../README.md) — Full project overview
- **Implementation Summary**: [`../IMPLEMENTATION_SUMMARY.md`](../IMPLEMENTATION_SUMMARY.md) — Recent fixes
- **Feature Roadmap**: [`../FEATURE_ROADMAP.md`](../FEATURE_ROADMAP.md) — Planned features

## 📜 License

Open source — available for educational and demonstration purposes.
