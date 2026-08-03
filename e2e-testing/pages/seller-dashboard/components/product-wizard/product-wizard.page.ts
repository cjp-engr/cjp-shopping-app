import { Locator, Page } from '@playwright/test';

import type { SimpleProductOptions } from './product-wizard.types';
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
}
