import { useState, useEffect, useMemo } from "react";
import API from "../api/axios";
import SearchBar from "../components/ui/SearchBar";
import FilterSelect from "../components/ui/FilterSelect";
import Pagination from "../components/ui/Pagination";
import usePagination from "../components/ui/usePagination";

const ACTION_COLORS = {
  created:    { bg:"#eff6ff", color:"#2563eb", border:"#bfdbfe", icon:"📄" },
  updated:    { bg:"#fef9c3", color:"#b45309", border:"#fde68a", icon:"✏️" },
  deleted:    { bg:"#fef2f2", color:"#dc2626", border:"#fecaca", icon:"🗑️" },
  approved:   { bg:"#f0fdf4", color:"#16a34a", border:"#bbf7d0", icon:"✅" },
  rejected:   { bg:"#fef2f2", color:"#dc2626", border:"#fecaca", icon:"❌" },
  accepted:   { bg:"#f0fdf4", color:"#16a34a", border:"#bbf7d0", icon:"✅" },
  held:       { bg:"#fff7ed", color:"#ea580c", border:"#fed7aa", icon:"⏸️" },
  "on hold":  { bg:"#fff7ed", color:"#ea580c", border:"#fed7aa", icon:"⏸️" },
  "sent back":{ bg:"#f5f3ff", color:"#7c3aed", border:"#ddd6fe", icon:"↩️" },
  processed:  { bg:"#ecfeff", color:"#0891b2", border:"#a5f3fc", icon:"💳" },
  uploaded:   { bg:"#f0fdf4", color:"#16a34a", border:"#bbf7d0", icon:"📎" },
  pending:    { bg:"#f8fafc", color:"#475569", border:"#e2e8f0", icon:"⏳" },
};

function getActionStyle(action = "") {
  const key = Object.keys(ACTION_COLORS).find(k => action.toLowerCase().includes(k));
  return ACTION_COLORS[key] || { bg:"#f8fafc", color:"#475569", border:"#e2e8f0", icon:"📋" };
}

function ActionBadge({ action }) {
  const s = getActionStyle(action);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px",
      borderRadius:20, fontSize:12, fontWeight:600, background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>
      <span>{s.icon}</span> {action}
    </span>
  );
}

function Avatar({ name, size=32 }) {
  const colors = ["#2563eb","#7c3aed","#16a34a","#ea580c","#0891b2","#d97706"];
  const initials = (name || "?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const color = colors[(name?.charCodeAt(0)||0) % colors.length];
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:color, color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:size*0.38, flexShrink:0 }}>
      {initials}
    </div>
  );
}

function LogDetailModal({ log, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:560 }}>
        <div className="modal-header">
          <span className="modal-title">📋 Log Detail</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[
              ["Action",       log.action],
              ["Performed By", log.performedBy],
              ["Role",         log.role],
              ["Invoice ID",   log.invoiceId],
              ["Old Status",   log.oldStatus || "—"],
              ["New Status",   log.newStatus || "—"],
              ["Timestamp",    log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN") : "—"],
            ].map(([label, value]) => (
              <div key={label} style={{ background:"#f8fafc", borderRadius:8, padding:"10px 14px", border:"1px solid var(--border)" }}>
                <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600, marginBottom:4, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</div>
                <div style={{ fontSize:13, color:"var(--text-primary)", fontWeight:500 }}>{value}</div>
              </div>
            ))}
          </div>
          {log.remarks && (
            <div style={{ background:"#fffbeb", borderRadius:8, padding:"12px 14px", border:"1px solid #fde68a" }}>
              <div style={{ fontSize:11, color:"#b45309", fontWeight:600, marginBottom:4, textTransform:"uppercase" }}>Remarks</div>
              <div style={{ fontSize:13, color:"#92400e" }}>{log.remarks}</div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function ActivityLogs() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [actFilter, setActFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [viewLog, setViewLog] = useState(null);

  const { page, pageSize, setPage, setPageSize, resetPage, paginate } = usePagination(20);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      // Fetch all invoices, then for each get audit trail
      const invRes = await API.get("/api/v1/invoices?limit=200");
      const invoices = invRes.data?.invoices || invRes.data?.data || invRes.data || [];
      
      const allLogs = [];
      await Promise.all(
        invoices.slice(0, 50).map(async inv => {
          try {
            const res = await API.get(`/api/v1/invoices/${inv.id}/audit-trail`);
            const trail = res.data?.auditTrail || res.data?.data || res.data || [];
            trail.forEach(t => allLogs.push({
              ...t,
              invoiceNo: inv.invoiceNo,
              invoiceVendor: inv.vendor,
              invoiceAmount: inv.amount,
            }));
          } catch {}
        })
      );

      // Sort by timestamp desc
      allLogs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
      setLogs(allLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const actionOptions = useMemo(() => {
    const acts = [...new Set(logs.map(l => l.action).filter(Boolean))];
    return acts.map(a => ({ value:a, label:a }));
  }, [logs]);

  const roleOptions = useMemo(() => {
    const roles = [...new Set(logs.map(l => l.role).filter(Boolean))];
    return roles.map(r => ({ value:r, label:r }));
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter(l => {
      const matchQ = !q || l.performedBy?.toLowerCase().includes(q) || l.invoiceNo?.toLowerCase().includes(q) || l.action?.toLowerCase().includes(q);
      const matchA = !actFilter  || l.action  === actFilter;
      const matchR = !roleFilter || l.role    === roleFilter;
      return matchQ && matchA && matchR;
    });
  }, [logs, search, actFilter, roleFilter]);

  const pageData = paginate(filtered);
  const mkFilter = setter => val => { setter(val); resetPage(); };

  // Stats
  const todayLogs = logs.filter(l => {
    const d = new Date(l.timestamp);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, flexDirection:"column", gap:12 }}>
      <div style={{ width:40, height:40, border:"3px solid var(--border)", borderTopColor:"var(--accent)", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <span style={{ color:"var(--text-muted)", fontSize:14 }}>Loading activity logs…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  return (
    <div>
      {viewLog && <LogDetailModal log={viewLog} onClose={() => setViewLog(null)} />}

      <div className="page-header">
        <h1 className="page-title">📋 Activity Logs</h1>
        <p className="page-subtitle">Complete audit trail of all invoice actions across the system</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns:"repeat(4,1fr)", marginBottom:24 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Logs</div>
          <div className="kpi-value">{logs.length}</div>
          <div className="kpi-meta">All time</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Today</div>
          <div className="kpi-value">{todayLogs.length}</div>
          <div className="kpi-meta">Actions today</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Unique Users</div>
          <div className="kpi-value">{new Set(logs.map(l=>l.performedBy)).size}</div>
          <div className="kpi-meta">Who acted</div>
        </div>
        <div className="kpi-card yellow">
          <div className="kpi-label">Filtered</div>
          <div className="kpi-value">{filtered.length}</div>
          <div className="kpi-meta">Matching filters</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <SearchBar value={search} onChange={mkFilter(setSearch)} placeholder="Search by user, invoice no, action…" />
        <FilterSelect value={actFilter} onChange={mkFilter(setActFilter)} options={actionOptions} placeholder="All Actions" />
        <FilterSelect value={roleFilter} onChange={mkFilter(setRoleFilter)} options={roleOptions} placeholder="All Roles" />
        <button className="btn btn-outline btn-sm" onClick={() => { setSearch(""); setActFilter(""); setRoleFilter(""); resetPage(); }}>Clear</button>
      </div>

      {/* Timeline / Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">🕐 Audit Trail</span>
          <span style={{ fontSize:12, color:"var(--text-muted)" }}>{filtered.length} entries</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
            <p style={{ color:"var(--text-muted)", fontSize:14 }}>No activity logs found.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Performed By</th>
                    <th>Role</th>
                    <th>Invoice</th>
                    <th>Status Change</th>
                    <th>Remarks</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((log, idx) => (
                    <tr key={log.id || idx}>
                      <td style={{ color:"var(--text-muted)", fontSize:12 }}>{(page-1)*pageSize+idx+1}</td>
                      <td style={{ fontSize:12, color:"var(--text-muted)", whiteSpace:"nowrap" }}>
                        <div>{log.timestamp ? new Date(log.timestamp).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—"}</div>
                        <div style={{ fontSize:11 }}>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }) : ""}</div>
                      </td>
                      <td><ActionBadge action={log.action} /></td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <Avatar name={log.performedBy} />
                          <span style={{ fontWeight:600, fontSize:13 }}>{log.performedBy || "—"}</span>
                        </div>
                      </td>
                      <td style={{ fontSize:12, color:"var(--text-secondary)" }}>{log.role || "—"}</td>
                      <td>
                        <div style={{ fontSize:13, fontWeight:600, color:"var(--accent)" }}>{log.invoiceNo || "—"}</div>
                        {log.invoiceVendor && <div style={{ fontSize:11, color:"var(--text-muted)" }}>{log.invoiceVendor}</div>}
                      </td>
                      <td>
                        {log.oldStatus || log.newStatus ? (
                          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12 }}>
                            {log.oldStatus && <span style={{ background:"#f1f5f9", color:"#475569", padding:"2px 8px", borderRadius:4 }}>{log.oldStatus}</span>}
                            {log.oldStatus && log.newStatus && <span style={{ color:"var(--text-muted)" }}>→</span>}
                            {log.newStatus && <span style={{ background:"#eff6ff", color:"#2563eb", padding:"2px 8px", borderRadius:4, fontWeight:600 }}>{log.newStatus}</span>}
                          </div>
                        ) : <span style={{ color:"var(--text-muted)", fontSize:12 }}>—</span>}
                      </td>
                      <td style={{ fontSize:12, color:"var(--text-secondary)", maxWidth:160 }}>
                        {log.remarks ? (
                          <span style={{ display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:140 }} title={log.remarks}>{log.remarks}</span>
                        ) : "—"}
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => setViewLog(log)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalItems={filtered.length} pageSize={pageSize}
              onPageChange={setPage} pageSizeOptions={[20,50,100]} onPageSizeChange={setPageSize} />
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
