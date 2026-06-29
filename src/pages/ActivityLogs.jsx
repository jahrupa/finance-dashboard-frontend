import React, { useState, useEffect, useMemo, useCallback } from "react";
import SearchBar from "../components/ui/SearchBar";
import Pagination from "../components/ui/Pagination";
import usePagination from "../components/ui/usePagination";
import API from "../api/axios";
import "../styles/Activitylogs.css";

// ── API calls ─────────────────────────────────────────────────
const V1 = "/api/v1";
const fetchLogs  = (params) => API.get(`${V1}/activity-logs`,         { params }).then(r => r.data);
const fetchStats = ()        => API.get(`${V1}/activity-logs/stats`).then(r => r.data);

// ── Constants ─────────────────────────────────────────────────
const ACTION_COLORS = {
  "Invoice Submitted":          { bg: "#dbeafe", color: "#1d4ed8", icon: "📋" },
  "Invoice Updated":            { bg: "#e0f2fe", color: "#0369a1", icon: "✏️" },
  "Invoice Deleted":            { bg: "#fee2e2", color: "#dc2626", icon: "🗑️" },
  "Finance Accepted":           { bg: "#dcfce7", color: "#16a34a", icon: "✅" },
  "Finance Rejected":           { bg: "#fee2e2", color: "#dc2626", icon: "❌" },
  "Finance Held":               { bg: "#fef9c3", color: "#b45309", icon: "⏸️" },
  "Finance moved to Pending":   { bg: "#f3e8ff", color: "#7c3aed", icon: "🔄" },
  "HOD Approved":               { bg: "#dcfce7", color: "#15803d", icon: "👍" },
  "HOD Rejected":               { bg: "#fee2e2", color: "#b91c1c", icon: "👎" },
  "HOD Sent Back":              { bg: "#fff7ed", color: "#c2410c", icon: "↩️" },
  "Payment Approved":           { bg: "#d1fae5", color: "#065f46", icon: "💳" },
  "Payment Rejected":           { bg: "#fee2e2", color: "#dc2626", icon: "🚫" },
  "Payment Held":               { bg: "#fef9c3", color: "#a16207", icon: "⏳" },
  "Payment Sent Back":          { bg: "#fff7ed", color: "#c2410c", icon: "↩️" },
  "Payment Processed":          { bg: "#d1fae5", color: "#047857", icon: "💰" },
};

const DEFAULT_ACTION = { bg: "#f1f5f9", color: "#475569", icon: "📌" };

function getAction(action) {
  return ACTION_COLORS[action] || DEFAULT_ACTION;
}

// ── Helpers ───────────────────────────────────────────────────
function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const day = Math.floor(h / 24);
  return `${day}d ago`;
}

function Avatar({ name, size = 32 }) {
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  // deterministic color from name
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#06b6d4"];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: colors[idx], color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.38,
    }}>
      {initials}
    </div>
  );
}

function ActionBadge({ action }) {
  const { bg, color, icon } = getAction(action);
  return (
    <span className="al-badge" style={{ background: bg, color }}>
      <span className="al-badge-icon">{icon}</span>
      {action}
    </span>
  );
}

function StatusChip({ label, from }) {
  if (!label) return <span className="al-muted">—</span>;
  const isNew = !from;
  return (
    <span className={`al-status-chip ${isNew ? "new" : ""}`}>{label}</span>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────
function DetailDrawer({ entry, onClose }) {
  if (!entry) return null;
  const { bg, color, icon } = getAction(entry.action);

  return (
    <div className="al-drawer-overlay" onClick={onClose}>
      <div className="al-drawer" onClick={e => e.stopPropagation()}>
        <div className="al-drawer-header">
          <span className="al-drawer-title">📋 Activity Detail</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="al-drawer-body">
          {/* Action banner */}
          <div className="al-drawer-action-banner" style={{ background: bg, color }}>
            <span style={{ fontSize: 28 }}>{icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{entry.action}</div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>{formatDateTime(entry.timestamp)}</div>
            </div>
          </div>

          {/* Who */}
          <div className="al-drawer-section">
            <div className="al-drawer-section-title">👤 Performed By</div>
            <div className="al-drawer-row">
              <Avatar name={entry.performedBy} size={40} />
              <div>
                <div className="al-drawer-name">{entry.performedBy}</div>
                <div className="al-drawer-sub">{entry.role}</div>
              </div>
            </div>
          </div>

          {/* Invoice details */}
          <div className="al-drawer-section">
            <div className="al-drawer-section-title">🧾 Invoice Details</div>
            <div className="al-detail-grid">
              <div className="al-detail-item">
                <div className="al-detail-label">Invoice No</div>
                <div className="al-detail-value mono">{entry.invoiceNo || "—"}</div>
              </div>
              <div className="al-detail-item">
                <div className="al-detail-label">Vendor</div>
                <div className="al-detail-value">{entry.vendor || "—"}</div>
              </div>
              <div className="al-detail-item">
                <div className="al-detail-label">Department</div>
                <div className="al-detail-value">{entry.department || "—"}</div>
              </div>
              <div className="al-detail-item">
                <div className="al-detail-label">Amount</div>
                <div className="al-detail-value">
                  {entry.amount ? `₹${entry.amount.toLocaleString("en-IN")}` : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Status change */}
          {(entry.oldStatus || entry.newStatus) && (
            <div className="al-drawer-section">
              <div className="al-drawer-section-title">🔄 Status Change</div>
              <div className="al-status-flow">
                {entry.oldStatus
                  ? <StatusChip label={entry.oldStatus} />
                  : <span className="al-status-chip new">New</span>
                }
                <span className="al-arrow">→</span>
                <StatusChip label={entry.newStatus} />
              </div>
            </div>
          )}

          {/* Remarks */}
          {entry.remarks && (
            <div className="al-drawer-section">
              <div className="al-drawer-section-title">💬 Remarks</div>
              <div className="al-drawer-remarks">{entry.remarks}</div>
            </div>
          )}

          {/* Timestamp */}
          <div className="al-drawer-section">
            <div className="al-drawer-section-title">🕐 Timestamp</div>
            <div className="al-detail-value">{formatDateTime(entry.timestamp)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── User Stats Panel ──────────────────────────────────────────
function UserStatsPanel({ stats, actionTotals, totalEntries, onUserClick }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="al-stats-panel">
      <div className="al-stats-header">
        <span className="al-stats-title">👥 User Activity Summary</span>
        <span className="al-stats-meta">{totalEntries} total actions</span>
      </div>

      {/* Action type totals row */}
      {actionTotals && Object.keys(actionTotals).length > 0 && (
        <div className="al-action-totals">
          {Object.entries(actionTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([action, count]) => {
              const { bg, color, icon } = getAction(action);
              return (
                <div key={action} className="al-action-total-chip" style={{ background: bg, color }}>
                  <span>{icon}</span>
                  <span style={{ fontWeight: 600 }}>{count}</span>
                  <span style={{ fontSize: 11 }}>{action.replace("Invoice ", "").replace("Finance ", "").replace("HOD ", "HOD ").replace("Payment ", "Pmt ")}</span>
                </div>
              );
            })}
        </div>
      )}

      {/* Per-user rows */}
      <div className="al-user-list">
        {stats.map((s) => (
          <div key={s.userName} className="al-user-row">
            <div
              className="al-user-row-main"
              onClick={() => setExpanded(expanded === s.userName ? null : s.userName)}
            >
              <Avatar name={s.userName} size={36} />
              <div className="al-user-info">
                <div className="al-user-name"
                  onClick={(e) => { e.stopPropagation(); onUserClick(s.userName); }}
                >
                  {s.userName}
                </div>
                <div className="al-user-role">{s.role}</div>
              </div>
              <div className="al-user-meta">
                <div className="al-user-count">{s.totalActions}</div>
                <div className="al-user-last">{timeAgo(s.lastActive)}</div>
              </div>
              <span className="al-expand-arrow">{expanded === s.userName ? "▲" : "▼"}</span>
            </div>

            {expanded === s.userName && (
              <div className="al-user-breakdown">
                {Object.entries(s.actionBreakdown || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([action, count]) => {
                    const { bg, color, icon } = getAction(action);
                    return (
                      <div key={action} className="al-bd-row">
                        <span className="al-bd-badge" style={{ background: bg, color }}>
                          {icon} {action}
                        </span>
                        <span className="al-bd-count">{count}×</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Main Page
// ═══════════════════════════════════════════════════════════════
function ActivityLogs() {
  const [logs,         setLogs]         = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [total,        setTotal]        = useState(0);
  const [error,        setError]        = useState("");
  const [detail,       setDetail]       = useState(null);  // drawer entry

  // filters
  const [search,     setSearch]     = useState("");
  const [actionF,    setActionF]    = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [fromDate,   setFromDate]   = useState("");
  const [toDate,     setToDate]     = useState("");
  const [activeTab,  setActiveTab]  = useState("logs"); // "logs" | "users"

  const { page, pageSize, setPage, setPageSize, resetPage, paginate } = usePagination(50);

  // Load logs when filters change
  useEffect(() => {
    loadLogs();
  }, [search, actionF, userFilter, deptFilter, fromDate, toDate, page, pageSize]);

  // Load stats once
  useEffect(() => {
    loadStats();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        page, limit: pageSize,
        ...(search     && { search }),
        ...(actionF    && { action: actionF }),
        ...(userFilter && { userName: userFilter }),
        ...(deptFilter && { department: deptFilter }),
        ...(fromDate   && { fromDate }),
        ...(toDate     && { toDate }),
      };
      const res = await fetchLogs(params);
      setLogs(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch (err) {
      setError("Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const res = await fetchStats();
      setStats(res.data);
    } catch {
      // stats panel fails silently
    } finally {
      setStatsLoading(false);
    }
  };

  const handleFilter = useCallback((setter) => (val) => {
    setter(val); resetPage();
  }, [resetPage]);

  const handleUserClick = useCallback((userName) => {
    setUserFilter(userName);
    setActiveTab("logs");
    resetPage();
  }, [resetPage]);

  const clearFilters = () => {
    setSearch(""); setActionF(""); setUserFilter("");
    setDeptFilter(""); setFromDate(""); setToDate("");
    resetPage();
  };

  const hasFilters = search || actionF || userFilter || deptFilter || fromDate || toDate;

  // Derive unique departments + actions from current logs for filter dropdowns
  const departments = useMemo(() =>
    [...new Set(logs.map(l => l.department).filter(Boolean))].sort(),
    [logs]
  );
  const allActions = Object.keys(ACTION_COLORS);

  return (
    <div className="al-root">

      {/* Detail Drawer */}
      {detail && <DetailDrawer entry={detail} onClose={() => setDetail(null)} />}

      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Activity Logs</h1>
          <p className="page-subtitle">
            Complete audit trail — every action, who did it, when and on which record.
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => { loadLogs(); loadStats(); }}>
          🔄 Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="al-error-banner">⚠️ {error}
          <button onClick={() => setError("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}>✕</button>
        </div>
      )}

      {/* KPI strip */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Actions</div>
          <div className="kpi-value">{stats?.totalEntries ?? "—"}</div>
          <div className="kpi-meta">All time</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active Users</div>
          <div className="kpi-value">{stats?.userStats?.length ?? "—"}</div>
          <div className="kpi-meta">With recorded activity</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Action Types</div>
          <div className="kpi-value">{stats ? Object.keys(stats.actionTotals || {}).length : "—"}</div>
          <div className="kpi-meta">Distinct operations</div>
        </div>
        <div className="kpi-card yellow">
          <div className="kpi-label">Showing</div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-meta">Matching current filters</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="al-tabs">
        <button className={`al-tab ${activeTab === "logs"  ? "active" : ""}`} onClick={() => setActiveTab("logs")}>
          📋 Activity Log {total > 0 && <span className="al-tab-count">{total}</span>}
        </button>
        <button className={`al-tab ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>
          👥 User Summary
        </button>
      </div>

      {/* ── Tab: Logs ── */}
      {activeTab === "logs" && (
        <>
          {/* Filters */}
          <div className="al-filters">
            <SearchBar
              value={search}
              onChange={handleFilter(setSearch)}
              placeholder="Search invoice no, vendor, user..."
            />

            <select
              className="al-select"
              value={actionF}
              onChange={e => { setActionF(e.target.value); resetPage(); }}
            >
              <option value="">All Actions</option>
              {allActions.map(a => (
                <option key={a} value={a}>{getAction(a).icon} {a}</option>
              ))}
            </select>

            <input
              className="al-input"
              placeholder="Filter by user..."
              value={userFilter}
              onChange={e => { setUserFilter(e.target.value); resetPage(); }}
            />

            <select
              className="al-select"
              value={deptFilter}
              onChange={e => { setDeptFilter(e.target.value); resetPage(); }}
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <input type="date" className="al-input al-date" value={fromDate}
              onChange={e => { setFromDate(e.target.value); resetPage(); }}
              title="From date"
            />
            <span className="al-date-sep">→</span>
            <input type="date" className="al-input al-date" value={toDate}
              onChange={e => { setToDate(e.target.value); resetPage(); }}
              title="To date"
            />

            {hasFilters && (
              <button className="btn btn-outline btn-sm" onClick={clearFilters}>
                ✕ Clear
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="al-chips">
              {userFilter  && <span className="al-chip">👤 {userFilter}  <button onClick={() => { setUserFilter(""); resetPage(); }}>✕</button></span>}
              {actionF     && <span className="al-chip">⚡ {actionF}    <button onClick={() => { setActionF(""); resetPage(); }}>✕</button></span>}
              {deptFilter  && <span className="al-chip">🏢 {deptFilter} <button onClick={() => { setDeptFilter(""); resetPage(); }}>✕</button></span>}
              {fromDate    && <span className="al-chip">📅 From {fromDate} <button onClick={() => { setFromDate(""); resetPage(); }}>✕</button></span>}
              {toDate      && <span className="al-chip">📅 To {toDate}    <button onClick={() => { setToDate(""); resetPage(); }}>✕</button></span>}
              {search      && <span className="al-chip">🔍 "{search}"   <button onClick={() => { setSearch(""); resetPage(); }}>✕</button></span>}
            </div>
          )}

          {/* Table */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📋 Activity Log</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{total} entries</span>
            </div>

            {loading ? (
              <div className="al-loading">
                <div className="al-spinner" />
                <span>Loading activity logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="al-empty">
                <div style={{ fontSize: 48 }}>📭</div>
                <div className="al-empty-title">No activity found</div>
                <p className="al-empty-sub">
                  {hasFilters ? "Try adjusting your filters." : "Activity will appear here as users perform actions."}
                </p>
              </div>
            ) : (
              <>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>When</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Invoice No</th>
                        <th>Vendor</th>
                        <th>Dept</th>
                        <th>Amount</th>
                        <th>Status Change</th>
                        <th>Remarks</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, idx) => (
                        <tr key={log.id} className="al-log-row">
                          <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                            {(page - 1) * pageSize + idx + 1}
                          </td>

                          {/* When */}
                          <td style={{ whiteSpace: "nowrap" }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                              {timeAgo(log.timestamp)}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              {formatDateTime(log.timestamp)}
                            </div>
                          </td>

                          {/* User */}
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Avatar name={log.performedBy} size={30} />
                              <div>
                                <div
                                  style={{ fontWeight: 600, fontSize: 13, cursor: "pointer",
                                    color: "var(--accent)" }}
                                  onClick={() => handleFilter(setUserFilter)(log.performedBy)}
                                  title="Filter by this user"
                                >
                                  {log.performedBy}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{log.role}</div>
                              </div>
                            </div>
                          </td>

                          {/* Action */}
                          <td><ActionBadge action={log.action} /></td>

                          {/* Invoice No */}
                          <td>
                            <span style={{ fontFamily: "monospace", fontSize: 13,
                              background: "#f8fafc", padding: "2px 6px", borderRadius: 5,
                              border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                              {log.invoiceNo || "—"}
                            </span>
                          </td>

                          {/* Vendor */}
                          <td style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 140 }}>
                            <span style={{ display: "block", overflow: "hidden",
                              textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}
                              title={log.vendor}>
                              {log.vendor || "—"}
                            </span>
                          </td>

                          {/* Dept */}
                          <td>
                            {log.department
                              ? <span style={{ fontSize: 12, padding: "2px 8px",
                                  background: "#f1f5f9", borderRadius: 6,
                                  border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                                  {log.department}
                                </span>
                              : <span style={{ color: "var(--text-muted)", fontSize: 13 }}>—</span>}
                          </td>

                          {/* Amount */}
                          <td style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)",
                            whiteSpace: "nowrap" }}>
                            {log.amount ? `₹${Number(log.amount).toLocaleString("en-IN")}` : "—"}
                          </td>

                          {/* Status change */}
                          <td>
                            {(log.oldStatus || log.newStatus) ? (
                              <div className="al-status-flow" style={{ fontSize: 12, gap: 4 }}>
                                {log.oldStatus
                                  ? <span className="al-status-chip sm">{log.oldStatus}</span>
                                  : <span className="al-status-chip sm new">New</span>
                                }
                                <span style={{ color: "var(--text-muted)" }}>→</span>
                                <span className="al-status-chip sm">{log.newStatus}</span>
                              </div>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                            )}
                          </td>

                          {/* Remarks */}
                          <td style={{ maxWidth: 150 }}>
                            {log.remarks
                              ? <span style={{ fontSize: 12, color: "var(--text-secondary)",
                                  display: "block", overflow: "hidden", textOverflow: "ellipsis",
                                  whiteSpace: "nowrap", maxWidth: 140 }} title={log.remarks}>
                                  {log.remarks}
                                </span>
                              : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>}
                          </td>

                          {/* Detail button */}
                          <td>
                            <button className="btn btn-outline btn-sm"
                              onClick={() => setDetail(log)}
                              title="View detail">
                              🔍
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={page}
                  totalItems={total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  pageSizeOptions={[25, 50, 100]}
                  onPageSizeChange={(s) => { setPageSize(s); resetPage(); }}
                />
              </>
            )}
          </div>
        </>
      )}

      {/* ── Tab: User Summary ── */}
      {activeTab === "users" && (
        statsLoading ? (
          <div className="al-loading"><div className="al-spinner" /><span>Loading user stats...</span></div>
        ) : stats ? (
          <UserStatsPanel
            stats={stats.userStats || []}
            actionTotals={stats.actionTotals || {}}
            totalEntries={stats.totalEntries || 0}
            onUserClick={handleUserClick}
          />
        ) : (
          <div className="al-empty">
            <div className="al-empty-title">Stats not available</div>
          </div>
        )
      )}

      <style>{`
        @keyframes al-spin { to { transform: rotate(360deg); } }
        @keyframes al-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}

export default ActivityLogs;