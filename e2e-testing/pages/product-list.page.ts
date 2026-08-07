import { Locator, Page } from '@playwright/test';

export class ProductListPage {
  readonly page: Page;
  readonly root: Locator;
  readonly loadingSpinner: Locator;
  readonly searchInput: Locator;
  readonly grid: Locator;
  readonly emptyState: Locator;
  readonly filtersPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('products-page');
    this.loadingSpinner = page.getByTestId('products-loading');
    this.searchInput = page.getByTestId('product-search-input');
    this.grid = page.getByTestId('products-grid');
    this.emptyState = page.getByTestId('products-empty');
    this.filtersPanel = page.getByTestId('filters-panel');
  }

  async goto(): Promise<void> {
    await this.page.goto('/products');
    await this.root.waitFor();
    await this.loadingSpinner.waitFor({ state: 'hidden' });
  }

  async search(keyword: string): Promise<void> {
    await this.searchInput.fill(keyword);
    await this.searchInput.press('Enter');
    await this.loadingSpinner.waitFor({ state: 'hidden' });
  }

  async clickCategoryFilter(slug: string): Promise<void> {
    await this.page.getByTestId(`category-filter-${slug}`).click();
    await this.loadingSpinner.waitFor({ state: 'hidden' });
  }

  async clickFirstCategoryFilter(): Promise<string> {
    const filters = this.page.locator('[data-testid^="category-filter-"]');
    const first = filters.first();
    const testId = (await first.getAttribute('data-testid')) ?? '';
    const slug = testId.replace('category-filter-', '');
    await first.click();
    await this.loadingSpinner.waitFor({ state: 'hidden' });
    return slug;
  }

  async clickFirstProduct(): Promise<void> {
    await this.page.locator('[data-testid^="product-card-"]').first().click();
  }

  productCard(id: string): Locator {
    return this.page.getByTestId(`product-card-${id}`);
  }
}
