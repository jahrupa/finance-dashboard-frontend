import { useState, useEffect, useMemo } from "react";
import { useInvoices } from "../context/InvoiceContext";
import {
  fetchFinanceInvoices,
  fetchInvoiceById,
  financeAccept,
  financeHold,
  financePending,
  financeReject,
  updateFinance,
} from "../api/Service";
import SearchBar   from "../components/ui/SearchBar";
import FilterSelect from "../components/ui/FilterSelect";
import Pagination  from "../components/ui/Pagination";
import usePagination from "../components/ui/usePagination";
import DownloadDocsButton from "../components/ui/DownloadDocsButton";
import { useToast } from "../context/ToastContext";
import { getErrorMessage, getSuccessMessage } from "../utils/apiMessage";

// ── Constants ─────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "Pending Review", label: "Pending Review" },
  { value: "On Hold",        label: "On Hold"        },
  { value: "Accepted",       label: "Accepted"       },
  { value: "Rejected",       label: "Rejected"       },
];

// TaxDetails is now a category dropdown (not a free-text rate field)
const TAX_TYPE_OPTIONS = [
  { value: "GST Invoice",      label: "GST Invoice"      },
  { value: "Non GST Invoice",  label: "Non GST Invoice"  },
  { value: "Proforma Invoice", label: "Proforma Invoice" },
  { value: "Advance Voucher",  label: "Advance Voucher"  },
];

const ACTION_COLORS = { Accept: "btn-success", Reject: "btn-danger", Hold: "btn-warning" };
const ACTION_ICONS  = { Accept: "✅", Reject: "❌", Hold: "⏸" };

// Fields Finance is allowed to correct (matches backend FinanceEditInvoice handler)
const EMPTY_EDIT_FORM = {
  invoiceNo:   "",
  invoiceDate: "",
  amount:      "",
  taxDetails:  "",
  remarks:     "",
};

// ── Component ──────────────────────────────────────────────────
export default function FinanceReview() {
  const { getDaysPending } = useInvoices();
  const toast = useToast();

  // ── Data ────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(false);

  // ── Approve / Reject / Hold modal ───────────────────────────
  const [selected, setSelected] = useState(null);   // invoice object
  const [action,   setAction]   = useState(null);   // "Accept" | "Reject" | "Hold"
  const [formData, setFormData] = useState({ glCode: "", expenseHead: "", taxDetails: "", remarks: "" });

  // ── Finance Edit modal ───────────────────────────────────────
  const [editTarget,  setEditTarget]  = useState(null);   // invoice being edited
  const [editForm,    setEditForm]    = useState(EMPTY_EDIT_FORM);
  const [editLoading, setEditLoading] = useState(false);
  const [editError,   setEditError]   = useState("");
  const [editChanges, setEditChanges] = useState([]);     // returned by backend

  // ── Filters ─────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter,   setDeptFilter]   = useState("");

  const { page, pageSize, setPage, setPageSize, resetPage, paginate } = usePagination(10);

  // ── Fetch ────────────────────────────────────────────────────
  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetchFinanceInvoices();
      setInvoices(res?.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load invoices."));
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInvoices(); }, []);

  // ── Derived ──────────────────────────────────────────────────
  const departments = useMemo(
    () => [...new Set(invoices.map((i) => i.department).filter(Boolean))],
    [invoices],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter((inv) => {
      const matchSearch =
        !q ||
        inv.vendor?.toLowerCase().includes(q)     ||
        inv.id?.toLowerCase().includes(q)         ||
        inv.invoiceNo?.toLowerCase().includes(q)  ||
        inv.department?.toLowerCase().includes(q);
      const matchStatus = !statusFilter || inv.status === statusFilter || inv.financeStatus === statusFilter;
      const matchDept   = !deptFilter   || inv.department === deptFilter;
      return matchSearch && matchStatus && matchDept;
    });
  }, [invoices, search, statusFilter, deptFilter]);

  const pageData = paginate(filtered);
  const handleFilterChange = (setter) => (val) => { setter(val); resetPage(); };

  // ── KPI counts ──────────────────────────────────────────────
  const pendingCount  = invoices.filter((i) => i.status === "Pending Review").length;
  const holdCount     = invoices.filter((i) => i.status === "On Hold").length;
  const acceptedCount = invoices.filter((i) => i.financeStatus === "Accepted").length;
  const rejectedCount = invoices.filter((i) => i.financeStatus === "Rejected").length;

  const getAgeClass = (days) =>
    days <= 3 ? "age-green" : days <= 7 ? "age-yellow" : days <= 15 ? "age-orange" : "age-red";

  // ════════════════════════════════════════════════════════
  //  APPROVE / REJECT / HOLD  handlers
  // ════════════════════════════════════════════════════════
  const openAction = (inv, act) => {
    setSelected(inv);
    setAction(act);
    setFormData({
      glCode:      inv.glCode      || "",
      expenseHead: inv.expenseHead || "",
      taxDetails:  inv.taxDetails  || "",
      remarks:     "",
    });
  };

  const closeAction = () => { setSelected(null); setAction(null); };

  const handleConfirm = async () => {
    if (!selected?.id) return;
    if (action === "Reject" && !formData.remarks) {
      toast.error("Rejection reason is mandatory.");
      return;
    }
    if (action === "Accept" && (!formData.glCode || !formData.expenseHead)) {
      toast.error("GL Code and Expense Head are required.");
      return;
    }
    try {
      let res;
      if (action === "Accept")  res = await financeAccept(selected.id, formData);
      if (action === "Reject")  res = await financeReject(selected.id, formData);
      if (action === "Hold")    res = await financeHold(selected.id, formData);
      if (action === "Pending") res = await financePending(selected.id, formData);
      closeAction();
      await loadInvoices();
      toast.success(getSuccessMessage(res, `Invoice ${action.toLowerCase()}ed successfully.`));
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Action failed. Please try again."));
    }
  };

  // ════════════════════════════════════════════════════════
  //  FINANCE EDIT  handlers
  // ════════════════════════════════════════════════════════
  const openEdit = async (inv) => {
    // Only allow editing when invoice is in Finance's hands
    if (inv.status !== "Pending Review" && inv.status !== "On Hold") {
      toast.error(`Cannot edit: invoice is in "${inv.status}" status. Finance can only edit Pending Review or On Hold invoices.`);
      return;
    }
    try {
      // Fetch fresh data to avoid editing stale values
      const res  = await fetchInvoiceById(inv.id);
      const data = res?.data || inv;
      setEditTarget(data);
      setEditForm({
        invoiceNo:   data.invoiceNo   || "",
        invoiceDate: data.invoiceDate?.split("T")[0] || "",
        amount:      data.amount      || "",
        taxDetails:  data.taxDetails  || "",
        remarks:     "",
      });
      setEditError("");
      setEditChanges([]);
    } catch {
      // Fallback to whatever we have in the table row
      setEditTarget(inv);
      setEditForm({
        invoiceNo:   inv.invoiceNo   || "",
        invoiceDate: inv.invoiceDate?.split("T")[0] || "",
        amount:      inv.amount      || "",
        taxDetails:  inv.taxDetails  || "",
        remarks:     "",
      });
      setEditError("");
      setEditChanges([]);
    }
  };

  const closeEdit = () => { setEditTarget(null); setEditForm(EMPTY_EDIT_FORM); setEditError(""); setEditChanges([]); };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setEditError("");
  };

  const handleEditSave = async () => {
    if (!editTarget?.id) return;

    // Client-side validation
    if (editForm.amount !== "" && Number(editForm.amount) <= 0) {
      setEditError("Amount must be greater than zero.");
      return;
    }

    // Build payload — only send changed fields
    const payload = {};
    if (editForm.invoiceNo   !== editTarget.invoiceNo)                                payload.invoiceNo   = editForm.invoiceNo.trim();
    if (editForm.invoiceDate !== (editTarget.invoiceDate?.split("T")[0] || ""))       payload.invoiceDate = editForm.invoiceDate;
    if (editForm.amount      !== "" && Number(editForm.amount) !== editTarget.amount) payload.amount      = Number(editForm.amount);
    if (editForm.taxDetails  !== editTarget.taxDetails)                               payload.taxDetails  = editForm.taxDetails;
    if (editForm.remarks.trim())                                                      payload.remarks     = editForm.remarks.trim();

    if (Object.keys(payload).length === 0) {
      setEditError("No changes detected.");
      return;
    }

    try {
      setEditLoading(true);
      setEditError("");
      const res = await updateFinance(editTarget.id, payload);
      setEditChanges(res?.changes || []);
      await loadInvoices();
      toast.success(getSuccessMessage(res, "Invoice updated successfully."));
      // Keep modal open briefly to show the "changes saved" confirmation
      setTimeout(closeEdit, 1400);
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to save changes. Please try again.");
      setEditError(msg);
      toast.error(msg);
    } finally {
      setEditLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div>

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">Finance Review Dashboard</h1>
        <p className="page-subtitle">Review, accept, reject or hold incoming invoices</p>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Pending Review</div>
          <div className="kpi-value">{pendingCount}</div>
          <div className="kpi-meta">Requires action</div>
        </div>
        <div className="kpi-card yellow">
          <div className="kpi-label">On Hold</div>
          <div className="kpi-value">{holdCount}</div>
          <div className="kpi-meta">Awaiting clarification</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Accepted</div>
          <div className="kpi-value">{acceptedCount}</div>
          <div className="kpi-meta">Moved to approval</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Rejected</div>
          <div className="kpi-value">{rejectedCount}</div>
          <div className="kpi-meta">Returned to vendor</div>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          ⚠️ {pendingCount} invoice(s) are pending your review. SLA breach may occur for older invoices.
        </div>
      )}

      {/* ── Search & Filters ─────────────────────────────────── */}
      <div className="filter-bar">
        <SearchBar
          value={search}
          onChange={handleFilterChange(setSearch)}
          placeholder="Search by vendor, invoice no, department..."
        />
        <FilterSelect
          value={statusFilter}
          onChange={handleFilterChange(setStatusFilter)}
          options={STATUS_OPTIONS}
          placeholder="All Statuses"
        />
        <FilterSelect
          value={deptFilter}
          onChange={handleFilterChange(setDeptFilter)}
          options={departments}
          placeholder="All Departments"
        />
        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Invoice Table ─────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Invoice Queue</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{invoices.length} total</span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: 76 }}>Edit / Doc</th>
                <th>Invoice ID</th>
                <th>Vendor</th>
                <th>Invoice No.</th>
                <th style={{ color: "var(--accent)" }}>📅 Date of Receipt</th>
                <th>Days</th>
                <th>Department</th>
                <th>Amount (₹)</th>
                <th>Tax Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    Loading invoices…
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🔍</div>
                      <div className="empty-state-text">No invoices match your filters</div>
                    </div>
                  </td>
                </tr>
              ) : (
                pageData.map((inv) => {
                  const days         = getDaysPending(inv.dateOfReceipt);
                  const canEdit      = inv.status === "Pending Review" || inv.status === "On Hold";
                  return (
                    <tr key={inv.id}>
                      {/* ── Edit + Download buttons ── */}
                      <td>
                        <div className="actions-btn">
                          <button
                            className="btn btn-outline btn-sm"
                            style={{
                              padding: "3px 8px",
                              fontSize: 14,
                              opacity: canEdit ? 1 : 0.35,
                              cursor: canEdit ? "pointer" : "not-allowed",
                            }}
                            onClick={() => openEdit(inv)}
                            title={canEdit ? "Edit invoice details" : `Cannot edit — status is "${inv.status}"`}
                          >
                            ✏️
                          </button>
                          <DownloadDocsButton invoice={inv} />
                        </div>
                      </td>

                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{inv.id}</td>
                      <td style={{ fontWeight: 600 }}>{inv.vendor}</td>
                      <td style={{ color: "var(--text-muted)" }}>{inv.invoiceNo}</td>
                      <td><span className="receipt-date">{inv.dateOfReceipt}</span></td>
                      <td><span className={`age-chip ${getAgeClass(days)}`}>{days}d</span></td>
                      <td>{inv.department}</td>
                      <td className="amount-cell">₹{inv.amount?.toLocaleString("en-IN")}</td>
                      <td style={{ fontSize: 12 }}>
                        {inv.taxDetails
                          ? <span className="badge badge-gray">{inv.taxDetails}</span>
                          : <span style={{ color: "var(--text-muted)" }}>—</span>
                        }
                      </td>
                      <td>
                        <span className={`badge ${
                          inv.status === "Pending Review" ? "badge-blue"   :
                          inv.status === "On Hold"        ? "badge-yellow" :
                          inv.status === "Rejected"       ? "badge-red"    : "badge-cyan"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-row">
                          <button className="btn btn-success btn-sm" onClick={() => openAction(inv, "Accept")}>✅ Accept</button>
                          <button className="btn btn-danger btn-sm"  onClick={() => openAction(inv, "Reject")}>❌ Reject</button>
                          <button className="btn btn-warning btn-sm" onClick={() => openAction(inv, "Hold")}>⏸ Hold</button>
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

      {/* ════════════════════════════════════════════════════════
           APPROVE / REJECT / HOLD  MODAL
          ════════════════════════════════════════════════════════ */}
      {selected && action && !editTarget && (
        <div className="modal-overlay" onClick={closeAction}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {ACTION_ICONS[action]} {action} Invoice — {selected.invoiceNo}
              </span>
              <button className="close-btn" onClick={closeAction}>✕</button>
            </div>

            <div className="modal-body">
              {/* Invoice summary */}
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><span style={{ color: "var(--text-muted)" }}>Vendor: </span><strong>{selected.vendor}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Invoice No: </span><strong>{selected.invoiceNo}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Amount: </span><strong>₹{selected.amount?.toLocaleString("en-IN")}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Receipt: </span><strong style={{ color: "var(--accent)" }}>{selected.dateOfReceipt}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Tax Type: </span><strong>{selected.taxDetails || "—"}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Department: </span><strong>{selected.department}</strong></div>
                </div>
              </div>

              {/* Accept — GL Code + Expense Head */}
              {action === "Accept" && (
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">GL Code <span className="required">*</span></label>
                    <input
                      className="form-control"
                      value={formData.glCode}
                      onChange={(e) => setFormData((p) => ({ ...p, glCode: e.target.value }))}
                      placeholder="e.g. 5100"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expense Head <span className="required">*</span></label>
                    <input
                      className="form-control"
                      value={formData.expenseHead}
                      onChange={(e) => setFormData((p) => ({ ...p, expenseHead: e.target.value }))}
                      placeholder="e.g. Raw Material"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tax Type</label>
                    <select
                      className="form-control"
                      value={formData.taxDetails}
                      onChange={(e) => setFormData((p) => ({ ...p, taxDetails: e.target.value }))}
                    >
                      <option value="">— Select Tax Type —</option>
                      {TAX_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {action === "Reject" && (
                <div className="alert alert-danger" style={{ marginBottom: 12 }}>
                  ⚠️ Rejection reason is mandatory and will be sent to the uploader.
                </div>
              )}
              {action === "Hold" && (
                <div className="alert alert-warning" style={{ marginBottom: 12 }}>
                  ⏸ Invoice will be kept on hold. Please specify the reason below.
                </div>
              )}

              <div className="form-group" style={{ marginTop: action === "Accept" ? 14 : 0 }}>
                <label className="form-label">
                  Remarks {(action === "Reject" || action === "Hold") && <span className="required">*</span>}
                </label>
                <textarea
                  className="form-control"
                  value={formData.remarks}
                  onChange={(e) => setFormData((p) => ({ ...p, remarks: e.target.value }))}
                  placeholder={
                    action === "Reject" ? "Reason for rejection..." :
                    action === "Hold"   ? "Reason for hold..."      : "Optional remarks..."
                  }
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeAction}>Cancel</button>
              <button className={`btn ${ACTION_COLORS[action]}`} onClick={handleConfirm}>
                {ACTION_ICONS[action]} Confirm {action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
           FINANCE EDIT MODAL
           Calls PATCH /invoices/:id/finance/edit
           Allowed fields: invoiceNo, invoiceDate, amount, taxDetails, remarks
          ════════════════════════════════════════════════════════ */}
      {editTarget && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div
            className="modal"
            style={{ maxWidth: 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <span className="modal-title">✏️ Edit Invoice — {editTarget.invoiceNo}</span>
              <button className="close-btn" onClick={closeEdit}>✕</button>
            </div>

            <div className="modal-body">
              {/* Info banner */}
              <div style={{
                background: "#eff6ff", border: "1px solid #bfdbfe",
                borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                fontSize: 12, color: "#1e40af",
              }}>
                ℹ️ Finance can correct <strong>Invoice No., Invoice Date, Amount, Tax Type</strong> and add remarks.
                All changes are logged in the audit trail.
              </div>

              {/* Read-only context row */}
              <div style={{
                background: "#f8fafc", borderRadius: 8, padding: "10px 14px",
                marginBottom: 16, fontSize: 13,
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
              }}>
                <div><span style={{ color: "var(--text-muted)" }}>Vendor: </span><strong>{editTarget.vendor}</strong></div>
                <div><span style={{ color: "var(--text-muted)" }}>Department: </span><strong>{editTarget.department}</strong></div>
                <div><span style={{ color: "var(--text-muted)" }}>Date of Receipt: </span>
                  <strong style={{ color: "var(--accent)" }}>{editTarget.dateOfReceipt?.split?.("T")[0] || editTarget.dateOfReceipt}</strong>
                </div>
                <div><span style={{ color: "var(--text-muted)" }}>Current Status: </span>
                  <span className={`badge ${editTarget.status === "On Hold" ? "badge-yellow" : "badge-blue"}`}>
                    {editTarget.status}
                  </span>
                </div>
              </div>

              {/* Editable fields */}
              <div className="form-grid form-grid-2">

                {/* Invoice No */}
                <div className="form-group">
                  <label className="form-label">Invoice Number</label>
                  <input
                    name="invoiceNo"
                    className="form-control"
                    value={editForm.invoiceNo}
                    onChange={handleEditChange}
                    placeholder="e.g. TC-8821"
                  />
                  {editTarget.invoiceNo && editForm.invoiceNo !== editTarget.invoiceNo && (
                    <span style={{ fontSize: 11, color: "var(--warning)" }}>
                      Was: {editTarget.invoiceNo}
                    </span>
                  )}
                </div>

                {/* Invoice Date */}
                <div className="form-group">
                  <label className="form-label">Invoice Date</label>
                  <input
                    type="date"
                    name="invoiceDate"
                    className="form-control"
                    value={editForm.invoiceDate}
                    onChange={handleEditChange}
                  />
                  {editTarget.invoiceDate && editForm.invoiceDate !== editTarget.invoiceDate?.split("T")[0] && (
                    <span style={{ fontSize: 11, color: "var(--warning)" }}>
                      Was: {editTarget.invoiceDate?.split("T")[0]}
                    </span>
                  )}
                </div>

                {/* Amount */}
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    name="amount"
                    className="form-control"
                    value={editForm.amount}
                    onChange={handleEditChange}
                    placeholder="e.g. 50000"
                    min={1}
                  />
                  {editForm.amount !== "" && Number(editForm.amount) !== editTarget.amount && (
                    <span style={{ fontSize: 11, color: "var(--warning)" }}>
                      Was: ₹{editTarget.amount?.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                {/* Tax Type — dropdown, not free text */}
                <div className="form-group">
                  <label className="form-label">Tax Type</label>
                  <select
                    name="taxDetails"
                    className="form-control"
                    value={editForm.taxDetails}
                    onChange={handleEditChange}
                  >
                    <option value="">— Select Tax Type —</option>
                    {TAX_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {editTarget.taxDetails && editForm.taxDetails !== editTarget.taxDetails && (
                    <span style={{ fontSize: 11, color: "var(--warning)" }}>
                      Was: {editTarget.taxDetails}
                    </span>
                  )}
                </div>
              </div>

              {/* Remarks — full width */}
              {/* <div className="form-group" style={{ marginTop: 4 }}>
                <label className="form-label">Correction Remarks</label>
                <textarea
                  name="remarks"
                  className="form-control"
                  value={editForm.remarks}
                  onChange={handleEditChange}
                  placeholder="Reason for correction (e.g. wrong invoice number supplied by vendor)..."
                  rows={3}
                />
              </div> */}

              {/* Error message */}
              {editError && (
                <div className="alert alert-danger" style={{ marginTop: 8, fontSize: 13 }}>
                  ⚠️ {editError}
                </div>
              )}

              {/* Success — show what changed */}
              {editChanges.length > 0 && (
                <div className="alert alert-info" style={{ marginTop: 8, fontSize: 13 }}>
                  ✅ Saved successfully. Changes logged:
                  <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                    {editChanges.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeEdit} disabled={editLoading}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleEditSave}
                disabled={editLoading}
                style={{ minWidth: 120 }}
              >
                {editLoading ? "Saving…" : "💾 Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}