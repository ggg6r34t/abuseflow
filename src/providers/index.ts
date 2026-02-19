import type { AnalystProfile, ClientProfile } from "../storage/profileStore";
import { cloudflareAbuseFormProvider } from "./cloudflare_abuse_form";
import { dynadotAbuseFormProvider } from "./dynadot_abuse_form";
import { facebookAbuseFormProvider } from "./facebook_abuse_form";
import { googleAbuseFormProvider } from "./google_abuse_form";
import { hostingerAbuseFormProvider } from "./hostinger_abuse_form";
import { instagramAbuseFormProvider } from "./instagram_abuse_form";
import { namesiloAbuseFormProvider } from "./namesilo_abuse_form";
import { tiktokAbuseFormProvider } from "./tiktok_abuse_form";
import { xAbuseFormProvider } from "./x_abuse_form";

export type ProviderId =
  | "facebook_abuse_form"
  | "namesilo_abuse_form"
  | "x_abuse_form"
  | "cloudflare_abuse_form"
  | "instagram_abuse_form"
  | "tiktok_abuse_form"
  | "hostinger_abuse_form"
  | "dynadot_abuse_form"
  | "google_abuse_form";

export interface AutofillPayload {
  analyst: AnalystProfile;
  client: ClientProfile;
  urls: string[];
  description: string;
}

export interface ProviderModule {
  id: ProviderId;
  isMatch(url: string): boolean;
  autofill(payload: AutofillPayload): number;
}

const providers: ProviderModule[] = [
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

export function getProviderById(id: ProviderId): ProviderModule | null {
  return providers.find((provider) => provider.id === id) ?? null;
}

export function getProviderByUrl(url: string): ProviderModule | null {
  return providers.find((provider) => provider.isMatch(url)) ?? null;
}
