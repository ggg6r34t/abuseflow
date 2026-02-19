import type { ProviderModule } from "./index";
import { safeFillIfVisible } from "../utils/safeFill";

const yourNameCandidates = ["your_name"];
const organizationNameCandidates = ["organization_name"];
const organizationAddressCandidates = ["organization_address"];
const emailCandidates = ["email_address"];
const reportedUrlCandidates = ["url_impersonation_sites"];
const officialUrlCandidates = ["official_url"];

function firstUrl(urls: string[]): string {
  return urls.find((url) => url.trim().length > 0)?.trim() ?? "";
}

function safeFillInputByNames(names: readonly string[], value: string): boolean {
  for (const name of names) {
    if (safeFillIfVisible(`input[name="${CSS.escape(name)}"]`, value)) {
      return true;
    }
  }
  return false;
}

function findPhoneInput(): HTMLInputElement | null {
  const phoneSelectHost = document.getElementById("phone_number");
  if (!phoneSelectHost || !phoneSelectHost.parentElement) {
    return null;
  }
  const telInput = phoneSelectHost.parentElement.querySelector<HTMLInputElement>('input[type="tel"]');
  return telInput ?? null;
}

export const googleAbuseFormProvider: ProviderModule = {
  id: "google_abuse_form",
  isMatch(url: string): boolean {
    return url.includes("support.google.com/sites/contact/corporate_impersonation");
  },
  autofill(payload): number {
    let filledCount = 0;

    if (safeFillInputByNames(yourNameCandidates, payload.analyst.fullName)) {
      filledCount += 1;
    }

    if (safeFillInputByNames(organizationNameCandidates, payload.analyst.company ?? payload.client.clientName)) {
      filledCount += 1;
    }

    if (safeFillInputByNames(organizationAddressCandidates, payload.analyst.companyAddress ?? "")) {
      filledCount += 1;
    }

    const phoneField = findPhoneInput();
    if (phoneField && !phoneField.id) {
      phoneField.id = "abuseflow-google-phone-input";
    }
    if (phoneField?.id && safeFillIfVisible(`#${CSS.escape(phoneField.id)}`, "")) {
      filledCount += 1;
    }

    if (safeFillInputByNames(emailCandidates, payload.analyst.email)) {
      filledCount += 1;
    }

    if (safeFillInputByNames(reportedUrlCandidates, firstUrl(payload.urls))) {
      filledCount += 1;
    }

    if (safeFillInputByNames(officialUrlCandidates, payload.client.trademarkUrl ?? "")) {
      filledCount += 1;
    }

    return filledCount;
  }
};
