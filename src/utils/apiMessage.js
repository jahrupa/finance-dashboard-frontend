// ─────────────────────────────────────────────────────────────
// Helpers to pull a human-readable message out of an API
// response or an error — used for global toast notifications.
//
// The service layer (api/Service.jsx) sometimes throws a plain
// string (already-extracted message) and sometimes lets the raw
// axios error bubble up. These helpers handle both cases.
// ─────────────────────────────────────────────────────────────

// Extract a success message from an API response payload.
// Backend responses look like { success, message, data }.
export function getSuccessMessage(res, fallback = "Action completed successfully.") {
  if (!res) return fallback;
  if (typeof res === "string" && res.trim()) return res;
  return res.message || res.msg || fallback;
}

// Extract an error message from anything a catch block might receive.
export function getErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (!err) return fallback;

  // Service layer already threw a clean string
  if (typeof err === "string") return err.trim() || fallback;

  // Raw axios error — dig into the response payload
  const data = err.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.error) return data.error;
  if (data?.message) return data.message;

  // Network / unexpected errors
  if (err.message) return err.message;

  return fallback;
}
