import { useEffect, useMemo, useState } from "react";
import type { AutofillPayload, ProviderId } from "../providers";
import { getAnalystProfile, getClientProfileById, listClientProfiles, type ClientProfile } from "../storage/profileStore";
import { renderTemplate } from "../utils/templateEngine";
import { detectProviderFromUrl, parseUrls } from "../utils/urlDetector";
import { AutofillButton } from "./AutofillButton";
import { ClientSelector } from "./ClientSelector";
import { UrlInput } from "./UrlInput";

interface AutofillMessage {
  type: "ABUSEFLOW_AUTOFILL";
  providerId: ProviderId;
  payload: AutofillPayload;
}

interface AutofillResponse {
  ok: boolean;
  filledCount?: number;
  error?: string;
}

interface TabContext {
  tabId: number | null;
  url: string;
  providerId: ProviderId | null;
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

export function Popup(): JSX.Element {
  const [tabContext, setTabContext] = useState<TabContext>({ tabId: null, url: "", providerId: null });
  const [analystConfigured, setAnalystConfigured] = useState(false);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [urlsText, setUrlsText] = useState("");
  const [status, setStatus] = useState("");
  const [isAutofilling, setIsAutofilling] = useState(false);

  useEffect(() => {
    async function load(): Promise<void> {
      const [context, analystProfile, clientProfiles] = await Promise.all([
        getCurrentTabContext(),
        getAnalystProfile(),
        listClientProfiles()
      ]);
      setTabContext(context);
      setAnalystConfigured(Boolean(analystProfile));
      setClients(clientProfiles);
      const firstClient = clientProfiles[0];
      if (firstClient) {
        setSelectedClientId(firstClient.id);
      }
    }

    void load();
  }, []);

  const isSupportedPage = tabContext.providerId !== null;

  const canAutofill = useMemo(() => {
    return isSupportedPage && analystConfigured && selectedClientId.length > 0 && !isAutofilling;
  }, [analystConfigured, isAutofilling, isSupportedPage, selectedClientId]);

  async function handleAutofillClick(): Promise<void> {
    if (!tabContext.providerId || tabContext.tabId === null) {
      return;
    }
    setIsAutofilling(true);
    setStatus("");
    try {
      const [analystProfile, clientProfile] = await Promise.all([
        getAnalystProfile(),
        getClientProfileById(selectedClientId)
      ]);

      if (!analystProfile) {
        setStatus("Configure Analyst Profile in settings.");
        return;
      }
      if (!clientProfile) {
        setStatus("Select a client profile.");
        return;
      }

      const urls = parseUrls(urlsText);
      const description = renderTemplate(clientProfile.defaultDescriptionTemplate, {
        client_name: clientProfile.clientName,
        trademark_name: clientProfile.trademarkName,
        registration_number: clientProfile.registrationNumber,
        jurisdiction: clientProfile.jurisdiction,
        urls: urls.join("\n")
      });

      const message: AutofillMessage = {
        type: "ABUSEFLOW_AUTOFILL",
        providerId: tabContext.providerId,
        payload: {
          analyst: analystProfile,
          client: clientProfile,
          urls,
          description
        }
      };

      const response = (await chrome.tabs.sendMessage(tabContext.tabId, message)) as AutofillResponse;
      if (!response?.ok) {
        setStatus(response?.error ?? "Autofill failed.");
        return;
      }
      setStatus(`Autofill completed. ${response.filledCount ?? 0} field(s) updated.`);
    } catch {
      setStatus("Unable to autofill this form.");
    } finally {
      setIsAutofilling(false);
    }
  }

  return (
    <main
      style={{
        width: "340px",
        padding: "14px",
        display: "grid",
        gap: "12px",
        fontFamily: "Segoe UI, Arial, sans-serif",
        color: "#1b1b1b"
      }}
    >
      <header style={{ display: "grid", gap: "4px" }}>
        <strong style={{ fontSize: "15px" }}>AbuseFlow</strong>
        <small style={{ color: "#595959", wordBreak: "break-all" }}>{tabContext.url || "No active tab URL"}</small>
      </header>

      {!isSupportedPage && <div style={{ color: "#9b2c2c", fontSize: "13px" }}>Unsupported page for autofill.</div>}

      {isSupportedPage && !analystConfigured && (
        <div style={{ display: "grid", gap: "8px", fontSize: "13px" }}>
          <span>Analyst profile is required before autofill.</span>
          <button
            type="button"
            onClick={() => chrome.runtime.openOptionsPage()}
            style={{
              border: "1px solid #c9c9c9",
              borderRadius: "8px",
              backgroundColor: "#f8f8f8",
              padding: "8px",
              cursor: "pointer"
            }}
          >
            Open Settings
          </button>
        </div>
      )}

      {isSupportedPage && analystConfigured && (
        <>
          <ClientSelector clients={clients} selectedClientId={selectedClientId} onChange={setSelectedClientId} />
          <UrlInput value={urlsText} onChange={setUrlsText} />
          <AutofillButton disabled={!canAutofill} onClick={() => void handleAutofillClick()} />
        </>
      )}

      {status.length > 0 && (
        <footer style={{ fontSize: "12px", color: "#2f2f2f", backgroundColor: "#f5f5f5", padding: "8px", borderRadius: "8px" }}>
          {status}
        </footer>
      )}
    </main>
  );
}
