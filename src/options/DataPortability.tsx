import { useRef, useState } from "react";
import {
  exportProfilesBackup,
  importProfilesBackup
} from "../storage/profileStore";

interface DataPortabilityProps {
  onImported: () => void;
}

function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function timestampForFilename(): string {
  const now = new Date();
  const pad = (value: number): string => value.toString().padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

export function DataPortability(props: DataPortabilityProps): JSX.Element {
  const { onImported } = props;
  const [importText, setImportText] = useState("");
  const [includeAnalystOnExport, setIncludeAnalystOnExport] = useState(false);
  const [includeAnalystOnImport, setIncludeAnalystOnImport] = useState(false);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function buildBackupJson(): Promise<string> {
    const backup = await exportProfilesBackup({
      includeAnalystProfile: includeAnalystOnExport
    });
    return JSON.stringify(backup, null, 2);
  }

  async function handleCopyExport(): Promise<void> {
    setError("");
    setStatus("");
    setIsBusy(true);
    try {
      const text = await buildBackupJson();
      await navigator.clipboard.writeText(text);
      setStatus("Backup copied to clipboard.");
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "Unable to export backup.";
      setError(message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDownloadExport(): Promise<void> {
    setError("");
    setStatus("");
    setIsBusy(true);
    try {
      const text = await buildBackupJson();
      const scope = includeAnalystOnExport ? "full" : "clients_only";
      downloadTextFile(`abuseflow_backup_${scope}_${timestampForFilename()}.json`, text);
      setStatus("Backup file downloaded.");
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "Unable to download backup.";
      setError(message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleImport(): Promise<void> {
    setError("");
    setStatus("");
    if (!importText.trim()) {
      setError("Paste a backup JSON payload first.");
      return;
    }
    setIsBusy(true);
    try {
      const parsed = JSON.parse(importText);
      const result = await importProfilesBackup(parsed, {
        includeAnalystProfile: includeAnalystOnImport,
        mode: importMode
      });
      setStatus(
        `Imported ${result.importedClients} client profile(s)${
          result.importedAnalyst ? " and analyst profile." : "."
        }`
      );
      onImported();
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "Unable to import backup.";
      setError(message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleFileSelected(file: File | null): Promise<void> {
    if (!file) {
      return;
    }
    setError("");
    setStatus("");
    try {
      const text = await file.text();
      setImportText(text);
      setStatus(`Loaded ${file.name}. Review settings and click import.`);
    } catch {
      setError("Unable to read selected file.");
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
      <h2 style={{ margin: 0, fontSize: "16px", color: "#0e3172" }}>Data Portability</h2>
      <small style={{ color: "#506177" }}>
        Share client profiles across analysts. Default mode is client-only + merge import.
      </small>

      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
        <input
          type="checkbox"
          checked={includeAnalystOnExport}
          onChange={(event) => setIncludeAnalystOnExport(event.target.checked)}
          disabled={isBusy}
        />
        Include analyst profile in export
      </label>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => void handleCopyExport()}
          disabled={isBusy}
          style={{
            border: "none",
            borderRadius: "8px",
            backgroundColor: isBusy ? "#9fb4f5" : "#1f5eff",
            color: "#ffffff",
            padding: "8px 14px",
            cursor: isBusy ? "not-allowed" : "pointer"
          }}
        >
          Copy Backup JSON
        </button>
        <button
          type="button"
          onClick={() => void handleDownloadExport()}
          disabled={isBusy}
          style={{
            border: "1px solid #c7d6ea",
            borderRadius: "8px",
            backgroundColor: "#f7faff",
            color: "#1d3557",
            padding: "8px 14px",
            cursor: isBusy ? "not-allowed" : "pointer"
          }}
        >
          Download Backup File
        </button>
      </div>

      <div style={{ display: "grid", gap: "8px", borderTop: "1px solid #e8eef8", paddingTop: "8px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#1d3557" }}>Import</div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            style={{
              border: "1px solid #c7d6ea",
              borderRadius: "8px",
              backgroundColor: "#f7faff",
              color: "#1d3557",
              padding: "8px 14px",
              cursor: isBusy ? "not-allowed" : "pointer"
            }}
          >
            Upload Backup File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              void handleFileSelected(file);
              event.target.value = "";
            }}
          />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
          <input
            type="checkbox"
            checked={includeAnalystOnImport}
            onChange={(event) => setIncludeAnalystOnImport(event.target.checked)}
            disabled={isBusy}
          />
          Import analyst profile from backup
        </label>
        <label style={{ display: "grid", gap: "4px", fontSize: "13px" }}>
          <span>Import mode</span>
          <select
            value={importMode}
            onChange={(event) => setImportMode(event.target.value as "merge" | "replace")}
            disabled={isBusy}
            style={{
              padding: "8px",
              borderRadius: "8px",
              border: "1px solid #c7d6ea",
              backgroundColor: "#fbfdff"
            }}
          >
            <option value="merge">Merge (recommended)</option>
            <option value="replace">Replace all existing clients</option>
          </select>
        </label>
        <textarea
          rows={6}
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          placeholder="Paste backup JSON to import"
          style={{
            padding: "8px",
            borderRadius: "8px",
            border: "1px solid #c7d6ea",
            backgroundColor: "#fbfdff",
            resize: "vertical"
          }}
        />
        <button
          type="button"
          onClick={() => void handleImport()}
          disabled={isBusy}
          style={{
            width: "fit-content",
            border: "none",
            borderRadius: "8px",
            backgroundColor: isBusy ? "#9fb4f5" : "#1f5eff",
            color: "#ffffff",
            padding: "8px 14px",
            cursor: isBusy ? "not-allowed" : "pointer"
          }}
        >
          Import Backup
        </button>
      </div>

      {error && <small style={{ color: "#b42318" }}>{error}</small>}
      {status && <small style={{ color: "#067647" }}>{status}</small>}
    </section>
  );
}

