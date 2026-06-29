/**
 * usePagination — custom hook for client-side pagination
 *
 * Usage:
 *   const { page, pageSize, setPage, setPageSize, paginate } = usePagination();
 *   const pageData = paginate(filteredItems);
 */
import { useState, useCallback } from "react";

export default function usePagination(defaultPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const setPageSizeAndReset = useCallback((size) => {
    setPageSize(size);
    setPage(1);
  }, []);

  // Call this when filters change to reset to page 1
  const resetPage = useCallback(() => setPage(1), []);

  // Slice an array for the current page
  const paginate = useCallback(
    (items) => {
      const start = (page - 1) * pageSize;
      return items.slice(start, start + pageSize);
    },
    [page, pageSize]
  );

  return {
    page,
    pageSize,
    setPage,
    setPageSize: setPageSizeAndReset,
    resetPage,
    paginate,
  };
}
