import { useEffect, useState } from "react";
import { getAnalystProfile, saveAnalystProfile, type AnalystProfile } from "../storage/profileStore";

const emptyAnalyst: AnalystProfile = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  companyAddress: "",
  signature: ""
};

interface AnalystSettingsProps {
  onSaved: () => void;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const inputStyle = {
  padding: "8px",
  borderRadius: "8px",
  border: "1px solid #c7d6ea",
  backgroundColor: "#fbfdff"
} as const;

export function AnalystSettings(props: AnalystSettingsProps): JSX.Element {
  const { onSaved } = props;
  const [form, setForm] = useState<AnalystProfile>(emptyAnalyst);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const profile = await getAnalystProfile();
        if (profile) {
          setForm(profile);
        }
      } catch {
        setError("Unable to load analyst profile.");
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  function update<K extends keyof AnalystProfile>(key: K, value: AnalystProfile[K]): void {
    setStatus("");
    setError("");
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(): Promise<void> {
    const normalized: AnalystProfile = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone?.trim() ?? "",
      company: form.company?.trim() ?? "",
      companyAddress: form.companyAddress?.trim() ?? "",
      signature: form.signature.trim()
    };

    if (!normalized.fullName || !normalized.email || !normalized.signature) {
      setError("Full name, email, and signature are required.");
      setStatus("");
      return;
    }

    if (!isValidEmail(normalized.email)) {
      setError("Enter a valid email address.");
      setStatus("");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await saveAnalystProfile(normalized);
      setStatus("Analyst profile saved.");
      onSaved();
    } catch {
      setError("Unable to save analyst profile.");
      setStatus("");
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
      <h2 style={{ margin: 0, fontSize: "16px", color: "#0e3172" }}>Analyst Profile</h2>
      <small style={{ color: "#506177" }}>
        Required fields are used by most providers. Optional fields are filled only when matching fields exist.
      </small>

      <label style={{ display: "grid", gap: "4px", fontSize: "13px" }}>
        <span>Full Name</span>
        <input
          placeholder="Full name"
          value={form.fullName}
          onChange={(event) => update("fullName", event.target.value)}
          disabled={isLoading || isSaving}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "grid", gap: "4px", fontSize: "13px" }}>
        <span>Email</span>
        <input
          placeholder="Email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          disabled={isLoading || isSaving}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "grid", gap: "4px", fontSize: "13px" }}>
        <span>Phone (Optional)</span>
        <input
          placeholder="Phone number (optional)"
          value={form.phone ?? ""}
          onChange={(event) => update("phone", event.target.value)}
          disabled={isLoading || isSaving}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "grid", gap: "4px", fontSize: "13px" }}>
        <span>Company (Optional)</span>
        <input
          placeholder="Company (optional)"
          value={form.company ?? ""}
          onChange={(event) => update("company", event.target.value)}
          disabled={isLoading || isSaving}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "grid", gap: "4px", fontSize: "13px" }}>
        <span>Company Address (Optional)</span>
        <input
          placeholder="Company address (optional)"
          value={form.companyAddress ?? ""}
          onChange={(event) => update("companyAddress", event.target.value)}
          disabled={isLoading || isSaving}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "grid", gap: "4px", fontSize: "13px" }}>
        <span>Electronic Signature</span>
        <input
          placeholder="Electronic signature"
          value={form.signature}
          onChange={(event) => update("signature", event.target.value)}
          disabled={isLoading || isSaving}
          style={inputStyle}
        />
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
        {isSaving ? "Saving..." : "Save Analyst Profile"}
      </button>

      {error && <small style={{ color: "#b42318" }}>{error}</small>}
      {status && <small style={{ color: "#067647" }}>{status}</small>}
    </section>
  );
}

