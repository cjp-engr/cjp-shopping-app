export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface SavedCard {
  _id: string;
  type: 'credit-card' | 'debit-card' | 'paypal';
  last4: string;
  cardHolder: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
}

export interface SavedAddress {
  _id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'buyer' | 'seller';
  avatar?: string;
  phone?: string;
  address?: Address;
  savedCards?: SavedCard[];
  savedAddresses?: SavedAddress[];
  createdAt: string;
}

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: 'buyer' | 'seller';
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData extends LoginCredentials {
  firstName: string;
  lastName: string;
  confirmPassword: string;
}
