import { useEffect, useMemo, useState } from "react";
import {
  deleteClientProfile,
  listClientProfiles,
  upsertClientProfile,
  type ClientProfile
} from "../storage/profileStore";

const defaultTemplate =
  "Group-IB acts as the authorized representative of {{client_name}}, the rights holder of {{trademark_name}} (Registration: {{registration_number}}, Jurisdiction: {{jurisdiction}}).\n\nThe reported account(s) and/or content are impersonating {{client_name}} through unauthorized use of the brand’s name, logo, and protected identity elements.\n\nInfringing URLs:\n{{urls}}\n\nThis activity constitutes trademark infringement and brand impersonation, creates a false impression of affiliation, and may mislead users. We respectfully request prompt removal or suspension of the infringing content in accordance with your policies.\n\nThank you for your cooperation.";

function createClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyClient(): ClientProfile {
  return {
    id: createClientId(),
    clientName: "",
    trademarkName: "",
    registrationNumber: "",
    jurisdiction: "",
    trademarkUrl: "",
    xHandle: "",
    defaultDescriptionTemplate: defaultTemplate
  };
}

interface ClientManagerProps {
  onSaved: () => void;
}

export function ClientManager(props: ClientManagerProps): JSX.Element {
  const { onSaved } = props;
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [editing, setEditing] = useState<ClientProfile>(createEmptyClient());
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const loadedClients = await listClientProfiles();
        setClients(loadedClients);
        const firstClient = loadedClients[0];
        if (firstClient) {
          setSelectedId(firstClient.id);
          setEditing(firstClient);
        }
      } catch {
        setError("Unable to load client profiles.");
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedId) ?? null,
    [clients, selectedId]
  );

  function update<K extends keyof ClientProfile>(key: K, value: ClientProfile[K]): void {
    setStatus("");
    setError("");
    setEditing((prev) => ({ ...prev, [key]: value }));
  }

  function handleSelect(id: string): void {
    setSelectedId(id);
    setStatus("");
    setError("");
    const next = clients.find((client) => client.id === id);
    if (next) {
      setEditing(next);
    }
  }

  function handleCreate(): void {
    const next = createEmptyClient();
    setSelectedId(next.id);
    setEditing(next);
    setStatus("");
    setError("");
  }

  async function handleSave(): Promise<void> {
    const normalized: ClientProfile = {
      ...editing,
      clientName: editing.clientName.trim(),
      trademarkName: editing.trademarkName.trim(),
      registrationNumber: editing.registrationNumber.trim(),
      jurisdiction: editing.jurisdiction.trim(),
      trademarkUrl: editing.trademarkUrl?.trim() ?? "",
      xHandle: editing.xHandle?.trim() ?? "",
      defaultDescriptionTemplate: editing.defaultDescriptionTemplate.trim()
    };

    if (
      !normalized.clientName ||
      !normalized.trademarkName ||
      !normalized.registrationNumber ||
      !normalized.jurisdiction ||
      !normalized.defaultDescriptionTemplate
    ) {
      setError("Client name, trademark, registration number, jurisdiction, and template are required.");
      setStatus("");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await upsertClientProfile(normalized);
      const nextClients = await listClientProfiles();
      setClients(nextClients);
      setSelectedId(normalized.id);
      setEditing(normalized);
      setStatus("Client profile saved.");
      onSaved();
    } catch {
      setError("Unable to save client profile.");
      setStatus("");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!selectedClient) {
      return;
    }

    setIsDeleting(true);
    setError("");
    try {
      await deleteClientProfile(selectedClient.id);
      const nextClients = await listClientProfiles();
      setClients(nextClients);
      const firstClient = nextClients[0];
      if (firstClient) {
        setSelectedId(firstClient.id);
        setEditing(firstClient);
      } else {
        const empty = createEmptyClient();
        setSelectedId(empty.id);
        setEditing(empty);
      }
      setStatus("Client profile deleted.");
      onSaved();
    } catch {
      setError("Unable to delete client profile.");
      setStatus("");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: "10px", padding: "14px", border: "1px solid #e3e3e3", borderRadius: "10px" }}>
      <h2 style={{ margin: 0, fontSize: "16px" }}>Client Profiles</h2>

      <div style={{ display: "flex", gap: "8px" }}>
        <select
          value={selectedId}
          onChange={(event) => handleSelect(event.target.value)}
          disabled={isLoading || isSaving || isDeleting}
          style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #c9c9c9" }}
        >
          <option value="">Select existing client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.clientName || "Untitled Client"}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isLoading || isSaving || isDeleting}
          style={{ border: "1px solid #c9c9c9", borderRadius: "8px", backgroundColor: "#f8f8f8", padding: "8px 10px", cursor: "pointer" }}
        >
          New
        </button>
      </div>

      <input
        placeholder="Client name"
        value={editing.clientName}
        onChange={(event) => update("clientName", event.target.value)}
        disabled={isLoading || isSaving || isDeleting}
        style={{ padding: "8px", borderRadius: "8px", border: "1px solid #c9c9c9" }}
      />
      <input
        placeholder="Trademark name"
        value={editing.trademarkName}
        onChange={(event) => update("trademarkName", event.target.value)}
        disabled={isLoading || isSaving || isDeleting}
        style={{ padding: "8px", borderRadius: "8px", border: "1px solid #c9c9c9" }}
      />
      <input
        placeholder="Registration number"
        value={editing.registrationNumber}
        onChange={(event) => update("registrationNumber", event.target.value)}
        disabled={isLoading || isSaving || isDeleting}
        style={{ padding: "8px", borderRadius: "8px", border: "1px solid #c9c9c9" }}
      />
      <input
        placeholder="Jurisdiction"
        value={editing.jurisdiction}
        onChange={(event) => update("jurisdiction", event.target.value)}
        disabled={isLoading || isSaving || isDeleting}
        style={{ padding: "8px", borderRadius: "8px", border: "1px solid #c9c9c9" }}
      />
      <input
        placeholder="Trademark URL (optional)"
        value={editing.trademarkUrl ?? ""}
        onChange={(event) => update("trademarkUrl", event.target.value)}
        disabled={isLoading || isSaving || isDeleting}
        style={{ padding: "8px", borderRadius: "8px", border: "1px solid #c9c9c9" }}
      />
      <input
        placeholder="Client X handle (optional, e.g. @brand)"
        value={editing.xHandle ?? ""}
        onChange={(event) => update("xHandle", event.target.value)}
        disabled={isLoading || isSaving || isDeleting}
        style={{ padding: "8px", borderRadius: "8px", border: "1px solid #c9c9c9" }}
      />
      <textarea
        placeholder="Default description template"
        value={editing.defaultDescriptionTemplate}
        onChange={(event) => update("defaultDescriptionTemplate", event.target.value)}
        disabled={isLoading || isSaving || isDeleting}
        rows={6}
        style={{ padding: "8px", borderRadius: "8px", border: "1px solid #c9c9c9", resize: "vertical" }}
      />

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isLoading || isSaving || isDeleting}
          style={{
            border: "none",
            borderRadius: "8px",
            backgroundColor: isLoading || isSaving || isDeleting ? "#9fb4f5" : "#1f5eff",
            color: "#ffffff",
            padding: "8px 14px",
            cursor: isLoading || isSaving || isDeleting ? "not-allowed" : "pointer"
          }}
        >
          {isSaving ? "Saving..." : "Save Client"}
        </button>
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={!selectedClient || isLoading || isSaving || isDeleting}
          style={{
            border: "1px solid #c9c9c9",
            borderRadius: "8px",
            backgroundColor: "#f8f8f8",
            padding: "8px 14px",
            cursor: !selectedClient || isLoading || isSaving || isDeleting ? "not-allowed" : "pointer"
          }}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {error && <small style={{ color: "#b42318" }}>{error}</small>}
      {status && <small style={{ color: "#067647" }}>{status}</small>}
    </section>
  );
}
