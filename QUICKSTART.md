# TokoMart Full-Stack Quick Start Guide

The frontend is now connected to the backend API. Follow these steps to run the full application.

## Prerequisites

- Node.js (v16+)
- MongoDB running locally or Docker

## Step 1: Start MongoDB

Choose one option:

### Option A: Local MongoDB
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Windows (if installed as service)
net start MongoDB

# Linux
sudo systemctl start mongod
```

### Option B: Docker
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Step 2: Set Up Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already done)
npm install

# Seed the database with products and test user
npm run seed

# Start the backend server
npm run dev
```

The backend will start at **http://localhost:5000**

You should see:
```
🚀 Server running in development mode on port 5000
📍 API: http://localhost:5000
❤️  Health Check: http://localhost:5000/health

MongoDB Connected: localhost
```

## Step 3: Start Frontend

In a **new terminal** window:

```bash
# From the root directory
npm run dev
```

The frontend will start at **http://localhost:5173**

## Step 4: Test the Application

1. **Open your browser** to http://localhost:5173

2. **Sign up or login:**
   - Email: `test@example.com`
   - Password: `password123`

3. **Browse products** - You should see real products from the database

4. **Add to cart and checkout** - Orders are saved to MongoDB

## What Was Fixed

### Files Created
1. **`src/config/api.ts`** - API endpoint configuration
2. **`src/services/authService.ts`** - Authentication service with backend integration
3. **`src/services/productService.ts`** - Product service with backend integration
4. **`src/services/orderService.ts`** - Order service with backend integration
5. **`.env`** - Environment variables for API URL

### Files Updated
1. **`src/pages/Home.tsx`** - Updated to use async product fetching
2. **`src/pages/ProductDetails.tsx`** - Updated to use async related products
3. **`src/pages/Profile.tsx`** - Updated to use async order summary

### Files Removed (Mock Data)
- `src/data/mockProducts.ts`
- `src/data/mockUsers.ts`
- Old mock-based service files

## API Endpoints Available

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)
- `PUT /api/auth/profile` - Update profile (requires auth)

### Products
- `GET /api/products` - Get all products (supports filters)
- `GET /api/products/:id` - Get single product
- `GET /api/products/categories/all` - Get categories

### Orders (Requires Authentication)
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get single order
- `PUT /api/orders/:id/status` - Update order status

## Environment Variables

### Frontend (`.env` in root)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/shopping-app
JWT_SECRET=TokoMart-secret-key-2024-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

## Troubleshooting

### Frontend can't connect to backend
- Check that backend is running on port 5000
- Check browser console for CORS errors
- Verify `.env` file exists in root directory

### Backend can't connect to database
- Ensure MongoDB is running
- Check MongoDB connection string in `backend/.env`
- Try `mongosh` to verify MongoDB is accessible

### "No products found"
- Run `cd backend && npm run seed` to populate database
- Check backend console for errors

### Authentication errors
- Clear browser localStorage
- Check JWT_SECRET is set in `backend/.env`
- Verify token is being sent in Authorization header

## Development Tips

### Viewing API Responses
- Open Browser DevTools > Network tab
- Filter by "Fetch/XHR"
- Click on requests to see headers and responses

### Backend Logs
- All API requests are logged in the backend terminal
- MongoDB queries are logged in development mode

### Re-seeding Database
```bash
cd backend
npm run seed
```
This will clear existing data and create fresh products and test user.

## Production Deployment

For production:
1. Update `VITE_API_BASE_URL` to your production API URL
2. Use MongoDB Atlas or production database
3. Set strong `JWT_SECRET`
4. Enable HTTPS
5. Build frontend: `npm run build`
6. Build backend: `cd backend && npm run build`

## Need Help?

- Backend API docs: `backend/README.md`
- Integration guide: `BACKEND_INTEGRATION.md`
- Main README: `README.md`
