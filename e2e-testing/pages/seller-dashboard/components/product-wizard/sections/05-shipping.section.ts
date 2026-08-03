import { Locator, Page } from '@playwright/test';

import type { DeliveryOption, ShippingConfig, ShippingFeeOption } from '../product-wizard.types';

export class ShippingSection {
  readonly page: Page;
  readonly step: Locator;
  readonly deliveryOptions: Locator;
  readonly shippingFeeOptions: Locator;
  readonly freeShippingFee: Locator;
  readonly buyerPaysShippingFee: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.step = page.getByTestId('wizard-shipping-step');
    this.deliveryOptions = page.getByTestId('wizard-delivery-options');
    this.shippingFeeOptions = page.getByTestId('wizard-shipping-fee-options');
    this.freeShippingFee = page.getByTestId('wizard-shipping-fee-free');
    this.buyerPaysShippingFee = page.getByTestId('wizard-shipping-fee-buyer_pays');
    this.nextButton = page.getByTestId('wizard-next-btn');
  }

  deliveryOption(value: DeliveryOption): Locator {
    return this.page.getByTestId(`wizard-delivery-option-${value}`);
  }

  shippingFeeAmount(value: DeliveryOption): Locator {
    return this.page.getByTestId(`wizard-shipping-fee-amount-${value}`);
  }

  async toggleDeliveryOption(value: DeliveryOption): Promise<void> {
    await this.deliveryOption(value).click();
  }

  async selectShippingFee(value: ShippingFeeOption): Promise<void> {
    await this.page.getByTestId(`wizard-shipping-fee-${value}`).click();
  }

  async ensureDeliveryOptionSelected(value: DeliveryOption): Promise<void> {
    const option = this.deliveryOption(value);
    if ((await option.getAttribute('aria-pressed')) !== 'true') {
      await option.click();
    }
  }

  async configure(opts: ShippingConfig): Promise<void> {
    for (const option of opts.deliveryOptions) {
      await this.ensureDeliveryOptionSelected(option);
    }

    await this.selectShippingFee(opts.feeMode);

    if (opts.feeMode === 'buyer_pays' && opts.feeAmounts) {
      for (const [option, amount] of Object.entries(opts.feeAmounts)) {
        await this.shippingFeeAmount(option as DeliveryOption).fill(amount);
      }
    }

    await this.nextButton.click();
  }

  async acceptDefaultAndContinue(): Promise<void> {
    await this.nextButton.click();
  }
}
