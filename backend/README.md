# TokoMart Backend API

Backend REST API for the TokoMart e-commerce application built with Node.js, Express, TypeScript, and MongoDB.

## Features

- **Authentication**: JWT-based user authentication with secure password hashing
- **Product Management**: CRUD operations for products with advanced filtering and search
- **Order Management**: Create orders, view order history, update order status
- **TypeScript**: Fully typed codebase for type safety
- **MongoDB**: NoSQL database with Mongoose ODM
- **Security**: Helmet, CORS, input validation
- **Error Handling**: Centralized error handling middleware

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: Helmet, CORS

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/shopping-app
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Seed Database
To populate the database with initial products and test user:
```bash
npm run seed
```

This will create:
- 40 products across 5 categories
- 1 test user (test@example.com / password123)

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
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
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

### Products

#### Get All Products
```http
GET /api/products?category=Electronics&minPrice=100&maxPrice=1000&rating=4&search=laptop&sort=price-asc&page=1&limit=20
```

Query Parameters:
- `category`: Filter by category
- `minPrice`: Minimum price
- `maxPrice`: Maximum price
- `rating`: Minimum rating
- `search`: Search in name and description
- `sort`: Sort option (price-asc, price-desc, rating, newest, name)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

#### Get Single Product
```http
GET /api/products/:id
```

#### Create Product
```http
POST /api/products
Content-Type: application/json

{
  "name": "Product Name",
  "description": "Product description",
  "price": 99.99,
  "category": "Electronics",
  "image": "https://example.com/image.jpg",
  "stock": 50,
  "rating": 4.5,
  "reviews": 100,
  "tags": ["tag1", "tag2"]
}
```

#### Update Product
```http
PUT /api/products/:id
Content-Type: application/json

{
  "price": 89.99,
  "stock": 45
}
```

#### Delete Product
```http
DELETE /api/products/:id
```

#### Get Categories
```http
GET /api/products/categories/all
```

### Orders

All order endpoints require authentication.

#### Create Order
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "product_id_here",
      "quantity": 2
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
    "type": "credit-card",
    "last4": "4242",
    "cardHolder": "John Doe"
  }
}
```

#### Get User Orders
```http
GET /api/orders
Authorization: Bearer <token>
```

#### Get Single Order
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
  "status": "cancelled"
}
```

Valid statuses: `pending`, `processing`, `shipped`, `delivered`, `cancelled`

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   └── database.ts   # Database connection
│   ├── controllers/      # Route controllers
│   │   ├── authController.ts
│   │   ├── orderController.ts
│   │   └── productController.ts
│   ├── middleware/       # Express middleware
│   │   ├── auth.ts       # JWT authentication
│   │   └── errorHandler.ts
│   ├── models/           # Mongoose models
│   │   ├── Order.ts
│   │   ├── Product.ts
│   │   └── User.ts
│   ├── routes/           # API routes
│   │   ├── authRoutes.ts
│   │   ├── orderRoutes.ts
│   │   └── productRoutes.ts
│   ├── utils/            # Utility functions
│   │   ├── jwt.ts
│   │   └── seed.ts
│   └── server.ts         # Express app setup
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Database Models

### User
- email (unique)
- password (hashed)
- firstName
- lastName
- avatar (optional)
- phone (optional)
- address (optional)

### Product
- name
- description
- price
- category
- image
- images (array)
- stock
- rating
- reviews
- tags (array)
- specifications (map)

### Order
- userId (reference to User)
- items (array of cart items)
- shippingAddress
- paymentMethod
- subtotal
- tax
- shipping
- total
- status
- estimatedDelivery

## Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing configuration
- **Input Validation**: Mongoose schema validation
- **Error Handling**: Centralized error handling

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment mode | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/shopping-app |
| JWT_SECRET | Secret key for JWT | - |
| JWT_EXPIRES_IN | JWT expiration time | 7d |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:5173 |

## Testing

Test the API using tools like:
- Postman
- Insomnia
- cURL
- Thunder Client (VS Code extension)

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Use a strong `JWT_SECRET`
3. Use MongoDB Atlas or a production MongoDB instance
4. Enable HTTPS
5. Set appropriate CORS origins
6. Consider adding rate limiting
7. Add input validation middleware
8. Implement admin authentication for product/order management endpoints

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error message here"
}
```

Success responses:

```json
{
  "success": true,
  "data": {}
}
```

## License

This project is open source and available for educational purposes.
