import { test, expect } from '@playwright/test';

// TC coverage: API smoke — server health
test.describe('API health', () => {
  test('GET /health returns 200', async ({ request }) => {
    await test.step('Send GET /health and assert success response', async () => {
      const response = await request.get('/health');
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  test('GET / returns API info', async ({ request }) => {
    await test.step('Send GET / and assert TokoMart API message', async () => {
      const response = await request.get('/');
      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.message).toBe('TokoMart API');
    });
  });
});
