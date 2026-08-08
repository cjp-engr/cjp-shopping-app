// TC-064: Seller creates variant product via wizard

import { Page } from '@playwright/test';

import {
  assertBuyerPaysShipping,
  assertTwoImagesPerVariant,
  assertVariantAttributes,
  fetchSavedProduct,
} from '../../../helpers/product-assertions';
import { BUYER_PAYS_SHIPPING, TC064_SIZE_VARIANTS } from '../../../helpers/test-data';
import { test, expect } from '../../../fixtures/base-fixture';
import { HomePage } from '../../../pages/home.page';
import { ProductWizardPage } from '../../../pages/seller-dashboard/components/product-wizard/product-wizard.page';
import { SellerDashboardPage } from '../../../pages/seller-dashboard/seller-dashboard.page';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

async function openSellerWizard(
  page: Page,
  homePage: HomePage,
  sellerDashboardPage: SellerDashboardPage,
): Promise<ProductWizardPage> {
  await page.goto('/');
  await expect(page.getByTestId('navbar')).toBeVisible();
  await homePage.navigateToSellerDashboard();
  await sellerDashboardPage.expectLoaded();
  const wizard = await sellerDashboardPage.openCreateProductWizard();
  await expect(wizard.root).toBeVisible();
  return wizard;
}

test(
  'TC-064: seller creates variant product via wizard and verifies variants on detail page',
  { tag: ['@TC-064', '@seller', '@product-create', '@variant', '@smoke'] },
  async ({ page, request, homePage, sellerDashboardPage, productDetailPage }) => {
    const productName = `E2E Variant Hoodie ${Date.now()}`;
    const productImageUrl =
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400';
    const productDescription =
      'E2E variant hoodie with Size options S, M, and L.';

    const wizard = await openSellerWizard(page, homePage, sellerDashboardPage);

    await wizard.createVariantProduct({
      name: productName,
      category: 'Clothing',
      attributes: [TC064_SIZE_VARIANTS.attribute],
      variantRows: [...TC064_SIZE_VARIANTS.rows],
      description: productDescription,
      imageUrl: productImageUrl,
      shipping: BUYER_PAYS_SHIPPING,
    });

    await expect(wizard.root).not.toBeVisible();

    const productId = await sellerDashboardPage.getProductIdFromCard(productName);

    const token = await page.evaluate(() =>
      localStorage.getItem('shopping_app_auth_token'),
    );
    expect(token).toBeTruthy();

    const savedProduct = await fetchSavedProduct(request, API_URL, productId, token!);
    expect(savedProduct.variants).toHaveLength(3);
    assertVariantAttributes(
      savedProduct as { variantAttributes: { name: string; values: string[] }[] },
      'Size',
      ['S', 'M', 'L'],
    );
    assertBuyerPaysShipping(savedProduct as Parameters<typeof assertBuyerPaysShipping>[0]);
    assertTwoImagesPerVariant(savedProduct.variants as { images: string[] }[]);

    await productDetailPage.goto(productId);
    await productDetailPage.enterBuyerPreview();
    await productDetailPage.expectSizeOptions(TC064_SIZE_VARIANTS.attribute.values);
    await productDetailPage.expectVariantSelectionCycle(
      TC064_SIZE_VARIANTS.attribute.values,
      TC064_SIZE_VARIANTS.priceBySize,
    );
  },
);
