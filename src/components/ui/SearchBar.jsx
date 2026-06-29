/**
 * SearchBar — reusable search input component
 * Props:
 *   value      : string
 *   onChange   : (value: string) => void
 *   placeholder: string (optional)
 *   className  : string (optional)
 */
export default function SearchBar({ value, onChange, placeholder = "Search...", className = "" }) {
  return (
    <div className={`sb-wrapper ${className}`}>
      
      <input
        type="text"
        // className="sb-input"
        className="form-control search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button className="sb-clear" onClick={() => onChange("")} title="Clear search">
          ✕
        </button>
      )}
    </div>
  );
}
