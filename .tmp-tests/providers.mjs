// providerRoutes.json
var providerRoutes_default = {
  providers: [
    {
      id: "facebook_abuse_form",
      rules: [
        {
          all: ["facebook.com/help/contact"]
        }
      ],
      manifestMatches: ["https://*.facebook.com/help/contact*"]
    },
    {
      id: "instagram_abuse_form",
      rules: [
        {
          all: ["help.instagram.com/contact"]
        }
      ],
      manifestMatches: ["https://help.instagram.com/contact/*"]
    },
    {
      id: "namesilo_abuse_form",
      rules: [
        {
          all: ["namesilo.com/report_abuse.php"]
        }
      ],
      manifestMatches: ["https://www.namesilo.com/report_abuse.php*"]
    },
    {
      id: "x_abuse_form",
      rules: [
        {
          all: ["help.x.com", "/forms/ipi/trademark/"]
        },
        {
          all: ["help.x.com", "/content/help-twitter/en/forms/ipi/trademark/"]
        }
      ],
      manifestMatches: [
        "https://help.x.com/en/forms/ipi/trademark/*",
        "https://help.x.com/content/help-twitter/en/forms/ipi/trademark/*"
      ]
    },
    {
      id: "cloudflare_abuse_form",
      rules: [
        {
          all: ["abuse.cloudflare.com/trademark"]
        }
      ],
      manifestMatches: ["https://abuse.cloudflare.com/trademark*"]
    },
    {
      id: "tiktok_abuse_form",
      rules: [
        {
          all: ["ipr.tiktokforbusiness.com/legal/report/trademark"]
        }
      ],
      manifestMatches: ["https://ipr.tiktokforbusiness.com/legal/report/Trademark*"]
    },
    {
      id: "hostinger_abuse_form",
      rules: [
        {
          all: ["hostinger.com/report-abuse"]
        }
      ],
      manifestMatches: ["https://www.hostinger.com/report-abuse*"]
    },
    {
      id: "dynadot_abuse_form",
      rules: [
        {
          all: ["dynadot.com/report-abuse"]
        }
      ],
      manifestMatches: ["https://www.dynadot.com/report-abuse*"]
    },
    {
      id: "google_abuse_form",
      rules: [
        {
          all: ["support.google.com/sites/contact/corporate_impersonation"]
        }
      ],
      manifestMatches: ["https://support.google.com/sites/contact/corporate_impersonation*"]
    }
  ]
};

// src/config/providerRoutes.ts
var providerEntries = providerRoutes_default.providers;
function normalizeUrl(url) {
  return url.toLowerCase();
}
function entryMatchesUrl(entry, normalizedUrl) {
  return entry.rules.some((rule) => rule.all.every((fragment) => normalizedUrl.includes(fragment.toLowerCase())));
}
function isProviderUrl(providerId, url) {
  const normalizedUrl = normalizeUrl(url);
  const entry = providerEntries.find((item) => item.id === providerId);
  if (!entry) {
    return false;
  }
  return entryMatchesUrl(entry, normalizedUrl);
}

// src/utils/safeFill.ts
function isFieldEmpty(value) {
  return value.trim().length === 0;
}
function isElementVisible(element) {
  if (!element.isConnected) {
    return false;
  }
  if (element instanceof HTMLElement && element.hidden) {
    return false;
  }
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") {
    return false;
  }
  return element.getClientRects().length > 0;
}
function dispatchFieldEvents(element) {
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}
function safeFillField(element, value) {
  if (!element || value.trim().length === 0) {
    return false;
  }
  if (!isElementVisible(element) || element.disabled || element.readOnly) {
    return false;
  }
  if (!isFieldEmpty(element.value)) {
    return false;
  }
  element.focus();
  element.value = value;
  dispatchFieldEvents(element);
  return true;
}
function safeFillIfVisible(selector, value, root = document) {
  const field = root.querySelector(selector);
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
    return false;
  }
  return safeFillField(field, value);
}
function findSelectOptionValue(select, targetValue) {
  const normalizedTarget = targetValue.trim().toLowerCase();
  if (!normalizedTarget) {
    return null;
  }
  for (const option of Array.from(select.options)) {
    const optionText = option.textContent?.trim().toLowerCase() ?? "";
    const optionValue = option.value.trim().toLowerCase();
    if (optionText === normalizedTarget || optionValue === normalizedTarget) {
      return option.value;
    }
  }
  for (const option of Array.from(select.options)) {
    const optionText = option.textContent?.trim().toLowerCase() ?? "";
    const optionValue = option.value.trim().toLowerCase();
    if (optionText.includes(normalizedTarget) || optionValue.includes(normalizedTarget)) {
      return option.value;
    }
  }
  return null;
}
function safeSelectOption(select, value) {
  if (!select || value.trim().length === 0) {
    return false;
  }
  if (!isElementVisible(select) || select.disabled) {
    return false;
  }
  if (!isFieldEmpty(select.value)) {
    return false;
  }
  const optionValue = findSelectOptionValue(select, value);
  if (!optionValue) {
    return false;
  }
  select.focus();
  select.value = optionValue;
  dispatchFieldEvents(select);
  return true;
}

// src/providers/cloudflare_abuse_form.ts
var fullNameCandidates = ["name"];
var emailCandidates = ["email"];
var confirmEmailCandidates = ["email2"];
var titleCandidates = ["title"];
var companyCandidates = ["company"];
var trademarkSymbolCandidates = ["trademark_symbol"];
var trademarkNumberCandidates = ["trademark_number"];
var trademarkOfficeCandidates = ["trademark_office"];
var urlsCandidates = ["urls"];
var justificationCandidates = ["justification"];
var commentsCandidates = ["comments"];
function pickTrademarkOffice(jurisdiction) {
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
function safeFillInputByNames(names, value) {
  for (const name of names) {
    if (safeFillIfVisible(`input[name="${CSS.escape(name)}"]`, value)) {
      return true;
    }
  }
  return false;
}
function safeFillTextareaByNames(names, value) {
  for (const name of names) {
    if (safeFillIfVisible(`textarea[name="${CSS.escape(name)}"]`, value)) {
      return true;
    }
  }
  return false;
}
var cloudflareAbuseFormProvider = {
  id: "cloudflare_abuse_form",
  isMatch(url) {
    return isProviderUrl("cloudflare_abuse_form", url);
  },
  autofill(payload) {
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

// src/providers/dynadot_abuse_form.ts
var fullNameCandidates2 = ["full_name_7"];
var emailCandidates2 = ["email_7"];
var confirmEmailCandidates2 = ["email2_7"];
var phoneCandidates = ["phone_7"];
var addressCandidates = ["address_7"];
var proxyCandidates = ["proxy_locations_7"];
var domainPathCandidates = ["domain_path_7"];
var trademarkWordCandidates = ["word_symbol_7"];
var registrationNumberCandidates = ["reg_number_7"];
var registrationOfficeCandidates = ["reg_office_7"];
var commentsCandidates2 = ["comments_7"];
function firstUrl(urls) {
  return urls.find((url) => url.trim().length > 0)?.trim() ?? "";
}
function deriveRegistrationOffice(jurisdiction) {
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
function safeFillInputByNames2(names, value) {
  for (const name of names) {
    if (safeFillIfVisible(`input[name="${CSS.escape(name)}"]`, value)) {
      return true;
    }
  }
  return false;
}
function safeFillTextareaByNames2(names, value) {
  for (const name of names) {
    if (safeFillIfVisible(`textarea[name="${CSS.escape(name)}"]`, value)) {
      return true;
    }
  }
  return false;
}
var dynadotAbuseFormProvider = {
  id: "dynadot_abuse_form",
  isMatch(url) {
    return isProviderUrl("dynadot_abuse_form", url);
  },
  autofill(payload) {
    let filledCount = 0;
    if (safeFillInputByNames2(fullNameCandidates2, payload.analyst.fullName)) {
      filledCount += 1;
    }
    if (safeFillInputByNames2(emailCandidates2, payload.analyst.email)) {
      filledCount += 1;
    }
    if (safeFillInputByNames2(confirmEmailCandidates2, payload.analyst.email)) {
      filledCount += 1;
    }
    if (safeFillInputByNames2(phoneCandidates, payload.analyst.phone ?? "")) {
      filledCount += 1;
    }
    if (safeFillInputByNames2(addressCandidates, payload.analyst.companyAddress ?? "")) {
      filledCount += 1;
    }
    if (safeFillInputByNames2(proxyCandidates, "N/A")) {
      filledCount += 1;
    }
    if (safeFillInputByNames2(domainPathCandidates, firstUrl(payload.urls))) {
      filledCount += 1;
    }
    if (safeFillInputByNames2(trademarkWordCandidates, payload.client.trademarkName)) {
      filledCount += 1;
    }
    if (safeFillInputByNames2(registrationNumberCandidates, payload.client.registrationNumber)) {
      filledCount += 1;
    }
    if (safeFillInputByNames2(registrationOfficeCandidates, deriveRegistrationOffice(payload.client.jurisdiction))) {
      filledCount += 1;
    }
    if (safeFillTextareaByNames2(commentsCandidates2, payload.description)) {
      filledCount += 1;
    }
    return filledCount;
  }
};

// src/utils/domHelpers.ts
function normalizeText(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
function textIncludesAny(text, candidates) {
  const normalizedText = normalizeText(text);
  return candidates.some((candidate) => normalizedText.includes(normalizeText(candidate)));
}
function findInputByNames(candidates) {
  for (const candidate of candidates) {
    const escaped = CSS.escape(candidate);
    const input = document.querySelector(`input[name="${escaped}"]`);
    if (input) {
      return input;
    }
  }
  return null;
}
function findTextareaByNames(candidates) {
  for (const candidate of candidates) {
    const escaped = CSS.escape(candidate);
    const textarea = document.querySelector(`textarea[name="${escaped}"]`);
    if (textarea) {
      return textarea;
    }
  }
  return null;
}
function findSelectByNames(candidates) {
  for (const candidate of candidates) {
    const escaped = CSS.escape(candidate);
    const select = document.querySelector(`select[name="${escaped}"]`);
    if (select) {
      return select;
    }
  }
  return null;
}
function findControlInLabel(label) {
  const nested = label.querySelector("input, textarea, select");
  if (nested) {
    return nested;
  }
  const htmlFor = label.htmlFor;
  if (!htmlFor) {
    return null;
  }
  const referenced = document.getElementById(htmlFor);
  if (referenced instanceof HTMLInputElement || referenced instanceof HTMLTextAreaElement || referenced instanceof HTMLSelectElement) {
    return referenced;
  }
  return null;
}
function findFieldByLabelText(candidates) {
  const labels = Array.from(document.querySelectorAll("label"));
  for (const label of labels) {
    const text = label.textContent ?? "";
    if (!textIncludesAny(text, candidates)) {
      continue;
    }
    const control = findControlInLabel(label);
    if (control) {
      return control;
    }
  }
  return null;
}
function findInputsByNamePrefix(prefix) {
  const escapedPrefix = CSS.escape(prefix);
  return Array.from(
    document.querySelectorAll(`input[name^="${escapedPrefix}"]`)
  ).sort((a, b) => a.name.localeCompare(b.name));
}
function findTextareasByNamePrefix(prefix) {
  const escapedPrefix = CSS.escape(prefix);
  return Array.from(
    document.querySelectorAll(`textarea[name^="${escapedPrefix}"]`)
  ).sort((a, b) => a.name.localeCompare(b.name));
}

// src/providers/facebook_abuse_form.ts
var continueReportCandidates = ["continuereport"];
var relationshipCandidates = ["relationship_rightsowner"];
var nameCandidates = ["your_name", "full_name", "name"];
var emailCandidates3 = ["email", "email_address"];
var confirmEmailCandidates3 = ["confirm_email", "email_confirm", "email_confirmation"];
var rightsOwnerCandidates = ["reporter_name", "rights_owner", "rights_owner_name", "owner_name"];
var trademarkCandidates = ["what_is_your_trademark", "trademark", "trademark_name"];
var registrationInputCandidates = ["registration_number", "trademark_registration_number", "reg_number"];
var registrationTextareaCandidates = ["TMREGNUMBER"];
var jurisdictionCandidates = ["rights_owner_country_routing", "jurisdiction", "country", "registration_country"];
var trademarkUrlCandidates = ["TM_URL", "trademark_url"];
var descriptionCandidates = ["why_reporting_other", "description", "details", "additional_info"];
var addressCandidates2 = ["Address", "address", "mailing_address"];
var signatureCandidates = ["electronic_signature", "signature"];
var additionalLinksCandidates = ["additionallinks[]", "additionallinks"];
var didAutoExpandAdditionalLinks = false;
function safeCheckRadioByNameValue(name, value) {
  const radios = Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`));
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
function selectorForField(field) {
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
function safeFillBySelector(selector, value) {
  if (!selector) {
    return false;
  }
  return safeFillIfVisible(selector, value);
}
function safeCheckAdditionalLinksCheckbox() {
  for (const name of additionalLinksCandidates) {
    const checkboxes = Array.from(
      document.querySelectorAll(`input[type="checkbox"][name="${CSS.escape(name)}"]`)
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
function contentUrlFieldOrder(name) {
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
function getVisibleOrderedContentUrlFields() {
  const urlInputs = findInputsByNamePrefix("content_urls");
  const urlTextareas = findTextareasByNamePrefix("content_urls");
  return (urlTextareas.length > 0 ? urlTextareas : urlInputs).filter((field) => isElementVisible(field) && !field.disabled).sort((a, b) => {
    const orderDelta = contentUrlFieldOrder(a.name) - contentUrlFieldOrder(b.name);
    return orderDelta !== 0 ? orderDelta : a.name.localeCompare(b.name);
  });
}
function fillUrlsIntoFields(urls, startIndex, fields) {
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
function fillPrimaryFields(payload) {
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
  const fullNameField = findInputByNames(nameCandidates) ?? findFieldByLabelText(["your full name", "full name"]);
  if (safeFillBySelector(selectorForField(fullNameField), payload.analyst.fullName)) {
    filledCount += 1;
  }
  const emailField = findInputByNames(emailCandidates3) ?? findFieldByLabelText(["email address", "email"]);
  if (safeFillBySelector(selectorForField(emailField), payload.analyst.email)) {
    filledCount += 1;
  }
  const confirmEmailField = findInputByNames(confirmEmailCandidates3) ?? findFieldByLabelText(["confirm email", "re-enter email"]);
  if (safeFillBySelector(selectorForField(confirmEmailField), payload.analyst.email)) {
    filledCount += 1;
  }
  const rightsOwnerField = findInputByNames(rightsOwnerCandidates) ?? findFieldByLabelText(["name of rights owner", "rights owner"]);
  if (safeFillBySelector(selectorForField(rightsOwnerField), payload.client.clientName)) {
    filledCount += 1;
  }
  const trademarkField = findInputByNames(trademarkCandidates) ?? findFieldByLabelText(["what is the trademark", "trademark"]);
  if (safeFillBySelector(selectorForField(trademarkField), payload.client.trademarkName)) {
    filledCount += 1;
  }
  const registrationField = findTextareaByNames(registrationTextareaCandidates) ?? findInputByNames(registrationInputCandidates) ?? findFieldByLabelText(["registration number", "trademark registration"]);
  if (safeFillBySelector(selectorForField(registrationField), payload.client.registrationNumber)) {
    filledCount += 1;
  }
  const jurisdictionField = findSelectByNames(jurisdictionCandidates) ?? findFieldByLabelText(["jurisdiction", "country"]);
  if (safeSelectOption(jurisdictionField, payload.client.jurisdiction)) {
    filledCount += 1;
  }
  const trademarkUrlField = findInputByNames(trademarkUrlCandidates) ?? findFieldByLabelText(["link to the trademark registration", "trademark registration from an online trademark database"]);
  if (safeFillBySelector(selectorForField(trademarkUrlField), payload.client.trademarkUrl ?? "")) {
    filledCount += 1;
  }
  const addressField = findTextareaByNames(addressCandidates2) ?? findFieldByLabelText(["mailing address", "address"]);
  if (safeFillBySelector(selectorForField(addressField), payload.analyst.companyAddress ?? "")) {
    filledCount += 1;
  }
  const descriptionField = findTextareaByNames(descriptionCandidates) ?? findFieldByLabelText(["description", "details"]);
  if (safeFillBySelector(selectorForField(descriptionField), payload.description)) {
    filledCount += 1;
  }
  const signatureField = findInputByNames(signatureCandidates) ?? findFieldByLabelText(["electronic signature", "signature"]);
  if (safeFillBySelector(selectorForField(signatureField), payload.analyst.signature)) {
    filledCount += 1;
  }
  return filledCount;
}
function fillUrlFields(urls) {
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
  const fallbackField = findFieldByLabelText(["url", "content url", "infringing url"]);
  if (safeFillBySelector(selectorForField(fallbackField), normalizedUrls.join("\n"))) {
    return 1;
  }
  return 0;
}
var facebookAbuseFormProvider = {
  id: "facebook_abuse_form",
  isMatch(url) {
    return isProviderUrl("facebook_abuse_form", url);
  },
  autofill(payload) {
    didAutoExpandAdditionalLinks = false;
    const primaryCount = fillPrimaryFields(payload);
    const urlCount = fillUrlFields(payload.urls);
    return primaryCount + urlCount;
  }
};

// src/providers/google_abuse_form.ts
var yourNameCandidates = ["your_name"];
var organizationNameCandidates = ["organization_name"];
var organizationAddressCandidates = ["organization_address"];
var emailCandidates4 = ["email_address"];
var reportedUrlCandidates = ["url_impersonation_sites"];
var officialUrlCandidates = ["official_url"];
function firstUrl2(urls) {
  return urls.find((url) => url.trim().length > 0)?.trim() ?? "";
}
function safeFillInputByNames3(names, value) {
  for (const name of names) {
    if (safeFillIfVisible(`input[name="${CSS.escape(name)}"]`, value)) {
      return true;
    }
  }
  return false;
}
function findPhoneInput() {
  const phoneSelectHost = document.getElementById("phone_number");
  if (!phoneSelectHost || !phoneSelectHost.parentElement) {
    return null;
  }
  const telInput = phoneSelectHost.parentElement.querySelector('input[type="tel"]');
  return telInput ?? null;
}
var googleAbuseFormProvider = {
  id: "google_abuse_form",
  isMatch(url) {
    return isProviderUrl("google_abuse_form", url);
  },
  autofill(payload) {
    let filledCount = 0;
    if (safeFillInputByNames3(yourNameCandidates, payload.analyst.fullName)) {
      filledCount += 1;
    }
    if (safeFillInputByNames3(organizationNameCandidates, payload.analyst.company ?? payload.client.clientName)) {
      filledCount += 1;
    }
    if (safeFillInputByNames3(organizationAddressCandidates, payload.analyst.companyAddress ?? "")) {
      filledCount += 1;
    }
    const phoneField = findPhoneInput();
    if (phoneField && !phoneField.id) {
      phoneField.id = "abuseflow-google-phone-input";
    }
    if (phoneField?.id && safeFillIfVisible(`#${CSS.escape(phoneField.id)}`, payload.analyst.phone ?? "")) {
      filledCount += 1;
    }
    if (safeFillInputByNames3(emailCandidates4, payload.analyst.email)) {
      filledCount += 1;
    }
    if (safeFillInputByNames3(reportedUrlCandidates, firstUrl2(payload.urls))) {
      filledCount += 1;
    }
    if (safeFillInputByNames3(officialUrlCandidates, payload.client.trademarkUrl ?? "")) {
      filledCount += 1;
    }
    return filledCount;
  }
};

// src/providers/hostinger_abuse_form.ts
var abuseTypeInputId = "report-abuse-form-abuseType";
var reporterNameInputId = "report-abuse-form-reporterName";
var reporterEmailInputId = "report-abuse-form-reporterEmail";
var abuserWebsiteInputId = "report-abuse-form-abuserWebsite";
var commentsInputId = "report-abuse-form-message";
function firstUrl3(urls) {
  return urls.find((url) => url.trim().length > 0)?.trim() ?? "";
}
function safeSelectAbuseType(optionText) {
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
  const options = Array.from(document.querySelectorAll('[role="option"].h-form-field__option'));
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
var hostingerAbuseFormProvider = {
  id: "hostinger_abuse_form",
  isMatch(url) {
    return isProviderUrl("hostinger_abuse_form", url);
  },
  autofill(payload) {
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
    if (safeFillIfVisible(`#${CSS.escape(abuserWebsiteInputId)}`, firstUrl3(payload.urls))) {
      filledCount += 1;
    }
    if (safeFillIfVisible(`#${CSS.escape(commentsInputId)}`, payload.description)) {
      filledCount += 1;
    }
    return filledCount;
  }
};

// src/providers/instagram_abuse_form.ts
var instagramAbuseFormProvider = {
  id: "instagram_abuse_form",
  isMatch(url) {
    return isProviderUrl("instagram_abuse_form", url);
  },
  autofill(payload) {
    return facebookAbuseFormProvider.autofill(payload);
  }
};

// src/providers/namesilo_abuse_form.ts
var domainCandidates = ["domain"];
var reportTypeCandidates = ["report_type"];
var desiredResolutionCandidates = ["desired_resolution"];
var yourNameCandidates2 = ["your_name"];
var yourEmailCandidates = ["your_email"];
var commentsCandidates3 = ["comments"];
function extractDomainFromUrls(urls) {
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
function selectorForField2(field) {
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
function safeFillBySelector2(selector, value) {
  if (!selector) {
    return false;
  }
  return safeFillIfVisible(selector, value);
}
var namesiloAbuseFormProvider = {
  id: "namesilo_abuse_form",
  isMatch(url) {
    return isProviderUrl("namesilo_abuse_form", url);
  },
  autofill(payload) {
    let filledCount = 0;
    const domainValue = extractDomainFromUrls(payload.urls);
    const domainField = findInputByNames(domainCandidates) ?? findFieldByLabelText(["domain name"]);
    if (safeFillBySelector2(selectorForField2(domainField), domainValue)) {
      filledCount += 1;
    }
    const reportTypeField = findSelectByNames(reportTypeCandidates) ?? findFieldByLabelText(["type of report"]);
    if (safeSelectOption(reportTypeField, "Domain-Trademark")) {
      filledCount += 1;
    }
    const desiredResolutionField = findSelectByNames(desiredResolutionCandidates) ?? findFieldByLabelText(["desired resolution"]);
    if (safeSelectOption(desiredResolutionField, "Forward-Registrant")) {
      filledCount += 1;
    }
    const yourNameField = findInputByNames(yourNameCandidates2) ?? findFieldByLabelText(["your name"]);
    if (safeFillBySelector2(selectorForField2(yourNameField), payload.analyst.fullName)) {
      filledCount += 1;
    }
    const yourEmailField = findInputByNames(yourEmailCandidates) ?? findFieldByLabelText(["your email"]);
    if (safeFillBySelector2(selectorForField2(yourEmailField), payload.analyst.email)) {
      filledCount += 1;
    }
    const commentsField = findTextareaByNames(commentsCandidates3) ?? findFieldByLabelText(["comments"]);
    if (safeFillBySelector2(selectorForField2(commentsField), payload.description)) {
      filledCount += 1;
    }
    return filledCount;
  }
};

// src/providers/tiktok_abuse_form.ts
function findInputInSection(sectionId) {
  return document.querySelector(`#${CSS.escape(sectionId)} input[type="text"]`);
}
function findTextareaInSection(sectionId) {
  return document.querySelector(`#${CSS.escape(sectionId)} textarea`);
}
function safeCheckRadioByNameValue2(name, value) {
  const radios = Array.from(
    document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)
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
function safeCheckAgreementCheckboxes() {
  let checkedCount = 0;
  const checkboxes = Array.from(
    document.querySelectorAll(`#agreement input[type="checkbox"][data-tux-checkbox-input="true"]`)
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
function safeFillIfEnabled(element, value) {
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
var tiktokAbuseFormProvider = {
  id: "tiktok_abuse_form",
  isMatch(url) {
    return isProviderUrl("tiktok_abuse_form", url);
  },
  autofill(payload) {
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
    if (safeCheckRadioByNameValue2("extra.cfGoods", "0")) {
      filledCount += 1;
    }
    if (safeCheckRadioByNameValue2("relationship", "4")) {
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
    if (safeCheckRadioByNameValue2("personalAccount", "0")) {
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

// src/providers/x_abuse_form.ts
var fullNameCandidates3 = ["_1660688133@Form_Name__c", "_-404431659@name"];
var jobTitleCandidates = ["_1660688133@job-title", "_-404431659@job-title"];
var companyCandidates2 = ["_1660688133@company", "_-404431659@company"];
var companyWebsiteCandidates = ["_1660688133@company-website", "_-404431659@company-website"];
var emailCandidates5 = ["_1660688133@Form_Email__c", "_-404431659@Form_Email__c"];
var phoneCandidates2 = ["_1660688133@SuppliedPhone", "_-404431659@SuppliedPhone"];
var platformCandidates = ["_1046311997@Type_of_Issue__c", "_1691786258@Type_of_Issue__c"];
var reportedUsernameCandidates = ["_1046311997@Reported_Screen_Name__c", "_1691786258@Reported_Screen_Name__c"];
var detailsCandidates = ["_1046311997@DescriptionText", "_1691786258@DescriptionText"];
var trademarkHolderNameCandidates = ["_-1737788478@Content_Owner_Name__c", "_-1945608478@Content_Owner_Name__c"];
var trademarkHolderAddressCandidates = ["_-1737788478@trademark-holder-address", "_-1945608478@trademark-holder-address"];
var trademarkHolderCountryCandidates = ["_-1737788478@trademark-holder-country", "_-1945608478@trademark-holder-country"];
var trademarkHolderWebsiteCandidates = ["_-1737788478@trademark-holder-website", "_-1945608478@trademark-holder-website"];
var trademarkHolderUsernameCandidates = ["_-1737788478@trademark-holder-username", "_-1945608478@trademark-holder-username"];
var trademarkWordCandidates2 = ["_-1448987698@trademark-word", "_-952722188@trademark-word"];
var trademarkRegNumberCandidates = ["_-1448987698@Registration_Number__c", "_-952722188@Registration_Number__c"];
var trademarkClassCandidates = ["_-1448987698@trademark-class", "_-952722188@trademark-class"];
var regOfficeCandidates = ["_-1448987698@reg-office", "_-952722188@reg-office"];
var trademarkLinkCandidates = ["_-1448987698@trademark-link", "_-952722188@trademark-link"];
var confirmationCheckboxCandidates = ["confirm-1", "confirm-2", "confirm-3"];
function safeCheckRadioByNameValue3(name, value) {
  const radios = Array.from(
    document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)
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
function safeCheckByName(name) {
  const checkbox = document.querySelector(
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
function selectorForField3(field) {
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
function safeFillBySelector3(selector, value) {
  if (!selector) {
    return false;
  }
  return safeFillIfVisible(selector, value);
}
function normalizeProfileUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol;
}
function normalizeHandle(value) {
  return value.trim().replace(/^@+/, "");
}
function extractUsername(urls) {
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
      return normalizeHandle(first);
    } catch {
      continue;
    }
  }
  return "";
}
function pickWebsite(clientWebsite, urls) {
  const normalizedClientWebsite = normalizeProfileUrl(clientWebsite ?? "");
  if (normalizedClientWebsite) {
    return normalizedClientWebsite;
  }
  const firstUrl4 = urls[0] ?? "";
  return normalizeProfileUrl(firstUrl4);
}
var xAbuseFormProvider = {
  id: "x_abuse_form",
  isMatch(url) {
    return isProviderUrl("x_abuse_form", url);
  },
  autofill(payload) {
    let filledCount = 0;
    const defaultWebsite = pickWebsite(payload.client.trademarkUrl, payload.urls);
    const reportedUsername = extractUsername(payload.urls);
    const clientHandle = normalizeHandle(payload.client.xHandle ?? "");
    const fullNameField = findInputByNames(fullNameCandidates3);
    if (safeFillBySelector3(selectorForField3(fullNameField), payload.analyst.fullName)) {
      filledCount += 1;
    }
    const jobTitleField = findInputByNames(jobTitleCandidates);
    if (safeFillBySelector3(selectorForField3(jobTitleField), "Authorized Representative")) {
      filledCount += 1;
    }
    const companyField = findInputByNames(companyCandidates2);
    if (safeFillBySelector3(selectorForField3(companyField), payload.analyst.company ?? payload.client.clientName)) {
      filledCount += 1;
    }
    const companyWebsiteField = findInputByNames(companyWebsiteCandidates);
    if (safeFillBySelector3(selectorForField3(companyWebsiteField), defaultWebsite)) {
      filledCount += 1;
    }
    const emailField = findInputByNames(emailCandidates5);
    if (safeFillBySelector3(selectorForField3(emailField), payload.analyst.email)) {
      filledCount += 1;
    }
    const phoneField = findInputByNames(phoneCandidates2);
    if (safeFillBySelector3(selectorForField3(phoneField), payload.analyst.phone ?? "")) {
      filledCount += 1;
    }
    for (const candidate of platformCandidates) {
      if (safeCheckRadioByNameValue3(candidate, "X")) {
        filledCount += 1;
        break;
      }
    }
    const reportedUsernameField = findInputByNames(reportedUsernameCandidates);
    if (safeFillBySelector3(selectorForField3(reportedUsernameField), reportedUsername)) {
      filledCount += 1;
    }
    const detailsField = findTextareaByNames(detailsCandidates);
    if (safeFillBySelector3(selectorForField3(detailsField), payload.description)) {
      filledCount += 1;
    }
    const holderNameField = findInputByNames(trademarkHolderNameCandidates);
    if (safeFillBySelector3(selectorForField3(holderNameField), payload.client.clientName)) {
      filledCount += 1;
    }
    const holderAddressField = findInputByNames(trademarkHolderAddressCandidates);
    if (safeFillBySelector3(selectorForField3(holderAddressField), payload.analyst.companyAddress ?? "")) {
      filledCount += 1;
    }
    const holderCountryField = findSelectByNames(trademarkHolderCountryCandidates);
    if (safeSelectOption(holderCountryField, payload.client.jurisdiction)) {
      filledCount += 1;
    }
    const holderWebsiteField = findInputByNames(trademarkHolderWebsiteCandidates);
    if (safeFillBySelector3(selectorForField3(holderWebsiteField), defaultWebsite)) {
      filledCount += 1;
    }
    const holderUsernameField = findInputByNames(trademarkHolderUsernameCandidates);
    if (safeFillBySelector3(selectorForField3(holderUsernameField), clientHandle ? `@${clientHandle}` : "")) {
      filledCount += 1;
    }
    const trademarkWordField = findInputByNames(trademarkWordCandidates2);
    if (safeFillBySelector3(selectorForField3(trademarkWordField), payload.client.trademarkName)) {
      filledCount += 1;
    }
    const trademarkRegNumberField = findInputByNames(trademarkRegNumberCandidates);
    if (safeFillBySelector3(selectorForField3(trademarkRegNumberField), payload.client.registrationNumber)) {
      filledCount += 1;
    }
    const trademarkClassField = findSelectByNames(trademarkClassCandidates);
    if (safeSelectOption(trademarkClassField, "Other")) {
      filledCount += 1;
    }
    const regOfficeField = findInputByNames(regOfficeCandidates);
    if (safeFillBySelector3(selectorForField3(regOfficeField), `${payload.client.jurisdiction} Trademark Office`)) {
      filledCount += 1;
    }
    const trademarkLinkField = findInputByNames(trademarkLinkCandidates);
    if (safeFillBySelector3(selectorForField3(trademarkLinkField), defaultWebsite)) {
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

// src/providers/index.ts
var providers = [
  facebookAbuseFormProvider,
  googleAbuseFormProvider,
  dynadotAbuseFormProvider,
  hostingerAbuseFormProvider,
  instagramAbuseFormProvider,
  namesiloAbuseFormProvider,
  tiktokAbuseFormProvider,
  xAbuseFormProvider,
  cloudflareAbuseFormProvider
];
function getProviderById(id) {
  return providers.find((provider) => provider.id === id) ?? null;
}
function getProviderByUrl(url) {
  return providers.find((provider) => provider.isMatch(url)) ?? null;
}
export {
  getProviderById,
  getProviderByUrl
};
