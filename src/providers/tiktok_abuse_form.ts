import type { ProviderModule } from "./index";
import { isProviderUrl } from "../config/providerRoutes";
import { isElementVisible, safeFillIfVisible } from "../utils/safeFill";

function findInputInSection(sectionId: string): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>(`#${CSS.escape(sectionId)} input[type="text"]`);
}

function findTextareaInSection(sectionId: string): HTMLTextAreaElement | null {
  return document.querySelector<HTMLTextAreaElement>(`#${CSS.escape(sectionId)} textarea`);
}

function safeCheckRadioByNameValue(name: string, value: string): boolean {
  const radios = Array.from(
    document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(name)}"]`)
  );
  const eligibleRadios = radios.filter((radio) => isElementVisible(radio) && !radio.disabled);
  if (eligibleRadios.length === 0 || eligibleRadios.some((radio) => radio.checked)) {
    return false;
  }
  const target = eligibleRadios.find((radio) => radio.value.trim() === value);
  if (!target) {
    return false;
  }
  target.focus();
  target.click();
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function safeCheckAgreementCheckboxes(): number {
  let checkedCount = 0;
  const checkboxes = Array.from(
    document.querySelectorAll<HTMLInputElement>(`#agreement input[type="checkbox"][data-tux-checkbox-input="true"]`)
  );
  for (const checkbox of checkboxes) {
    if (checkbox.checked || checkbox.disabled || !isElementVisible(checkbox)) {
      continue;
    }
    checkbox.focus();
    checkbox.click();
    checkbox.dispatchEvent(new Event("input", { bubbles: true }));
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    checkedCount += 1;
  }
  return checkedCount;
}

function safeFillIfEnabled(element: HTMLInputElement | HTMLTextAreaElement | null, value: string): boolean {
  if (!element) {
    return false;
  }
  if (element.id) {
    return safeFillIfVisible(`#${CSS.escape(element.id)}`, value);
  }
  const tag = element instanceof HTMLTextAreaElement ? "textarea" : "input";
  if (!element.name) {
    return false;
  }
  return safeFillIfVisible(`${tag}[name="${CSS.escape(element.name)}"]`, value);
}

export const tiktokAbuseFormProvider: ProviderModule = {
  id: "tiktok_abuse_form",
  isMatch(url: string): boolean {
    return isProviderUrl("tiktok_abuse_form", url);
  },
  autofill(payload): number {
    let filledCount = 0;

    if (safeFillIfEnabled(findInputInSection("name"), payload.analyst.fullName)) {
      filledCount += 1;
    }
    if (safeFillIfEnabled(findInputInSection("nameOfOwner"), payload.client.clientName)) {
      filledCount += 1;
    }
    if (safeFillIfEnabled(findInputInSection("address"), payload.analyst.companyAddress ?? "")) {
      filledCount += 1;
    }
    if (safeFillIfEnabled(findInputInSection("phoneNumber"), payload.analyst.phone ?? "")) {
      filledCount += 1;
    }

    if (safeCheckRadioByNameValue("extra.cfGoods", "0")) {
      filledCount += 1;
    }
    if (safeCheckRadioByNameValue("relationship", "4")) {
      filledCount += 1;
    }

    if (safeFillIfEnabled(findInputInSection("jurisdiction"), payload.client.jurisdiction)) {
      filledCount += 1;
    }
    if (safeFillIfEnabled(findInputInSection("registrationNumber"), payload.client.registrationNumber)) {
      filledCount += 1;
    }
    if (safeFillIfEnabled(findInputInSection("goodsServiceClass"), "Other")) {
      filledCount += 1;
    }
    if (safeFillIfEnabled(findInputInSection("recordUrl"), payload.client.trademarkUrl ?? "")) {
      filledCount += 1;
    }

    if (safeFillIfEnabled(findTextareaInSection("link"), payload.urls.join("\n"))) {
      filledCount += 1;
    }
    if (safeCheckRadioByNameValue("personalAccount", "0")) {
      filledCount += 1;
    }

    if (safeFillIfEnabled(findInputInSection("description"), payload.description)) {
      filledCount += 1;
    }

    filledCount += safeCheckAgreementCheckboxes();

    if (safeFillIfEnabled(findInputInSection("signature"), payload.analyst.signature)) {
      filledCount += 1;
    }

    return filledCount;
  }
};
