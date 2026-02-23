import { useEffect, useMemo, useState } from "react";
import type { ProviderId } from "../providers";
import { getAnalystProfile, listClientProfiles, type ClientProfile } from "../storage/profileStore";
import { detectProviderFromUrl } from "../utils/urlDetector";

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

async function getCurrentTabContext(): Promise<TabContext> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  const tabId = typeof tab?.id === "number" ? tab.id : null;
  const url = tab?.url ?? "";
  return {
    tabId,
    url,
    providerId: detectProviderFromUrl(url)
  };
}

function formatTimestamp(timestampMs: number): string {
  return new Date(timestampMs).toLocaleTimeString();
}

export function Popup(): JSX.Element {
  const ui = {
    shell: {
      width: "330px",
      padding: "14px",
      display: "grid",
      gap: "12px",
      fontFamily: "\"IBM Plex Sans\", \"Avenir Next\", \"Trebuchet MS\", sans-serif",
      color: "#112031",
      background:
        "linear-gradient(140deg, #f5f9ff 0%, #eef4ff 55%, #f8fbff 100%)"
    } as const,
    card: {
      display: "grid",
      gap: "7px",
      fontSize: "12px",
      backgroundColor: "#ffffff",
      border: "1px solid #dce6ee",
      borderRadius: "12px",
      padding: "10px",
      boxShadow: "0 3px 10px rgba(17, 32, 49, 0.06)"
    } as const,
    primaryButton: {
      border: "none",
      borderRadius: "10px",
      backgroundColor: "#1f5eff",
      color: "#ffffff",
      padding: "10px 12px",
      fontWeight: 700,
      cursor: "pointer",
      transition: "transform 120ms ease, filter 120ms ease"
    } as const,
    secondaryButton: {
      border: "1px solid #cfd8e3",
      borderRadius: "10px",
      backgroundColor: "#ffffff",
      color: "#1e293b",
      padding: "9px 10px",
      fontWeight: 600,
      cursor: "pointer"
    } as const,
    badge: {
      display: "inline-block",
      borderRadius: "999px",
      padding: "2px 8px",
      fontSize: "11px",
      fontWeight: 700
    } as const
  };

  const [tabContext, setTabContext] = useState<TabContext>({ tabId: null, url: "", providerId: null });
  const [analystConfigured, setAnalystConfigured] = useState(false);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [snapshot, setSnapshot] = useState<PanelSnapshot | null>(null);
  const [status, setStatus] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function refreshState(): Promise<void> {
    setIsBusy(true);
    try {
      const [context, analyst, clientProfiles] = await Promise.all([
        getCurrentTabContext(),
        getAnalystProfile(),
        listClientProfiles()
      ]);

      setTabContext(context);
      setAnalystConfigured(Boolean(analyst));
      setClients(clientProfiles);

      if (context.tabId !== null && context.providerId) {
        const response = (await chrome.tabs.sendMessage(context.tabId, {
          type: "ABUSEFLOW_PANEL_SNAPSHOT"
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
    return clients.find((client) => client.id === snapshot.selectedClientId) ?? null;
  }, [clients, snapshot?.selectedClientId]);

  async function handleOpenPanel(): Promise<void> {
    if (!tabContext.tabId || !isSupportedPage) {
      setStatus("Open a supported form page to use the panel.");
      return;
    }
    setStatus("");
    try {
      const response = (await chrome.tabs.sendMessage(tabContext.tabId, {
        type: "ABUSEFLOW_OPEN_PANEL"
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
        enabled: nextEnabled
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
    if (!snapshot?.lastRun) {
      setStatus("No autofill run report available yet.");
      return;
    }
    const report = {
      pageUrl: tabContext.url,
      detectedProvider: tabContext.providerId,
      panelOpen: snapshot.panelOpen,
      selectedClientId: snapshot.selectedClientId,
      debugMode: snapshot.debugMode,
      lastRun: snapshot.lastRun
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setStatus("Debug report copied.");
    } catch {
      setStatus("Unable to copy debug report.");
    }
  }

  return (
    <main
      style={ui.shell}
    >
      <header style={{ display: "grid", gap: "6px" }}>
        <strong style={{ fontSize: "16px", letterSpacing: "0.2px" }}>AbuseFlow Control Center</strong>
        <small style={{ color: "#4b5563", wordBreak: "break-all", lineHeight: 1.35 }}>
          {tabContext.url || "No active tab URL"}
        </small>
      </header>

      <section style={ui.card}>
        <div>
          <strong>Support:</strong>{" "}
          <span
            style={{
              ...ui.badge,
              backgroundColor: isSupportedPage ? "#dcfce7" : "#fee2e2",
              color: isSupportedPage ? "#166534" : "#991b1b"
            }}
          >
            {isSupportedPage ? "Supported" : "Unsupported"}
          </span>
        </div>
        <div>
          <strong>Provider:</strong> {tabContext.providerId ?? "-"}
        </div>
        <div>
          <strong>Analyst:</strong> {analystConfigured ? "Configured" : "Missing"}
        </div>
        <div>
          <strong>Clients:</strong> {clients.length}
        </div>
        <div>
          <strong>Panel:</strong> {snapshot?.panelOpen ? "Open" : "Closed"}
        </div>
        <div>
          <strong>Selected Client:</strong> {selectedClient?.clientName ?? "Not selected in panel"}
        </div>
      </section>

      <div style={{ display: "grid", gap: "8px" }}>
        <button
          type="button"
          onClick={() => void handleOpenPanel()}
          disabled={isBusy || !isSupportedPage}
          style={{
            ...ui.primaryButton,
            opacity: isBusy || !isSupportedPage ? 0.55 : 1,
            cursor: isBusy || !isSupportedPage ? "not-allowed" : "pointer"
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
            cursor: isBusy ? "not-allowed" : "pointer"
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
            cursor: isBusy || !isSupportedPage ? "not-allowed" : "pointer"
          }}
        >
          {snapshot?.debugMode ? "Disable Debug Mode" : "Enable Debug Mode"}
        </button>
        <button
          type="button"
          onClick={handleCopyDebugReport}
          disabled={isBusy || !snapshot?.lastRun}
          style={{
            ...ui.secondaryButton,
            cursor: isBusy || !snapshot?.lastRun ? "not-allowed" : "pointer"
          }}
        >
          Copy Debug Report
        </button>
        <button
          type="button"
          onClick={() => chrome.runtime.openOptionsPage()}
          style={{
            ...ui.secondaryButton,
            cursor: "pointer"
          }}
        >
          Open Settings
        </button>
      </div>

      <section style={ui.card}>
        <strong>Last Run</strong>
        {!snapshot?.lastRun && <div>No run recorded yet. Use the floating panel to autofill.</div>}
        {snapshot?.lastRun && (
          <>
            <div>
              <strong>Status:</strong> {snapshot.lastRun.ok ? "Success" : "Failed"}
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
              <strong>Time:</strong> {formatTimestamp(snapshot.lastRun.timestampMs)}
            </div>
            {snapshot.lastRun.notes.length > 0 && (
              <div>
                <strong>Notes:</strong> {snapshot.lastRun.notes.join(" ")}
              </div>
            )}
            {snapshot.lastRun.error && (
              <div style={{ color: "#b42318" }}>
                <strong>Error:</strong> {snapshot.lastRun.error}
              </div>
            )}
          </>
        )}
      </section>

      {status.length > 0 && (
        <footer
          style={{
            fontSize: "12px",
            color: "#2f2f2f",
            backgroundColor: "#eef4ff",
            border: "1px solid #cfe0ff",
            padding: "8px",
            borderRadius: "10px"
          }}
        >
          {status}
        </footer>
      )}
    </main>
  );
}
