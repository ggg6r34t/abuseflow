interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function UrlInput(props: UrlInputProps): JSX.Element {
  const { value, onChange } = props;

  return (
    <label style={{ display: "grid", gap: "6px", fontSize: "13px" }}>
      <span>Content URLs (one per line)</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        placeholder="https://example.com/post/1"
        style={{
          resize: "vertical",
          padding: "8px",
          borderRadius: "8px",
          border: "1px solid #c9c9c9",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: "12px"
        }}
      />
    </label>
  );
}
