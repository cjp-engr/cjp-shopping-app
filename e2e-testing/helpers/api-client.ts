import type { APIRequestContext } from '@playwright/test';

export const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@example.com';
export const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'password123';
export const BUYER_EMAIL = process.env.BUYER_EMAIL ?? 'buyer@test.com';
export const SELLER_EMAIL = process.env.SELLER_EMAIL ?? 'seller@test.com';
export const PASSWORD = process.env.PASSWORD ?? 'Test750!!';

export async function login(
  request: APIRequestContext,
  email = TEST_EMAIL,
  password = TEST_PASSWORD,
): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email, password },
  });
  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
  }
  const body = await response.json();
  return body.token as string;
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function signupFreshUser(
  request: APIRequestContext,
  prefix = 'user',
): Promise<{ token: string; userId: string }> {
  const email = `${prefix}-${Date.now()}@test.com`;
  const res = await request.post('/api/auth/signup', {
    data: { email, password: PASSWORD, firstName: 'Test', lastName: 'User' },
  });
  if (!res.ok()) throw new Error(`Signup failed: ${res.status()}`);
  const { token, user } = await res.json();
  return { token, userId: user.id };
}
