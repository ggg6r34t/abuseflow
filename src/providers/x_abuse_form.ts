import type { ProviderModule } from "./index";
import { findInputByNames, findSelectByNames, findTextareaByNames } from "../utils/domHelpers";
import { isElementVisible, safeFillIfVisible, safeSelectOption } from "../utils/safeFill";

const fullNameCandidates = ["_-404431659@name"];
const jobTitleCandidates = ["_-404431659@job-title"];
const companyCandidates = ["_-404431659@company"];
const companyWebsiteCandidates = ["_-404431659@company-website"];
const emailCandidates = ["_-404431659@Form_Email__c"];
const phoneCandidates = ["_-404431659@SuppliedPhone"];
const platformCandidates = ["_1691786258@Type_of_Issue__c"];
const reportedUsernameCandidates = ["_1691786258@Reported_Screen_Name__c"];
const detailsCandidates = ["_1691786258@DescriptionText"];
const trademarkHolderNameCandidates = ["_-1945608478@Content_Owner_Name__c"];
const trademarkHolderAddressCandidates = ["_-1945608478@trademark-holder-address"];
const trademarkHolderCountryCandidates = ["_-1945608478@trademark-holder-country"];
const trademarkHolderWebsiteCandidates = ["_-1945608478@trademark-holder-website"];
const trademarkHolderUsernameCandidates = ["_-1945608478@trademark-holder-username"];
const trademarkWordCandidates = ["_-952722188@trademark-word"];
const trademarkRegNumberCandidates = ["_-952722188@Registration_Number__c"];
const trademarkClassCandidates = ["_-952722188@trademark-class"];
const regOfficeCandidates = ["_-952722188@reg-office"];
const trademarkLinkCandidates = ["_-952722188@trademark-link"];
const confirmationCheckboxCandidates = ["confirm-1", "confirm-2", "confirm-3"];

function safeCheckRadioByNameValue(name: string, value: string): boolean {
  const radios = Array.from(
    document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(name)}"]`)
  );
  const eligibleRadios = radios.filter((radio) => isElementVisible(radio) && !radio.disabled);
  if (eligibleRadios.length === 0 || eligibleRadios.some((radio) => radio.checked)) {
    return false;
  }
  const normalizedTarget = value.trim().toLowerCase();
  if (!normalizedTarget) {
    return false;
  }
  const matched = eligibleRadios.find((radio) => radio.value.trim().toLowerCase() === normalizedTarget);
  if (!matched) {
    return false;
  }
  matched.focus();
  matched.click();
  matched.dispatchEvent(new Event("input", { bubbles: true }));
  matched.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function safeCheckByName(name: string): boolean {
  const checkbox = document.querySelector<HTMLInputElement>(
    `input[type="checkbox"][name="${CSS.escape(name)}"]`
  );
  if (!checkbox || checkbox.checked || checkbox.disabled || !isElementVisible(checkbox)) {
    return false;
  }
  checkbox.focus();
  checkbox.click();
  checkbox.dispatchEvent(new Event("input", { bubbles: true }));
  checkbox.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function selectorForField(field: HTMLInputElement | HTMLTextAreaElement | null): string | null {
  if (!field) {
    return null;
  }
  if (field.id) {
    return `#${CSS.escape(field.id)}`;
  }
  if (field.name) {
    const tag = field instanceof HTMLTextAreaElement ? "textarea" : "input";
    return `${tag}[name="${CSS.escape(field.name)}"]`;
  }
  return null;
}

function safeFillBySelector(selector: string | null, value: string): boolean {
  if (!selector) {
    return false;
  }
  return safeFillIfVisible(selector, value);
}

function normalizeProfileUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol;
}

function extractUsername(urls: string[]): string {
  for (const rawUrl of urls) {
    const normalized = normalizeProfileUrl(rawUrl);
    if (!normalized) {
      continue;
    }
    try {
      const parsed = new URL(normalized);
      const hostname = parsed.hostname.toLowerCase();
      if (!hostname.includes("x.com") && !hostname.includes("twitter.com")) {
        continue;
      }
      const parts = parsed.pathname.split("/").map((part) => part.trim()).filter((part) => part.length > 0);
      const first = parts[0];
      if (!first) {
        continue;
      }
      if (first.toLowerCase() === "i" || first.toLowerCase() === "home") {
        continue;
      }
      return first.replace(/^@/, "");
    } catch {
      continue;
    }
  }
  return "";
}

function pickWebsite(clientWebsite: string | undefined, urls: string[]): string {
  const normalizedClientWebsite = normalizeProfileUrl(clientWebsite ?? "");
  if (normalizedClientWebsite) {
    return normalizedClientWebsite;
  }
  const firstUrl = urls[0] ?? "";
  return normalizeProfileUrl(firstUrl);
}

export const xAbuseFormProvider: ProviderModule = {
  id: "x_abuse_form",
  isMatch(url: string): boolean {
    return url.includes("help.x.com/en/forms/ipi/trademark/auth-to-rep");
  },
  autofill(payload): number {
    let filledCount = 0;

    const defaultWebsite = pickWebsite(payload.client.trademarkUrl, payload.urls);
    const reportedUsername = extractUsername(payload.urls);

    const fullNameField = findInputByNames(fullNameCandidates);
    if (safeFillBySelector(selectorForField(fullNameField), payload.analyst.fullName)) {
      filledCount += 1;
    }

    const jobTitleField = findInputByNames(jobTitleCandidates);
    if (safeFillBySelector(selectorForField(jobTitleField), "Authorized Representative")) {
      filledCount += 1;
    }

    const companyField = findInputByNames(companyCandidates);
    if (safeFillBySelector(selectorForField(companyField), payload.analyst.company ?? payload.client.clientName)) {
      filledCount += 1;
    }

    const companyWebsiteField = findInputByNames(companyWebsiteCandidates);
    if (safeFillBySelector(selectorForField(companyWebsiteField), defaultWebsite)) {
      filledCount += 1;
    }

    const emailField = findInputByNames(emailCandidates);
    if (safeFillBySelector(selectorForField(emailField), payload.analyst.email)) {
      filledCount += 1;
    }

    const phoneField = findInputByNames(phoneCandidates);
    if (safeFillBySelector(selectorForField(phoneField), "")) {
      filledCount += 1;
    }

    for (const candidate of platformCandidates) {
      if (safeCheckRadioByNameValue(candidate, "X")) {
        filledCount += 1;
        break;
      }
    }

    const reportedUsernameField = findInputByNames(reportedUsernameCandidates);
    if (safeFillBySelector(selectorForField(reportedUsernameField), reportedUsername)) {
      filledCount += 1;
    }

    const detailsField = findTextareaByNames(detailsCandidates);
    if (safeFillBySelector(selectorForField(detailsField), payload.description)) {
      filledCount += 1;
    }

    const holderNameField = findInputByNames(trademarkHolderNameCandidates);
    if (safeFillBySelector(selectorForField(holderNameField), payload.client.clientName)) {
      filledCount += 1;
    }

    const holderAddressField = findInputByNames(trademarkHolderAddressCandidates);
    if (safeFillBySelector(selectorForField(holderAddressField), payload.analyst.companyAddress ?? "")) {
      filledCount += 1;
    }

    const holderCountryField = findSelectByNames(trademarkHolderCountryCandidates);
    if (safeSelectOption(holderCountryField, payload.client.jurisdiction)) {
      filledCount += 1;
    }

    const holderWebsiteField = findInputByNames(trademarkHolderWebsiteCandidates);
    if (safeFillBySelector(selectorForField(holderWebsiteField), defaultWebsite)) {
      filledCount += 1;
    }

    const holderUsernameField = findInputByNames(trademarkHolderUsernameCandidates);
    if (safeFillBySelector(selectorForField(holderUsernameField), reportedUsername ? `@${reportedUsername}` : "")) {
      filledCount += 1;
    }

    const trademarkWordField = findInputByNames(trademarkWordCandidates);
    if (safeFillBySelector(selectorForField(trademarkWordField), payload.client.trademarkName)) {
      filledCount += 1;
    }

    const trademarkRegNumberField = findInputByNames(trademarkRegNumberCandidates);
    if (safeFillBySelector(selectorForField(trademarkRegNumberField), payload.client.registrationNumber)) {
      filledCount += 1;
    }

    const trademarkClassField = findSelectByNames(trademarkClassCandidates);
    if (safeSelectOption(trademarkClassField, "Other")) {
      filledCount += 1;
    }

    const regOfficeField = findInputByNames(regOfficeCandidates);
    if (safeFillBySelector(selectorForField(regOfficeField), `${payload.client.jurisdiction} Trademark Office`)) {
      filledCount += 1;
    }

    const trademarkLinkField = findInputByNames(trademarkLinkCandidates);
    if (safeFillBySelector(selectorForField(trademarkLinkField), defaultWebsite)) {
      filledCount += 1;
    }

    for (const checkboxName of confirmationCheckboxCandidates) {
      if (safeCheckByName(checkboxName)) {
        filledCount += 1;
      }
    }

    return filledCount;
  }
};
