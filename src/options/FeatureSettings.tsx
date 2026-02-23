import { useEffect, useState } from "react";
import { getFeatureFlags, saveFeatureFlags, type FeatureFlags } from "../storage/appStateStore";

interface FeatureSettingsProps {
  onSaved: () => void;
}

const defaults: FeatureFlags = {
  tier: "core",
  enableCaseSession: false,
  enableDiagnostics: false,
  enableEvidenceExport: false,
  enablePlaybooks: false,
  enableUrlIntel: false,
  enableRunHistory: false,
  enableSafetyGuardrails: true
};

const inputStyle = {
  padding: "8px",
  borderRadius: "8px",
  border: "1px solid #c7d6ea",
  backgroundColor: "#fbfdff"
} as const;

export function FeatureSettings(props: FeatureSettingsProps): JSX.Element {
  const { onSaved } = props;
  const [flags, setFlags] = useState<FeatureFlags>(defaults);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const current = await getFeatureFlags();
        setFlags(current);
      } catch {
        setError("Unable to load feature settings.");
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    setError("");
    try {
      await saveFeatureFlags(flags);
      setStatus("Feature settings saved.");
      onSaved();
    } catch {
      setError("Unable to save feature settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      style={{
        display: "grid",
        gap: "10px",
        padding: "14px",
        border: "1px solid #dbe6f4",
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        boxShadow: "0 3px 12px rgba(15, 42, 87, 0.06)"
      }}
    >
      <h2 style={{ margin: 0, fontSize: "16px", color: "#0e3172" }}>Experience Tier</h2>
      <small style={{ color: "#506177" }}>
        Keep daily usage minimal with Core, then enable Advanced or Enterprise capabilities as needed.
      </small>
      <select
        value={flags.tier}
        onChange={(event) =>
          setFlags((prev) => ({ ...prev, tier: event.target.value as FeatureFlags["tier"] }))
        }
        disabled={isLoading || isSaving}
        style={inputStyle}
      >
        <option value="core">Core (minimal)</option>
        <option value="advanced">Advanced (diagnostics + history)</option>
        <option value="enterprise">Enterprise (adds case session)</option>
      </select>

      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
        <input
          type="checkbox"
          checked={flags.enableSafetyGuardrails}
          onChange={(event) =>
            setFlags((prev) => ({ ...prev, enableSafetyGuardrails: event.target.checked }))
          }
          disabled={isLoading || isSaving}
        />
        Enable required-data guardrails before autofill
      </label>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={isLoading || isSaving}
        style={{
          width: "fit-content",
          border: "none",
          borderRadius: "8px",
          backgroundColor: isLoading || isSaving ? "#9fb4f5" : "#1f5eff",
          color: "#ffffff",
          padding: "8px 14px",
          cursor: isLoading || isSaving ? "not-allowed" : "pointer"
        }}
      >
        {isSaving ? "Saving..." : "Save Feature Settings"}
      </button>

      {error && <small style={{ color: "#b42318" }}>{error}</small>}
      {status && <small style={{ color: "#067647" }}>{status}</small>}
    </section>
  );
}

