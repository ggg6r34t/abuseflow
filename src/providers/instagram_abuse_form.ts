import type { ProviderModule } from "./index";
import { facebookAbuseFormProvider } from "./facebook_abuse_form";
import { isProviderUrl } from "../config/providerRoutes";

export const instagramAbuseFormProvider: ProviderModule = {
  id: "instagram_abuse_form",
  isMatch(url: string): boolean {
    return isProviderUrl("instagram_abuse_form", url);
  },
  autofill(payload): number {
    return facebookAbuseFormProvider.autofill(payload);
  }
};
