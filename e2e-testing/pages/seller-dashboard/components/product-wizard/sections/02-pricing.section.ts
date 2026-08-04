import { expect, Locator, Page } from '@playwright/test';

import type { VariantAttributeConfig, VariantRowConfig } from '../product-wizard.types';

export class PricingSection {
  readonly page: Page;
  readonly priceInput: Locator;
  readonly stockInput: Locator;
  readonly skuInput: Locator;
  readonly discountInput: Locator;
  readonly variantsToggle: Locator;
  readonly addAttributeButton: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.priceInput = page.getByTestId('wizard-price-input');
    this.stockInput = page.getByTestId('wizard-stock-input');
    this.skuInput = page.getByRole('textbox', { name: 'e.g. SKU-001' });
    this.discountInput = page.getByRole('spinbutton', { name: 'e.g. 10' });
    this.variantsToggle = page.getByTestId('wizard-has-variants-toggle');
    this.addAttributeButton = page.getByTestId('wizard-add-variant-attr-btn');
    this.nextButton = page.getByTestId('wizard-next-btn');
  }

  variantImagePreviews(rowIndex: number): Locator {
    return this.page
      .locator(`[data-testid^="wizard-variant-row-${rowIndex}-image-"]`)
      .filter({ has: this.page.locator('img') });
  }

  async fill(
    price: string,
    stock: string,
    sku?: string,
    discount?: string,
  ): Promise<void> {
    await this.priceInput.fill(price);
    await this.stockInput.fill(stock);
    if (sku) {
      await this.skuInput.fill(sku);
    }
    if (discount) {
      await this.discountInput.fill(discount);
    }
  }

  async enableVariants(): Promise<void> {
    await this.variantsToggle.click();
    await this.addAttributeButton.waitFor();
  }

  async addAttribute(
    attrIndex: number,
    config: VariantAttributeConfig,
  ): Promise<void> {
    await this.addAttributeButton.click();

    await this.page
      .getByTestId(`wizard-variant-attr-name-${attrIndex}`)
      .fill(config.name);

    for (const value of config.values) {
      const valueInput = this.page.getByTestId(
        `wizard-variant-attr-value-input-${attrIndex}`,
      );
      await valueInput.fill(value);
      await this.page
        .getByTestId(`wizard-variant-attr-add-value-${attrIndex}`)
        .click();
    }
  }

  async fillVariantRows(rows: VariantRowConfig[]): Promise<void> {
    for (let i = 0; i < rows.length; i++) {
      await this.page.getByTestId(`wizard-variant-row-${i}-price`).fill(rows[i].price);
      await this.page.getByTestId(`wizard-variant-row-${i}-stock`).fill(rows[i].stock);
    }
  }

  async uploadVariantImages(rowIndex: number, paths: string[]): Promise<void> {
    const input = this.page.getByTestId(`wizard-variant-row-${rowIndex}-image-input`);

    for (const filePath of paths) {
      const before = await this.variantImagePreviews(rowIndex).count();
      await input.setInputFiles(filePath);
      await expect(this.variantImagePreviews(rowIndex)).toHaveCount(before + 1, {
        timeout: 15_000,
      });
    }
  }

  async expectVariantImageCount(rowIndex: number, count: number): Promise<void> {
    await expect(this.variantImagePreviews(rowIndex)).toHaveCount(count);
  }

  async expectVariantCoverAt(rowIndex: number, imgIdx: number): Promise<void> {
    await expect(
      this.page.getByTestId(`wizard-variant-row-${rowIndex}-image-${imgIdx}-cover`),
    ).toBeVisible();
  }

  async moveVariantImageRight(rowIndex: number, imgIdx: number): Promise<void> {
    const preview = this.page.getByTestId(
      `wizard-variant-row-${rowIndex}-image-${imgIdx}`,
    );
    await preview.hover();
    await this.page
      .getByTestId(`wizard-variant-row-${rowIndex}-image-${imgIdx}-move-right`)
      .click();
  }

  async applyVariantRowImages(rowIndex: number, row: VariantRowConfig): Promise<void> {
    if (!row.imagePaths?.length) return;

    await this.uploadVariantImages(rowIndex, row.imagePaths);
    await this.expectVariantImageCount(rowIndex, row.imagePaths.length);

    if (row.reorderCover) {
      await this.moveVariantImageRight(rowIndex, 0);
      await this.expectVariantCoverAt(rowIndex, 0);
    }
  }

  async configureVariants(
    attributes: VariantAttributeConfig[],
    rows: VariantRowConfig[],
  ): Promise<void> {
    await this.enableVariants();
    for (let i = 0; i < attributes.length; i++) {
      await this.addAttribute(i, attributes[i]);
    }
    await this.fillVariantRows(rows);
    for (let i = 0; i < rows.length; i++) {
      await this.applyVariantRowImages(i, rows[i]);
    }
  }

  async continue(): Promise<void> {
    await this.nextButton.click();
  }
}
