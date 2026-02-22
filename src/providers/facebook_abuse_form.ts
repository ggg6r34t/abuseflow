import type { ProviderModule } from "./index";
import {
  findFieldByLabelText,
  findInputByNames,
  findInputsByNamePrefix,
  findSelectByNames,
  findTextareaByNames,
  findTextareasByNamePrefix
} from "../utils/domHelpers";
import { isElementVisible, safeFillIfVisible, safeSelectOption } from "../utils/safeFill";

const continueReportCandidates = ["continuereport"];
const relationshipCandidates = ["relationship_rightsowner"];
const nameCandidates = ["your_name", "full_name", "name"];
const emailCandidates = ["email", "email_address"];
const confirmEmailCandidates = ["confirm_email", "email_confirm", "email_confirmation"];
const rightsOwnerCandidates = ["reporter_name", "rights_owner", "rights_owner_name", "owner_name"];
const trademarkCandidates = ["what_is_your_trademark", "trademark", "trademark_name"];
const registrationInputCandidates = ["registration_number", "trademark_registration_number", "reg_number"];
const registrationTextareaCandidates = ["TMREGNUMBER"];
const jurisdictionCandidates = ["rights_owner_country_routing", "jurisdiction", "country", "registration_country"];
const trademarkUrlCandidates = ["TM_URL", "trademark_url"];
const descriptionCandidates = ["why_reporting_other", "description", "details", "additional_info"];
const addressCandidates = ["Address", "address", "mailing_address"];
const signatureCandidates = ["electronic_signature", "signature"];
const additionalLinksCandidates = ["additionallinks[]", "additionallinks"];
let didAutoExpandAdditionalLinks = false;

export function consumeFacebookAdditionalLinksAutoExpanded(): boolean {
  const value = didAutoExpandAdditionalLinks;
  didAutoExpandAdditionalLinks = false;
  return value;
}

function safeCheckRadioByNameValue(name: string, value: string): boolean {
  const radios = Array.from(document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(name)}"]`));
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

function safeCheckAdditionalLinksCheckbox(): boolean {
  for (const name of additionalLinksCandidates) {
    const checkboxes = Array.from(
      document.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${CSS.escape(name)}"]`)
    ).filter((checkbox) => isElementVisible(checkbox) && !checkbox.disabled);
    const target = checkboxes.find((checkbox) => !checkbox.checked);
    if (!target) {
      continue;
    }
    target.focus();
    target.click();
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  const fallback = findFieldByLabelText(["i have additional links to report"]);
  if (!(fallback instanceof HTMLInputElement) || fallback.type !== "checkbox") {
    return false;
  }
  if (!isElementVisible(fallback) || fallback.disabled || fallback.checked) {
    return false;
  }
  fallback.focus();
  fallback.click();
  fallback.dispatchEvent(new Event("input", { bubbles: true }));
  fallback.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function contentUrlFieldOrder(name: string): number {
  if (name === "content_urls") {
    return 0;
  }
  const match = /^content_urls(\d+)$/.exec(name);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }
  const suffix = match[1];
  if (!suffix) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Number.parseInt(suffix, 10) + 1;
}

function getVisibleOrderedContentUrlFields(): Array<HTMLInputElement | HTMLTextAreaElement> {
  const urlInputs = findInputsByNamePrefix("content_urls");
  const urlTextareas = findTextareasByNamePrefix("content_urls");
  return (urlTextareas.length > 0 ? urlTextareas : urlInputs)
    .filter((field) => isElementVisible(field) && !field.disabled)
    .sort((a, b) => {
      const orderDelta = contentUrlFieldOrder(a.name) - contentUrlFieldOrder(b.name);
      return orderDelta !== 0 ? orderDelta : a.name.localeCompare(b.name);
    });
}

function fillUrlsIntoFields(
  urls: string[],
  startIndex: number,
  fields: Array<HTMLInputElement | HTMLTextAreaElement>
): { filledCount: number; nextUrlIndex: number } {
  let filledCount = 0;
  let urlIndex = startIndex;
  let fieldIndex = 0;

  while (urlIndex < urls.length && fieldIndex < fields.length) {
    const url = urls[urlIndex]?.trim() ?? "";
    if (!url) {
      urlIndex += 1;
      continue;
    }

    const field = fields[fieldIndex];
    fieldIndex += 1;
    if (!field) {
      break;
    }

    if (safeFillBySelector(selectorForField(field), url)) {
      filledCount += 1;
      urlIndex += 1;
    }
  }

  return { filledCount, nextUrlIndex: urlIndex };
}

function fillPrimaryFields(payload: Parameters<ProviderModule["autofill"]>[0]): number {
  let filledCount = 0;

  for (const name of continueReportCandidates) {
    if (safeCheckRadioByNameValue(name, "trademark")) {
      filledCount += 1;
      break;
    }
  }

  for (const name of relationshipCandidates) {
    if (safeCheckRadioByNameValue(name, "I am reporting on behalf of my organization or client.")) {
      filledCount += 1;
      break;
    }
  }

  const fullNameField =
    findInputByNames(nameCandidates) ??
    (findFieldByLabelText(["your full name", "full name"]) as HTMLInputElement | null);
  if (safeFillBySelector(selectorForField(fullNameField), payload.analyst.fullName)) {
    filledCount += 1;
  }

  const emailField =
    findInputByNames(emailCandidates) ??
    (findFieldByLabelText(["email address", "email"]) as HTMLInputElement | null);
  if (safeFillBySelector(selectorForField(emailField), payload.analyst.email)) {
    filledCount += 1;
  }

  const confirmEmailField =
    findInputByNames(confirmEmailCandidates) ??
    (findFieldByLabelText(["confirm email", "re-enter email"]) as HTMLInputElement | null);
  if (safeFillBySelector(selectorForField(confirmEmailField), payload.analyst.email)) {
    filledCount += 1;
  }

  const rightsOwnerField =
    findInputByNames(rightsOwnerCandidates) ??
    (findFieldByLabelText(["name of rights owner", "rights owner"]) as HTMLInputElement | null);
  if (safeFillBySelector(selectorForField(rightsOwnerField), payload.client.clientName)) {
    filledCount += 1;
  }

  const trademarkField =
    findInputByNames(trademarkCandidates) ??
    (findFieldByLabelText(["what is the trademark", "trademark"]) as HTMLInputElement | null);
  if (safeFillBySelector(selectorForField(trademarkField), payload.client.trademarkName)) {
    filledCount += 1;
  }

  const registrationField =
    findTextareaByNames(registrationTextareaCandidates) ??
    findInputByNames(registrationInputCandidates) ??
    (findFieldByLabelText(["registration number", "trademark registration"]) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null);
  if (safeFillBySelector(selectorForField(registrationField), payload.client.registrationNumber)) {
    filledCount += 1;
  }

  const jurisdictionField =
    findSelectByNames(jurisdictionCandidates) ??
    (findFieldByLabelText(["jurisdiction", "country"]) as HTMLSelectElement | null);
  if (safeSelectOption(jurisdictionField, payload.client.jurisdiction)) {
    filledCount += 1;
  }

  const trademarkUrlField =
    findInputByNames(trademarkUrlCandidates) ??
    (findFieldByLabelText(["link to the trademark registration", "trademark registration from an online trademark database"]) as
      | HTMLInputElement
      | null);
  if (safeFillBySelector(selectorForField(trademarkUrlField), payload.client.trademarkUrl ?? "")) {
    filledCount += 1;
  }

  const addressField =
    findTextareaByNames(addressCandidates) ??
    (findFieldByLabelText(["mailing address", "address"]) as HTMLTextAreaElement | null);
  if (safeFillBySelector(selectorForField(addressField), payload.analyst.companyAddress ?? "")) {
    filledCount += 1;
  }

  const descriptionField =
    findTextareaByNames(descriptionCandidates) ??
    (findFieldByLabelText(["description", "details"]) as HTMLTextAreaElement | null);
  if (safeFillBySelector(selectorForField(descriptionField), payload.description)) {
    filledCount += 1;
  }

  const signatureField =
    findInputByNames(signatureCandidates) ??
    (findFieldByLabelText(["electronic signature", "signature"]) as HTMLInputElement | null);
  if (safeFillBySelector(selectorForField(signatureField), payload.analyst.signature)) {
    filledCount += 1;
  }

  return filledCount;
}

function fillUrlFields(urls: string[]): number {
  const normalizedUrls = urls.map((url) => url.trim()).filter((url) => url.length > 0);
  if (normalizedUrls.length === 0) {
    return 0;
  }

  let totalFilledCount = 0;
  let nextUrlIndex = 0;

  const firstPass = fillUrlsIntoFields(normalizedUrls, nextUrlIndex, getVisibleOrderedContentUrlFields());
  totalFilledCount += firstPass.filledCount;
  nextUrlIndex = firstPass.nextUrlIndex;

  if (nextUrlIndex < normalizedUrls.length && safeCheckAdditionalLinksCheckbox()) {
    didAutoExpandAdditionalLinks = true;
    const secondPass = fillUrlsIntoFields(normalizedUrls, nextUrlIndex, getVisibleOrderedContentUrlFields());
    totalFilledCount += secondPass.filledCount;
    nextUrlIndex = secondPass.nextUrlIndex;
  }

  if (totalFilledCount > 0) {
    return totalFilledCount;
  }

  const fallbackField =
    (findFieldByLabelText(["url", "content url", "infringing url"]) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null);
  if (safeFillBySelector(selectorForField(fallbackField), normalizedUrls.join("\n"))) {
    return 1;
  }
  return 0;
}

export const facebookAbuseFormProvider: ProviderModule = {
  id: "facebook_abuse_form",
  isMatch(url: string): boolean {
    return url.includes("facebook.com/help/contact");
  },
  autofill(payload): number {
    didAutoExpandAdditionalLinks = false;
    const primaryCount = fillPrimaryFields(payload);
    const urlCount = fillUrlFields(payload.urls);
    return primaryCount + urlCount;
  }
};
