interface AutofillButtonProps {
  disabled: boolean;
  onClick: () => void;
}

export function AutofillButton(props: AutofillButtonProps): JSX.Element {
  const { disabled, onClick } = props;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: "100%",
        border: "none",
        borderRadius: "10px",
        backgroundColor: disabled ? "#b2b2b2" : "#1f5eff",
        color: "#ffffff",
        padding: "10px 12px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer"
      }}
    >
      Autofill Form
    </button>
  );
}
