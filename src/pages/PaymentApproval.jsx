import { useEffect, useState } from "react";
import { useInvoices } from "../context/InvoiceContext";
import {
  fetchPaymentApprovalInvoices,
  paymentApprovalApprove,
  paymentApprovalHold,
  paymentApprovalReject,
  paymentApprovalSendBack,
} from "../api/Service";

export default function PaymentApproval() {
  const { paymentApprovalAction, getDaysPending } = useInvoices();
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null);
  const [formData, setFormData] = useState({
    paymentMode: "NEFT",
    priority: "Normal",
    remarks: "",
  });
  const [invoices, setInvoices] = useState([]);

  const pending = invoices.filter(
    (i) =>
      (i.hodStatus === "Approved" && i.status === "Payment Approval") ||
      i.status === "On Hold",
  );
  const approved = invoices.filter(
    (i) => i.paymentApprovalStatus === "Approved",
  );
  const held = invoices.filter((i) => i.paymentApprovalStatus === "Hold");

  const openAction = (inv, act) => {
    setSelected(inv);
    setAction(act);
    setFormData({
      paymentMode: inv.paymentMode || "NEFT",
      priority: inv.priority || "Normal",
      remarks: "",
    });
  };

  const handleConfirm = async () => {
    try {
      if (action === "Approve") {
        await paymentApprovalApprove(selected.id, formData);
      } else if (action === "Reject") {
        await paymentApprovalReject(selected.id, formData);
      } else if (action === "Hold") {
        await paymentApprovalHold(selected.id, formData);
      } else if (action === "Send Back") {
        await paymentApprovalSendBack(selected.id);
      }
      // Optional: refresh invoices after action
      const response = await fetchPaymentApprovalInvoices();
      setInvoices(response?.data || []);

      // Reset modal state
      setSelected(null);
      setAction(null);
    } catch (error) {
      alert(error);
    }
  };

  const getAgeClass = (days) => {
    if (days <= 3) return "age-green";
    if (days <= 7) return "age-yellow";
    if (days <= 15) return "age-orange";
    return "age-red";
  };

  const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date();

  useEffect(() => {
    const fetchFinanceInvoicesData = async () => {
      try {
        const response = await fetchPaymentApprovalInvoices();
        const data = response?.data || [];
        setInvoices(data);
      } catch {
        setInvoices([]);
      }
    };

    fetchFinanceInvoicesData();
  }, []);
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payment Approval Dashboard</h1>
        <p className="page-subtitle">
          Final authority approves invoices before payment processing
        </p>
      </div>

      <div
        className="kpi-grid"
        style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}
      >
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
          <div className="kpi-value">
            {pending.filter((i) => isOverdue(i.dueDate)).length}
          </div>
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
          🚨 {pending.filter((i) => isOverdue(i.dueDate)).length} invoice(s) are
          past their due date. Immediate action required.
        </div>
      )}

      {/* Pending Approval Table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">⏳ Awaiting Payment Approval</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {pending.length} invoices
          </span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Vendor</th>
                <th>Department</th>
                <th>Amount (₹)</th>
                <th style={{ color: "var(--accent)" }}>📅 Date of Receipt</th>
                <th>Due Date</th>
                <th>Days Pending</th>
                <th>GL Code</th>
                <th>Expense Head</th>
                <th>status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state">
                      <div className="empty-state-icon">✅</div>
                      <div className="empty-state-text">
                        No invoices pending payment approval
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                pending.map((inv) => {
                  const days = getDaysPending(inv.dateOfReceipt);
                  const overdue = isOverdue(inv.dueDate);
                  return (
                    <tr
                      key={inv.id}
                      style={overdue ? { background: "#fff5f5" } : {}}
                    >
                      <td>
                        {overdue && (
                          <span
                            style={{ color: "var(--danger)", marginRight: 4 }}
                          >
                            🚨
                          </span>
                        )}
                        {inv.id}
                      </td>
                      <td style={{ fontWeight: 600 }}>{inv.vendor}</td>
                      <td>{inv.department}</td>
                      <td className="amount-cell">
                        ₹{inv.amount.toLocaleString("en-IN")}
                      </td>
                      <td>
                        <span className="receipt-date">
                          {inv.dateOfReceipt}
                        </span>
                      </td>
                      <td
                        style={{
                          color: overdue ? "var(--danger)" : "inherit",
                          fontWeight: overdue ? 700 : 400,
                        }}
                      >
                        {inv.dueDate || "—"}
                      </td>
                      <td>
                        <span className={`age-chip ${getAgeClass(days)}`}>
                          {days}d
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {inv.glCode}
                      </td>
                      <td style={{ fontSize: 12 }}>{inv.expenseHead}</td>
                      <td style={{ fontSize: 12 }}>{inv.status}</td>
                      <td>
                        <div className="action-row">
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => openAction(inv, "Approve")}
                          >
                            ✅ Approve
                          </button>
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => openAction(inv, "Hold")}
                          >
                            ⏸ Hold
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => openAction(inv, "Reject")}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approved Table */}
      {approved.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">✅ Approved for Payment</span>
            <span className="badge badge-green">{approved.length}</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Vendor</th>
                  <th>Amount (₹)</th>
                  <th>Due Date</th>
                  <th>Payment Mode</th>
                  <th>Priority</th>
                  <th>Payment Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.id}</td>
                    <td style={{ fontWeight: 600 }}>{inv.vendor}</td>
                    <td className="amount-cell">
                      ₹{inv.amount.toLocaleString("en-IN")}
                    </td>
                    <td
                      style={{
                        color: isOverdue(inv.dueDate)
                          ? "var(--danger)"
                          : "inherit",
                      }}
                    >
                      {inv.dueDate || "—"}
                    </td>
                    <td>
                      <span className="badge badge-cyan">
                        {inv.paymentMode || "—"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${inv.priority === "High" ? "badge-red" : inv.priority === "Normal" ? "badge-green" : "badge-gray"}`}
                      >
                        {inv.priority || "Normal"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${inv.paymentStatus === "Processed" ? "badge-green" : "badge-blue"}`}
                      >
                        {inv.paymentStatus || "Pending"}
                      </span>
                    </td>
                    <td>
                      <div className="action-row">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openAction(inv, "Send Back")}
                        >
                          ↩ Send Back
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                {action === "Approve"
                  ? "✅ Approve Payment"
                  : action === "Hold"
                    ? "⏸ Hold Payment"
                    : "❌ Reject Invoice"}{" "}
                — {selected.id}
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
                    <span style={{ color: "var(--text-muted)" }}>Amount: </span>
                    <strong>₹{selected.amount.toLocaleString("en-IN")}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>
                      Due Date:{" "}
                    </span>
                    <strong>{selected.dueDate || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>
                      Receipt:{" "}
                    </span>
                    <strong style={{ color: "var(--accent)" }}>
                      {selected.dateOfReceipt}
                    </strong>
                  </div>
                </div>
              </div>

              {action === "Approve" && (
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      Payment Mode <span className="required">*</span>
                    </label>
                    <select
                      className="form-control"
                      value={formData.paymentMode}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          paymentMode: e.target.value,
                        }))
                      }
                    >
                      <option>NEFT</option>
                      <option>RTGS</option>
                      <option>Cheque</option>
                      <option>IMPS</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Priority</label>
                    <select
                      className="form-control"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, priority: e.target.value }))
                      }
                    >
                      <option>High</option>
                      <option>Normal</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">Remarks</label>
                <textarea
                  className="form-control"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, remarks: e.target.value }))
                  }
                  placeholder="Optional remarks..."
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
                className={`btn ${action === "Approve" ? "btn-success" : action === "Hold" ? "btn-warning" : "btn-danger"}`}
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
