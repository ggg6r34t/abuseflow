import type { AutofillPayload } from "../providers";
import type { AnalystProfile, ClientProfile } from "../storage/profileStore";
import {
  composeDescription,
  type DescriptionTemplateType,
  type DescriptionTone
} from "./descriptionPresets";
import { parseUrls } from "./urlDetector";

interface BuildAutofillOptions {
  templateType?: DescriptionTemplateType;
  tone?: DescriptionTone;
}

export function buildAutofillPayload(
  analyst: AnalystProfile,
  client: ClientProfile,
  urlsText: string,
  options: BuildAutofillOptions = {}
): AutofillPayload {
  const urls = parseUrls(urlsText);
  const description = composeDescription(
    options.templateType ?? "client_default",
    options.tone ?? "neutral",
    client.defaultDescriptionTemplate,
    {
      client_name: client.clientName,
      trademark_name: client.trademarkName,
      registration_number: client.registrationNumber,
      jurisdiction: client.jurisdiction,
      urls: urls.join("\n")
    }
  );

  return {
    analyst,
    client,
    urls,
    description
  };
}
