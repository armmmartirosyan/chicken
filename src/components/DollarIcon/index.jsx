import "./index.css";

export function DollarIcon({ size = "default", className = "" }) {
  return <span className={`dollar-icon ${size} ${className}`}>€</span>;
}
