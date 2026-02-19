import type { ProviderId } from "../providers";

export function detectProviderFromUrl(url: string): ProviderId | null {
  if (url.includes("facebook.com/help/contact")) {
    return "facebook_abuse_form";
  }
  if (url.includes("help.instagram.com/contact")) {
    return "instagram_abuse_form";
  }
  if (url.includes("namesilo.com/report_abuse.php")) {
    return "namesilo_abuse_form";
  }
  if (url.includes("help.x.com/en/forms/ipi/trademark/auth-to-rep")) {
    return "x_abuse_form";
  }
  if (url.includes("abuse.cloudflare.com/trademark")) {
    return "cloudflare_abuse_form";
  }
  if (url.includes("ipr.tiktokforbusiness.com/legal/report/Trademark")) {
    return "tiktok_abuse_form";
  }
  if (url.includes("hostinger.com/report-abuse")) {
    return "hostinger_abuse_form";
  }
  if (url.includes("dynadot.com/report-abuse")) {
    return "dynadot_abuse_form";
  }
  if (url.includes("support.google.com/sites/contact/corporate_impersonation")) {
    return "google_abuse_form";
  }
  return null;
}

export function parseUrls(urlsText: string): string[] {
  return urlsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
