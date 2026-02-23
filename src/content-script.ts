import { getProviderById, type AutofillPayload, type ProviderId } from "./providers";
import { consumeFacebookAdditionalLinksAutoExpanded } from "./providers/facebook_abuse_form";
import { getAnalystProfile, listClientProfiles, type ClientProfile } from "./storage/profileStore";
import { buildAutofillPayload } from "./utils/autofillPayload";
import { detectProviderFromUrl } from "./utils/urlDetector";

interface AutofillRequestMessage {
  type: "ABUSEFLOW_AUTOFILL";
  providerId: ProviderId;
  payload: AutofillPayload;
}

interface AutofillResponseMessage {
  ok: boolean;
  filledCount?: number;
  notes?: string[];
  diagnostics?: {
    providerId: ProviderId;
    pageUrl: string;
    inputUrlCount: number;
    durationMs: number;
  };
  error?: string;
}

interface OpenOptionsResponse {
  ok: boolean;
  error?: string;
}

const ABUSEFLOW_STYLE_ID = "abuseflow-style";
const ABUSEFLOW_BUTTON_ID = "abuseflow-floating-button";
const ABUSEFLOW_PANEL_ID = "abuseflow-floating-panel";
const ABUSEFLOW_CLIENT_SELECT_ID = "abuseflow-client-select";
const ABUSEFLOW_URL_INPUT_ID = "abuseflow-url-input";
const ABUSEFLOW_AUTOFILL_BUTTON_ID = "abuseflow-autofill-button";
const ABUSEFLOW_STATUS_ID = "abuseflow-status";
const ABUSEFLOW_SETTINGS_BUTTON_ID = "abuseflow-open-settings";
const ABUSEFLOW_BUTTON_ICON_URL = chrome.runtime.getURL("public/icons/button_icon48.png");
const CLIENT_PROFILES_KEY = "abuseflow_client_profiles";
const BASE_BUTTON_RIGHT = 20;
const BASE_BUTTON_BOTTOM = 20;
const BUTTON_SIZE_PX = 48;
const BUTTON_STEP_OFFSET_PX = 72;
const BUTTON_MAX_OFFSET_PX = 360;
const BUTTON_REPOSITION_INTERVAL_MS = 4000;
const SYNC_UI_INTERVAL_MS = 5000;
const MAX_FLOATING_Z_INDEX = 2147483646;

let lastKnownUrl = window.location.href;
let outsideClickHandlerAttached = false;
let storageListenerAttached = false;
let selectedClientId = "";
let isPanelBusy = false;
let floatingPositionTimerId: number | null = null;
let floatingPositionListenersAttached = false;
let historyListenersAttached = false;

function getElementById<T extends HTMLElement>(id: string, ctor: { new (): T }): T | null {
  const element = document.getElementById(id);
  return element instanceof ctor ? element : null;
}

async function openSettingsPage(): Promise<void> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: "ABUSEFLOW_OPEN_OPTIONS"
    })) as OpenOptionsResponse | undefined;
    if (response?.ok) {
      return;
    }
  } catch {
    // Fall through to direct URL open.
  }

  const optionsUrl = chrome.runtime.getURL("public/options.html");
  window.open(optionsUrl, "_blank", "noopener,noreferrer");
}

function createFloatingButton(): HTMLButtonElement {
  const existingButton = getElementById(ABUSEFLOW_BUTTON_ID, HTMLButtonElement);
  if (existingButton) {
    return existingButton;
  }

  const button = document.createElement("button");
  button.id = ABUSEFLOW_BUTTON_ID;
  button.type = "button";
  button.textContent = "AF";
  button.setAttribute("aria-label", "Open AbuseFlow panel");
  button.setAttribute("aria-expanded", "false");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void togglePanel();
  });
  return button;
}

function createPanel(): HTMLDivElement {
  const existingPanel = getElementById(ABUSEFLOW_PANEL_ID, HTMLDivElement);
  if (existingPanel) {
    return existingPanel;
  }

  const panel = document.createElement("div");
  panel.id = ABUSEFLOW_PANEL_ID;
  panel.hidden = true;
  panel.setAttribute("aria-hidden", "true");

  const titleRow = document.createElement("div");
  titleRow.className = "abuseflow-title-row";

  const title = document.createElement("div");
  title.textContent = "AbuseFlow";
  title.className = "abuseflow-title";

  const settingsButton = document.createElement("button");
  settingsButton.id = ABUSEFLOW_SETTINGS_BUTTON_ID;
  settingsButton.type = "button";
  settingsButton.textContent = "Settings";
  settingsButton.className = "abuseflow-link-button";
  settingsButton.addEventListener("click", () => {
    void openSettingsPage();
  });

  titleRow.appendChild(title);
  titleRow.appendChild(settingsButton);

  const clientLabel = document.createElement("label");
  clientLabel.textContent = "Client";
  clientLabel.className = "abuseflow-label";
  clientLabel.htmlFor = ABUSEFLOW_CLIENT_SELECT_ID;

  const clientSelect = document.createElement("select");
  clientSelect.id = ABUSEFLOW_CLIENT_SELECT_ID;
  clientSelect.className = "abuseflow-select";
  clientSelect.disabled = true;

  const urlLabel = document.createElement("label");
  urlLabel.textContent = "Content URLs";
  urlLabel.className = "abuseflow-label";
  urlLabel.htmlFor = ABUSEFLOW_URL_INPUT_ID;

  const urlTextarea = document.createElement("textarea");
  urlTextarea.id = ABUSEFLOW_URL_INPUT_ID;
  urlTextarea.className = "abuseflow-textarea";
  urlTextarea.rows = 4;
  urlTextarea.placeholder = "One URL per line";

  const autofillButton = document.createElement("button");
  autofillButton.id = ABUSEFLOW_AUTOFILL_BUTTON_ID;
  autofillButton.type = "button";
  autofillButton.textContent = "Autofill Current Step";
  autofillButton.className = "abuseflow-primary-button";
  autofillButton.disabled = true;

  const status = document.createElement("div");
  status.id = ABUSEFLOW_STATUS_ID;
  status.className = "abuseflow-status";

  panel.appendChild(titleRow);
  panel.appendChild(clientLabel);
  panel.appendChild(clientSelect);
  panel.appendChild(urlLabel);
  panel.appendChild(urlTextarea);
  panel.appendChild(autofillButton);
  panel.appendChild(status);

  attachPanelHandlers(panel);
  return panel;
}

function attachPanelHandlers(panel: HTMLDivElement): void {
  const clientSelect = panel.querySelector(`#${ABUSEFLOW_CLIENT_SELECT_ID}`);
  if (clientSelect instanceof HTMLSelectElement) {
    clientSelect.addEventListener("change", () => {
      selectedClientId = clientSelect.value;
      setPanelStatus("");
      updateAutofillButtonState();
    });
  }

  const autofillButton = panel.querySelector(`#${ABUSEFLOW_AUTOFILL_BUTTON_ID}`);
  if (autofillButton instanceof HTMLButtonElement) {
    autofillButton.addEventListener("click", () => {
      void handlePanelAutofill();
    });
  }
}

function setPanelBusyState(isBusy: boolean): void {
  isPanelBusy = isBusy;
  const clientSelect = getElementById(ABUSEFLOW_CLIENT_SELECT_ID, HTMLSelectElement);
  const autofillButton = getElementById(ABUSEFLOW_AUTOFILL_BUTTON_ID, HTMLButtonElement);

  if (clientSelect) {
    clientSelect.disabled = isBusy || clientSelect.options.length <= 1;
  }
  if (autofillButton) {
    autofillButton.disabled = isBusy || selectedClientId.length === 0;
    autofillButton.textContent = isBusy ? "Autofilling..." : "Autofill Current Step";
  }
}

function updateAutofillButtonState(): void {
  const autofillButton = getElementById(ABUSEFLOW_AUTOFILL_BUTTON_ID, HTMLButtonElement);
  if (!autofillButton) {
    return;
  }
  autofillButton.disabled = isPanelBusy || selectedClientId.length === 0;
}

function setPanelStatus(message: string, tone: "info" | "error" | "success" = "info"): void {
  const status = getElementById(ABUSEFLOW_STATUS_ID, HTMLDivElement);
  if (!status) {
    return;
  }
  status.textContent = message;
  status.setAttribute("data-tone", tone);
}

function isDebugMode(): boolean {
  try {
    return window.localStorage.getItem("abuseflow_debug_mode") === "1";
  } catch {
    return false;
  }
}

function runAutofillForProvider(providerId: ProviderId, payload: AutofillPayload): { filledCount: number; notes: string[] } {
  const provider = getProviderById(providerId);
  if (!provider) {
    throw new Error("Provider unavailable.");
  }

  const filledCount = provider.autofill(payload);
  const notes: string[] = [];
  if (providerId === "facebook_abuse_form" && consumeFacebookAdditionalLinksAutoExpanded()) {
    notes.push("Additional link fields were auto-expanded.");
  }
  if (isDebugMode()) {
    notes.push(`Debug: provider=${providerId}, urls=${payload.urls.length}`);
  }

  return { filledCount, notes };
}

function populateClientOptions(clients: ClientProfile[]): void {
  const clientSelect = getElementById(ABUSEFLOW_CLIENT_SELECT_ID, HTMLSelectElement);
  if (!clientSelect) {
    return;
  }

  const previousId = selectedClientId;
  clientSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = clients.length > 0 ? "Select client profile" : "No client profiles configured";
  clientSelect.appendChild(placeholder);

  for (const client of clients) {
    const option = document.createElement("option");
    option.value = client.id;
    option.textContent = client.clientName;
    clientSelect.appendChild(option);
  }

  const hasPreviousSelection = previousId.length > 0 && clients.some((client) => client.id === previousId);
  selectedClientId = hasPreviousSelection ? previousId : "";
  clientSelect.value = selectedClientId;
  clientSelect.disabled = isPanelBusy || clients.length === 0;
  updateAutofillButtonState();
}

async function refreshClientsInPanel(): Promise<void> {
  try {
    const clients = await listClientProfiles();
    populateClientOptions(clients);
    if (clients.length === 0) {
      setPanelStatus("Add a client profile in Settings.", "info");
    } else {
      const currentStatus = getElementById(ABUSEFLOW_STATUS_ID, HTMLDivElement);
      if (currentStatus?.textContent === "Add a client profile in Settings.") {
        setPanelStatus("");
      }
    }
  } catch {
    populateClientOptions([]);
    setPanelStatus("Unable to load client profiles.", "error");
  }
}

async function handlePanelAutofill(): Promise<void> {
  if (isPanelBusy) {
    return;
  }

  const providerId = detectProviderFromUrl(window.location.href);
  if (!providerId) {
    setPanelStatus("Unsupported page for autofill.", "error");
    return;
  }

  if (!selectedClientId) {
    setPanelStatus("Select a client profile.", "error");
    return;
  }

  const provider = getProviderById(providerId);
  if (!provider) {
    setPanelStatus("Provider unavailable.", "error");
    return;
  }

  setPanelBusyState(true);
  setPanelStatus("");
  const startedAt = Date.now();
  try {
    const [analyst, clients] = await Promise.all([getAnalystProfile(), listClientProfiles()]);
    if (!analyst) {
      setPanelStatus("Configure Analyst Profile in Settings.", "error");
      return;
    }

    const client = clients.find((item) => item.id === selectedClientId);
    if (!client) {
      setPanelStatus("Selected client no longer exists.", "error");
      await refreshClientsInPanel();
      return;
    }

    const urlTextarea = getElementById(ABUSEFLOW_URL_INPUT_ID, HTMLTextAreaElement);
    const payload = buildAutofillPayload(analyst, client, urlTextarea?.value ?? "");
    const { filledCount, notes } = runAutofillForProvider(providerId, payload);

    if (isDebugMode()) {
      notes.push(`Debug: duration=${Date.now() - startedAt}ms`);
    }
    const notesSuffix = notes.length > 0 ? ` ${notes.join(" ")}` : "";
    setPanelStatus(`Autofill completed. ${filledCount} field(s) updated.${notesSuffix}`, "success");
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "Unable to autofill this form.";
    setPanelStatus(message, "error");
  } finally {
    setPanelBusyState(false);
  }
}

async function togglePanel(forceOpen?: boolean): Promise<void> {
  const panel = getElementById(ABUSEFLOW_PANEL_ID, HTMLDivElement);
  const button = getElementById(ABUSEFLOW_BUTTON_ID, HTMLButtonElement);
  if (!panel || !button) {
    return;
  }

  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : panel.hidden;
  panel.hidden = !shouldOpen;
  panel.setAttribute("aria-hidden", String(!shouldOpen));
  button.setAttribute("aria-expanded", String(shouldOpen));

  if (shouldOpen) {
    attachFloatingPositionWatchers();
    startFloatingPositionTimer();
    resolveFloatingPosition();
    await refreshClientsInPanel();
  } else {
    stopFloatingPositionTimer();
    detachFloatingPositionWatchers();
  }
}

function injectStyles(): void {
  const existingStyle = getElementById(ABUSEFLOW_STYLE_ID, HTMLStyleElement);
  if (existingStyle) {
    return;
  }

  const style = document.createElement("style");
  style.id = ABUSEFLOW_STYLE_ID;
  style.textContent = `
    :root {
      --abuseflow-button-right: ${BASE_BUTTON_RIGHT}px;
      --abuseflow-button-bottom: ${BASE_BUTTON_BOTTOM}px;
    }
    #${ABUSEFLOW_BUTTON_ID} {
      position: fixed;
      right: var(--abuseflow-button-right);
      bottom: var(--abuseflow-button-bottom);
      width: ${BUTTON_SIZE_PX}px;
      height: ${BUTTON_SIZE_PX}px;
      border: none;
      border-radius: 50%;
      background-color: #1e3a8a;
      background-image: url("${ABUSEFLOW_BUTTON_ICON_URL}");
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      color: transparent;
      text-indent: -9999px;
      overflow: hidden;
      cursor: pointer;
      z-index: ${MAX_FLOATING_Z_INDEX};
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.28);
      transition: transform 140ms ease, filter 140ms ease;
    }
    #${ABUSEFLOW_BUTTON_ID}:hover {
      transform: scale(1.03);
      filter: brightness(1.06);
    }
    #${ABUSEFLOW_BUTTON_ID}:focus-visible {
      outline: 2px solid #93c5fd;
      outline-offset: 2px;
    }
    #${ABUSEFLOW_PANEL_ID} {
      position: fixed;
      right: var(--abuseflow-button-right);
      bottom: calc(var(--abuseflow-button-bottom) + ${BUTTON_SIZE_PX + 18}px);
      width: 300px;
      max-width: calc(100vw - 24px);
      padding: 12px;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.22);
      z-index: ${MAX_FLOATING_Z_INDEX};
      box-sizing: border-box;
      font-family: "Segoe UI", Arial, sans-serif;
      color: #0f172a;
      display: grid;
      gap: 8px;
    }
    #${ABUSEFLOW_PANEL_ID}[hidden] {
      display: none !important;
    }
    #${ABUSEFLOW_PANEL_ID} .abuseflow-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    #${ABUSEFLOW_PANEL_ID} .abuseflow-title {
      font-size: 14px;
      font-weight: 700;
    }
    #${ABUSEFLOW_PANEL_ID} .abuseflow-link-button {
      border: none;
      background: transparent;
      color: #1d4ed8;
      cursor: pointer;
      font-size: 12px;
      padding: 0;
      font-weight: 600;
    }
    #${ABUSEFLOW_PANEL_ID} .abuseflow-label {
      font-size: 12px;
      font-weight: 600;
      color: #334155;
    }
    #${ABUSEFLOW_PANEL_ID} .abuseflow-select,
    #${ABUSEFLOW_PANEL_ID} .abuseflow-textarea {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px;
      box-sizing: border-box;
      font-size: 12px;
      font-family: "Segoe UI", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
    }
    #${ABUSEFLOW_PANEL_ID} .abuseflow-textarea {
      resize: vertical;
      min-height: 84px;
    }
    #${ABUSEFLOW_PANEL_ID} .abuseflow-primary-button {
      border: none;
      border-radius: 8px;
      padding: 10px;
      background: #1e3a8a;
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: filter 120ms ease;
    }
    #${ABUSEFLOW_PANEL_ID} .abuseflow-primary-button:hover {
      filter: brightness(1.05);
    }
    #${ABUSEFLOW_PANEL_ID} .abuseflow-primary-button:disabled {
      background: #8ca1d1;
      cursor: not-allowed;
      filter: none;
    }
    #${ABUSEFLOW_PANEL_ID} .abuseflow-status {
      min-height: 18px;
      font-size: 12px;
      color: #475569;
    }
    #${ABUSEFLOW_PANEL_ID} .abuseflow-status[data-tone="error"] {
      color: #b42318;
    }
    #${ABUSEFLOW_PANEL_ID} .abuseflow-status[data-tone="success"] {
      color: #067647;
    }
  `;
  document.documentElement.appendChild(style);
}

function applyFloatingPosition(right: number, bottom: number): void {
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--abuseflow-button-right", `${Math.max(8, right)}px`);
  rootStyle.setProperty("--abuseflow-button-bottom", `${Math.max(8, bottom)}px`);
}

function isBlockingElement(element: Element): boolean {
  if (element.id === ABUSEFLOW_BUTTON_ID || element.id === ABUSEFLOW_PANEL_ID || element.id === ABUSEFLOW_STYLE_ID) {
    return false;
  }

  if (element.closest(`#${ABUSEFLOW_PANEL_ID}`) || element.closest(`#${ABUSEFLOW_BUTTON_ID}`)) {
    return false;
  }

  const computed = window.getComputedStyle(element);
  if (computed.pointerEvents === "none" || computed.visibility === "hidden" || computed.display === "none") {
    return false;
  }

  if (computed.position !== "fixed" && computed.position !== "sticky") {
    return false;
  }

  const zIndexValue = Number.parseInt(computed.zIndex, 10);
  return !Number.isNaN(zIndexValue) && zIndexValue >= 1000;
}

function hasCollisionAt(right: number, bottom: number): boolean {
  const centerX = window.innerWidth - right - BUTTON_SIZE_PX / 2;
  const centerY = window.innerHeight - bottom - BUTTON_SIZE_PX / 2;

  if (centerX < 0 || centerY < 0 || centerX > window.innerWidth || centerY > window.innerHeight) {
    return false;
  }

  const samplePoints: Array<[number, number]> = [
    [centerX, centerY],
    [centerX - BUTTON_SIZE_PX / 3, centerY - BUTTON_SIZE_PX / 3],
    [centerX + BUTTON_SIZE_PX / 3, centerY - BUTTON_SIZE_PX / 3],
    [centerX - BUTTON_SIZE_PX / 3, centerY + BUTTON_SIZE_PX / 3],
    [centerX + BUTTON_SIZE_PX / 3, centerY + BUTTON_SIZE_PX / 3]
  ];

  for (const [x, y] of samplePoints) {
    const elements = document.elementsFromPoint(x, y);
    if (elements.some((element) => isBlockingElement(element))) {
      return true;
    }
  }

  return false;
}

function resolveFloatingPosition(): void {
  if (!getElementById(ABUSEFLOW_BUTTON_ID, HTMLButtonElement)) {
    return;
  }

  let bottom = BASE_BUTTON_BOTTOM;
  const maxBottom = BASE_BUTTON_BOTTOM + BUTTON_MAX_OFFSET_PX;

  while (bottom <= maxBottom) {
    if (!hasCollisionAt(BASE_BUTTON_RIGHT, bottom)) {
      applyFloatingPosition(BASE_BUTTON_RIGHT, bottom);
      return;
    }
    bottom += BUTTON_STEP_OFFSET_PX;
  }

  applyFloatingPosition(BASE_BUTTON_RIGHT, maxBottom);
}

function attachFloatingPositionWatchers(): void {
  if (floatingPositionListenersAttached) {
    return;
  }

  window.addEventListener("resize", resolveFloatingPosition, { passive: true });
  window.addEventListener("scroll", resolveFloatingPosition, { passive: true });
  floatingPositionListenersAttached = true;
}

function detachFloatingPositionWatchers(): void {
  if (!floatingPositionListenersAttached) {
    return;
  }

  window.removeEventListener("resize", resolveFloatingPosition);
  window.removeEventListener("scroll", resolveFloatingPosition);
  floatingPositionListenersAttached = false;
}

function startFloatingPositionTimer(): void {
  if (floatingPositionTimerId !== null) {
    return;
  }

  floatingPositionTimerId = window.setInterval(resolveFloatingPosition, BUTTON_REPOSITION_INTERVAL_MS);
}

function stopFloatingPositionTimer(): void {
  if (floatingPositionTimerId === null) {
    return;
  }

  window.clearInterval(floatingPositionTimerId);
  floatingPositionTimerId = null;
}

function handleOutsideClick(event: MouseEvent): void {
  const panel = getElementById(ABUSEFLOW_PANEL_ID, HTMLDivElement);
  const button = getElementById(ABUSEFLOW_BUTTON_ID, HTMLButtonElement);
  if (!panel || !button || panel.hidden) {
    return;
  }

  const targetNode = event.target;
  if (!(targetNode instanceof Node)) {
    return;
  }

  if (panel.contains(targetNode) || button.contains(targetNode)) {
    return;
  }

  void togglePanel(false);
}

function handleStorageChange(
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: "sync" | "local" | "managed" | "session"
): void {
  if (areaName !== "sync" || !changes[CLIENT_PROFILES_KEY]) {
    return;
  }
  if (getElementById(ABUSEFLOW_PANEL_ID, HTMLDivElement)) {
    void refreshClientsInPanel();
  }
}

function injectUI(): void {
  const providerId = detectProviderFromUrl(window.location.href);
  if (!providerId) {
    removeUI();
    return;
  }

  injectStyles();

  const button = createFloatingButton();
  const panel = createPanel();

  if (!getElementById(ABUSEFLOW_BUTTON_ID, HTMLButtonElement)) {
    document.documentElement.appendChild(button);
  }
  if (!getElementById(ABUSEFLOW_PANEL_ID, HTMLDivElement)) {
    document.documentElement.appendChild(panel);
  }

  if (!outsideClickHandlerAttached) {
    document.addEventListener("mousedown", handleOutsideClick, true);
    outsideClickHandlerAttached = true;
  }

  if (!storageListenerAttached) {
    chrome.storage.onChanged.addListener(handleStorageChange);
    storageListenerAttached = true;
  }

  resolveFloatingPosition();
}

function removeUI(): void {
  const panel = document.getElementById(ABUSEFLOW_PANEL_ID);
  if (panel) {
    panel.remove();
  }

  const button = document.getElementById(ABUSEFLOW_BUTTON_ID);
  if (button) {
    button.remove();
  }

  const style = document.getElementById(ABUSEFLOW_STYLE_ID);
  if (style) {
    style.remove();
  }

  if (outsideClickHandlerAttached) {
    document.removeEventListener("mousedown", handleOutsideClick, true);
    outsideClickHandlerAttached = false;
  }

  if (storageListenerAttached) {
    chrome.storage.onChanged.removeListener(handleStorageChange);
    storageListenerAttached = false;
  }

  stopFloatingPositionTimer();
  detachFloatingPositionWatchers();
  applyFloatingPosition(BASE_BUTTON_RIGHT, BASE_BUTTON_BOTTOM);

  selectedClientId = "";
  isPanelBusy = false;
}

function syncUiForCurrentUrl(): void {
  if (window.location.href !== lastKnownUrl) {
    lastKnownUrl = window.location.href;
  }
  const providerId = detectProviderFromUrl(lastKnownUrl);
  if (providerId) {
    injectUI();
  } else {
    removeUI();
  }
}

function notifyUrlChange(): void {
  window.dispatchEvent(new Event("abuseflow:urlchange"));
}

function attachHistoryListeners(): void {
  if (historyListenersAttached) {
    return;
  }

  const originalPushState = history.pushState;
  history.pushState = function pushStatePatched(...args: Parameters<History["pushState"]>) {
    originalPushState.apply(this, args);
    notifyUrlChange();
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function replaceStatePatched(...args: Parameters<History["replaceState"]>) {
    originalReplaceState.apply(this, args);
    notifyUrlChange();
  };

  window.addEventListener("abuseflow:urlchange", syncUiForCurrentUrl);
  historyListenersAttached = true;
}

injectUI();
syncUiForCurrentUrl();
attachHistoryListeners();
window.setInterval(syncUiForCurrentUrl, SYNC_UI_INTERVAL_MS);
window.addEventListener("popstate", syncUiForCurrentUrl);
window.addEventListener("hashchange", syncUiForCurrentUrl);

chrome.runtime.onMessage.addListener(
  (
    message: AutofillRequestMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: AutofillResponseMessage) => void
  ): boolean => {
    if (message.type !== "ABUSEFLOW_AUTOFILL") {
      sendResponse({ ok: false, error: "Unsupported message type." });
      return false;
    }

    const provider = getProviderById(message.providerId);
    if (!provider) {
      sendResponse({ ok: false, error: "Provider not found." });
      return false;
    }
    const detectedProviderId = detectProviderFromUrl(window.location.href);
    if (detectedProviderId !== message.providerId) {
      sendResponse({ ok: false, error: "This page is not supported by the selected provider." });
      return false;
    }

    const startedAt = Date.now();
    try {
      const { filledCount, notes } = runAutofillForProvider(message.providerId, message.payload);
      sendResponse({
        ok: true,
        filledCount,
        notes,
        diagnostics: {
          providerId: message.providerId,
          pageUrl: window.location.href,
          inputUrlCount: message.payload.urls.length,
          durationMs: Date.now() - startedAt
        }
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Autofill failed.";
      sendResponse({
        ok: false,
        error: messageText,
        diagnostics: {
          providerId: message.providerId,
          pageUrl: window.location.href,
          inputUrlCount: message.payload.urls.length,
          durationMs: Date.now() - startedAt
        }
      });
    }
    return false;
  }
);
