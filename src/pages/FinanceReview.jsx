import { useState } from "react";
import { useInvoices } from "../context/InvoiceContext";
import { fetchFinanceInvoices, financeAccept, financeHold, financePending, financeReject } from "../api/Service";
import { useEffect } from "react";

export default function FinanceReview() {
  const { financeAction, getDaysPending, getAgingBucket } =
    useInvoices();
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null); // "Accept" | "Reject" | "Hold"
  const [formData, setFormData] = useState({
    glCode: "",
    expenseHead: "",
    taxDetails: "",
    remarks: ""
  });
  const [invoices, setInvoices] = useState([])
  const [filter, setFilter] = useState("all");
  console.log(formData, "formData");
  const reviewable = invoices.filter(
    (i) =>
      i.status === "Pending Review" ||
      (filter === "all" &&
        ["Pending Review", "Under Review", "On Hold"].includes(i.status)),
  );
  const displayInvoices =
    filter === "all"
      ? invoices
      : invoices.filter((i) => i.status === "Pending Review");
console.log(displayInvoices,'displayInvoices')
  const openAction = (inv, act) => {
    setSelected(inv);
    setAction(act);
    setFormData({
      glCode: inv.glCode || "",
      expenseHead: inv.expenseHead || "",
      taxDetails: inv.taxDetails || "",
      remarks: inv.remarks || "",
    });
  };

  const handleConfirm = async () => {
    if (!selected?.id) return;

    try {
      // Reject validation
      if (action === "Reject" && !formData.remarks) {
        alert("Rejection reason is mandatory.");
        return;
      }

      // Accept validation
      if (action === "Accept" && (!formData.glCode || !formData.expenseHead)) {
        alert("GL Code and Expense Head are required before accepting.");
        return;
      }

      let response;
      if (action === "Accept") {
        response = await financeAccept(selected.id, formData);
      }

      if (action === "Reject") {
        response = await financeReject(selected.id, formData);
      }

      if (action === "Hold") {
        response = await financeHold(selected.id, formData);
      }
      if (action === 'Pending') {
        response = await financePending(selected.id, formData);
      }
      const data = await fetchFinanceInvoices();
      setInvoices(data?.data || [])
      setSelected(null);
      setAction(null);
    } catch (error) {
      console.error("Finance Action Error:", error);
      alert(error);
    }
  };

  const getAgeClass = (days) => {
    if (days <= 3) return "age-green";
    if (days <= 7) return "age-yellow";
    if (days <= 15) return "age-orange";
    return "age-red";
  };

  const actionColors = {
    Accept: "btn-success",
    Reject: "btn-danger",
    Hold: "btn-warning",
  };
  const actionIcons = { Accept: "✅", Reject: "❌", Hold: "⏸" };

  const pendingCount = invoices.filter(
    (i) => i.status === "Pending Review",
  ).length;
  const holdCount = invoices.filter((i) => i.status === "On Hold").length;
  useEffect(() => {
    const fetchFinanceInvoicesData = async () => {
      try {
        const response = await fetchFinanceInvoices();
        const data = response?.data || [];
        setInvoices(data);
      } catch {
        setInvoices([]);
      }
    };

    fetchFinanceInvoicesData(); // ✅ Call function here (outside definition)
  }, []);
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Finance Review Dashboard</h1>
        <p className="page-subtitle">
          Review, accept, reject or hold incoming invoices
        </p>
      </div>

      <div
        className="kpi-grid"
        style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}
      >
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
          <div className="kpi-value">
            {invoices.filter((i) => i.financeStatus === "Accepted").length}
          </div>
          <div className="kpi-meta">Moved to approval</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Rejected</div>
          <div className="kpi-value">
            {invoices.filter((i) => i.financeStatus === "Rejected").length}
          </div>
          <div className="kpi-meta">Returned to vendor</div>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          ⚠️ {pendingCount} invoice(s) are pending your review. SLA breach may
          occur for older invoices.
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          ["all", "All Active"],
          ["pending", "Pending Only"],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`btn ${filter === val ? "btn-primary" : "btn-outline"} btn-sm`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Invoice Queue</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {invoices.length} invoices
          </span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Vendor</th>
                <th>Invoice No.</th>
                <th style={{ color: "var(--accent)" }}>📅 Date of Receipt</th>
                <th>Days</th>
                <th>Department</th>
                <th>Amount (₹)</th>
                <th>Tax</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🎉</div>
                      <div className="empty-state-text">
                        All invoices reviewed!
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayInvoices.map((inv) => {
                  const days = getDaysPending(inv.dateOfReceipt);
                  const isPending = inv.status === "Pending Review";
                  return (
                    <tr key={inv.id}>
                      <td>{inv.id}</td>
                      <td style={{ fontWeight: 600 }} className="space-remove">{inv.vendor}</td>
                      <td style={{ color: "var(--text-muted)" }}>
                        {inv.invoiceNo}
                      </td>
                      <td>
                        <span className="receipt-date">
                          {inv.dateOfReceipt}
                        </span>
                      </td>
                      <td>
                        <span className={`age-chip ${getAgeClass(days)}`}>
                          {days}d
                        </span>
                      </td>
                      <td>{inv.department}</td>
                      <td className="amount-cell">
                        ₹{inv.amount.toLocaleString("en-IN")}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {inv.taxDetails || "—"}
                      </td>
                      <td>
                        <span
                          className={`badge ${inv.status === "Pending Review" ? "badge-blue" : inv.status === "On Hold" ? "badge-yellow" : inv.status === "Rejected" ? "badge-red" : "badge-cyan"}`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        {/* {isPending ? ( */}
                        <div className="action-row">
                          {inv.financeStatus !== "Accepted" && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => openAction(inv, "Accept")}
                            >
                              ✅ Accept
                            </button>
                          )}

                          {inv.financeStatus !== "Rejected" && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => openAction(inv, "Reject")}
                            >
                              ❌ Reject
                            </button>
                          )}

                          {inv.financeStatus !== "Hold" && (
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => openAction(inv, "Hold")}
                            >
                              ⏸ Hold
                            </button>
                          )}

                          {inv.status !== "Pending Review" && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => openAction(inv, "Pending")}
                            >
                              🔄 Pending
                            </button>
                          )}
                        </div>
                        {/* ) : (
                          <span
                            style={{ fontSize: 12, color: "var(--text-muted)" }}
                          >
                            {inv.financeStatus || "—"}
                          </span>
                        )} */}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
      {selected && action && (
        <div
          className="modal-overlay"
          onClick={() => {
            setSelected(null);
            setAction(null);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {actionIcons[action]} {action} Invoice — {selected.id}
              </span>
              <button
                className="close-btn"
                onClick={() => {
                  setSelected(null);
                  setAction(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: 16,
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Vendor: </span>
                    <strong>{selected.vendor}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>
                      Invoice No:{" "}
                    </span>
                    <strong>{selected.invoiceNo}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Amount: </span>
                    <strong>₹{selected.amount.toLocaleString("en-IN")}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>
                      Receipt Date:{" "}
                    </span>
                    <strong style={{ color: "var(--accent)" }}>
                      {selected.dateOfReceipt}
                    </strong>
                  </div>
                </div>
              </div>

              {action === "Accept" && (
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      GL Code <span className="required">*</span>
                    </label>
                    <input
                      className="form-control"
                      value={formData.glCode}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, glCode: e.target.value }))
                      }
                      placeholder="e.g. 5100"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Expense Head <span className="required">*</span>
                    </label>
                    <input
                      className="form-control"
                      value={formData.expenseHead}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          expenseHead: e.target.value,
                        }))
                      }
                      placeholder="e.g. Raw Material"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tax Details</label>
                    <input
                      className="form-control"
                      value={formData.taxDetails}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          taxDetails: e.target.value,
                        }))
                      }
                      placeholder="e.g. GST 18%"
                    />
                  </div>
                </div>
              )}

              {action === "Reject" && (
                <div className="alert alert-danger">
                  ⚠️ Rejection reason is mandatory and will be sent to the
                  uploader.
                </div>
              )}
              {action === "Hold" && (
                <div className="alert alert-warning">
                  ⏸ Invoice will be kept on hold. Please specify the reason
                  below.
                </div>
              )}

              <div
                className="form-group"
                style={{ marginTop: action === "Accept" ? 14 : 0 }}
              >
                <label className="form-label">
                  Remarks{" "}
                  {(action === "Reject" || action === "Hold") && (
                    <span className="required">*</span>
                  )}
                </label>
                <textarea
                  className="form-control"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, remarks: e.target.value }))
                  }
                  placeholder={
                    action === "Reject"
                      ? "Reason for rejection (mandatory)..."
                      : action === "Hold"
                        ? "Reason for hold..."
                        : "Optional remarks..."
                  }
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setSelected(null);
                  setAction(null);
                }}
              >
                Cancel
              </button>
              <button
                className={`btn ${actionColors[action]}`}
                onClick={handleConfirm}
              >
                {actionIcons[action]} Confirm {action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
