import type { ProviderModule } from "./index";
import { facebookAbuseFormProvider } from "./facebook_abuse_form";

export const instagramAbuseFormProvider: ProviderModule = {
  id: "instagram_abuse_form",
  isMatch(url: string): boolean {
    return url.includes("help.instagram.com/contact");
  },
  autofill(payload): number {
    return facebookAbuseFormProvider.autofill(payload);
  }
};
