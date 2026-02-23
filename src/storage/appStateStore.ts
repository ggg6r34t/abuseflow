import type { ProviderId } from "../providers";

export type ExperienceTier = "core" | "advanced" | "enterprise";

export interface FeatureFlags {
  tier: ExperienceTier;
  enableCaseSession: boolean;
  enableDiagnostics: boolean;
  enableEvidenceExport: boolean;
  enablePlaybooks: boolean;
  enableUrlIntel: boolean;
  enableRunHistory: boolean;
  enableSafetyGuardrails: boolean;
}

export interface CaseSession {
  id: string;
  caseName: string;
  ticketRef: string;
  severity: "low" | "medium" | "high" | "critical";
  tags: string[];
  notes: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface RunRecord {
  id: string;
  providerId: ProviderId;
  pageUrl: string;
  clientId: string;
  urlsText: string;
  ok: boolean;
  filledCount: number;
  notes: string[];
  durationMs: number;
  timestampMs: number;
  error?: string;
}

const FEATURE_FLAGS_KEY = "abuseflow_feature_flags";
const CASE_SESSION_KEY = "abuseflow_case_session";
const RUN_HISTORY_KEY = "abuseflow_run_history";
const RUN_HISTORY_LIMIT = 100;

function getNowMs(): number {
  return Date.now();
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStorage<T>(key: string): Promise<T | undefined> {
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

function writeStorage<T>(key: string, value: T): Promise<void> {
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

function normalizeTier(value: unknown): ExperienceTier {
  return value === "advanced" || value === "enterprise" ? value : "core";
}

function normalizeFlags(value: unknown): FeatureFlags {
  const base: FeatureFlags = {
    tier: "core",
    enableCaseSession: false,
    enableDiagnostics: false,
    enableEvidenceExport: false,
    enablePlaybooks: false,
    enableUrlIntel: false,
    enableRunHistory: false,
    enableSafetyGuardrails: true
  };
  if (!isObject(value)) {
    return base;
  }
  const tier = normalizeTier(value.tier);
  const normalized: FeatureFlags = {
    tier,
    enableCaseSession: Boolean(value.enableCaseSession),
    enableDiagnostics: Boolean(value.enableDiagnostics),
    enableEvidenceExport: Boolean(value.enableEvidenceExport),
    enablePlaybooks: Boolean(value.enablePlaybooks),
    enableUrlIntel: Boolean(value.enableUrlIntel),
    enableRunHistory: Boolean(value.enableRunHistory),
    enableSafetyGuardrails: value.enableSafetyGuardrails !== false
  };
  if (tier === "core") {
    normalized.enableCaseSession = false;
    normalized.enableDiagnostics = false;
    normalized.enableEvidenceExport = false;
    normalized.enablePlaybooks = false;
    normalized.enableUrlIntel = false;
    normalized.enableRunHistory = false;
  }
  if (tier === "advanced") {
    normalized.enableDiagnostics = true;
    normalized.enableEvidenceExport = true;
    normalized.enablePlaybooks = true;
    normalized.enableUrlIntel = true;
    normalized.enableRunHistory = true;
  }
  if (tier === "enterprise") {
    normalized.enableDiagnostics = true;
    normalized.enableEvidenceExport = true;
    normalized.enablePlaybooks = true;
    normalized.enableUrlIntel = true;
    normalized.enableRunHistory = true;
    normalized.enableCaseSession = true;
  }
  return normalized;
}

function normalizeCaseSession(value: unknown): CaseSession | null {
  if (!isObject(value)) {
    return null;
  }
  const caseName = typeof value.caseName === "string" ? value.caseName.trim() : "";
  if (!caseName) {
    return null;
  }
  const severityRaw = value.severity;
  const severity =
    severityRaw === "low" || severityRaw === "high" || severityRaw === "critical" ? severityRaw : "medium";
  const tags = Array.isArray(value.tags) ? value.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean) : [];
  const now = getNowMs();
  return {
    id: typeof value.id === "string" && value.id ? value.id : createId("case"),
    caseName,
    ticketRef: typeof value.ticketRef === "string" ? value.ticketRef.trim() : "",
    severity,
    tags,
    notes: typeof value.notes === "string" ? value.notes : "",
    createdAtMs: typeof value.createdAtMs === "number" ? value.createdAtMs : now,
    updatedAtMs: typeof value.updatedAtMs === "number" ? value.updatedAtMs : now
  };
}

function normalizeRunRecord(value: unknown): RunRecord | null {
  if (!isObject(value)) {
    return null;
  }
  if (typeof value.providerId !== "string" || typeof value.pageUrl !== "string") {
    return null;
  }
  const normalized: RunRecord = {
    id: typeof value.id === "string" && value.id ? value.id : createId("run"),
    providerId: value.providerId as ProviderId,
    pageUrl: value.pageUrl,
    clientId: typeof value.clientId === "string" ? value.clientId : "",
    urlsText: typeof value.urlsText === "string" ? value.urlsText : "",
    ok: Boolean(value.ok),
    filledCount: typeof value.filledCount === "number" ? value.filledCount : 0,
    notes: Array.isArray(value.notes) ? value.notes.filter((note) => typeof note === "string") : [],
    durationMs: typeof value.durationMs === "number" ? value.durationMs : 0,
    timestampMs: typeof value.timestampMs === "number" ? value.timestampMs : getNowMs()
  };
  if (typeof value.error === "string" && value.error.length > 0) {
    normalized.error = value.error;
  }
  return normalized;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const raw = await readStorage<unknown>(FEATURE_FLAGS_KEY);
  return normalizeFlags(raw);
}

export async function saveFeatureFlags(flags: FeatureFlags): Promise<FeatureFlags> {
  const normalized = normalizeFlags(flags);
  await writeStorage(FEATURE_FLAGS_KEY, normalized);
  return normalized;
}

export async function setExperienceTier(tier: ExperienceTier): Promise<FeatureFlags> {
  const current = await getFeatureFlags();
  return saveFeatureFlags({ ...current, tier });
}

export async function getCaseSession(): Promise<CaseSession | null> {
  const raw = await readStorage<unknown>(CASE_SESSION_KEY);
  return normalizeCaseSession(raw);
}

export async function saveCaseSession(session: Omit<CaseSession, "id" | "createdAtMs" | "updatedAtMs"> & Partial<Pick<CaseSession, "id" | "createdAtMs">>): Promise<CaseSession> {
  const now = getNowMs();
  const normalized = normalizeCaseSession({
    ...session,
    id: session.id ?? createId("case"),
    createdAtMs: session.createdAtMs ?? now,
    updatedAtMs: now
  });
  if (!normalized) {
    throw new Error("Invalid case session.");
  }
  await writeStorage(CASE_SESSION_KEY, normalized);
  return normalized;
}

export async function clearCaseSession(): Promise<void> {
  await writeStorage<null>(CASE_SESSION_KEY, null);
}

export async function listRunHistory(): Promise<RunRecord[]> {
  const raw = await readStorage<unknown>(RUN_HISTORY_KEY);
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => normalizeRunRecord(item))
    .filter((item): item is RunRecord => item !== null)
    .sort((a, b) => b.timestampMs - a.timestampMs)
    .slice(0, RUN_HISTORY_LIMIT);
}

export async function appendRunRecord(record: Omit<RunRecord, "id">): Promise<void> {
  const existing = await listRunHistory();
  const next: RunRecord[] = [
    {
      ...record,
      id: createId("run")
    },
    ...existing
  ].slice(0, RUN_HISTORY_LIMIT);
  await writeStorage(RUN_HISTORY_KEY, next);
}

export async function clearRunHistory(): Promise<void> {
  await writeStorage<RunRecord[]>(RUN_HISTORY_KEY, []);
}
