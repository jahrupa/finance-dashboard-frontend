import { useEffect, useState, useMemo } from "react";
import { useInvoices } from "../context/InvoiceContext";
import { fetchHodInvoices, hodApprove, hodReject, hodSendBack } from "../api/Service";
import SearchBar from "../components/ui/SearchBar";
import FilterSelect from "../components/ui/FilterSelect";
import Pagination from "../components/ui/Pagination";
import usePagination from "../components/ui/usePagination";
import DownloadDocsButton from "../components/ui/DownloadDocsButton";
import { useToast } from "../context/ToastContext";
import { getErrorMessage, getSuccessMessage } from "../utils/apiMessage";

const HOD_STATUS_OPTIONS = [
  { value: "Pending",   label: "Pending"   },
  { value: "Approved",  label: "Approved"  },
  { value: "Rejected",  label: "Rejected"  },
  { value: "Sent Back", label: "Sent Back" },
];

export default function HODApproval() {
  const { getDaysPending } = useInvoices();
  const toast = useToast();

  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [action,   setAction]   = useState(null);
  const [remarks,  setRemarks]  = useState("");

  // ── filters ───────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [deptFilter,   setDeptFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { page, pageSize, setPage, setPageSize, resetPage, paginate } = usePagination(10);

  // ── fetch ─────────────────────────────────────────────────
  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const res  = await fetchHodInvoices();
      const data = res?.data || [];
      const filtered = data.filter(
        (i) =>
          (i.financeStatus === "Accepted" || i.financeStatus === "Approved") &&
          !["Rejected", "sent back"].includes(i.hodStatus) &&
          i.status === "HOD Approval"
      );
      setInvoices(filtered);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load invoices."));
      setInvoices([]);
    }
  };

  // ── derived ───────────────────────────────────────────────
  const departments = useMemo(
    () => [...new Set(invoices.map((i) => i.department).filter(Boolean))],
    [invoices]
  );

  const pendingHOD = invoices.filter(
    (i) => i.financeStatus === "Accepted" && !["Approved", "Rejected"].includes(i.hodStatus)
  );

  // Department matrix
  const deptMatrix = useMemo(() => {
    const m = {};
    invoices.forEach((i) => {
      if (!m[i.department]) m[i.department] = { pending: 0, approved: 0, total: 0 };
      m[i.department].total++;
      if (i.hodStatus === "Approved") m[i.department].approved++;
      else if (i.status === "HOD Approval") m[i.department].pending++;
    });
    return m;
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter((inv) => {
      const matchSearch =
        !q ||
        inv.vendor?.toLowerCase().includes(q) ||
        inv.id?.toLowerCase().includes(q) ||
        inv.department?.toLowerCase().includes(q);
      const matchDept   = !deptFilter   || inv.department === deptFilter;
      const matchStatus = !statusFilter || inv.hodStatus  === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [invoices, search, deptFilter, statusFilter]);

  const pageData = paginate(filtered);
  const handleFilterChange = (setter) => (val) => { setter(val); resetPage(); };

  // ── modal ─────────────────────────────────────────────────
  const openAction = (inv, act) => { setSelected(inv); setAction(act); setRemarks(""); };

  const handleConfirm = async () => {
    if (!remarks && action !== "Approve") { toast.error("Please provide remarks."); return; }
    try {
      const payload = { remarks: remarks || "" };
      let res;
      if (action === "Approve")   res = await hodApprove(selected.id, payload);
      if (action === "Reject")    res = await hodReject(selected.id, payload);
      if (action === "Send Back") res = await hodSendBack(selected.id, payload);
      await loadInvoices();
      setSelected(null); setAction(null); setRemarks("");
      toast.success(getSuccessMessage(res, `Invoice ${action.toLowerCase()} successful.`));
    } catch (err) { toast.error(getErrorMessage(err, "Action failed. Please try again.")); }
  };

  const getAgeClass = (days) =>
    days <= 3 ? "age-green" : days <= 7 ? "age-yellow" : days <= 15 ? "age-orange" : "age-red";

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">HOD / Authority Approval</h1>
        <p className="page-subtitle">Department heads review and approve invoices cleared by Finance</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}>
        <div className="kpi-card purple">
          <div className="kpi-label">Pending HOD Approval</div>
          <div className="kpi-value">{pendingHOD.length}</div>
          <div className="kpi-meta">Awaiting HOD action</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">HOD Approved</div>
          <div className="kpi-value">{invoices.filter((i) => i.hodStatus === "Approved").length}</div>
          <div className="kpi-meta">Moved to payment</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Sent Back</div>
          <div className="kpi-value">{invoices.filter((i) => i.hodStatus === "Sent Back").length}</div>
          <div className="kpi-meta">Returned for review</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-label">Departments Active</div>
          <div className="kpi-value">{departments.length}</div>
          <div className="kpi-meta">With pending items</div>
        </div>
      </div>

      {/* Dept Matrix + Quick Stats */}
      <div className="content-grid grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">🏢 Department Matrix</span></div>
          <div className="card-body">
            {Object.entries(deptMatrix).length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No data available.</div>
            ) : (
              Object.entries(deptMatrix).map(([dept, data]) => (
                <div key={dept} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{dept}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span className="badge badge-purple">{data.pending} pending</span>
                    <span className="badge badge-green">{data.approved} approved</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">📋 Quick Stats</span></div>
          <div className="card-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Total Finance-Cleared",  value: invoices.filter((i) => i.financeStatus === "Accepted").length, color: "var(--accent)"   },
                { label: "Awaiting HOD Review",     value: pendingHOD.length,                                             color: "var(--purple)"  },
                { label: "HOD Approved",            value: invoices.filter((i) => i.hodStatus === "Approved").length,     color: "var(--success)" },
                { label: "HOD Rejected",            value: invoices.filter((i) => i.hodStatus === "Rejected").length,     color: "var(--danger)"  },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{item.label}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: item.color, fontFamily: "var(--font-display)" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="filter-bar">
        <SearchBar
          value={search}
          onChange={handleFilterChange(setSearch)}
          placeholder="Search by vendor, invoice ID, department..."
        />
        <FilterSelect
          value={deptFilter}
          onChange={handleFilterChange(setDeptFilter)}
          options={departments}
          placeholder="All Departments"
        />
        <FilterSelect
          value={statusFilter}
          onChange={handleFilterChange(setStatusFilter)}
          options={HOD_STATUS_OPTIONS}
          placeholder="All HOD Statuses"
        />
        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Invoices Awaiting HOD Approval</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>doc</th>
                <th>Invoice ID</th>
                <th>Vendor</th>
                <th>Department</th>
                <th>Amount (₹)</th>
                <th style={{ color: "var(--accent)" }}>📅 Date of Receipt</th>
                <th>Days</th>
                <th>GL Code</th>
                <th>Expense Head</th>
                <th>Finance Remarks</th>
                <th>HOD Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="empty-state">
                      <div className="empty-state-icon">✅</div>
                      <div className="empty-state-text">No invoices match your filters</div>
                    </div>
                  </td>
                </tr>
              ) : (
                pageData.map((inv) => {
                  const days = getDaysPending(inv.dateOfReceipt);
                  return (
                    <tr key={inv.id}>
                      <td><DownloadDocsButton invoice={inv} /></td>
                      <td>{inv.id}</td>
                      <td style={{ fontWeight: 600 }} className="space-remove">{inv.vendor}</td>
                      <td>{inv.department}</td>
                      <td className="amount-cell">₹{inv.amount?.toLocaleString("en-IN")}</td>
                      <td><span className="receipt-date">{inv.dateOfReceipt}</span></td>
                      <td><span className={`age-chip ${getAgeClass(days)}`}>{days}d</span></td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{inv.glCode || "—"}</td>
                      <td style={{ fontSize: 12 }}>{inv.expenseHead || "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.remarks || "—"}</td>
                      <td>
                        <span className={`status-chip ${inv.hodStatus === "Approved" ? "status-green" : inv.hodStatus === "Rejected" ? "status-red" : "status-yellow"}`}>
                          {inv.hodStatus || "Pending"}
                        </span>
                      </td>
                      <td>
                        <div className="action-row">
                          <button className="btn btn-success btn-sm" onClick={() => openAction(inv, "Approve")}>✅ Approve</button>
                          <button className="btn btn-outline btn-sm"  onClick={() => openAction(inv, "Send Back")}>↩ Send Back</button>
                          <button className="btn btn-danger btn-sm"   onClick={() => openAction(inv, "Reject")}>❌ Reject</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          pageSizeOptions={[10, 20, 50]}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Action Modal */}
      {selected && action && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setAction(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {action === "Approve" ? "✅" : action === "Reject" ? "❌" : "↩"} {action} — {selected.id}
              </span>
              <button className="close-btn" onClick={() => { setSelected(null); setAction(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><span style={{ color: "var(--text-muted)" }}>Vendor: </span><strong>{selected.vendor}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Dept: </span><strong>{selected.department}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Amount: </span><strong>₹{selected.amount?.toLocaleString("en-IN")}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Receipt: </span><strong style={{ color: "var(--accent)" }}>{selected.dateOfReceipt}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>GL Code: </span><strong>{selected.glCode}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Expense Head: </span><strong>{selected.expenseHead}</strong></div>
                </div>
              </div>
              {action === "Approve"   && <div className="alert alert-info">✅ Approving will move this invoice to Payment Approval stage.</div>}
              {action === "Reject"    && <div className="alert alert-danger">❌ Rejecting will close this invoice. Please provide a reason.</div>}
              {action === "Send Back" && <div className="alert alert-warning">↩ Invoice will be sent back to Finance for clarification.</div>}
              <div className="form-group">
                <label className="form-label">
                  Comments / Remarks {action !== "Approve" && <span className="required">*</span>}
                </label>
                <textarea className="form-control" value={remarks} onChange={(e) => setRemarks(e.target.value)}
                  placeholder={action === "Approve" ? "Optional approval notes..." : "Please specify reason..."}
                  rows={3} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setSelected(null); setAction(null); }}>Cancel</button>
              <button
                className={`btn ${action === "Approve" ? "btn-success" : action === "Reject" ? "btn-danger" : "btn-warning"}`}
                onClick={handleConfirm}
              >
                Confirm {action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
