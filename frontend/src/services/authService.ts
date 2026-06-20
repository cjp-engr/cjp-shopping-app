import type { User, LoginCredentials, SignupData } from '../types/user';
import { API_ENDPOINTS, getAuthHeaders, getHeaders } from '../config/api';

const getAuthToken = () => localStorage.getItem('shopping_app_auth_token');

interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: getHeaders(),
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
  }

  async signup(signupData: SignupData): Promise<AuthResponse> {
    const response = await fetch(API_ENDPOINTS.SIGNUP, {
      method: 'POST',
      headers: getHeaders(),
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
  }

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('shopping_app_auth_token');

    if (!token) {
      return null;
    }

    try {
      const response = await fetch(API_ENDPOINTS.GET_ME, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        this.logout();
        return null;
      }

      const data = await response.json();
      localStorage.setItem('shopping_app_user_data', JSON.stringify(data.user));
      return data.user;
    } catch (error) {
      this.logout();
      return null;
    }
  }

  async updateProfile(_userId: string, updates: Partial<User>): Promise<User> {
    const response = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Update failed');
    }

    const data = await response.json();
    localStorage.setItem('shopping_app_user_data', JSON.stringify(data.user));
    return data.user;
  }

  async uploadAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = getAuthToken();
    const response = await fetch(API_ENDPOINTS.UPLOAD_AVATAR, {
      method: 'POST',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Avatar upload failed');
    }

    const data = await response.json();
    localStorage.setItem('shopping_app_user_data', JSON.stringify(data.user));
    return data.user;
  }

  logout(): void {
    localStorage.removeItem('shopping_app_auth_token');
    localStorage.removeItem('shopping_app_user_data');
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('shopping_app_auth_token');
    return token !== null;
  }
}

export default new AuthService();
