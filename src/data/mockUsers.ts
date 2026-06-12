import type { User } from '../types/user';

// Password for all mock users: password123
// In authService, we'll validate against this password
export const mockUsers: User[] = [
  {
    id: 'user-001',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '(555) 123-4567',
    avatar: 'https://i.pravatar.cc/150?img=12',
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    createdAt: '2023-06-15'
  },
  {
    id: 'user-002',
    email: 'jane.smith@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '(555) 987-6543',
    avatar: 'https://i.pravatar.cc/150?img=45',
    address: {
      street: '456 Oak Avenue',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      country: 'USA'
    },
    createdAt: '2023-08-22'
  },
  {
    id: 'user-003',
    email: 'mike.wilson@example.com',
    firstName: 'Mike',
    lastName: 'Wilson',
    phone: '(555) 456-7890',
    avatar: 'https://i.pravatar.cc/150?img=33',
    createdAt: '2024-01-10'
  }
];

// Helper function to find user by email
export const findUserByEmail = (email: string): User | undefined => {
  return mockUsers.find(user => user.email.toLowerCase() === email.toLowerCase());
};

// Mock password for all users (in real app, would be hashed)
export const MOCK_PASSWORD = 'password123';
