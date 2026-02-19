import { createRoot } from "react-dom/client";
import { useState } from "react";
import { AnalystSettings } from "./AnalystSettings";
import { ClientManager } from "./ClientManager";

function OptionsApp(): JSX.Element {
  const [, setVersion] = useState(0);

  return (
    <main
      style={{
        margin: "0 auto",
        maxWidth: "900px",
        padding: "20px",
        display: "grid",
        gap: "16px",
        fontFamily: "Segoe UI, Arial, sans-serif",
        color: "#1b1b1b"
      }}
    >
      <h1 style={{ margin: 0, fontSize: "22px" }}>AbuseFlow Settings</h1>
      <AnalystSettings onSaved={() => setVersion((v) => v + 1)} />
      <ClientManager onSaved={() => setVersion((v) => v + 1)} />
    </main>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Options root element not found.");
}

createRoot(rootElement).render(<OptionsApp />);
