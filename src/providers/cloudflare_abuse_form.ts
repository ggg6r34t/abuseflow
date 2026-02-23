import type { ProviderModule } from "./index";
import { isProviderUrl } from "../config/providerRoutes";
import { safeFillIfVisible } from "../utils/safeFill";

const fullNameCandidates = ["name"];
const emailCandidates = ["email"];
const confirmEmailCandidates = ["email2"];
const titleCandidates = ["title"];
const companyCandidates = ["company"];
const trademarkSymbolCandidates = ["trademark_symbol"];
const trademarkNumberCandidates = ["trademark_number"];
const trademarkOfficeCandidates = ["trademark_office"];
const urlsCandidates = ["urls"];
const justificationCandidates = ["justification"];
const commentsCandidates = ["comments"];

function pickTrademarkOffice(jurisdiction: string): string {
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

export const cloudflareAbuseFormProvider: ProviderModule = {
  id: "cloudflare_abuse_form",
  isMatch(url: string): boolean {
    return isProviderUrl("cloudflare_abuse_form", url);
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

    if (safeFillInputByNames(titleCandidates, "Authorized Representative")) {
      filledCount += 1;
    }

    if (safeFillInputByNames(companyCandidates, payload.analyst.company ?? payload.client.clientName)) {
      filledCount += 1;
    }

    if (safeFillInputByNames(trademarkSymbolCandidates, payload.client.trademarkName)) {
      filledCount += 1;
    }

    if (safeFillInputByNames(trademarkNumberCandidates, payload.client.registrationNumber)) {
      filledCount += 1;
    }

    if (safeFillInputByNames(trademarkOfficeCandidates, pickTrademarkOffice(payload.client.jurisdiction))) {
      filledCount += 1;
    }

    if (safeFillTextareaByNames(urlsCandidates, payload.urls.join("\n"))) {
      filledCount += 1;
    }

    if (safeFillTextareaByNames(justificationCandidates, payload.description)) {
      filledCount += 1;
    }

    if (safeFillTextareaByNames(commentsCandidates, "Submitted by authorized representative.")) {
      filledCount += 1;
    }

    return filledCount;
  }
};
