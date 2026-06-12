# ShopHub - React Shopping App

A full-featured e-commerce shopping application built with React, TypeScript, and Tailwind CSS.

## Features

### Core Functionality
- **Product Browsing**: Browse 40+ products across 5 categories (Electronics, Clothing, Home & Garden, Books, Sports & Outdoors)
- **Search & Filters**: Real-time product search with category, price range, and rating filters
- **Shopping Cart**: Add/remove items, update quantities, persistent cart storage
- **User Authentication**: Login/signup with mock JWT authentication
- **Checkout Process**: Multi-step checkout flow with shipping and payment information
- **Order History**: View past orders with detailed information
- **User Profile**: Edit personal information and view order statistics

### Technical Features
- **TypeScript**: Fully typed codebase for type safety
- **React Context API**: Global state management for auth and cart
- **React Router v6**: Client-side routing with protected routes
- **Tailwind CSS**: Modern, responsive UI design
- **LocalStorage Persistence**: Cart and user session persistence
- **Mock Backend**: Simulated API calls with realistic delays
- **Responsive Design**: Mobile-first approach, works on all screen sizes

## Tech Stack

- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Icons**: Lucide React
- **State Management**: React Context API
- **Data Storage**: Browser LocalStorage

## Project Structure

```
shopping-app-automation/
├── src/
│   ├── components/
│   │   ├── common/          # Reusable UI components
│   │   ├── layout/          # Layout components (Navbar, Layout)
│   │   ├── auth/            # Authentication components
│   ├── pages/               # Page components
│   ├── context/             # React Context providers
│   ├── hooks/               # Custom React hooks
│   ├── services/            # Business logic and API simulation
│   ├── types/               # TypeScript type definitions
│   ├── data/                # Mock data (products, users)
│   ├── utils/               # Utility functions
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # App entry point
│   └── index.css           # Global styles
├── public/                  # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd shopping-app-automation
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:5173
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Usage

### Test Credentials

**Pre-configured Test Account:**
- Email: `test@example.com`
- Password: `password123`

**Or create a new account:**
- Click "Sign Up" and register with any email
- All new accounts use the password `password123` for demo purposes

### User Flows

#### 1. Browse and Shop
1. Visit the homepage to see featured products
2. Navigate to "Products" to browse all items
3. Use filters to narrow down products by category, price, or rating
4. Click on a product to view detailed information
5. Add items to your cart with the "Add to Cart" button

#### 2. Shopping Cart
1. Click the cart icon in the navbar to view your cart
2. Adjust quantities or remove items as needed
3. See real-time price calculations including tax and shipping
4. Orders over $50 qualify for free shipping

#### 3. Checkout
1. Click "Proceed to Checkout" (requires login)
2. Fill in shipping information
3. Enter payment details (mock payment, any valid card format)
4. Review your order
5. Place order and view confirmation

#### 4. Order Management
1. View order history from your profile dropdown
2. See order status, items, and tracking information
3. Cancel pending orders if needed

## Features Deep Dive

### Product Management
- **40 Products** across 5 categories
- High-quality product images from Unsplash
- Ratings and reviews
- Stock availability tracking
- Related products suggestions

### Shopping Cart
- Persistent cart (survives page refresh)
- Real-time total calculations
- Stock validation
- Tax calculation (8%)
- Shipping cost ($9.99, free over $50)

### Authentication
- Mock JWT token generation
- Secure password validation
- Auto-login from saved session
- Protected routes for checkout and profile
- Profile editing capabilities

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Touch-friendly buttons and controls
- Optimized for all screen sizes

## Data Storage

All data is stored in browser LocalStorage:

- `shopping_app_auth_token` - Authentication token
- `shopping_app_user_data` - User profile information
- `shopping_app_cart_data` - Shopping cart items
- `shopping_app_orders_{userId}` - User order history

## Code Highlights

### Type Safety
Every component, service, and utility function is fully typed with TypeScript interfaces.

### Reusable Components
- **Button**: Multiple variants (primary, secondary, outline, danger)
- **Input**: Form inputs with validation and error states
- **Card**: Flexible container with hover effects
- **Badge**: Status indicators and labels
- **Spinner**: Loading indicators

### Custom Hooks
- `useAuth` - Authentication state and methods
- `useCart` - Shopping cart management
- `useProducts` - Product filtering and sorting
- `useDebounce` - Debounced values for search
- `useLocalStorage` - LocalStorage synchronization

### Services
- **authService**: User authentication and session management
- **productService**: Product data and filtering
- **orderService**: Order creation and history
- **storageService**: LocalStorage abstraction

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Lazy route loading
- Optimized re-renders with React hooks
- Debounced search input
- Efficient filtering and sorting algorithms

## Security Notes

This is a **demo application** with mock authentication:
- Passwords are not actually encrypted
- JWT tokens are base64-encoded (not secure)
- All data is stored client-side
- **Do not use in production without proper backend**

## Future Enhancements

Potential features for future development:
- Product reviews and ratings system
- Wishlist functionality
- Product comparison
- Dark mode theme
- Social sharing
- Discount codes and coupons
- Multiple payment methods
- Order tracking timeline
- Email notifications
- Advanced search with autocomplete

## Troubleshooting

### Port Already in Use
If port 5173 is already in use:
```bash
npm run dev -- --port 3000
```

### Build Errors
Clear node_modules and reinstall:
```bash
rm -rf node_modules
npm install
```

### LocalStorage Issues
Clear browser LocalStorage if experiencing issues:
- Open DevTools (F12)
- Go to Application > LocalStorage
- Delete all `shopping_app_*` keys

## Contributing

This is a demonstration project. Feel free to fork and customize for your own needs.

## License

This project is open source and available for educational purposes.

## Acknowledgments

- Product images from [Unsplash](https://unsplash.com)
- Icons from [Lucide](https://lucide.dev)
- UI components styled with [Tailwind CSS](https://tailwindcss.com)
- Built with [Vite](https://vitejs.dev) and [React](https://react.dev)

---

**Built with React + TypeScript + Tailwind CSS**

For questions or issues, please check the code comments or create an issue in the repository.
