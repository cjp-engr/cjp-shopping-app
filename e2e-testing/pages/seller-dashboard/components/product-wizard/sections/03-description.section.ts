import { Locator, Page } from '@playwright/test';

export class DescriptionSection {
  readonly page: Page;
  readonly descriptionTextarea: Locator;
  readonly tagsInput: Locator;
  readonly tagsAddButton: Locator;
  readonly tagsList: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.descriptionTextarea = page.getByTestId('wizard-description-textarea');
    this.tagsInput = page.getByTestId('wizard-tags-input');
    this.tagsAddButton = page.getByTestId('wizard-tags-add-btn');
    this.tagsList = page.getByTestId('wizard-tags-list');
    this.nextButton = page.getByTestId('wizard-next-btn');
  }

  tagChip(name: string): Locator {
    return this.page.getByTestId(`wizard-tag-${name}`);
  }

  async fill(text: string, tags?: string[]): Promise<void> {
    await this.descriptionTextarea.fill(text);
    if (tags?.length) {
      await this.addTags(tags);
    }
  }

  async addTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.tagsInput.fill(tag);
      await this.tagsAddButton.click();
      await this.tagChip(tag).waitFor({ state: 'visible' });
    }
  }

  async continue(): Promise<void> {
    await this.nextButton.click();
  }
}
