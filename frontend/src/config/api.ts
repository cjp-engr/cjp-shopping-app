const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/auth/login`,
  SIGNUP: `${API_BASE_URL}/auth/signup`,
  GET_ME: `${API_BASE_URL}/auth/me`,
  UPDATE_PROFILE: `${API_BASE_URL}/auth/profile`,
  UPLOAD_AVATAR: `${API_BASE_URL}/auth/avatar`,

  // Products
  PRODUCTS: `${API_BASE_URL}/products`,
  PRODUCT: (id: string) => `${API_BASE_URL}/products/${id}`,
  CATEGORIES: `${API_BASE_URL}/products/categories/all`,

  // Orders
  ORDERS: `${API_BASE_URL}/orders`,
  ORDER: (id: string) => `${API_BASE_URL}/orders/${id}`,
  ORDER_STATUS: (id: string) => `${API_BASE_URL}/orders/${id}/status`,
  ORDER_CONFIRM_RECEIVED: (id: string) => `${API_BASE_URL}/orders/${id}/confirm-received`,

  // Payment methods
  PAYMENT_METHODS: `${API_BASE_URL}/auth/payment-methods`,
  PAYMENT_METHOD: (id: string) => `${API_BASE_URL}/auth/payment-methods/${id}`,

  // Saved addresses
  SAVED_ADDRESSES: `${API_BASE_URL}/auth/saved-addresses`,
  SAVED_ADDRESS: (id: string) => `${API_BASE_URL}/auth/saved-addresses/${id}`,
  SAVED_ADDRESS_DEFAULT: (id: string) => `${API_BASE_URL}/auth/saved-addresses/${id}/default`,

  // Reviews
  REVIEWS: `${API_BASE_URL}/reviews`,
  REVIEW: (id: string) => `${API_BASE_URL}/reviews/${id}`,
  PRODUCT_REVIEWS: (productId: string) => `${API_BASE_URL}/reviews/product/${productId}`,
  CHECK_REVIEW: (productId: string) => `${API_BASE_URL}/reviews/check/${productId}`,

  // Cart
  CART: `${API_BASE_URL}/cart`,

  // Users / Follow
  USERS: `${API_BASE_URL}/users`,
  USER_PROFILE: (id: string) => `${API_BASE_URL}/users/${id}`,
  USER_FOLLOW: (id: string) => `${API_BASE_URL}/users/${id}/follow`,
  USER_FOLLOWERS: (id: string) => `${API_BASE_URL}/users/${id}/followers`,
  USER_FOLLOWING: (id: string) => `${API_BASE_URL}/users/${id}/following`,

  // Seller
  SELLER_PRODUCTS: `${API_BASE_URL}/seller/products`,
  SELLER_PRODUCT: (id: string) => `${API_BASE_URL}/seller/products/${id}`,
  SELLER_ORDERS: `${API_BASE_URL}/seller/orders`,
  SELLER_ORDER_STATUS: (id: string) => `${API_BASE_URL}/seller/orders/${id}/status`,
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('shopping_app_auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

export const getHeaders = () => ({
  'Content-Type': 'application/json',
});
