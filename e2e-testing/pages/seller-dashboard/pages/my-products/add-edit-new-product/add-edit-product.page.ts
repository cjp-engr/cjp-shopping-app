import { Page } from "@playwright/test";
import { BasicInfoSection } from "./sections/01-basic-info.section";
import { PricingSection } from "./sections/02-pricing.section";
import { DescriptionSection } from "./sections/03-description.section";
import { ImagesSection } from "./sections/04-images.section";
import { ReviewSection } from "./sections/05-review.section";
import { ShippingSection } from "./sections/06-shipping.section";
export class AddEditProductPage {
    readonly page: Page;

    readonly basicInfoSection: BasicInfoSection;
    readonly pricingSection: PricingSection;
    readonly descriptionSection: DescriptionSection;
    readonly imagesSection: ImagesSection;
    readonly shippingSection: ShippingSection;
    readonly reviewSection: ReviewSection;



    constructor(page: Page) {
        this.page = page;
        this.basicInfoSection = new BasicInfoSection(page);
        this.pricingSection = new PricingSection(page);
        this.descriptionSection = new DescriptionSection(page);
        this.imagesSection = new ImagesSection(page);
        this.shippingSection = new ShippingSection(page);
        this.reviewSection = new ReviewSection(page);
    }
}