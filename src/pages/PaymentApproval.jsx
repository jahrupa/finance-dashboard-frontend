import { useEffect, useState, useMemo } from "react";
import { useInvoices } from "../context/InvoiceContext";
import {
  fetchPaymentApprovalInvoices,
  paymentApprovalApprove,
  paymentApprovalHold,
  paymentApprovalReject,
  paymentApprovalSendBack,
} from "../api/Service";
import SearchBar from "../components/ui/SearchBar";
import FilterSelect from "../components/ui/FilterSelect";
import Pagination from "../components/ui/Pagination";
import usePagination from "../components/ui/usePagination";
import DownloadDocsButton from "../components/ui/DownloadDocsButton";
import { useToast } from "../context/ToastContext";
import { getErrorMessage, getSuccessMessage } from "../utils/apiMessage";

const PRIORITY_OPTIONS = [
  { value: "High",   label: "High"   },
  { value: "Normal", label: "Normal" },
  { value: "Low",    label: "Low"    },
];

export default function PaymentApproval() {
  const { getDaysPending } = useInvoices();
  const toast = useToast();

  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [action,   setAction]   = useState(null);
  const [formData, setFormData] = useState({ paymentMode: "NEFT", priority: "Normal", remarks: "" });

  // ── filters ───────────────────────────────────────────────
  const [search,         setSearch]         = useState("");
  const [deptFilter,     setDeptFilter]     = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const pendingPagination  = usePagination(10);
  const approvedPagination = usePagination(10);

  // ── fetch ─────────────────────────────────────────────────
  useEffect(() => { loadInvoices(); }, []);

  const loadInvoices = async () => {
    try {
      const res = await fetchPaymentApprovalInvoices();
      setInvoices(res?.data || []);
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

  const pending  = invoices.filter((i) => (i.hodStatus === "Approved" && i.status === "Payment Approval") || i.status === "On Hold");
  const approved = invoices.filter((i) => i.paymentApprovalStatus === "Approved");
  const held     = invoices.filter((i) => i.paymentApprovalStatus === "Hold");
  const isOverdue = (d) => d && new Date(d) < new Date();

  const applyFilters = (list) => {
    const q = search.toLowerCase();
    return list.filter((inv) => {
      const matchSearch   = !q || inv.vendor?.toLowerCase().includes(q) || inv.id?.toLowerCase().includes(q);
      const matchDept     = !deptFilter     || inv.department === deptFilter;
      const matchPriority = !priorityFilter || inv.priority   === priorityFilter;
      return matchSearch && matchDept && matchPriority;
    });
  };

  const filteredPending  = applyFilters(pending);
  const filteredApproved = applyFilters(approved);

  const handleFilterChange = (setter) => (val) => {
    setter(val);
    pendingPagination.resetPage();
    approvedPagination.resetPage();
  };

  // ── modal ─────────────────────────────────────────────────
  const openAction = (inv, act) => {
    setSelected(inv); setAction(act);
    setFormData({ paymentMode: inv.paymentMode || "NEFT", priority: inv.priority || "Normal", remarks: "" });
  };

  const handleConfirm = async () => {
    try {
      let res;
      if (action === "Approve")   res = await paymentApprovalApprove(selected.id, formData);
      if (action === "Reject")    res = await paymentApprovalReject(selected.id, formData);
      if (action === "Hold")      res = await paymentApprovalHold(selected.id, formData);
      if (action === "Send Back") res = await paymentApprovalSendBack(selected.id);
      await loadInvoices();
      setSelected(null); setAction(null);
      toast.success(getSuccessMessage(res, `Payment ${action.toLowerCase()} successful.`));
    } catch (err) { toast.error(getErrorMessage(err, "Action failed. Please try again.")); }
  };

  const getAgeClass = (days) =>
    days <= 3 ? "age-green" : days <= 7 ? "age-yellow" : days <= 15 ? "age-orange" : "age-red";

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payment Approval Dashboard</h1>
        <p className="page-subtitle">Final authority approves invoices before payment processing</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}>
        <div className="kpi-card yellow">
          <div className="kpi-label">Pending Approval</div>
          <div className="kpi-value">{pending.length}</div>
          <div className="kpi-meta">Awaiting your action</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Approved for Payment</div>
          <div className="kpi-value">{approved.length}</div>
          <div className="kpi-meta">Ready to process</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Overdue</div>
          <div className="kpi-value">{pending.filter((i) => isOverdue(i.dueDate)).length}</div>
          <div className="kpi-meta">Past due date</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">On Hold</div>
          <div className="kpi-value">{held.length}</div>
          <div className="kpi-meta">Deferred payments</div>
        </div>
      </div>

      {pending.some((i) => isOverdue(i.dueDate)) && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          🚨 {pending.filter((i) => isOverdue(i.dueDate)).length} invoice(s) are past their due date. Immediate action required.
        </div>
      )}

      {/* Search & Filters */}
      <div className="filter-bar">
        <SearchBar
          value={search}
          onChange={handleFilterChange(setSearch)}
          placeholder="Search by vendor or invoice ID..."
        />
        <FilterSelect value={deptFilter}     onChange={handleFilterChange(setDeptFilter)}     options={departments}     placeholder="All Departments" />
        <FilterSelect value={priorityFilter} onChange={handleFilterChange(setPriorityFilter)} options={PRIORITY_OPTIONS} placeholder="All Priorities" />
        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {filteredPending.length} pending
        </span>
      </div>

      {/* Pending Table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">⏳ Awaiting Payment Approval</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{filteredPending.length} invoices</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Doc</th>
                <th>Invoice ID</th><th>Vendor</th><th>Department</th>
                <th>Amount (₹)</th><th style={{ color: "var(--accent)" }}>📅 Date of Receipt</th>
                <th>Due Date</th><th>Days</th><th>GL Code</th>
                <th>Expense Head</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingPagination.paginate(filteredPending).length === 0 ? (
                <tr><td colSpan={11}>
                  <div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-text">No invoices match filters</div></div>
                </td></tr>
              ) : (
                pendingPagination.paginate(filteredPending).map((inv) => {
                  const days    = getDaysPending(inv.dateOfReceipt);
                  const overdue = isOverdue(inv.dueDate);
                  return (
                    <tr key={inv.id} style={overdue ? { background: "#fff5f5" } : {}}>
                      <td>
                          <DownloadDocsButton invoice={inv} />

                      </td>
                      <td>{overdue && <span style={{ color: "var(--danger)", marginRight: 4 }}>🚨</span>}{inv.id}</td>
                      <td style={{ fontWeight: 600 }}>{inv.vendor}</td>
                      <td>{inv.department}</td>
                      <td className="amount-cell">₹{inv.amount?.toLocaleString("en-IN")}</td>
                      <td><span className="receipt-date">{inv.dateOfReceipt}</span></td>
                      <td style={{ color: overdue ? "var(--danger)" : "inherit", fontWeight: overdue ? 700 : 400 }}>{inv.dueDate || "—"}</td>
                      <td><span className={`age-chip ${getAgeClass(days)}`}>{days}d</span></td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{inv.glCode}</td>
                      <td style={{ fontSize: 12 }}>{inv.expenseHead}</td>
                      <td style={{ fontSize: 12 }}>{inv.status}</td>
                      <td>
                        <div className="action-row">
                          <button className="btn btn-success btn-sm" onClick={() => openAction(inv, "Approve")}>✅ Approve</button>
                          <button className="btn btn-warning btn-sm" onClick={() => openAction(inv, "Hold")}>⏸ Hold</button>
                          <button className="btn btn-danger btn-sm"  onClick={() => openAction(inv, "Reject")}>❌ Reject</button>
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
          currentPage={pendingPagination.page}
          totalItems={filteredPending.length}
          pageSize={pendingPagination.pageSize}
          onPageChange={pendingPagination.setPage}
          pageSizeOptions={[10, 20, 50]}
          onPageSizeChange={pendingPagination.setPageSize}
        />
      </div>

      {/* Approved Table */}
      {filteredApproved.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">✅ Approved for Payment</span>
            <span className="badge badge-green">{filteredApproved.length}</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Doc</th>
                  <th>Invoice ID</th><th>Vendor</th><th>Amount (₹)</th>
                  <th>Due Date</th><th>Payment Mode</th><th>Priority</th>
                  <th>Payment Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvedPagination.paginate(filteredApproved).map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <DownloadDocsButton invoice={inv} />
                    </td>
                    <td>{inv.id}</td>
                    <td style={{ fontWeight: 600 }}>{inv.vendor}</td>
                    <td className="amount-cell">₹{inv.amount?.toLocaleString("en-IN")}</td>
                    <td style={{ color: isOverdue(inv.dueDate) ? "var(--danger)" : "inherit" }}>{inv.dueDate || "—"}</td>
                    <td><span className="badge badge-cyan">{inv.paymentMode || "—"}</span></td>
                    <td>
                      <span className={`badge ${inv.priority === "High" ? "badge-red" : inv.priority === "Normal" ? "badge-green" : "badge-gray"}`}>
                        {inv.priority || "Normal"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${inv.paymentStatus === "Processed" ? "badge-green" : "badge-blue"}`}>
                        {inv.paymentStatus || "Pending"}
                      </span>
                    </td>
                    <td>
                      <div className="action-row">
                        <button className="btn btn-outline btn-sm" onClick={() => openAction(inv, "Send Back")}>↩ Send Back</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={approvedPagination.page}
            totalItems={filteredApproved.length}
            pageSize={approvedPagination.pageSize}
            onPageChange={approvedPagination.setPage}
            pageSizeOptions={[10, 20, 50]}
            onPageSizeChange={approvedPagination.setPageSize}
          />
        </div>
      )}

      {/* Action Modal */}
      {selected && action && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setAction(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {action === "Approve" ? "✅ Approve Payment" : action === "Hold" ? "⏸ Hold Payment" : "❌ Reject Invoice"} — {selected.id}
              </span>
              <button className="close-btn" onClick={() => { setSelected(null); setAction(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><span style={{ color: "var(--text-muted)" }}>Vendor: </span><strong>{selected.vendor}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Amount: </span><strong>₹{selected.amount?.toLocaleString("en-IN")}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Due Date: </span><strong>{selected.dueDate || "—"}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Receipt: </span><strong style={{ color: "var(--accent)" }}>{selected.dateOfReceipt}</strong></div>
                </div>
              </div>
              {action === "Approve" && (
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Payment Mode <span className="required">*</span></label>
                    <select className="form-control" value={formData.paymentMode} onChange={(e) => setFormData((p) => ({ ...p, paymentMode: e.target.value }))}>
                      <option>NEFT</option><option>RTGS</option><option>Cheque</option><option>IMPS</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Priority</label>
                    <select className="form-control" value={formData.priority} onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value }))}>
                      <option>High</option><option>Normal</option><option>Low</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">Remarks</label>
                <textarea className="form-control" value={formData.remarks} onChange={(e) => setFormData((p) => ({ ...p, remarks: e.target.value }))} placeholder="Optional remarks..." rows={3} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setSelected(null); setAction(null); }}>Cancel</button>
              <button className={`btn ${action === "Approve" ? "btn-success" : action === "Hold" ? "btn-warning" : "btn-danger"}`} onClick={handleConfirm}>
                Confirm {action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
