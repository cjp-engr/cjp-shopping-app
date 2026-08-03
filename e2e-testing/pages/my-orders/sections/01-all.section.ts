import { Locator, Page } from "@playwright/test";

export class AllSection {
    readonly page: Page;

    readonly sampleLocator: Locator;

    constructor(page: Page) {
        this.page = page;

        this.sampleLocator = page.locator('sample-locator');
    }

    async sampleMethod(): Promise<void> { }

}