import { renderTemplate, type TemplateVariables } from "./templateEngine";

export type DescriptionTemplateType =
  | "client_default"
  | "impersonation"
  | "trademark"
  | "phishing"
  | "scam"
  | "other";

export type DescriptionTone = "neutral" | "firm" | "urgent" | "legal";

const TEMPLATE_PRESETS: Record<Exclude<DescriptionTemplateType, "client_default">, string> = {
  impersonation:
    "We act for {{client_name}}. The reported content appears to impersonate {{client_name}} by using protected brand identifiers associated with {{trademark_name}} (Registration: {{registration_number}}, Jurisdiction: {{jurisdiction}}).\n\nReported URLs:\n{{urls}}\n\nThis creates a false association and may mislead users. Please remove or disable the infringing content.",
  trademark:
    "We represent {{client_name}}, the rights owner of {{trademark_name}} (Registration: {{registration_number}}, Jurisdiction: {{jurisdiction}}).\n\nReported URLs:\n{{urls}}\n\nThe reported use appears unauthorized and infringes trademark rights. We request removal under your trademark policy.",
  phishing:
    "We represent {{client_name}}. The reported content appears to be phishing activity leveraging {{client_name}} branding and identity assets tied to {{trademark_name}}.\n\nReported URLs:\n{{urls}}\n\nThis may cause credential theft and user harm. Please urgently disable access and take enforcement action.",
  scam:
    "We represent {{client_name}}. The reported content appears linked to scam activity using unauthorized references to {{client_name}} and {{trademark_name}}.\n\nReported URLs:\n{{urls}}\n\nThis activity may cause financial harm to users. Please remove and enforce under your abuse policy.",
  other:
    "We represent {{client_name}} and are reporting abusive or infringing content involving {{trademark_name}} (Registration: {{registration_number}}, Jurisdiction: {{jurisdiction}}).\n\nReported URLs:\n{{urls}}\n\nPlease review and take action under your applicable policy."
};

function buildAuthRepPreamble(clientName: string): string {
  return `Group-IB acts as the authorized representative for ${clientName}.`;
}

function ensureAuthRepPreamble(text: string, clientName: string): string {
  const normalized = text.toLowerCase();
  const clientNameNormalized = clientName.trim().toLowerCase();
  const hasAuthRep = normalized.includes("authorized representative");
  const hasClientReference = clientNameNormalized.length > 0 && normalized.includes(clientNameNormalized);
  if (hasAuthRep && hasClientReference) {
    return text;
  }
  return `${buildAuthRepPreamble(clientName)}\n\n${text}`;
}

function applyTone(text: string, tone: DescriptionTone): string {
  if (tone === "neutral") {
    return text;
  }
  if (tone === "firm") {
    return `${text}\n\nWe request prompt action on this report.`;
  }
  if (tone === "urgent") {
    return `${text}\n\nThis requires urgent action due to active user risk.`;
  }
  return `${text}\n\nThis notice is submitted in good faith and we reserve all applicable legal rights.`;
}

export function composeDescription(
  templateType: DescriptionTemplateType,
  tone: DescriptionTone,
  clientDefaultTemplate: string,
  variables: TemplateVariables
): string {
  const baseTemplate =
    templateType === "client_default"
      ? clientDefaultTemplate
      : TEMPLATE_PRESETS[templateType];
  const rendered = renderTemplate(baseTemplate, variables);
  return applyTone(ensureAuthRepPreamble(rendered, variables.client_name), tone);
}
