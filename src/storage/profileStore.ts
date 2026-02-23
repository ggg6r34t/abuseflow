export interface AnalystProfile {
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  companyAddress?: string;
  signature: string;
}

export interface ClientProfile {
  id: string;
  clientName: string;
  trademarkName: string;
  registrationNumber: string;
  jurisdiction: string;
  trademarkUrl?: string;
  xHandle?: string;
  defaultDescriptionTemplate: string;
}

interface StoredState {
  analystProfile?: AnalystProfile;
  clientProfiles?: ClientProfile[];
}

const ANALYST_PROFILE_KEY = "abuseflow_analyst_profile";
const CLIENT_PROFILES_KEY = "abuseflow_client_profiles";
const DEFAULT_ANALYST_PROFILE: AnalystProfile = {
  fullName: "Group-IB Digital Risk Protection Analyst",
  email: "drp-response@group-ib.com",
  phone: "+31 20 226 9090",
  company: "Group-IB",
  companyAddress: "Prinsengracht 919, 1017KD Amsterdam, Netherlands",
  signature: "Group-IB Digital Risk Protection Analyst"
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAnalystProfile(value: unknown): AnalystProfile | null {
  if (!isObject(value)) {
    return null;
  }

  const fullName = toTrimmedString(value.fullName);
  const email = toTrimmedString(value.email);
  const signature = toTrimmedString(value.signature);
  const phone = toTrimmedString(value.phone || value.phoneNumber);
  const company = toTrimmedString(value.company || value.organization);
  const companyAddress = toTrimmedString(value.companyAddress);

  if (!fullName || !email || !signature) {
    return null;
  }

  const normalized: AnalystProfile = {
    fullName,
    email,
    signature
  };
  if (phone) {
    normalized.phone = phone;
  }
  if (company) {
    normalized.company = company;
  }
  if (companyAddress) {
    normalized.companyAddress = companyAddress;
  }
  return normalized;
}

function normalizeClientProfile(value: unknown): ClientProfile | null {
  if (!isObject(value)) {
    return null;
  }

  const id = toTrimmedString(value.id);
  const clientName = toTrimmedString(value.clientName);
  const trademarkName = toTrimmedString(value.trademarkName);
  const registrationNumber = toTrimmedString(value.registrationNumber);
  const jurisdiction = toTrimmedString(value.jurisdiction);
  const trademarkUrl = toTrimmedString(value.trademarkUrl);
  const xHandle = toTrimmedString(value.xHandle || value.twitterHandle || value.xUsername);
  const defaultDescriptionTemplate = toTrimmedString(value.defaultDescriptionTemplate);

  if (!id || !clientName || !trademarkName || !registrationNumber || !jurisdiction || !defaultDescriptionTemplate) {
    return null;
  }

  const normalized: ClientProfile = {
    id,
    clientName,
    trademarkName,
    registrationNumber,
    jurisdiction,
    defaultDescriptionTemplate
  };
  if (trademarkUrl) {
    normalized.trademarkUrl = trademarkUrl;
  }
  if (xHandle) {
    normalized.xHandle = xHandle;
  }
  return normalized;
}

function normalizeClientProfiles(value: unknown): ClientProfile[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((item) => normalizeClientProfile(item))
    .filter((item): item is ClientProfile => item !== null);

  const seenIds = new Set<string>();
  return normalized.filter((client) => {
    if (seenIds.has(client.id)) {
      return false;
    }
    seenIds.add(client.id);
    return true;
  });
}

function getFromStorage<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get([key], (result) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve(result[key] as T | undefined);
    });
  });
}

function setInStorage<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [key]: value }, () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve();
    });
  });
}

export async function getAnalystProfile(): Promise<AnalystProfile | null> {
  const profile = await getFromStorage<StoredState["analystProfile"]>(ANALYST_PROFILE_KEY);
  const normalized = normalizeAnalystProfile(profile);
  if (normalized) {
    return normalized;
  }
  const seeded = normalizeAnalystProfile(DEFAULT_ANALYST_PROFILE);
  if (!seeded) {
    return null;
  }
  await setInStorage(ANALYST_PROFILE_KEY, seeded);
  return seeded;
}

export async function saveAnalystProfile(profile: AnalystProfile): Promise<void> {
  const normalized = normalizeAnalystProfile(profile);
  if (!normalized) {
    throw new Error("Invalid analyst profile.");
  }
  await setInStorage(ANALYST_PROFILE_KEY, normalized);
}

export async function listClientProfiles(): Promise<ClientProfile[]> {
  const clients = await getFromStorage<StoredState["clientProfiles"]>(CLIENT_PROFILES_KEY);
  return normalizeClientProfiles(clients);
}

export async function getClientProfileById(id: string): Promise<ClientProfile | null> {
  const clients = await listClientProfiles();
  return clients.find((client) => client.id === id) ?? null;
}

export async function saveClientProfiles(clients: ClientProfile[]): Promise<void> {
  await setInStorage(CLIENT_PROFILES_KEY, clients);
}

export async function upsertClientProfile(client: ClientProfile): Promise<void> {
  const clients = await listClientProfiles();
  const index = clients.findIndex((existingClient) => existingClient.id === client.id);
  if (index >= 0) {
    clients[index] = client;
  } else {
    clients.push(client);
  }
  await saveClientProfiles(clients);
}

export async function deleteClientProfile(id: string): Promise<void> {
  const clients = await listClientProfiles();
  const nextClients = clients.filter((client) => client.id !== id);
  await saveClientProfiles(nextClients);
}
