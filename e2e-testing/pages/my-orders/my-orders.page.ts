import { Page } from "@playwright/test";
import { AllSection } from "./sections/01-all.section";
import { PendingSection } from "./sections/02-pending.section";
import { PreparingSection } from "./sections/03-preparing.section";
import { ToShipSection } from "./sections/04-to-ship.section";
import { ToReceiveSection } from "./sections/05-to-receive.section";
import { CompleteSection } from "./sections/06-complete.section";
import { CancelledSection } from "./sections/07-cancelled.section";

export class MyOrdersPage {
    readonly page: Page;

    readonly allSection: AllSection;
    readonly pendingSection: PendingSection;
    readonly preparingSection: PreparingSection;
    readonly toShipSection: ToShipSection;
    readonly toReceiveSection: ToReceiveSection;
    readonly completeSection: CompleteSection;
    readonly cancelledSection: CancelledSection;

    constructor(page: Page) {
        this.page = page;
        this.allSection = new AllSection(page);
        this.pendingSection = new PendingSection(page);
        this.preparingSection = new PreparingSection(page);
        this.toShipSection = new ToShipSection(page);
        this.toReceiveSection = new ToReceiveSection(page);
        this.completeSection = new CompleteSection(page);
        this.cancelledSection = new CancelledSection(page);
    }
}