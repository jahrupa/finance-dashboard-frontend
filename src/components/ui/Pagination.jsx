/**
 * Pagination — reusable pagination component
 * Props:
 *   currentPage : number (1-based)
 *   totalItems  : number
 *   pageSize    : number
 *   onPageChange: (page: number) => void
 *   pageSizeOptions: number[] (optional) — if provided, shows a page-size selector
 *   onPageSizeChange: (size: number) => void (optional)
 */
export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems === 0) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  // Build page window: show up to 5 pages centered on current
  const getPages = () => {
    const delta = 2;
    const range = [];
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    range.push(1);
    if (left > 2) range.push("...");
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push("...");
    if (totalPages > 1) range.push(totalPages);

    return range;
  };

  return (
    <div className="pagination-bar">
      <span className="pagination-info">
        Showing <strong>{from}–{to}</strong> of <strong>{totalItems}</strong>
      </span>

      <div className="pagination-controls">
        <button
          className="pg-btn"
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          title="First page"
        >
          «
        </button>
        <button
          className="pg-btn"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Previous page"
        >
          ‹
        </button>

        {getPages().map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} className="pg-ellipsis">…</span>
          ) : (
            <button
              key={page}
              className={`pg-btn ${currentPage === page ? "pg-btn-active" : ""}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )
        )}

        <button
          className="pg-btn"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Next page"
        >
          ›
        </button>
        <button
          className="pg-btn"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last page"
        >
          »
        </button>
      </div>

      {pageSizeOptions && onPageSizeChange && (
        <div className="pagination-size">
          <span>Rows:</span>
          <select
            className="pg-size-select"
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
