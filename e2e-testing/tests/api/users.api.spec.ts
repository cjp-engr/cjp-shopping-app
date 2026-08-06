// TC coverage: TC-113 (POST /api/users/:id/follow with own ID returns 400 "Cannot follow yourself")

import { test, expect } from '@playwright/test';
import { authHeaders, signupFreshUser } from '../../helpers/api-client';

test.describe('Users API — follow rules', () => {
  test('TC-113: user cannot follow themselves', async ({ request }) => {
    const { token, userId } = await signupFreshUser(request, 'self-follow');

    const res = await request.post(`/api/users/${userId}/follow`, {
      headers: authHeaders(token),
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Cannot follow yourself');
  });
});
