import type { ProviderModule } from "./index";
import { isProviderUrl } from "../config/providerRoutes";
import { isElementVisible, safeFillIfVisible } from "../utils/safeFill";

const abuseTypeInputId = "report-abuse-form-abuseType";
const reporterNameInputId = "report-abuse-form-reporterName";
const reporterEmailInputId = "report-abuse-form-reporterEmail";
const abuserWebsiteInputId = "report-abuse-form-abuserWebsite";
const commentsInputId = "report-abuse-form-message";

function firstUrl(urls: string[]): string {
  return urls.find((url) => url.trim().length > 0)?.trim() ?? "";
}

function safeSelectAbuseType(optionText: string): boolean {
  const input = document.getElementById(abuseTypeInputId);
  if (!(input instanceof HTMLInputElement)) {
    return false;
  }
  if (!isElementVisible(input) || input.disabled || input.readOnly) {
    return false;
  }
  if (input.value.trim().length > 0) {
    return false;
  }

  input.click();

  const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"].h-form-field__option'));
  const normalizedTarget = optionText.trim().toLowerCase();
  const option = options.find(
    (item) => (item.textContent ?? "").trim().toLowerCase() === normalizedTarget
  );
  if (!option || !isElementVisible(option)) {
    return false;
  }

  option.click();
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

export const hostingerAbuseFormProvider: ProviderModule = {
  id: "hostinger_abuse_form",
  isMatch(url: string): boolean {
    return isProviderUrl("hostinger_abuse_form", url);
  },
  autofill(payload): number {
    let filledCount = 0;

    if (safeSelectAbuseType("Copyright infringement")) {
      filledCount += 1;
    }

    if (safeFillIfVisible(`#${CSS.escape(reporterNameInputId)}`, payload.analyst.fullName)) {
      filledCount += 1;
    }

    if (safeFillIfVisible(`#${CSS.escape(reporterEmailInputId)}`, payload.analyst.email)) {
      filledCount += 1;
    }

    if (safeFillIfVisible(`#${CSS.escape(abuserWebsiteInputId)}`, firstUrl(payload.urls))) {
      filledCount += 1;
    }

    if (safeFillIfVisible(`#${CSS.escape(commentsInputId)}`, payload.description)) {
      filledCount += 1;
    }

    return filledCount;
  }
};
