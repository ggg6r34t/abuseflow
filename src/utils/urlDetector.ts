import type { ProviderId } from "../providers";
import { detectProviderIdFromUrl } from "../config/providerRoutes";

export function detectProviderFromUrl(url: string): ProviderId | null {
  const providerId = detectProviderIdFromUrl(url);
  return (providerId as ProviderId | null) ?? null;
}

export function parseUrls(urlsText: string): string[] {
  const normalized = urlsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const url of normalized) {
    if (seen.has(url)) {
      continue;
    }
    seen.add(url);
    unique.push(url);
  }
  return unique;
}
