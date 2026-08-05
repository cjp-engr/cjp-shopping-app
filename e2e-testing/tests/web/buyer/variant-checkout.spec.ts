// TC-098: Checkout COD with variant product (web)

import { expect } from '@playwright/test';

import { clearBuyerCart, getBuyerToken, loginSeller } from '../../../helpers/auth-state';
import { fetchOrder } from '../../../helpers/product-assertions';
import {
  API_URL,
  DEFAULT_SHIPPING_ADDRESS,
  TC064_SIZE_VARIANTS,
} from '../../../helpers/test-data';
import {
  createVariantProductForCheckout,
  fetchProduct,
  variantBySize,
} from '../../../helpers/variant-product-factory';
import { test } from '../../../fixtures/base-fixture';

const SELECTED_SIZE = 'M';

test.describe('TC-098: Checkout COD with variant product', () => {
  test.beforeEach(async ({ request }) => {
    await clearBuyerCart(request, API_URL);
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
      orderDetailPage,
    }) => {
      const sellerToken = await loginSeller(request, API_URL);
      const seed = await createVariantProductForCheckout(
        request,
        API_URL,
        sellerToken,
      );
      const variantM = variantBySize(seed.variants, SELECTED_SIZE);

      const stockBefore = await fetchProduct(request, API_URL, seed.productId);
      const sStockBefore = variantBySize(stockBefore.variants, 'S').stock;
      const mStockBefore = variantBySize(stockBefore.variants, 'M').stock;

      await productDetailPage.goto(seed.productId);
      await productDetailPage.selectSizeAndAddToCart(
        SELECTED_SIZE,
        TC064_SIZE_VARIANTS.priceBySize.M,
      );

      await cartPage.open();
      await cartPage.expectVariantLineItem(
        seed.productId,
        variantM.id,
        SELECTED_SIZE,
        '54.99',
      );

      await cartPage.proceedToCheckout();
      await checkoutPage.completeCodCheckout(DEFAULT_SHIPPING_ADDRESS);

      await expect(page).toHaveURL(/\/orders\?success=/, { timeout: 15_000 });
      const orderId = new URL(page.url()).searchParams.get('success');
      expect(orderId).toBeTruthy();

      const order = await fetchOrder(
        request,
        API_URL,
        orderId!,
        getBuyerToken(),
      );
      const item = (order.items as unknown[])[0] as {
        variantId: string;
        selectedAttributes: { Size: string };
        productPrice: number;
        productImage?: string;
      };
      expect(order.items).toHaveLength(1);
      expect(item.variantId).toBe(variantM.id);
      expect(item.selectedAttributes.Size).toBe(SELECTED_SIZE);
      expect(item.productPrice).toBe(54.99);
      if (variantM.image) {
        expect(item.productImage).toBe(variantM.image);
      }
      expect(order.status).toBe('pending');
      expect(
        (order.paymentMethod as { type?: string })?.type ?? order.paymentMethod,
      ).toMatch(/cash/i);

      await orderDetailPage.goto(orderId!);
      await orderDetailPage.expectVariantLine(
        seed.productId,
        SELECTED_SIZE,
        '$54.99',
      );

      const stockAfter = await fetchProduct(request, API_URL, seed.productId);
      expect(variantBySize(stockAfter.variants, 'S').stock).toBe(sStockBefore);
      expect(variantBySize(stockAfter.variants, 'M').stock).toBe(mStockBefore - 1);
    });
});

test.describe('TC-105: Checkout New card with variant product',
  () => {
    test.beforeEach(async ({ request }) => {
      await clearBuyerCart(request, API_URL);
    });

    test('buyer selects variant M, checks out with new credit card, and order persists variant data',
      {
        tag: ['@smoke', '@checkout', '@variant'],
      },
      async ({
        page,
        request,
        productDetailPage,
        cartPage,
        checkoutPage,
        orderDetailPage,
      }) => {
        const sellerToken = await loginSeller(request, API_URL);
        const seed = await createVariantProductForCheckout(
          request,
          API_URL,
          sellerToken,
        );
        const variantM = variantBySize(seed.variants, SELECTED_SIZE);

        const stockBefore = await fetchProduct(request, API_URL, seed.productId);
        const sStockBefore = variantBySize(stockBefore.variants, 'S').stock;
        const mStockBefore = variantBySize(stockBefore.variants, 'M').stock;

        await productDetailPage.goto(seed.productId);
        await productDetailPage.selectSizeAndAddToCart(
          SELECTED_SIZE,
          TC064_SIZE_VARIANTS.priceBySize.M,
        );

        await cartPage.open();
        await cartPage.expectVariantLineItem(
          seed.productId,
          variantM.id,
          SELECTED_SIZE,
          '54.99',
        );

        await cartPage.proceedToCheckout();
        await checkoutPage.root.waitFor();

        // Fill shipping, enter new credit card details, place order
        await checkoutPage.fillNewShippingAddress(DEFAULT_SHIPPING_ADDRESS);
        await checkoutPage.continueToPayment();
        await checkoutPage.fillNewCardForm({
          type: 'credit-card',
          cardNumber: '4111111111111111',
          cardHolder: 'Test Buyer',
          expiryMonth: '12',
          expiryYear: String(new Date().getFullYear() + 2),
          cvv: '123',
        });
        await checkoutPage.continueToReview();
        await checkoutPage.placeOrder();

        await expect(page).toHaveURL(/\/orders\?success=/, { timeout: 15_000 });
        const orderId = new URL(page.url()).searchParams.get('success');
        expect(orderId).toBeTruthy();

        const order = await fetchOrder(
          request,
          API_URL,
          orderId!,
          getBuyerToken(),
        );
        const item = (order.items as unknown[])[0] as {
          variantId: string;
          selectedAttributes: { Size: string };
          productPrice: number;
          productImage?: string;
        };
        expect(order.items).toHaveLength(1);
        expect(item.variantId).toBe(variantM.id);
        expect(item.selectedAttributes.Size).toBe(SELECTED_SIZE);
        expect(item.productPrice).toBe(54.99);
        if (variantM.image) {
          expect(item.productImage).toBe(variantM.image);
        }
        expect(order.status).toBe('pending');
        expect(
          (order.paymentMethod as { type?: string })?.type ?? order.paymentMethod,
        ).toMatch(/credit/i);

        await orderDetailPage.goto(orderId!);
        await orderDetailPage.expectVariantLine(
          seed.productId,
          SELECTED_SIZE,
          '$54.99',
        );

        const stockAfter = await fetchProduct(request, API_URL, seed.productId);
        expect(variantBySize(stockAfter.variants, 'S').stock).toBe(sStockBefore);
        expect(variantBySize(stockAfter.variants, 'M').stock).toBe(mStockBefore - 1);
      });
  });

test.describe('TC-106: Checkout Saved card with variant product',
  () => {
    test.beforeEach(async ({ request }) => {
      await clearBuyerCart(request, API_URL);
    });

    test('buyer selects variant M, checks out with saved credit card, and order persists variant data',
      {
        tag: ['@smoke', '@checkout', '@variant'],
      },
      async ({
        page,
        request,
        productDetailPage,
        cartPage,
        checkoutPage,
        orderDetailPage,
      }) => {
        const sellerToken = await loginSeller(request, API_URL);
        const seed = await createVariantProductForCheckout(
          request,
          API_URL,
          sellerToken,
        );
        const variantM = variantBySize(seed.variants, SELECTED_SIZE);

        const stockBefore = await fetchProduct(request, API_URL, seed.productId);
        const sStockBefore = variantBySize(stockBefore.variants, 'S').stock;
        const mStockBefore = variantBySize(stockBefore.variants, 'M').stock;

        await productDetailPage.goto(seed.productId);
        await productDetailPage.selectSizeAndAddToCart(
          SELECTED_SIZE,
          TC064_SIZE_VARIANTS.priceBySize.M,
        );

        await cartPage.open();
        await cartPage.expectVariantLineItem(
          seed.productId,
          variantM.id,
          SELECTED_SIZE,
          '54.99',
        );

        await cartPage.proceedToCheckout();
        await checkoutPage.root.waitFor();

        // Fill shipping, enter new credit card details, place order
        await checkoutPage.fillNewShippingAddress(DEFAULT_SHIPPING_ADDRESS);
        await checkoutPage.continueToPayment();
        await checkoutPage.selectSavedCard();
        await checkoutPage.continueToReview();
        await checkoutPage.placeOrder();

        await expect(page).toHaveURL(/\/orders\?success=/, { timeout: 15_000 });
        const orderId = new URL(page.url()).searchParams.get('success');
        expect(orderId).toBeTruthy();

        const order = await fetchOrder(
          request,
          API_URL,
          orderId!,
          getBuyerToken(),
        );
        const item = (order.items as unknown[])[0] as {
          variantId: string;
          selectedAttributes: { Size: string };
          productPrice: number;
          productImage?: string;
        };
        expect(order.items).toHaveLength(1);
        expect(item.variantId).toBe(variantM.id);
        expect(item.selectedAttributes.Size).toBe(SELECTED_SIZE);
        expect(item.productPrice).toBe(54.99);
        if (variantM.image) {
          expect(item.productImage).toBe(variantM.image);
        }
        expect(order.status).toBe('pending');
        expect(
          (order.paymentMethod as { type?: string })?.type ?? order.paymentMethod,
        ).toMatch(/credit/i);

        await orderDetailPage.goto(orderId!);
        await orderDetailPage.expectVariantLine(
          seed.productId,
          SELECTED_SIZE,
          '$54.99',
        );

        const stockAfter = await fetchProduct(request, API_URL, seed.productId);
        expect(variantBySize(stockAfter.variants, 'S').stock).toBe(sStockBefore);
        expect(variantBySize(stockAfter.variants, 'M').stock).toBe(mStockBefore - 1);
      });

  });
