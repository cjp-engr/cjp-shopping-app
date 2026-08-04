// TC-098: Checkout COD with variant product (web)

import * as fs from 'fs';
import * as path from 'path';

import {
  authHeaders,
  PASSWORD,
  SELLER_EMAIL,
} from '../../../helpers/api-client';
import {
  createVariantProductForCheckout,
  fetchProduct,
  variantBySize,
} from '../../../helpers/variant-product-factory';
import { test, expect } from '../../../fixtures/base-fixture';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';
const SELECTED_SIZE = 'M';
const SELECTED_PRICE = '$54.99';

function getBuyerToken(): string {
  const statePath = path.join(__dirname, '../../../.auth/buyer.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  const entry = state.origins?.[0]?.localStorage?.find(
    (e: { name: string; value: string }) => e.name === 'shopping_app_auth_token',
  );
  if (!entry?.value) throw new Error('Buyer auth token not found in .auth/buyer.json');
  return entry.value;
}

const SHIPPING_ADDRESS = {
  street: '123 Test Street',
  city: 'Manila',
  state: 'Metro Manila',
  zip: '1000',
  phone: '+63 912 345 6789',
};

test.describe('TC-098: Checkout COD with variant product', () => {
  test.beforeEach(async ({ request }) => {
    const token = getBuyerToken();
    await request.delete(`${API_URL}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test('buyer selects variant M, checks out COD, and order persists variant data',
    {
      tag: ['@smoke', '@checkout', '@variant'],
    },
    async ({
      page,
      request,
      productDetailPage,
      cartPage,
      checkoutPage,
    }) => {
      const sellerLogin = await request.post(`${API_URL}/api/auth/login`, {
        data: { email: SELLER_EMAIL, password: PASSWORD },
      });
      expect(sellerLogin.ok()).toBeTruthy();
      const { token: sellerToken } = await sellerLogin.json();
      const seed = await createVariantProductForCheckout(
        request,
        API_URL,
        sellerToken,
      );
      const variantM = variantBySize(seed.variants, SELECTED_SIZE);
      const variantS = variantBySize(seed.variants, 'S');

      const stockBefore = await fetchProduct(request, API_URL, seed.productId);
      const sStockBefore = variantBySize(stockBefore.variants, 'S').stock;
      const mStockBefore = variantBySize(stockBefore.variants, 'M').stock;

      await page.goto(`/products/${seed.productId}`);
      await productDetailPage.root.waitFor();

      await productDetailPage.selectVariant('Size', SELECTED_SIZE);
      await productDetailPage.expectDisplayedPrice(SELECTED_PRICE);
      await productDetailPage.addCurrentSelectionToCart();

      await cartPage.open();
      const cartLine = cartPage.cartItem(seed.productId, variantM.id);
      await expect(cartLine).toBeVisible();
      await expect(cartLine).toContainText(`Size: ${SELECTED_SIZE}`);
      await expect(cartLine).toContainText('54.99');

      await cartPage.proceedToCheckout();
      await checkoutPage.root.waitFor();
      await checkoutPage.fillNewShippingAddress(SHIPPING_ADDRESS);
      await checkoutPage.continueToPayment();
      await checkoutPage.selectPaymentMethod('cash-on-delivery');
      await checkoutPage.continueToReview();
      await checkoutPage.placeOrder();

      await expect(page).toHaveURL(/\/orders\?success=/, { timeout: 15_000 });
      const orderId = new URL(page.url()).searchParams.get('success');
      expect(orderId).toBeTruthy();

      const buyerToken = getBuyerToken();
      const orderRes = await request.get(`${API_URL}/api/orders/${orderId}`, {
        headers: authHeaders(buyerToken),
      });
      expect(orderRes.ok()).toBeTruthy();
      const { order } = await orderRes.json();
      expect(order.items).toHaveLength(1);
      expect(order.items[0].variantId).toBe(variantM.id);
      expect(order.items[0].selectedAttributes.Size).toBe(SELECTED_SIZE);
      expect(order.items[0].productPrice).toBe(54.99);
      if (variantM.image) {
        expect(order.items[0].productImage).toBe(variantM.image);
      }
      expect(order.status).toBe('pending');
      expect(order.paymentMethod?.type ?? order.paymentMethod).toMatch(/cash/i);

      await page.goto(`/orders/${orderId}`);
      await expect(page.getByTestId('order-detail-page')).toBeVisible();
      await expect(page.getByText(`Size: ${SELECTED_SIZE}`)).toBeVisible();
      await expect(page.getByText('$54.99 each')).toBeVisible();

      const stockAfter = await fetchProduct(request, API_URL, seed.productId);
      expect(variantBySize(stockAfter.variants, 'S').stock).toBe(sStockBefore);
      expect(variantBySize(stockAfter.variants, 'M').stock).toBe(mStockBefore - 1);
      expect(variantS.id).not.toBe(variantM.id);
    });
});
