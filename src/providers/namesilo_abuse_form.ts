import type { ProviderModule } from "./index";
import {
  findFieldByLabelText,
  findInputByNames,
  findSelectByNames,
  findTextareaByNames
} from "../utils/domHelpers";
import { safeFillIfVisible, safeSelectOption } from "../utils/safeFill";

const domainCandidates = ["domain"];
const reportTypeCandidates = ["report_type"];
const desiredResolutionCandidates = ["desired_resolution"];
const yourNameCandidates = ["your_name"];
const yourEmailCandidates = ["your_email"];
const commentsCandidates = ["comments"];

function extractDomainFromUrls(urls: string[]): string {
  for (const rawUrl of urls) {
    const value = rawUrl.trim();
    if (!value) {
      continue;
    }
    try {
      const parsed = new URL(value);
      if (parsed.hostname) {
        return parsed.hostname.replace(/^www\./i, "");
      }
    } catch {
      const withoutProtocol = value.replace(/^https?:\/\//i, "");
      const domain = withoutProtocol.split(/[/?#]/)[0]?.trim() ?? "";
      if (domain) {
        return domain.replace(/^www\./i, "");
      }
    }
  }
  return "";
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

export const namesiloAbuseFormProvider: ProviderModule = {
  id: "namesilo_abuse_form",
  isMatch(url: string): boolean {
    return url.includes("namesilo.com/report_abuse.php");
  },
  autofill(payload): number {
    let filledCount = 0;

    const domainValue = extractDomainFromUrls(payload.urls);
    const domainField =
      findInputByNames(domainCandidates) ??
      (findFieldByLabelText(["domain name"]) as HTMLInputElement | null);
    if (safeFillBySelector(selectorForField(domainField), domainValue)) {
      filledCount += 1;
    }

    const reportTypeField =
      findSelectByNames(reportTypeCandidates) ??
      (findFieldByLabelText(["type of report"]) as HTMLSelectElement | null);
    if (safeSelectOption(reportTypeField, "Domain-Trademark")) {
      filledCount += 1;
    }

    const desiredResolutionField =
      findSelectByNames(desiredResolutionCandidates) ??
      (findFieldByLabelText(["desired resolution"]) as HTMLSelectElement | null);
    if (safeSelectOption(desiredResolutionField, "Forward-Registrant")) {
      filledCount += 1;
    }

    const yourNameField =
      findInputByNames(yourNameCandidates) ??
      (findFieldByLabelText(["your name"]) as HTMLInputElement | null);
    if (safeFillBySelector(selectorForField(yourNameField), payload.analyst.fullName)) {
      filledCount += 1;
    }

    const yourEmailField =
      findInputByNames(yourEmailCandidates) ??
      (findFieldByLabelText(["your email"]) as HTMLInputElement | null);
    if (safeFillBySelector(selectorForField(yourEmailField), payload.analyst.email)) {
      filledCount += 1;
    }

    const commentsField =
      findTextareaByNames(commentsCandidates) ??
      (findFieldByLabelText(["comments"]) as HTMLTextAreaElement | null);
    if (safeFillBySelector(selectorForField(commentsField), payload.description)) {
      filledCount += 1;
    }

    return filledCount;
  }
};
