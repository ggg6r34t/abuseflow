import type { ClientProfile } from "../storage/profileStore";

interface ClientSelectorProps {
  clients: ClientProfile[];
  selectedClientId: string;
  onChange: (clientId: string) => void;
}

export function ClientSelector(props: ClientSelectorProps): JSX.Element {
  const { clients, selectedClientId, onChange } = props;

  return (
    <label style={{ display: "grid", gap: "6px", fontSize: "13px" }}>
      <span>Client</span>
      <select
        value={selectedClientId}
        onChange={(event) => onChange(event.target.value)}
        style={{ padding: "8px", borderRadius: "8px", border: "1px solid #c9c9c9" }}
      >
        <option value="">Select client profile</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.clientName}
          </option>
        ))}
      </select>
    </label>
  );
}
