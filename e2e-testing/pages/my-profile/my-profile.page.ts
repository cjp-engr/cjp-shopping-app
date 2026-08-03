import { Page } from "@playwright/test";
import { SaveAddressesSection } from "./sections/01-saved-addresses.section";
import { PersonalInformationSection } from "./sections/02-personal-information.section";
import { EditProfileSection } from "./sections/03-edit-profile.section";

export class MyProfilePage {
    readonly page: Page;

    readonly savedAddressesSection: SaveAddressesSection;
    readonly personalInformationSection: PersonalInformationSection;
    readonly editProfileSection: EditProfileSection;



    constructor(page: Page) {
        this.page = page;
        this.savedAddressesSection = new SaveAddressesSection(page);
        this.personalInformationSection = new PersonalInformationSection(page);
        this.editProfileSection = new EditProfileSection(page);
    }
}