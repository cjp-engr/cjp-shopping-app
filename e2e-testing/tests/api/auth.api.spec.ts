import { test, expect } from '@playwright/test';
import { authHeaders, login, SELLER_EMAIL, TEST_PASSWORD } from '../../helpers/api-client';

// TC coverage: TC-232 (login returns token), TC-233 (invalid password rejected),
// TC-132 (GET /api/auth/me without a token → 401; also in security.api.spec.ts),
// TC-234 (GET /api/auth/me with a valid token)
test.describe('Auth API', () => {
  test(
    'POST /api/auth/login returns token',
    { tag: ['@TC-232', '@api', '@auth'] },
    async ({ request }) => {
      await test.step('Send POST /api/auth/login with valid credentials', async () => {
        const response = await request.post('/api/auth/login', {
          data: { email: SELLER_EMAIL, password: TEST_PASSWORD },
        });
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.token).toBeTruthy();
        expect(body.user.email).toBe(SELLER_EMAIL);
      });
    },
  );

  test(
    'POST /api/auth/login rejects invalid password',
    { tag: ['@TC-233', '@api', '@auth'] },
    async ({ request }) => {
      await test.step('Send POST /api/auth/login with wrong password and assert 4xx', async () => {
        const response = await request.post('/api/auth/login', {
          data: { email: SELLER_EMAIL, password: 'wrong-password' },
        });
        expect(response.status()).toBeGreaterThanOrEqual(400);
      });
    },
  );

  test(
    'GET /api/auth/me requires auth',
    { tag: ['@TC-132', '@api', '@auth', '@security'] },
    async ({ request }) => {
      await test.step('Send GET /api/auth/me without token and assert 401', async () => {
        const response = await request.get('/api/auth/me');
        expect(response.status()).toBe(401);
      });
    },
  );

  test(
    'GET /api/auth/me returns user with valid token',
    { tag: ['@TC-234', '@api', '@auth'] },
    async ({ request }) => {
      await test.step('Authenticate and send GET /api/auth/me', async () => {
        const token = await login(request);
        const response = await request.get('/api/auth/me', {
          headers: authHeaders(token),
        });
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        expect(body.user.email).toBe(SELLER_EMAIL);
      });
    },
  );
});
