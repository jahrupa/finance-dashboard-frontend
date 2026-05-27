/**
 * FilterSelect — reusable dropdown filter
 * Props:
 *   value       : string
 *   onChange    : (value: string) => void
 *   options     : Array<string | { value, label }>
 *   placeholder : string (optional)
 *   className   : string (optional)
 */
export default function FilterSelect({
  value,
  onChange,
  options = [],
  placeholder = "All",
  className = "",
}) {
  return (
    <select
      className={`form-control ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        return (
          <option key={val} value={val}>
            {label}
          </option>
        );
      })}
    </select>
  );
}
