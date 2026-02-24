import { useEffect, useMemo, useState } from "react";
import type { ProviderId } from "../providers";
import {
  clearCaseSession,
  clearRunHistory,
  getCaseSession,
  getFeatureFlags,
  listRunHistory,
  saveCaseSession,
  setExperienceTier,
  type CaseSession,
  type FeatureFlags,
} from "../storage/appStateStore";
import {
  getAnalystProfile,
  listClientProfiles,
  type ClientProfile,
} from "../storage/profileStore";
import { detectProviderFromUrl, parseUrls } from "../utils/urlDetector";
import type {
  DescriptionTemplateType,
  DescriptionTone
} from "../utils/descriptionPresets";

interface TabContext {
  tabId: number | null;
  url: string;
  providerId: ProviderId | null;
}

interface PanelSnapshot {
  panelOpen: boolean;
  statusMessage: string;
  statusTone: "info" | "error" | "success" | "";
  selectedClientId: string;
  draftUrlsText: string;
  selectedTemplateType: DescriptionTemplateType;
  selectedTone: DescriptionTone;
  debugMode: boolean;
  lastRun: {
    ok: boolean;
    providerId: ProviderId;
    filledCount: number;
    notes: string[];
    durationMs: number;
    timestampMs: number;
    error?: string;
  } | null;
}

interface PanelSnapshotResponse {
  ok: boolean;
  snapshot?: PanelSnapshot;
  error?: string;
}

interface UrlIntel {
  total: number;
  uniqueDomains: number;
  shortenedLinks: number;
  supportsX: boolean;
}

const emptyFlags: FeatureFlags = {
  tier: "core",
  enableCaseSession: false,
  enableDiagnostics: false,
  enableEvidenceExport: false,
  enablePlaybooks: false,
  enableUrlIntel: false,
  enableRunHistory: false,
  enableSafetyGuardrails: true,
  autoPruneRunHistory: true,
  runHistoryMaxEntries: 300,
  runHistoryMaxAgeDays: 90,
};

const shortenerDomains = [
  "bit.ly",
  "t.co",
  "tinyurl.com",
  "cutt.ly",
  "rb.gy",
  "shorturl.at",
];

const playbooks: Partial<Record<ProviderId, string>> = {
  facebook_abuse_form:
    "Tick additional links if reporting more than 10 URLs; re-run autofill after expansion.",
  x_abuse_form:
    "Confirm phone and client X handle are present before autofill to avoid required-field blockers.",
  google_abuse_form:
    "Fill in one content URL per line; keep description concise and policy-focused.",
};

function formatTierLabel(tier: FeatureFlags["tier"]): string {
  if (tier === "enterprise") {
    return "Sensei";
  }
  if (tier === "advanced") {
    return "Advanced";
  }
  return "Core";
}

async function getCurrentTabContext(): Promise<TabContext> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  const tabId = typeof tab?.id === "number" ? tab.id : null;
  const url = tab?.url ?? "";
  return {
    tabId,
    url,
    providerId: detectProviderFromUrl(url),
  };
}

function formatTimestamp(timestampMs: number): string {
  return new Date(timestampMs).toLocaleTimeString();
}

function buildUrlIntel(inputText: string): UrlIntel {
  const parsed = parseUrls(inputText);
  const hosts = new Set<string>();
  let shortenedLinks = 0;
  let supportsX = false;

  for (const item of parsed) {
    try {
      const url = new URL(item);
      const host = url.hostname.toLowerCase();
      hosts.add(host);
      if (
        shortenerDomains.some(
          (domain) => host === domain || host.endsWith(`.${domain}`),
        )
      ) {
        shortenedLinks += 1;
      }
      if (host.includes("x.com") || host.includes("twitter.com")) {
        supportsX = true;
      }
    } catch {
      continue;
    }
  }

  return {
    total: parsed.length,
    uniqueDomains: hosts.size,
    shortenedLinks,
    supportsX,
  };
}

export function Popup(): JSX.Element {
  const ui = {
    shell: {
      width: "330px",
      padding: "12px",
      display: "grid",
      gap: "10px",
      fontFamily: '"IBM Plex Sans", "Avenir Next", "Trebuchet MS", sans-serif',
      color: "#112031",
      background:
        "linear-gradient(140deg, #f5f9ff 0%, #eef4ff 55%, #f8fbff 100%)",
    } as const,
    card: {
      display: "grid",
      gap: "7px",
      fontSize: "12px",
      backgroundColor: "#ffffff",
      border: "1px solid #dce6ee",
      borderRadius: "12px",
      padding: "10px",
      boxShadow: "0 3px 10px rgba(17, 32, 49, 0.06)",
    } as const,
    cardTitle: {
      fontSize: "12px",
      fontWeight: 700,
      color: "#0f2f66",
      letterSpacing: "0.2px",
      marginBottom: "2px",
    } as const,
    input: {
      width: "100%",
      border: "1px solid #cfd8e3",
      borderRadius: "8px",
      padding: "8px",
      fontSize: "12px",
      color: "#0f172a",
      backgroundColor: "#fbfdff",
      boxSizing: "border-box" as const,
    },
    primaryButton: {
      border: "none",
      borderRadius: "10px",
      backgroundColor: "#1f5eff",
      color: "#ffffff",
      padding: "10px 12px",
      fontWeight: 700,
      fontSize: "12px",
      cursor: "pointer",
    } as const,
    secondaryButton: {
      border: "1px solid #cfd8e3",
      borderRadius: "10px",
      backgroundColor: "#ffffff",
      color: "#1e293b",
      padding: "8px 10px",
      fontWeight: 600,
      fontSize: "12px",
      cursor: "pointer",
    } as const,
    tierButton: {
      border: "1px solid #cfd8e3",
      borderRadius: "9px",
      backgroundColor: "#ffffff",
      color: "#1e293b",
      padding: "5px 8px",
      fontWeight: 600,
      fontSize: "11px",
      cursor: "pointer",
    } as const,
    tierButtonActive: {
      backgroundColor: "#e9f0ff",
      borderColor: "#90b4ff",
      color: "#0f3ea8",
    } as const,
    badge: {
      display: "inline-block",
      borderRadius: "999px",
      padding: "2px 8px",
      fontSize: "11px",
      fontWeight: 700,
    } as const,
  };

  const [tabContext, setTabContext] = useState<TabContext>({
    tabId: null,
    url: "",
    providerId: null,
  });
  const [analystConfigured, setAnalystConfigured] = useState(false);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [snapshot, setSnapshot] = useState<PanelSnapshot | null>(null);
  const [flags, setFlags] = useState<FeatureFlags>(emptyFlags);
  const [caseSession, setCaseSession] = useState<CaseSession | null>(null);
  const [caseForm, setCaseForm] = useState({
    caseName: "",
    ticketRef: "",
    severity: "medium" as "low" | "medium" | "high" | "critical",
    tags: "",
    notes: "",
  });
  const [runHistory, setRunHistory] = useState<
    Array<{
      id: string;
      providerId: ProviderId;
      pageUrl: string;
      clientId: string;
      urlsText: string;
      descriptionTemplateType: DescriptionTemplateType;
      descriptionTone: DescriptionTone;
      ok: boolean;
      filledCount: number;
      notes: string[];
      durationMs: number;
      timestampMs: number;
      error?: string;
    }>
  >([]);
  const [status, setStatus] = useState("");
  const [rerunStatus, setRerunStatus] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [redactEvidence, setRedactEvidence] = useState(true);
  const isCore = flags.tier === "core";
  const isAdvanced = flags.tier === "advanced";
  const isEnterprise = flags.tier === "enterprise";

  async function refreshState(): Promise<void> {
    setIsBusy(true);
    try {
      const [
        context,
        analyst,
        clientProfiles,
        currentFlags,
        currentCase,
        history,
      ] = await Promise.all([
        getCurrentTabContext(),
        getAnalystProfile(),
        listClientProfiles(),
        getFeatureFlags(),
        getCaseSession(),
        listRunHistory(),
      ]);

      setTabContext(context);
      setAnalystConfigured(Boolean(analyst));
      setClients(clientProfiles);
      setFlags(currentFlags);
      setCaseSession(currentCase);
      setRunHistory(history.slice(0, 10));

      if (currentCase) {
        setCaseForm({
          caseName: currentCase.caseName,
          ticketRef: currentCase.ticketRef,
          severity: currentCase.severity,
          tags: currentCase.tags.join(", "),
          notes: currentCase.notes,
        });
      }

      if (context.tabId !== null && context.providerId) {
        const response = (await chrome.tabs.sendMessage(context.tabId, {
          type: "ABUSEFLOW_PANEL_SNAPSHOT",
        })) as PanelSnapshotResponse;
        if (response?.ok && response.snapshot) {
          setSnapshot(response.snapshot);
        } else {
          setSnapshot(null);
        }
      } else {
        setSnapshot(null);
      }
    } catch {
      setSnapshot(null);
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    void refreshState();
  }, []);

  const isSupportedPage = tabContext.providerId !== null;
  const selectedClient = useMemo(() => {
    if (!snapshot?.selectedClientId) {
      return null;
    }
    return (
      clients.find((client) => client.id === snapshot.selectedClientId) ?? null
    );
  }, [clients, snapshot?.selectedClientId]);

  const readinessChecks = useMemo(() => {
    const checks: Array<{ label: string; ok: boolean }> = [
      { label: "Supported page", ok: isSupportedPage },
      { label: "Analyst profile configured", ok: analystConfigured },
      { label: "At least one client profile", ok: clients.length > 0 },
      { label: "Floating panel opened", ok: Boolean(snapshot?.panelOpen) },
      {
        label: "Client selected in panel",
        ok: Boolean(snapshot?.selectedClientId),
      },
    ];
    if (tabContext.providerId === "x_abuse_form") {
      checks.push({
        label: "X handle exists in selected client",
        ok: Boolean(selectedClient?.xHandle?.trim()),
      });
    }
    if (flags.enableSafetyGuardrails) {
      checks.push({ label: "Safety guardrails enabled", ok: true });
    }
    return checks;
  }, [
    isSupportedPage,
    analystConfigured,
    clients.length,
    snapshot?.panelOpen,
    snapshot?.selectedClientId,
    tabContext.providerId,
    selectedClient?.xHandle,
    flags.enableSafetyGuardrails,
  ]);
  const readinessScore = useMemo(() => {
    if (readinessChecks.length === 0) {
      return 0;
    }
    const passed = readinessChecks.filter((check) => check.ok).length;
    return Math.round((passed / readinessChecks.length) * 100);
  }, [readinessChecks]);

  const latestHistoryItem = runHistory[0];
  const urlIntel = useMemo(
    () => buildUrlIntel(snapshot?.draftUrlsText ?? ""),
    [snapshot?.draftUrlsText],
  );
  const failureHint =
    snapshot?.lastRun && !snapshot.lastRun.ok
      ? "Retry after fixing missing profile fields and reopening the current form step."
      : "";

  async function handleOpenPanel(): Promise<void> {
    if (!tabContext.tabId || !isSupportedPage) {
      setStatus("Open a supported form page to use the panel.");
      return;
    }
    setStatus("");
    try {
      const response = (await chrome.tabs.sendMessage(tabContext.tabId, {
        type: "ABUSEFLOW_OPEN_PANEL",
      })) as PanelSnapshotResponse;
      if (!response?.ok || !response.snapshot) {
        setStatus(response?.error ?? "Unable to open panel.");
        return;
      }
      setSnapshot(response.snapshot);
      setStatus("Panel opened on active tab.");
    } catch {
      setStatus("Unable to open panel. Reload the target page and try again.");
    }
  }

  async function handleToggleDebug(): Promise<void> {
    if (!tabContext.tabId || !isSupportedPage) {
      setStatus("Open a supported form page first.");
      return;
    }
    const nextEnabled = !(snapshot?.debugMode ?? false);
    setStatus("");
    try {
      const response = (await chrome.tabs.sendMessage(tabContext.tabId, {
        type: "ABUSEFLOW_SET_DEBUG_MODE",
        enabled: nextEnabled,
      })) as PanelSnapshotResponse;
      if (!response?.ok || !response.snapshot) {
        setStatus(response?.error ?? "Unable to update debug mode.");
        return;
      }
      setSnapshot(response.snapshot);
      setStatus(`Debug mode ${nextEnabled ? "enabled" : "disabled"}.`);
    } catch {
      setStatus("Unable to toggle debug mode.");
    }
  }

  async function handleCopyDebugReport(): Promise<void> {
    const report = {
      pageUrl: tabContext.url,
      detectedProvider: tabContext.providerId,
      panelOpen: snapshot?.panelOpen ?? false,
      selectedClientId: snapshot?.selectedClientId ?? "",
      debugMode: snapshot?.debugMode ?? false,
      panelStatus: snapshot?.statusMessage ?? "",
      lastRun: snapshot?.lastRun ?? null,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setStatus("Debug report copied.");
    } catch {
      setStatus("Unable to copy debug report.");
    }
  }

  async function handleSetTier(tier: FeatureFlags["tier"]): Promise<void> {
    try {
      const next = await setExperienceTier(tier);
      setFlags(next);
      setStatus(`Experience tier set to ${tier}.`);
    } catch {
      setStatus("Unable to update tier.");
    }
  }

  async function handleSaveCaseSession(): Promise<void> {
    if (!caseForm.caseName.trim()) {
      setStatus("Case name is required.");
      return;
    }
    try {
      const saved = await saveCaseSession({
        caseName: caseForm.caseName.trim(),
        ticketRef: caseForm.ticketRef.trim(),
        severity: caseForm.severity,
        tags: caseForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        notes: caseForm.notes,
      });
      setCaseSession(saved);
      setStatus("Case session saved.");
    } catch {
      setStatus("Unable to save case session.");
    }
  }

  async function handleClearCaseSession(): Promise<void> {
    await clearCaseSession();
    setCaseSession(null);
    setCaseForm({
      caseName: "",
      ticketRef: "",
      severity: "medium",
      tags: "",
      notes: "",
    });
    setStatus("Case session cleared.");
  }

  async function handleCopyEvidencePackage(): Promise<void> {
    const payload = {
      exportedAt: new Date().toISOString(),
      tier: flags.tier,
      caseSession,
      page: redactEvidence ? "<redacted>" : tabContext.url,
      provider: tabContext.providerId,
      panel: {
        open: snapshot?.panelOpen ?? false,
        status: snapshot?.statusMessage ?? "",
        selectedClientId: snapshot?.selectedClientId ?? "",
      },
      lastRun: snapshot?.lastRun ?? null,
      history: runHistory,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setStatus("Evidence package copied.");
    } catch {
      setStatus("Unable to copy evidence package.");
    }
  }

  async function handleClearHistory(): Promise<void> {
    await clearRunHistory();
    setRunHistory([]);
    setStatus("Run history cleared.");
  }

  async function handleRerun(record: {
    providerId: ProviderId;
    clientId: string;
    urlsText: string;
    descriptionTemplateType?: DescriptionTemplateType;
    descriptionTone?: DescriptionTone;
  }): Promise<void> {
    setRerunStatus("");
    if (!tabContext.tabId) {
      setRerunStatus("No active tab available for rerun.");
      return;
    }
    try {
      const response = (await chrome.tabs.sendMessage(tabContext.tabId, {
        type: "ABUSEFLOW_RERUN_FROM_HISTORY",
        providerId: record.providerId,
        clientId: record.clientId,
        urlsText: record.urlsText,
        descriptionTemplateType: record.descriptionTemplateType ?? "client_default",
        descriptionTone: record.descriptionTone ?? "neutral",
      })) as PanelSnapshotResponse;
      if (!response?.ok) {
        setRerunStatus(response?.error ?? "Unable to rerun this submission.");
        return;
      }
      setSnapshot(response.snapshot ?? null);
      await refreshState();
      setRerunStatus("Rerun completed.");
    } catch {
      setRerunStatus("Unable to rerun this submission.");
    }
  }

  return (
    <main style={ui.shell}>
      <header style={{ display: "grid", gap: "6px" }}>
        <strong
          style={{ fontSize: "16px", letterSpacing: "0.2px", color: "#0b2a61" }}
        >
          AbuseFlow Control Center
        </strong>
        <small
          style={{ color: "#4b5563", wordBreak: "break-all", lineHeight: 1.35 }}
        >
          {tabContext.url || "No active tab URL"}
        </small>
      </header>

      <section style={ui.card}>
        <div style={ui.cardTitle}>Experience Mode</div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            style={{
              ...ui.tierButton,
              ...(isCore ? ui.tierButtonActive : {}),
            }}
            onClick={() => void handleSetTier("core")}
          >
            Core
          </button>
          <button
            type="button"
            style={{
              ...ui.tierButton,
              ...(isAdvanced ? ui.tierButtonActive : {}),
            }}
            onClick={() => void handleSetTier("advanced")}
          >
            Advanced
          </button>
          <button
            type="button"
            style={{
              ...ui.tierButton,
              ...(isEnterprise ? ui.tierButtonActive : {}),
            }}
            onClick={() => void handleSetTier("enterprise")}
          >
            Sensei
          </button>
        </div>
        <div>
          <strong>Active tier:</strong> {formatTierLabel(flags.tier)}
        </div>
      </section>

      <section style={ui.card}>
        <div style={ui.cardTitle}>Context</div>
        <div>
          <strong>Support:</strong>{" "}
          <span
            style={{
              ...ui.badge,
              backgroundColor: isSupportedPage ? "#dcfce7" : "#fee2e2",
              color: isSupportedPage ? "#166534" : "#991b1b",
            }}
          >
            {isSupportedPage ? "Supported" : "Unsupported"}
          </span>
        </div>
        <div>
          <strong>Provider:</strong> {tabContext.providerId ?? "-"}
        </div>
        <div>
          <strong>Analyst:</strong>{" "}
          {analystConfigured ? "Configured" : "Missing"}
        </div>
        <div>
          <strong>Clients:</strong> {clients.length}
        </div>
        <div>
          <strong>Panel:</strong> {snapshot?.panelOpen ? "Open" : "Closed"}
        </div>
      </section>

      <section style={ui.card}>
        <div style={ui.cardTitle}>Readiness</div>
        <div>
          <strong>Score:</strong> {readinessScore}%
        </div>
        {readinessChecks.map((check) => (
          <div
            key={check.label}
            style={{ color: check.ok ? "#067647" : "#b42318" }}
          >
            {check.ok ? "OK" : "Missing"}: {check.label}
          </div>
        ))}
      </section>

      <div style={{ display: "grid", gap: "8px" }}>
        <button
          type="button"
          onClick={() => void handleOpenPanel()}
          disabled={isBusy || !isSupportedPage}
          style={{
            ...ui.primaryButton,
            opacity: isBusy || !isSupportedPage ? 0.55 : 1,
            cursor: isBusy || !isSupportedPage ? "not-allowed" : "pointer",
          }}
        >
          Open/Focus Floating Panel
        </button>
        <button
          type="button"
          onClick={() => void refreshState()}
          disabled={isBusy}
          style={{
            ...ui.secondaryButton,
            cursor: isBusy ? "not-allowed" : "pointer",
          }}
        >
          Refresh Status
        </button>
        <button
          type="button"
          onClick={handleToggleDebug}
          disabled={isBusy || !isSupportedPage}
          style={{
            ...ui.secondaryButton,
            cursor: isBusy || !isSupportedPage ? "not-allowed" : "pointer",
          }}
        >
          {snapshot?.debugMode ? "Disable Debug Mode" : "Enable Debug Mode"}
        </button>
        <button
          type="button"
          onClick={() => void handleCopyDebugReport()}
          style={ui.secondaryButton}
        >
          Copy Debug Report
        </button>
        <button
          type="button"
          onClick={() => chrome.runtime.openOptionsPage()}
          style={ui.secondaryButton}
        >
          Open Settings
        </button>
      </div>

      <section style={ui.card}>
        <div style={ui.cardTitle}>Last Run</div>
        {!snapshot?.lastRun && (
          <div>No run recorded yet. Use the floating panel to autofill.</div>
        )}
        {snapshot?.lastRun && (
          <>
            <div>
              <strong>Status:</strong>{" "}
              {snapshot.lastRun.ok ? "Success" : "Failed"}
            </div>
            <div>
              <strong>Provider:</strong> {snapshot.lastRun.providerId}
            </div>
            <div>
              <strong>Fields Updated:</strong> {snapshot.lastRun.filledCount}
            </div>
            <div>
              <strong>Duration:</strong> {snapshot.lastRun.durationMs}ms
            </div>
            <div>
              <strong>Time:</strong>{" "}
              {formatTimestamp(snapshot.lastRun.timestampMs)}
            </div>
            {snapshot.lastRun.error && (
              <div style={{ color: "#b42318" }}>
                <strong>Error:</strong> {snapshot.lastRun.error}
              </div>
            )}
            {failureHint && (
              <div style={{ color: "#b42318" }}>{failureHint}</div>
            )}
            {latestHistoryItem && (
              <button
                type="button"
                onClick={() => void handleRerun(latestHistoryItem)}
                style={ui.secondaryButton}
              >
                Rerun Latest
              </button>
            )}
            {rerunStatus && (
              <div style={{ color: rerunStatus.includes("completed") ? "#067647" : "#b42318" }}>
                {rerunStatus}
              </div>
            )}
          </>
        )}
      </section>

      {flags.tier !== "core" && flags.enablePlaybooks && (
        <section style={ui.card}>
          <div style={ui.cardTitle}>Provider Playbook</div>
          <div>
            {(tabContext.providerId && playbooks[tabContext.providerId]) ||
              "No provider-specific hint yet."}
          </div>
        </section>
      )}

      {flags.tier !== "core" && flags.enableDiagnostics && (
        <section style={ui.card}>
          <div style={ui.cardTitle}>Diagnostics</div>
          <div>Panel status: {snapshot?.statusMessage || "No message"}</div>
          <div>Status tone: {snapshot?.statusTone || "-"}</div>
          <div>
            Selected client in panel:{" "}
            {selectedClient?.clientName || "Not selected"}
          </div>
          <div>
            Guardrails: {flags.enableSafetyGuardrails ? "Enabled" : "Disabled"}
          </div>
        </section>
      )}

      {flags.tier !== "core" && flags.enableUrlIntel && (
        <section style={ui.card}>
          <div style={ui.cardTitle}>URL Intelligence</div>
          <div>URLs parsed this session: {urlIntel.total}</div>
          <div>Unique domains: {urlIntel.uniqueDomains}</div>
          <div>Short links: {urlIntel.shortenedLinks}</div>
          <div>X/Twitter indicators: {urlIntel.supportsX ? "Yes" : "No"}</div>
        </section>
      )}

      {flags.enableCaseSession && (
        <section style={ui.card}>
          <div style={ui.cardTitle}>Case Session</div>
          <input
            value={caseForm.caseName}
            onChange={(event) =>
              setCaseForm((prev) => ({ ...prev, caseName: event.target.value }))
            }
            placeholder="Case name"
            style={ui.input}
          />
          <input
            value={caseForm.ticketRef}
            onChange={(event) =>
              setCaseForm((prev) => ({
                ...prev,
                ticketRef: event.target.value,
              }))
            }
            placeholder="Ticket reference"
            style={ui.input}
          />
          <select
            value={caseForm.severity}
            onChange={(event) =>
              setCaseForm((prev) => ({
                ...prev,
                severity: event.target.value as
                  | "low"
                  | "medium"
                  | "high"
                  | "critical",
              }))
            }
            style={ui.input}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <input
            value={caseForm.tags}
            onChange={(event) =>
              setCaseForm((prev) => ({ ...prev, tags: event.target.value }))
            }
            placeholder="Tags (comma-separated)"
            style={ui.input}
          />
          <textarea
            rows={3}
            value={caseForm.notes}
            onChange={(event) =>
              setCaseForm((prev) => ({ ...prev, notes: event.target.value }))
            }
            placeholder="Case notes"
            style={ui.input}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => void handleSaveCaseSession()}
              style={ui.secondaryButton}
            >
              Save Case
            </button>
            <button
              type="button"
              onClick={() => void handleClearCaseSession()}
              style={ui.secondaryButton}
            >
              Clear
            </button>
          </div>
        </section>
      )}

      {flags.enableRunHistory && (
        <section style={ui.card}>
          <div style={ui.cardTitle}>Run History</div>
          {!latestHistoryItem && <div>No stored runs yet.</div>}
          {runHistory.map((item) => (
            <div
              key={item.id}
              style={{ borderTop: "1px solid #eef2f7", paddingTop: "6px" }}
            >
              <div>
                <strong>{item.ok ? "Success" : "Fail"}</strong>{" "}
                {item.providerId}
              </div>
              <div>{formatTimestamp(item.timestampMs)}</div>
              <div>
                {item.filledCount} field(s), {item.durationMs}ms
              </div>
              <button
                type="button"
                onClick={() => void handleRerun(item)}
                style={{
                  ...ui.secondaryButton,
                  marginTop: "6px",
                  padding: "6px 8px",
                  fontSize: "11px",
                }}
              >
                Rerun
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => void handleClearHistory()}
            style={ui.secondaryButton}
          >
            Clear History
          </button>
          {rerunStatus && (
            <div style={{ color: rerunStatus.includes("completed") ? "#067647" : "#b42318" }}>
              {rerunStatus}
            </div>
          )}
        </section>
      )}

      {flags.enableEvidenceExport && (
        <section style={ui.card}>
          <div style={ui.cardTitle}>Evidence Export</div>
          <label style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={redactEvidence}
              onChange={(event) => setRedactEvidence(event.target.checked)}
            />
            Redact page URL
          </label>
          <button
            type="button"
            onClick={() => void handleCopyEvidencePackage()}
            style={ui.secondaryButton}
          >
            Copy Evidence Package
          </button>
        </section>
      )}

      {status.length > 0 && (
        <footer
          style={{
            fontSize: "12px",
            color: "#2f2f2f",
            backgroundColor: "#f3f7ff",
            border: "1px solid #bcd3ff",
            padding: "8px",
            borderRadius: "10px",
          }}
        >
          {status}
        </footer>
      )}
    </main>
  );
}
