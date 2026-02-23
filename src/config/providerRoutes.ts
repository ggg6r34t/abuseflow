import routesConfig from "../../providerRoutes.json";

type RouteRule = {
  all: string[];
};

type ProviderRouteEntry = {
  id: string;
  rules: RouteRule[];
  manifestMatches: string[];
};

const providerEntries = routesConfig.providers as ProviderRouteEntry[];

function normalizeUrl(url: string): string {
  return url.toLowerCase();
}

function entryMatchesUrl(entry: ProviderRouteEntry, normalizedUrl: string): boolean {
  return entry.rules.some((rule) => rule.all.every((fragment) => normalizedUrl.includes(fragment.toLowerCase())));
}

export function detectProviderIdFromUrl(url: string): string | null {
  const normalizedUrl = normalizeUrl(url);
  for (const entry of providerEntries) {
    if (entryMatchesUrl(entry, normalizedUrl)) {
      return entry.id;
    }
  }
  return null;
}

export function isProviderUrl(providerId: string, url: string): boolean {
  const normalizedUrl = normalizeUrl(url);
  const entry = providerEntries.find((item) => item.id === providerId);
  if (!entry) {
    return false;
  }
  return entryMatchesUrl(entry, normalizedUrl);
}

export function getContentScriptMatches(): string[] {
  const all = providerEntries.flatMap((entry) => entry.manifestMatches);
  return Array.from(new Set(all));
}
