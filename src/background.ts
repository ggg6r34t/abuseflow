interface OpenOptionsMessage {
  type: "ABUSEFLOW_OPEN_OPTIONS";
}

chrome.runtime.onInstalled.addListener(() => {
  return;
});

chrome.runtime.onMessage.addListener(
  (
    message: OpenOptionsMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: { ok: boolean; error?: string }) => void
  ): boolean => {
    if (message.type !== "ABUSEFLOW_OPEN_OPTIONS") {
      return false;
    }

    chrome.runtime.openOptionsPage(() => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        sendResponse({ ok: false, error: lastError.message || "Unable to open options page." });
        return;
      }
      sendResponse({ ok: true });
    });

    return true;
  }
);
