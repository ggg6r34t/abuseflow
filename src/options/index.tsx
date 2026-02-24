import { createRoot } from "react-dom/client";
import { useState } from "react";
import { AnalystSettings } from "./AnalystSettings";
import { ClientManager } from "./ClientManager";
import { DataPortability } from "./DataPortability";
import { FeatureSettings } from "./FeatureSettings";

function OptionsApp(): JSX.Element {
  const [, setVersion] = useState(0);

  return (
    <main
      style={{
        margin: "0 auto",
        maxWidth: "980px",
        padding: "22px",
        display: "grid",
        gap: "14px",
        fontFamily: "\"IBM Plex Sans\", \"Avenir Next\", \"Segoe UI\", sans-serif",
        color: "#1b1b1b",
        background: "linear-gradient(180deg, #f7fbff 0%, #ffffff 65%)"
      }}
    >
      <h1 style={{ margin: 0, fontSize: "22px", color: "#0e3172" }}>AbuseFlow Settings</h1>
      <small style={{ color: "#425466", marginTop: "-8px" }}>
        Configure analyst, client, and feature settings used by the floating panel and popup control center.
      </small>
      <FeatureSettings onSaved={() => setVersion((v) => v + 1)} />
      <AnalystSettings onSaved={() => setVersion((v) => v + 1)} />
      <ClientManager onSaved={() => setVersion((v) => v + 1)} />
      <DataPortability onImported={() => setVersion((v) => v + 1)} />
    </main>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Options root element not found.");
}

createRoot(rootElement).render(<OptionsApp />);
