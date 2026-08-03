import { test, expect } from '@playwright/test';
import { authHeaders, login, TEST_EMAIL, TEST_PASSWORD } from '../../helpers/api-client';

// TC coverage: auth API — login, getMe, invalid credentials
test.describe('Auth API', () => {
  test('POST /api/auth/login returns token', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe(TEST_EMAIL);
  });

  test('POST /api/auth/login rejects invalid password', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: TEST_EMAIL, password: 'wrong-password' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('GET /api/auth/me requires auth', async ({ request }) => {
    const response = await request.get('/api/auth/me');
    expect(response.status()).toBe(401);
  });

  test('GET /api/auth/me returns user with valid token', async ({ request }) => {
    const token = await login(request);
    const response = await request.get('/api/auth/me', {
      headers: authHeaders(token),
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.user.email).toBe(TEST_EMAIL);
  });
});
