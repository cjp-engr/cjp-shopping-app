// TC coverage: TC-113 (POST /api/users/:id/follow with own ID returns 400 "Cannot follow yourself")

import { test, expect } from '@playwright/test';
import { login, authHeaders } from '../../helpers/api-client';

test.describe('Users API — follow rules', () => {
  test('TC-113: user cannot follow themselves', async ({ request }) => {
    // Create a fresh account to get a known userId
    const email = `self-follow-${Date.now()}@test.com`;
    const signupRes = await request.post('/api/auth/signup', {
      data: { email, password: 'Test750!!', firstName: 'Self', lastName: 'Test' },
    });
    expect(signupRes.status()).toBe(201);
    const { token, user } = await signupRes.json();
    const ownId = user.id;

    const res = await request.post(`/api/users/${ownId}/follow`, {
      headers: authHeaders(token),
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Cannot follow yourself');
  });
});
