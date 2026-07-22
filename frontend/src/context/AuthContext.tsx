import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, LoginCredentials, SignupData, AuthState, SavedAddress } from '../types/user';
import authService from '../services/authService';
import { STORAGE_KEYS } from '../utils/constants';
import storageService from '../services/storageService';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  addAddress: (addr: Omit<SavedAddress, '_id' | 'isDefault'> & { setAsDefault?: boolean }) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setAuthState({
            user,
            token: 'mock-token', // Token is stored in localStorage
            isAuthenticated: true,
            isLoading: false
          });
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkAuth();
  }, []);

  const clearCartStorage = useCallback(() => {
    storageService.remove(STORAGE_KEYS.CART_DATA);
    window.dispatchEvent(new Event('cart:clear'));
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const { user, token } = await authService.login(credentials);
      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false
      });
      // Token is now in localStorage — tell CartContext to load this user's cart
      window.dispatchEvent(new Event('cart:load'));
    } catch (error) {
      throw error;
    }
  };

  const signup = async (data: SignupData) => {
    try {
      const { user, token } = await authService.signup(data);
      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false
      });
      window.dispatchEvent(new Event('cart:load'));
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    clearCartStorage();
    authService.logout();
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false
    });
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!authState.user) {
      throw new Error('No user logged in');
    }

    try {
      const updatedUser = await authService.updateProfile(authState.user.id, updates);
      setAuthState(prev => ({
        ...prev,
        user: updatedUser
      }));
    } catch (error) {
      throw error;
    }
  };

  const uploadAvatar = async (file: File) => {
    const updatedUser = await authService.uploadAvatar(file);
    setAuthState(prev => ({ ...prev, user: updatedUser }));
  };

  const addAddress = async (addr: Omit<SavedAddress, '_id' | 'isDefault'> & { setAsDefault?: boolean }) => {
    if (!authState.user) throw new Error('No user logged in');
    const res = await fetch(API_ENDPOINTS.SAVED_ADDRESSES, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(addr),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    setAuthState(prev => ({ ...prev, user: prev.user ? { ...prev.user, savedAddresses: data.savedAddresses } : prev.user }));
  };

  const deleteAddress = async (id: string) => {
    if (!authState.user) throw new Error('No user logged in');
    const res = await fetch(API_ENDPOINTS.SAVED_ADDRESS(id), { method: 'DELETE', headers: getAuthHeaders() });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    setAuthState(prev => ({ ...prev, user: prev.user ? { ...prev.user, savedAddresses: data.savedAddresses } : prev.user }));
  };

  const setDefaultAddress = async (id: string) => {
    if (!authState.user) throw new Error('No user logged in');
    const res = await fetch(API_ENDPOINTS.SAVED_ADDRESS_DEFAULT(id), { method: 'PUT', headers: getAuthHeaders() });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    setAuthState(prev => ({ ...prev, user: prev.user ? { ...prev.user, savedAddresses: data.savedAddresses } : prev.user }));
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, signup, logout, updateProfile, uploadAvatar, addAddress, deleteAddress, setDefaultAddress }}>
      {children}
    </AuthContext.Provider>
  );
};
