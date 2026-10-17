import type { APIRequestContext, Page } from '@playwright/test';

import { createSimpleProduct } from './product-factory';
import { getBuyerToken } from './auth-state';
import { API_URL } from './test-data';
import { TEST_PASSWORD } from './api-client';

// Must match the backend's CHECKOUT_FLOW for the run. Tests that need the authorization flow skip otherwise.
export const CHECKOUT_FLOW: 'legacy' | 'manual_capture' =
  process.env.CHECKOUT_FLOW === 'manual_capture' ? 'manual_capture' : 'legacy';
export const IS_MANUAL_CAPTURE = CHECKOUT_FLOW === 'manual_capture';

// Stripe test-mode cards (https://docs.stripe.com/testing). Expiry and CVC accept any future date and three digits.
export const STRIPE_TEST_CARDS = {
  success: '4242424242424242',
  declined: '4000000000000002',
  requires3ds: '4000002500003155',
} as const;

// Stripe's built-in test PaymentMethod. Attaching it to the buyer's customer gives a real saved card.
export const SAVED_TEST_PAYMENT_METHOD = 'pm_card_visa';

const SELLER_ACCOUNTS = ['s1@ex.com', 's2@ex.com'] as const;

async function loginAt(request: APIRequestContext, email: string): Promise<string> {
  const res = await request.post(`${API_URL}/api/auth/login`, { data: { email, password: TEST_PASSWORD } });
  if (!res.ok()) throw new Error(`Login failed for ${email}: ${res.status()}`);
  const body = await res.json();
  return body.token as string;
}

/** Saves the Stripe test card to the buyer's profile. A duplicate is not added twice. */
export async function ensureSavedStripeCard(request: APIRequestContext): Promise<void> {
  const res = await request.post(`${API_URL}/api/auth/payment-methods`, {
    headers: { Authorization: `Bearer ${getBuyerToken()}` },
    data: {
      type: 'credit-card',
      brand: 'visa',
      last4: '4242',
      cardHolder: 'Test Buyer',
      expiryMonth: '12',
      expiryYear: '2030',
      setAsDefault: true,
      stripePaymentMethodId: SAVED_TEST_PAYMENT_METHOD,
    },
  });
  if (!res.ok()) throw new Error(`Saving the test card failed: ${res.status()} ${await res.text()}`);
}

/** One simple product from each of the two seeded sellers, for a two-seller checkout. */
export async function createProductsFromTwoSellers(request: APIRequestContext): Promise<[string, string]> {
  const stamp = Date.now();
  const first = await createSimpleProduct(request, await loginAt(request, SELLER_ACCOUNTS[0]), `E2E Seller One ${stamp}`, { price: 25 });
  const second = await createSimpleProduct(request, await loginAt(request, SELLER_ACCOUNTS[1]), `E2E Seller Two ${stamp}`, { price: 35 });
  return [first, second];
}

export interface BuyerOrder {
  _id: string;
  status: string;
  paymentStatus?: string | null;
  paymentFlowVersion?: 'legacy' | 'manual_capture';
  items: Array<{ product: { _id?: string } | string }>;
}

export async function fetchBuyerOrders(request: APIRequestContext): Promise<BuyerOrder[]> {
  const res = await request.get(`${API_URL}/api/orders`, {
    headers: { Authorization: `Bearer ${getBuyerToken()}` },
  });
  if (!res.ok()) throw new Error(`Fetching orders failed: ${res.status()}`);
  const body = await res.json();
  return body.orders as BuyerOrder[];
}

/** Orders that contain any of the given products. */
export function ordersForProducts(orders: BuyerOrder[], productIds: string[]): BuyerOrder[] {
  return orders.filter(order => order.items.some(item => {
    const id = typeof item.product === 'string' ? item.product : item.product?._id;
    return !!id && productIds.includes(id);
  }));
}

/** The signed-in buyer's user ID, read from the storage the app writes at login. */
export async function buyerUserId(page: Page): Promise<string> {
  const id = await page.evaluate(() => {
    const raw = localStorage.getItem('shopping_app_user_data');
    return raw ? (JSON.parse(raw).id as string | undefined) : undefined;
  });
  if (!id) throw new Error('Buyer user ID not found in local storage');
  return id;
}

/** Same key the app uses for its per-buyer checkout attempt (frontend/src/utils/checkoutAttempt.ts). */
export const checkoutAttemptKey = (userId: string): string => `checkout-attempt:${userId}`;
