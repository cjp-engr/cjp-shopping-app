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
}
