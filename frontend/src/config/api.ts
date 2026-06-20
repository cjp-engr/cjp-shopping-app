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
