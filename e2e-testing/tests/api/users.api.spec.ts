// TC coverage: TC-113 (POST /api/users/:id/follow with own ID returns 400 "Cannot follow yourself")

import { test, expect } from '@playwright/test';
import { authHeaders, signupFreshUser } from '../../helpers/api-client';

test.describe('Users API — follow rules', () => {
  test('TC-113: user cannot follow themselves', async ({ request }) => {
    await test.step('Register fresh user', async () => {
      const { token, userId } = await signupFreshUser(request, 'self-follow');

      await test.step('Send POST /api/users/:id/follow with own user ID and assert 400', async () => {
        const res = await request.post(`/api/users/${userId}/follow`, {
          headers: authHeaders(token),
        });

        expect(res.status()).toBe(400);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe('Cannot follow yourself');
      });
    });
  });
});
