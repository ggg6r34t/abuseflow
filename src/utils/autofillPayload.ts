import type { AutofillPayload } from "../providers";
import type { AnalystProfile, ClientProfile } from "../storage/profileStore";
import { renderTemplate } from "./templateEngine";
import { parseUrls } from "./urlDetector";

export function buildAutofillPayload(
  analyst: AnalystProfile,
  client: ClientProfile,
  urlsText: string
): AutofillPayload {
  const urls = parseUrls(urlsText);
  const description = renderTemplate(client.defaultDescriptionTemplate, {
    client_name: client.clientName,
    trademark_name: client.trademarkName,
    registration_number: client.registrationNumber,
    jurisdiction: client.jurisdiction,
    urls: urls.join("\n")
  });

  return {
    analyst,
    client,
    urls,
    description
  };
}
