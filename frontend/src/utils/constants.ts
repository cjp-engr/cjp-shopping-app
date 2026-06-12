export const STORAGE_KEYS = {
  AUTH_TOKEN: 'shopping_app_auth_token',
  USER_DATA: 'shopping_app_user_data',
  CART_DATA: 'shopping_app_cart_data',
  ORDERS_PREFIX: 'shopping_app_orders_'
} as const;

export const TAX_RATE = 0.08; // 8%
export const SHIPPING_COST = 9.99;
export const FREE_SHIPPING_THRESHOLD = 50;

export const TOKEN_EXPIRY_HOURS = 24;

export const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under $25', min: 0, max: 25 },
  { label: '$25 - $50', min: 25, max: 50 },
  { label: '$50 - $100', min: 50, max: 100 },
  { label: '$100 - $200', min: 100, max: 200 },
  { label: 'Over $200', min: 200, max: Infinity }
];

export const RATING_OPTIONS = [
  { label: 'All Ratings', value: 0 },
  { label: '4+ Stars', value: 4 },
  { label: '3+ Stars', value: 3 },
  { label: '2+ Stars', value: 2 }
];
