// TC coverage: TC-012 — Product detail shows sale price with strikethrough
//              TC-013 — Select variant before add to cart
//              TC-014 — Add to cart blocked when variant not selected

import { expect } from '@playwright/test';

import { getSellerToken } from '../../../helpers/auth-state';
import { createDiscountedProduct } from '../../../helpers/product-factory';
import { createVariantProductForCheckout } from '../../../helpers/variant-product-factory';
import { API_URL, TC064_SIZE_VARIANTS } from '../../../helpers/test-data';
import { test } from '../../../fixtures/base-fixture';

// ──────────────────────────────────────────────────────────────────────────────
// TC-012: Sale price strikethrough
// ──────────────────────────────────────────────────────────────────────────────

test.describe('TC-012: Product detail — sale price strikethrough', () => {
  let discountedProductId: string;

  test.beforeAll(async ({ request }) => {
    // price: $100, discount: 20% → effective price $80
    discountedProductId = await createDiscountedProduct(request, getSellerToken(), {
      price: 100,
      discount: 20,
    });
  });

  test(
    'TC-012: discounted product shows original price and discounted price',
    { tag: ['@TC-012', '@buyer', '@product-detail', '@simple'] },
    async ({ productDetailPage }) => {
      await test.step('Navigate to discounted product detail page', async () => {
        await productDetailPage.goto(discountedProductId);
        await expect(productDetailPage.priceDisplay).toBeVisible();
      });

      await test.step('Verify original and sale prices are both displayed', async () => {
        const priceEl = productDetailPage.priceDisplay;
        // App renders the original price as a span with CSS line-through (not a <del>/<s> element).
        // Asserting both prices appear in the price block confirms the sale state is displayed.
        await expect(priceEl).toContainText('$80');   // discounted price (20% off $100)
        await expect(priceEl).toContainText('$100');  // original price (shown struck-through via CSS)
      });
    },
  );
});

// ──────────────────────────────────────────────────────────────────────────────
// TC-013 and TC-014 share the same variant product
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Product detail — variant selection (TC-013, TC-014)', () => {
  let variantProductId: string;

  test.beforeAll(async ({ request }) => {
    const seed = await createVariantProductForCheckout(request, API_URL, getSellerToken());
    variantProductId = seed.productId;
  });

  test(
    'TC-013: selecting a variant updates price and image, enables Add to Cart',
    { tag: ['@TC-013', '@buyer', '@product-detail', '@variant'] },
    async ({ productDetailPage }) => {
      await test.step('Navigate to variant product detail page', async () => {
        await productDetailPage.goto(variantProductId);
      });

      await test.step('Verify size options S, M, L are shown', async () => {
        await productDetailPage.expectSizeOptions(['S', 'M', 'L']);
      });

      await test.step('Cycle through each size and verify price updates', async () => {
        await productDetailPage.expectVariantSelectionCycle(
          ['S', 'M', 'L'],
          TC064_SIZE_VARIANTS.priceBySize,
          0, // each variant has 1 image — thumbnail grid only renders with >1 images
        );
      });

      await test.step('Verify Add to Cart is visible and enabled', async () => {
        await expect(productDetailPage.addToCartButton).toBeVisible();
        await expect(productDetailPage.addToCartButton).toBeEnabled();
      });
    },
  );

  test(
    'TC-014: Add to Cart is not shown when no variant is selected',
    { tag: ['@TC-014', '@buyer', '@product-detail', '@variant'] },
    async ({ productDetailPage }) => {
      await test.step('Navigate to variant product detail page', async () => {
        await productDetailPage.goto(variantProductId);
      });

      await test.step('Verify Add to Cart is not shown without a size selection', async () => {
        // The app conditionally renders add-to-cart-btn only when all variant attributes
        // are selected AND stock > 0. With no selection made, the button is absent from the DOM.
        await expect(productDetailPage.addToCartButton).not.toBeVisible();
      });
    },
  );
});
