import { Page } from "@playwright/test";
import { ListProductsSection } from "./sections/01-list-products.section";
import { DeleteProductSection } from "./sections/02-delete-product.section";

export class ListProductsPage {
    readonly page: Page;

    readonly listProductsSection: ListProductsSection;
    readonly deleteProductSection: DeleteProductSection;



    constructor(page: Page) {
        this.page = page;
        this.listProductsSection = new ListProductsSection(page);
        this.deleteProductSection = new DeleteProductSection(page);

    }
}