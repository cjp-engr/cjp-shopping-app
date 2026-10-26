// TC coverage: TC-229 / TC-STRIPE-WH-01 (webhook with an invalid signature → 400),
//              TC-295 / TC-193 / TC-STRIPE-WH-02 (card order without a payment intent)
//
// The full webhook flow (signed events) is covered by the backend integration tests and tested
// manually with `stripe listen` during development.

import { test, expect } from '@playwright/test';
import { authHeaders, login, signupFreshUser, SELLER_EMAIL, TEST_PASSWORD } from '../../helpers/api-client';
import { randomShippingMultipart } from '../../helpers/test-data';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400';

// These tests call the webhook endpoint directly with a fake signature.
// The backend will reject the signature — we test the 400 path.

test(
  'TC-STRIPE-WH-01: webhook with invalid signature returns 400',
  { tag: ['@TC-229', '@TC-STRIPE-WH-01', '@api', '@stripe', '@webhook'] },
  async ({ request }) => {
    const response = await request.post(`${API_URL}/api/payments/webhook`, {
      headers: {
        'stripe-signature': 'invalid_signature',
        'content-type': 'application/json',
      },
      data: JSON.stringify({ type: 'payment_intent.succeeded' }),
    });
    expect(response.status()).toBe(400);
    // The webhook answers with its own body shape, not the usual { success, message } envelope
    expect((await response.json()).error).toBe('Invalid signature');
  },
);

test(
  'TC-STRIPE-WH-02: a card order without a payment intent is refused under manual_capture and unverified under legacy',
  { tag: ['@TC-295', '@TC-193', '@TC-STRIPE-WH-02', '@api', '@stripe', '@orders'] },
  async ({ request }) => {
    let productId: string;
    let sellerToken: string;
    let orderId: string | undefined;

    await test.step('Create a real product and a fresh buyer', async () => {
      sellerToken = await login(request, SELLER_EMAIL, TEST_PASSWORD);
      const res = await request.post(`${API_URL}/api/seller/products`, {
        multipart: {
          name: `Card No Intent ${Date.now()}`,
          description: 'TC-295 test product — safe to delete',
          price: '25',
          category: 'Electronics',
          stock: '5',
          image: PLACEHOLDER_IMAGE,
          ...randomShippingMultipart(),
        },
        headers: authHeaders(sellerToken),
      });
      const body = await res.json();
      if (res.status() !== 201 || !body.product?._id) {
        throw new Error(`product creation failed: ${res.status()} ${JSON.stringify(body)}`);
      }
      productId = body.product._id;
    });

    const { token: buyerToken } = await signupFreshUser(request, 'card_no_intent');

    try {
      await test.step('Place a credit-card order with no paymentIntentId', async () => {
        const response = await request.post(`${API_URL}/api/orders`, {
          headers: authHeaders(buyerToken),
          data: {
            items: [{ productId, quantity: 1 }],
            shippingAddress: { street: '123 St', city: 'Manila', state: 'MM', zipCode: '1000' },
            paymentMethod: { type: 'credit-card' },
            // paymentIntentId intentionally omitted
          },
        });

        if (response.status() === 426) {
          // CHECKOUT_FLOW=manual_capture: card orders must go through /api/checkout/sessions
          const body = await response.json();
          expect(body.success).toBe(false);
          expect(body.error.code).toBe('update_required');
          expect(body.error.details.reason).toBe('card_order_requires_session');
          expect(body.error.details.requiredEndpoint).toBe('/api/checkout/sessions');
        } else {
          // CHECKOUT_FLOW=legacy: documents the CURRENT behaviour. A card order with no payment intent is
          // accepted with no Stripe verification (the "saved/mock card" path in orderService.createOrders).
          // If this assertion starts failing, that path has been closed: update TC-295.
          expect(response.status()).toBe(201);
          orderId = (await response.json()).orders[0]._id;
          test.info().annotations.push({
            type: 'known-gap',
            description: 'legacy flow accepts a card order without a payment intent (TC-295)',
          });
        }
      });
    } finally {
      // Cleanup: cancel the order if one was created, then remove the product
      if (orderId) {
        await request.put(`${API_URL}/api/orders/${orderId}/status`, {
          data: { status: 'cancelled' },
          headers: authHeaders(buyerToken),
        });
      }
      await request.delete(`${API_URL}/api/seller/products/${productId!}`, {
        headers: authHeaders(sellerToken!),
      });
    }
  },
);
