import { test, expect } from '@playwright/test';

// TC coverage: TC-298 (health and root endpoints respond)
test.describe('API health', () => {
  test(
    'GET /health returns 200',
    { tag: ['@TC-298', '@api', '@health', '@smoke'] },
    async ({ request }) => {
      await test.step('Send GET /health and assert success response', async () => {
        const response = await request.get('/health');
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        expect(body.success).toBe(true);
      });
    },
  );

  test(
    'GET / returns API info',
    { tag: ['@TC-298', '@api', '@health', '@smoke'] },
    async ({ request }) => {
      await test.step('Send GET / and assert TokoMart API message', async () => {
        const response = await request.get('/');
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        expect(body.message).toBe('TokoMart API');
      });
    },
  );
});
