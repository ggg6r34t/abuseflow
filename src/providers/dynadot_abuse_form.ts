import type { ProviderModule } from "./index";
import { safeFillIfVisible } from "../utils/safeFill";

const fullNameCandidates = ["full_name_7"];
const emailCandidates = ["email_7"];
const confirmEmailCandidates = ["email2_7"];
const phoneCandidates = ["phone_7"];
const addressCandidates = ["address_7"];
const proxyCandidates = ["proxy_locations_7"];
const domainPathCandidates = ["domain_path_7"];
const trademarkWordCandidates = ["word_symbol_7"];
const registrationNumberCandidates = ["reg_number_7"];
const registrationOfficeCandidates = ["reg_office_7"];
const commentsCandidates = ["comments_7"];

function firstUrl(urls: string[]): string {
  return urls.find((url) => url.trim().length > 0)?.trim() ?? "";
}

function deriveRegistrationOffice(jurisdiction: string): string {
  const normalized = jurisdiction.trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (normalized.includes("united states") || normalized === "us" || normalized === "usa") {
    return "USPTO";
  }
  if (normalized.includes("european union") || normalized === "eu" || normalized.includes("euipo")) {
    return "EUIPO";
  }
  if (normalized.includes("united kingdom") || normalized === "uk") {
    return "UKIPO";
  }
  return `${jurisdiction.trim()} trademark office`;
}

function safeFillInputByNames(names: readonly string[], value: string): boolean {
  for (const name of names) {
    if (safeFillIfVisible(`input[name="${CSS.escape(name)}"]`, value)) {
      return true;
    }
  }
  return false;
}

function safeFillTextareaByNames(names: readonly string[], value: string): boolean {
  for (const name of names) {
    if (safeFillIfVisible(`textarea[name="${CSS.escape(name)}"]`, value)) {
      return true;
    }
  }
  return false;
}

export const dynadotAbuseFormProvider: ProviderModule = {
  id: "dynadot_abuse_form",
  isMatch(url: string): boolean {
    return url.includes("dynadot.com/report-abuse");
  },
  autofill(payload): number {
    let filledCount = 0;

    if (safeFillInputByNames(fullNameCandidates, payload.analyst.fullName)) {
      filledCount += 1;
    }

    if (safeFillInputByNames(emailCandidates, payload.analyst.email)) {
      filledCount += 1;
    }

    if (safeFillInputByNames(confirmEmailCandidates, payload.analyst.email)) {
      filledCount += 1;
    }

    if (safeFillInputByNames(phoneCandidates, "")) {
      filledCount += 1;
    }

    if (safeFillInputByNames(addressCandidates, payload.analyst.companyAddress ?? "")) {
      filledCount += 1;
    }

    if (safeFillInputByNames(proxyCandidates, "N/A")) {
      filledCount += 1;
    }

    if (safeFillInputByNames(domainPathCandidates, firstUrl(payload.urls))) {
      filledCount += 1;
    }

    if (safeFillInputByNames(trademarkWordCandidates, payload.client.trademarkName)) {
      filledCount += 1;
    }

    if (safeFillInputByNames(registrationNumberCandidates, payload.client.registrationNumber)) {
      filledCount += 1;
    }

    if (safeFillInputByNames(registrationOfficeCandidates, deriveRegistrationOffice(payload.client.jurisdiction))) {
      filledCount += 1;
    }

    if (safeFillTextareaByNames(commentsCandidates, payload.description)) {
      filledCount += 1;
    }

    return filledCount;
  }
};
