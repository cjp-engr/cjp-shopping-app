import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

// These tests call the webhook endpoint directly with a fake signature.
// The backend will reject the signature — we test the 400 path.
// Full webhook flow is tested manually via `stripe listen` during development.

test('TC-STRIPE-WH-01: webhook with invalid signature returns 400', async ({ request }) => {
  const response = await request.post(`${API_URL}/api/payments/webhook`, {
    headers: {
      'stripe-signature': 'invalid_signature',
      'content-type': 'application/json',
    },
    data: JSON.stringify({ type: 'payment_intent.succeeded' }),
  });
  expect(response.status()).toBe(400);
});

test('TC-STRIPE-WH-02: create order with missing paymentIntentId returns 402', async ({
  request,
}) => {
  // Login first
  const loginRes = await request.post(`${API_URL}/api/auth/login`, {
    data: {
      email: process.env.BUYER_EMAIL ?? 'b1@test.com',
      password: process.env.TEST_PASSWORD ?? 'Test750!!',
    },
  });
  const { token } = await loginRes.json();

  const response = await request.post(`${API_URL}/api/orders`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      items: [{ productId: 'fake_id', quantity: 1 }],
      shippingAddress: { street: '123 St', city: 'Manila', state: 'MM', zipCode: '1000' },
      paymentMethod: { type: 'credit-card' },
      // paymentIntentId intentionally omitted
    },
  });
  expect(response.status()).toBe(402);
});
