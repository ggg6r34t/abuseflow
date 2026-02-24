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
const CLIENT_PROFILE_IDS_KEY = "abuseflow_client_profile_ids";
const CLIENT_PROFILE_KEY_PREFIX = "abuseflow_client_profile_";
const CLIENT_STORAGE_SCHEMA_VERSION_KEY = "abuseflow_client_storage_schema_version";
const CLIENT_STORAGE_SCHEMA_VERSION = 2;
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
  return getFromStorageArea<T>("sync", key);
}

function getFromStorageArea<T>(area: "sync" | "local", key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    chrome.storage[area].get([key], (result) => {
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
  return setInStorageArea("sync", key, value);
}

function setInStorageArea<T>(area: "sync" | "local", key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage[area].set({ [key]: value }, () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve();
    });
  });
}

function removeFromStorageArea(area: "sync" | "local", key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage[area].remove([key], () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve();
    });
  });
}

function clientProfileKey(id: string): string {
  return `${CLIENT_PROFILE_KEY_PREFIX}${id}`;
}

async function getLocalClientIds(): Promise<string[]> {
  const ids = await getFromStorageArea<unknown>("local", CLIENT_PROFILE_IDS_KEY);
  if (!Array.isArray(ids)) {
    return [];
  }
  return ids.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

async function setLocalClientIds(ids: string[]): Promise<void> {
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(id);
    }
  }
  await setInStorageArea("local", CLIENT_PROFILE_IDS_KEY, deduped);
}

async function getClientStorageSchemaVersion(): Promise<number> {
  const value = await getFromStorageArea<unknown>("local", CLIENT_STORAGE_SCHEMA_VERSION_KEY);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.trunc(value);
}

async function setClientStorageSchemaVersion(version: number): Promise<void> {
  await setInStorageArea("local", CLIENT_STORAGE_SCHEMA_VERSION_KEY, version);
}

export function buildClientMigrationPlan(localIds: string[], legacyClients: unknown): { shouldMigrate: boolean; ids: string[] } {
  const normalizedLegacy = normalizeClientProfiles(legacyClients);
  const ids = normalizedLegacy.map((client) => client.id);
  return {
    shouldMigrate: localIds.length === 0 && ids.length > 0,
    ids,
  };
}

async function migrateLegacyClientProfilesIfNeeded(): Promise<void> {
  const schemaVersion = await getClientStorageSchemaVersion();
  if (schemaVersion >= CLIENT_STORAGE_SCHEMA_VERSION) {
    return;
  }

  const localIds = await getLocalClientIds();
  if (localIds.length > 0) {
    await setClientStorageSchemaVersion(CLIENT_STORAGE_SCHEMA_VERSION);
    return;
  }

  const legacy = await getFromStorageArea<StoredState["clientProfiles"]>(
    "sync",
    CLIENT_PROFILES_KEY,
  );
  const plan = buildClientMigrationPlan(localIds, legacy);
  if (!plan.shouldMigrate) {
    await setClientStorageSchemaVersion(CLIENT_STORAGE_SCHEMA_VERSION);
    return;
  }

  const writes: Promise<void>[] = [];
  const normalized = normalizeClientProfiles(legacy);
  for (const client of normalized) {
    writes.push(setInStorageArea("local", clientProfileKey(client.id), client));
  }
  writes.push(setLocalClientIds(plan.ids));
  writes.push(removeFromStorageArea("sync", CLIENT_PROFILES_KEY));
  writes.push(setClientStorageSchemaVersion(CLIENT_STORAGE_SCHEMA_VERSION));
  await Promise.all(writes);
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
  await migrateLegacyClientProfilesIfNeeded();
  const ids = await getLocalClientIds();
  if (ids.length === 0) {
    return [];
  }
  const clients = await Promise.all(
    ids.map((id) => getFromStorageArea<unknown>("local", clientProfileKey(id)))
  );
  return clients
    .map((client) => normalizeClientProfile(client))
    .filter((client): client is ClientProfile => client !== null);
}

export async function getClientProfileById(id: string): Promise<ClientProfile | null> {
  const clients = await listClientProfiles();
  return clients.find((client) => client.id === id) ?? null;
}

export async function saveClientProfiles(clients: ClientProfile[]): Promise<void> {
  await migrateLegacyClientProfilesIfNeeded();
  const normalized = normalizeClientProfiles(clients);
  const existingIds = await getLocalClientIds();
  const nextIds = normalized.map((client) => client.id);

  const writeOps = normalized.map((client) =>
    setInStorageArea("local", clientProfileKey(client.id), client)
  );
  const staleIds = existingIds.filter((id) => !nextIds.includes(id));
  const removeOps = staleIds.map((id) => removeFromStorageArea("local", clientProfileKey(id)));

  await Promise.all([...writeOps, ...removeOps, setLocalClientIds(nextIds)]);
}

export async function upsertClientProfile(client: ClientProfile): Promise<void> {
  await migrateLegacyClientProfilesIfNeeded();
  const normalized = normalizeClientProfile(client);
  if (!normalized) {
    throw new Error("Invalid client profile.");
  }
  const ids = await getLocalClientIds();
  const nextIds = ids.includes(normalized.id) ? ids : [...ids, normalized.id];
  await Promise.all([
    setInStorageArea("local", clientProfileKey(normalized.id), normalized),
    setLocalClientIds(nextIds)
  ]);
}

export async function deleteClientProfile(id: string): Promise<void> {
  await migrateLegacyClientProfilesIfNeeded();
  const ids = await getLocalClientIds();
  const nextIds = ids.filter((clientId) => clientId !== id);
  await Promise.all([
    removeFromStorageArea("local", clientProfileKey(id)),
    setLocalClientIds(nextIds)
  ]);
}

export interface ProfilesBackupPayload {
  schemaVersion: number;
  exportedAt: string;
  analystProfile: AnalystProfile | null;
  clientProfiles: ClientProfile[];
}

export interface ExportProfilesOptions {
  includeAnalystProfile?: boolean;
}

export async function exportProfilesBackup(
  options: ExportProfilesOptions = {}
): Promise<ProfilesBackupPayload> {
  const includeAnalystProfile = options.includeAnalystProfile !== false;
  const [analystProfile, clientProfiles] = await Promise.all([
    getAnalystProfile(),
    listClientProfiles()
  ]);
  return {
    schemaVersion: CLIENT_STORAGE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    analystProfile: includeAnalystProfile ? analystProfile : null,
    clientProfiles
  };
}

export interface ImportProfilesOptions {
  includeAnalystProfile?: boolean;
  mode?: "merge" | "replace";
}

export async function importProfilesBackup(
  payload: unknown,
  options: ImportProfilesOptions = {}
): Promise<{ importedClients: number; importedAnalyst: boolean }> {
  const includeAnalystProfile = options.includeAnalystProfile !== false;
  const mode = options.mode === "merge" ? "merge" : "replace";
  if (!isObject(payload)) {
    throw new Error("Invalid backup payload.");
  }
  const analystRaw = payload.analystProfile;
  const clientsRaw = payload.clientProfiles;
  const analyst = normalizeAnalystProfile(analystRaw);
  const clients = normalizeClientProfiles(clientsRaw);
  if (!analyst && clients.length === 0) {
    throw new Error("Backup has no valid profiles.");
  }
  if (includeAnalystProfile && analyst) {
    await saveAnalystProfile(analyst);
  }
  if (clients.length > 0) {
    if (mode === "replace") {
      await saveClientProfiles(clients);
    } else {
      for (const client of clients) {
        await upsertClientProfile(client);
      }
    }
  }
  return {
    importedClients: clients.length,
    importedAnalyst: includeAnalystProfile && Boolean(analyst)
  };
}
