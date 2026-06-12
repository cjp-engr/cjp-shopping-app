# Backend Integration Guide

This guide explains how to integrate the backend API with the frontend React application.

## Quick Start

### 1. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# On macOS (with Homebrew)
brew services start mongodb-community

# On Windows (if installed as a service)
net start MongoDB

# On Linux
sudo systemctl start mongod

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Seed the Database

```bash
cd backend
npm run seed
```

This will create:
- 40 products across 5 categories
- 1 test user (test@example.com / password123)

### 3. Start the Backend Server

```bash
cd backend
npm run dev
```

The API will be available at `http://localhost:5000`

### 4. Start the Frontend

```bash
# In the root directory
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Connecting Frontend to Backend

The current frontend uses mock data and localStorage. To connect it to the real backend API, you'll need to update the service files.

### Update API Configuration

Create a new file `src/config/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/auth/login`,
  SIGNUP: `${API_BASE_URL}/auth/signup`,
  GET_ME: `${API_BASE_URL}/auth/me`,
  UPDATE_PROFILE: `${API_BASE_URL}/auth/profile`,

  // Products
  PRODUCTS: `${API_BASE_URL}/products`,
  PRODUCT: (id: string) => `${API_BASE_URL}/products/${id}`,
  CATEGORIES: `${API_BASE_URL}/products/categories/all`,

  // Orders
  ORDERS: `${API_BASE_URL}/orders`,
  ORDER: (id: string) => `${API_BASE_URL}/orders/${id}`,
  ORDER_STATUS: (id: string) => `${API_BASE_URL}/orders/${id}/status`,
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('shopping_app_auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};
```

Add to `.env` in the root directory:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Update authService.ts

Replace the mock authentication with real API calls:

```typescript
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await fetch(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();

    // Store token and user data
    localStorage.setItem('shopping_app_auth_token', data.token);
    localStorage.setItem('shopping_app_user_data', JSON.stringify(data.user));

    return {
      user: data.user,
      token: data.token
    };
  },

  async signup(signupData: SignupData) {
    const response = await fetch(API_ENDPOINTS.SIGNUP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    const data = await response.json();

    localStorage.setItem('shopping_app_auth_token', data.token);
    localStorage.setItem('shopping_app_user_data', JSON.stringify(data.user));

    return {
      user: data.user,
      token: data.token
    };
  },

  async getCurrentUser() {
    const response = await fetch(API_ENDPOINTS.GET_ME, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to get user');
    }

    const data = await response.json();
    return data.user;
  },

  async updateProfile(profileData: Partial<User>) {
    const response = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Update failed');
    }

    const data = await response.json();
    localStorage.setItem('shopping_app_user_data', JSON.stringify(data.user));
    return data.user;
  },

  logout() {
    localStorage.removeItem('shopping_app_auth_token');
    localStorage.removeItem('shopping_app_user_data');
  }
};
```

### Update productService.ts

```typescript
import { API_ENDPOINTS } from '../config/api';

export const productService = {
  async getProducts(filters?: ProductFilters, sort?: SortOption) {
    const params = new URLSearchParams();

    if (filters?.category) params.append('category', filters.category);
    if (filters?.priceRange) {
      params.append('minPrice', filters.priceRange.min.toString());
      params.append('maxPrice', filters.priceRange.max.toString());
    }
    if (filters?.rating) params.append('rating', filters.rating.toString());
    if (filters?.searchQuery) params.append('search', filters.searchQuery);
    if (sort) params.append('sort', sort);

    const response = await fetch(`${API_ENDPOINTS.PRODUCTS}?${params}`);

    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }

    const data = await response.json();
    return data.products;
  },

  async getProduct(id: string) {
    const response = await fetch(API_ENDPOINTS.PRODUCT(id));

    if (!response.ok) {
      throw new Error('Product not found');
    }

    const data = await response.json();
    return data.product;
  },

  async getCategories() {
    const response = await fetch(API_ENDPOINTS.CATEGORIES);

    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    const data = await response.json();
    return data.categories;
  }
};
```

### Update orderService.ts

```typescript
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

export const orderService = {
  async createOrder(checkoutData: CheckoutData, cartItems: CartItem[]) {
    const items = cartItems.map(item => ({
      productId: item.product.id,
      quantity: item.quantity
    }));

    const response = await fetch(API_ENDPOINTS.ORDERS, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        items,
        shippingAddress: checkoutData.shippingAddress,
        paymentMethod: checkoutData.paymentMethod
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create order');
    }

    const data = await response.json();
    return data.order;
  },

  async getOrders() {
    const response = await fetch(API_ENDPOINTS.ORDERS, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }

    const data = await response.json();
    return data.orders;
  },

  async getOrder(id: string) {
    const response = await fetch(API_ENDPOINTS.ORDER(id), {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Order not found');
    }

    const data = await response.json();
    return data.order;
  },

  async cancelOrder(id: string) {
    const response = await fetch(API_ENDPOINTS.ORDER_STATUS(id), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'cancelled' })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel order');
    }

    const data = await response.json();
    return data.order;
  }
};
```

## API Response Differences

### Frontend Mock Data vs Backend API

The backend returns data in a slightly different format. Here are the key differences:

1. **ID Field**: Backend uses `_id` instead of `id`
2. **Dates**: Backend returns ISO date strings
3. **Response Wrapper**: Backend wraps responses in `{ success: true, data: ... }`

You may need to create adapter functions:

```typescript
// src/utils/apiAdapters.ts

export const adaptProduct = (product: any): Product => ({
  id: product._id,
  name: product.name,
  description: product.description,
  price: product.price,
  category: product.category,
  image: product.image,
  images: product.images,
  stock: product.stock,
  rating: product.rating,
  reviews: product.reviews,
  tags: product.tags,
  specifications: product.specifications ? Object.fromEntries(product.specifications) : undefined,
  createdAt: product.createdAt
});

export const adaptUser = (user: any): User => ({
  id: user._id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  avatar: user.avatar,
  phone: user.phone,
  address: user.address,
  createdAt: user.createdAt
});

export const adaptOrder = (order: any): Order => ({
  id: order._id,
  userId: order.userId,
  items: order.items.map((item: any) => ({
    product: adaptProduct(item.product),
    quantity: item.quantity
  })),
  shippingAddress: order.shippingAddress,
  paymentMethod: order.paymentMethod,
  subtotal: order.subtotal,
  tax: order.tax,
  shipping: order.shipping,
  total: order.total,
  status: order.status,
  createdAt: order.createdAt,
  estimatedDelivery: order.estimatedDelivery
});
```

## Testing the Integration

1. **Test Authentication**:
   - Sign up a new user
   - Log in with test@example.com / password123
   - Update user profile

2. **Test Products**:
   - Browse products
   - Filter by category
   - Search for products
   - View product details

3. **Test Orders**:
   - Add items to cart
   - Complete checkout
   - View order history
   - Cancel an order

## Troubleshooting

### CORS Issues
If you encounter CORS errors:
1. Check that `CORS_ORIGIN` in backend `.env` matches your frontend URL
2. Ensure the backend is running
3. Clear browser cache

### Authentication Errors
- Make sure the token is being stored correctly in localStorage
- Check that the Authorization header is being sent with requests
- Verify the JWT_SECRET is set in backend `.env`

### Database Connection Issues
- Ensure MongoDB is running
- Check the MONGODB_URI in backend `.env`
- Run `npm run seed` to populate the database

## Development Workflow

1. Start MongoDB
2. Start backend (`cd backend && npm run dev`)
3. Start frontend (`npm run dev`)
4. Make changes to either frontend or backend
5. Test the integration

## Production Considerations

1. **Environment Variables**: Use production values for all environment variables
2. **HTTPS**: Use HTTPS for both frontend and backend
3. **API URL**: Update VITE_API_BASE_URL to your production API URL
4. **Database**: Use MongoDB Atlas or a production database
5. **Security**: Enable rate limiting, input validation, and other security measures
6. **Error Handling**: Add proper error handling and user feedback
7. **Loading States**: Add loading indicators for API calls

## Next Steps

1. Update the frontend services to use the real API
2. Add loading states and error handling
3. Implement optimistic updates for better UX
4. Add request/response interceptors for common functionality
5. Consider using a library like React Query or SWR for data fetching
6. Add proper TypeScript types for API responses
