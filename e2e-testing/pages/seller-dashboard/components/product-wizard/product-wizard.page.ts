import { Locator, Page } from '@playwright/test';

import type { SimpleProductOptions, VariantProductOptions } from './product-wizard.types';
import { BasicInfoSection } from './sections/01-basic-info.section';
import { PricingSection } from './sections/02-pricing.section';
import { DescriptionSection } from './sections/03-description.section';
import { ImagesSection } from './sections/04-images.section';
import { ShippingSection } from './sections/05-shipping.section';
import { ReviewSection } from './sections/06-review.section';

export class ProductWizardPage {
  readonly page: Page;
  readonly root: Locator;
  readonly errorAlert: Locator;
  readonly basicInfo: BasicInfoSection;
  readonly pricing: PricingSection;
  readonly description: DescriptionSection;
  readonly images: ImagesSection;
  readonly shipping: ShippingSection;
  readonly review: ReviewSection;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('product-wizard');
    this.errorAlert = page.getByTestId('wizard-error');
    this.basicInfo = new BasicInfoSection(page);
    this.pricing = new PricingSection(page);
    this.description = new DescriptionSection(page);
    this.images = new ImagesSection(page);
    this.shipping = new ShippingSection(page);
    this.review = new ReviewSection(page);
  }

  async fillBasicInfo(opts: {
    name: string;
    category: string;
    brand?: string;
  }): Promise<void> {
    await this.basicInfo.fill(opts.name, opts.category, opts.brand);
    await this.basicInfo.continue();
  }

  async fillPricing(opts: {
    price: string;
    stock: string;
    sku?: string;
    discount?: string;
  }): Promise<void> {
    await this.pricing.fill(opts.price, opts.stock, opts.sku, opts.discount);
    await this.pricing.continue();
  }

  async fillDescription(text: string, tags?: string[]): Promise<void> {
    await this.description.fill(text, tags);
    await this.description.continue();
  }

  async addImageByUrl(url: string): Promise<void> {
    await this.images.addByUrl(url);
    await this.images.continue();
  }

  async publish(): Promise<void> {
    await this.review.publish();
  }

  async fillPricingVariants(
    attributes: VariantProductOptions['attributes'],
    rows: VariantProductOptions['variantRows'],
  ): Promise<void> {
    await this.pricing.configureVariants(attributes, rows);
    await this.pricing.continue();
  }

  async createSimpleProduct(opts: SimpleProductOptions): Promise<void> {
    await this.fillBasicInfo({
      name: opts.name,
      category: opts.category,
      brand: opts.brand,
    });
    await this.fillPricing({
      price: opts.price,
      stock: opts.stock,
      sku: opts.sku,
      discount: opts.discount,
    });
    await this.fillDescription(opts.description, opts.tags);
    await this.addImageByUrl(opts.imageUrl);
    if (opts.shipping) {
      await this.shipping.configure(opts.shipping);
    } else {
      await this.shipping.acceptDefaultAndContinue();
    }
    await this.publish();
  }

  async editSimpleProductPricing(price: string, stock: string): Promise<void> {
    await this.basicInfo.continue();
    await this.pricing.priceInput.fill(price);
    await this.pricing.stockInput.fill(stock);
    await this.pricing.continue();
    await this.description.continue();
    await this.images.continue();
    await this.shipping.acceptDefaultAndContinue();
    await this.publish();
  }

  async editVariantProduct(changes: {
    variantUpdates: { rowIndex: number; price?: string; stock?: string }[];
    newValues?: { attrIndex: number; value: string; rowIndex: number; price: string; stock: string }[];
    imageUrl?: string;
  }): Promise<void> {
    await this.basicInfo.continue();
    for (const u of changes.variantUpdates) {
      if (u.price !== undefined) {
        await this.page
          .getByTestId(`wizard-variant-row-${u.rowIndex}-price`)
          .fill(u.price);
      }
      if (u.stock !== undefined) {
        await this.page
          .getByTestId(`wizard-variant-row-${u.rowIndex}-stock`)
          .fill(u.stock);
      }
    }
    for (const v of changes.newValues ?? []) {
      await this.page
        .getByTestId(`wizard-variant-attr-value-input-${v.attrIndex}`)
        .fill(v.value);
      await this.page
        .getByTestId(`wizard-variant-attr-add-value-${v.attrIndex}`)
        .click();
      await this.page
        .getByTestId(`wizard-variant-row-${v.rowIndex}-price`)
        .waitFor({ state: 'visible' });
      await this.page
        .getByTestId(`wizard-variant-row-${v.rowIndex}-price`)
        .fill(v.price);
      await this.page
        .getByTestId(`wizard-variant-row-${v.rowIndex}-stock`)
        .fill(v.stock);
    }
    await this.pricing.continue();
    await this.description.continue();
    if (changes.imageUrl) {
      await this.images.addByUrl(changes.imageUrl);
    }
    await this.images.continue();
    await this.shipping.acceptDefaultAndContinue();
    await this.publish();
  }

  async createVariantProduct(opts: VariantProductOptions): Promise<void> {
    await this.fillBasicInfo({
      name: opts.name,
      category: opts.category,
      brand: opts.brand,
    });
    await this.fillPricingVariants(opts.attributes, opts.variantRows);
    await this.fillDescription(opts.description, opts.tags);
    await this.addImageByUrl(opts.imageUrl);
    if (opts.shipping) {
      await this.shipping.configure(opts.shipping);
    } else {
      await this.shipping.acceptDefaultAndContinue();
    }
    await this.publish();
  }
}
