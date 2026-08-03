import { Page } from "@playwright/test";
import { AddEditVoucherSection } from "./sections/add-edit-voucher.section";
import { DeleteVoucherSection } from "./sections/delete-voucher.section";
import { ListVouchersSection } from "./sections/list-vouchers.section";
export class SellerVouchersPage {
    readonly page: Page;

    readonly addEditVoucherSection: AddEditVoucherSection;
    readonly deleteVoucherSection: DeleteVoucherSection;
    readonly listVouchersSection: ListVouchersSection;




    constructor(page: Page) {
        this.page = page;
        this.addEditVoucherSection = new AddEditVoucherSection(page);
        this.deleteVoucherSection = new DeleteVoucherSection(page);
        this.listVouchersSection = new ListVouchersSection(page);
    }
}