/**
 * DataTable — reusable table with empty state
 * Props:
 *   columns   : Array<{ key, label, headerStyle?, style?, render? }>
 *   data      : Array<object>
 *   rowKey    : string | (row) => string
 *   emptyIcon : string  (optional)
 *   emptyText : string  (optional)
 *   className : string  (optional)
 */
export default function DataTable({
  columns,
  data,
  rowKey,
  emptyIcon = "📋",
  emptyText = "No records found",
  className = "",
}) {
  const getKey = (row) =>
    typeof rowKey === "function" ? rowKey(row) : row[rowKey];

  return (
    <div className={`table-wrapper ${className}`}>
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.headerStyle}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="empty-state">
                  <div className="empty-state-icon">{emptyIcon}</div>
                  <div className="empty-state-text">{emptyText}</div>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={getKey(row)}>
                {columns.map((col) => (
                  <td key={col.key} style={col.style}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
