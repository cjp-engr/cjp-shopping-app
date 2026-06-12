import type { User, LoginCredentials, SignupData } from '../types/user';
import { mockUsers, findUserByEmail, MOCK_PASSWORD } from '../data/mockUsers';
import { STORAGE_KEYS, TOKEN_EXPIRY_HOURS } from '../utils/constants';
import storageService from './storageService';
import { generateId } from '../utils/helpers';

interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  private users: User[] = [...mockUsers];

  // Generate mock JWT token (base64 encoded)
  private generateToken(user: User): string {
    const tokenData = {
      userId: user.id,
      email: user.email,
      exp: Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    };
    return btoa(JSON.stringify(tokenData));
  }

  // Decode and validate token
  validateToken(token: string): boolean {
    try {
      const decoded = JSON.parse(atob(token));
      return decoded.exp > Date.now();
    } catch {
      return false;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const user = findUserByEmail(credentials.email);

    if (!user || credentials.password !== MOCK_PASSWORD) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user);

    // Store auth data
    storageService.set(STORAGE_KEYS.AUTH_TOKEN, token);
    storageService.set(STORAGE_KEYS.USER_DATA, user);

    return { user, token };
  }

  async signup(data: SignupData): Promise<AuthResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));

    // Check if user already exists
    const existingUser = findUserByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate password match
    if (data.password !== data.confirmPassword) {
      throw new Error('Passwords do not match');
    }

    // Create new user
    const newUser: User = {
      id: generateId('user'),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      createdAt: new Date().toISOString().split('T')[0]
    };

    // Add to mock database
    this.users.push(newUser);

    const token = this.generateToken(newUser);

    // Store auth data
    storageService.set(STORAGE_KEYS.AUTH_TOKEN, token);
    storageService.set(STORAGE_KEYS.USER_DATA, newUser);

    return { user: newUser, token };
  }

  logout(): void {
    storageService.remove(STORAGE_KEYS.AUTH_TOKEN);
    storageService.remove(STORAGE_KEYS.USER_DATA);
  }

  async getCurrentUser(): Promise<User | null> {
    const token = storageService.get<string>(STORAGE_KEYS.AUTH_TOKEN);

    if (!token || !this.validateToken(token)) {
      this.logout();
      return null;
    }

    const user = storageService.get<User>(STORAGE_KEYS.USER_DATA);
    return user;
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));

    const user = storageService.get<User>(STORAGE_KEYS.USER_DATA);
    if (!user || user.id !== userId) {
      throw new Error('User not found');
    }

    const updatedUser = { ...user, ...updates };
    storageService.set(STORAGE_KEYS.USER_DATA, updatedUser);

    return updatedUser;
  }

  isAuthenticated(): boolean {
    const token = storageService.get<string>(STORAGE_KEYS.AUTH_TOKEN);
    return token !== null && this.validateToken(token);
  }
}

export default new AuthService();
