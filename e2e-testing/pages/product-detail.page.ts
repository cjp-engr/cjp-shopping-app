import { expect, Locator, Page } from '@playwright/test';

export class ProductDetailPage {
  readonly page: Page;
  readonly root: Locator;
  readonly addToCartButton: Locator;
  readonly priceDisplay: Locator;
  readonly previewAsBuyerButton: Locator;
  readonly mainImage: Locator;
  readonly imageGallery: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('product-detail-page');
    this.addToCartButton = page.getByTestId('add-to-cart-btn');
    this.priceDisplay = page.getByTestId('product-price');
    this.previewAsBuyerButton = page.getByTestId('preview-as-buyer-btn');
    this.mainImage = page.getByTestId('product-main-image');
    this.imageGallery = page.getByTestId('product-image-gallery');
  }

  async goto(productId: string): Promise<void> {
    await this.page.goto(`/products/${productId}`);
    await this.root.waitFor();
  }

  async expectNoVariantSelectors(): Promise<void> {
    await expect(this.page.locator('[data-testid^="variant-attr-"]')).toHaveCount(0);
  }

  async expectSizeOptions(sizes: readonly string[]): Promise<void> {
    await expect(this.variantAttr('Size')).toBeVisible();
    for (const size of sizes) {
      await expect(this.variantValue('Size', size)).toBeVisible();
    }
  }

  /**
   * Selects each size, asserts price + thumbnail count, and verifies main image changes.
   */
  async expectVariantSelectionCycle(
    sizes: readonly string[],
    priceBySize: Record<string, string>,
    thumbnailCount = 2,
  ): Promise<void> {
    let previousSrc = '';
    for (const size of sizes) {
      await this.selectVariant('Size', size);
      await this.expectDisplayedPrice(priceBySize[size]);
      await this.expectThumbnailCount(thumbnailCount);
      if (previousSrc) {
        await this.expectMainImageSrcChanges(previousSrc);
      }
      previousSrc = await this.getMainImageSrc();
    }
    await expect(this.addToCartButton).toBeVisible();
  }

  async selectSizeAndAddToCart(size: string, expectedPrice: string): Promise<void> {
    await this.selectVariant('Size', size);
    await this.expectDisplayedPrice(expectedPrice);
    await this.addCurrentSelectionToCart();
  }

  async enterBuyerPreview(): Promise<void> {
    if (await this.previewAsBuyerButton.isVisible()) {
      await this.previewAsBuyerButton.click();
    }
  }

  variantAttr(name: string): Locator {
    return this.page.getByTestId(`variant-attr-${name}`);
  }

  variantValue(attr: string, value: string): Locator {
    return this.page.getByTestId(`variant-value-${attr}-${value}`);
  }

  async selectVariant(attr: string, value: string): Promise<void> {
    await this.variantValue(attr, value).click();
  }

  async expectDisplayedPrice(priceText: string): Promise<void> {
    await expect(this.priceDisplay).toContainText(priceText);
  }

  async getMainImageSrc(): Promise<string> {
    return (await this.mainImage.getAttribute('src')) ?? '';
  }

  async expectThumbnailCount(count: number): Promise<void> {
    const thumbs = this.imageGallery.locator('.grid button');
    await expect(thumbs).toHaveCount(count);
  }

  async expectMainImageSrcChanges(previousSrc: string): Promise<void> {
    await expect(this.mainImage).not.toHaveAttribute('src', previousSrc);
  }

  /** Selects the first available value for every variant attribute group. */
  async selectFirstAvailableVariants(): Promise<void> {
    const variantGroups = this.page.locator('[data-testid^="variant-attr-"]');
    const count = await variantGroups.count();
    for (let i = 0; i < count; i++) {
      const firstEnabled = variantGroups.nth(i).locator('button:not([disabled])').first();
      if (await firstEnabled.count() > 0) {
        await firstEnabled.click();
      }
    }
  }

  async addToCart(): Promise<void> {
    await this.selectFirstAvailableVariants();
    await this.addToCartButton.waitFor();
    await this.addToCartButton.click();
  }

  /** Adds to cart using the currently selected variant(s) without re-selecting. */
  async addCurrentSelectionToCart(): Promise<void> {
    await this.addToCartButton.waitFor();
    await this.addToCartButton.click();
  }
}
