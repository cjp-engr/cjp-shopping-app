import type { APIRequestContext } from '@playwright/test';

export const SELLER_EMAIL = process.env.SELLER_EMAIL ?? 'test@example.com';
export const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'password123';
export const BUYER_EMAIL = process.env.BUYER_EMAIL ?? 'b1@test.com';
export const SELLER_EMAIL = process.env.SELLER_EMAIL ?? 's1@example.com';
export const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'Test750!!';

export async function login(
  request: APIRequestContext,
  email = SELLER_EMAIL,
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
    data: { email, password: TEST_PASSWORD, firstName: 'Test', lastName: 'User' },
  });
  if (!res.ok()) throw new Error(`Signup failed: ${res.status()}`);
  const { token, user } = await res.json();
  return { token, userId: user.id };
}
