import "./index.css";

export function Checkbox({ checked, onChange }) {
  return (
    <label
      className={`SwitchContainer ${checked ? "Checked" : ""}`}
      onClick={onChange}
    >
      <span data-testid="menu-sound-switch" className="Slider"></span>
    </label>
  );
}
