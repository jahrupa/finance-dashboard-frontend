import { useEffect, useState } from "react";
import { useInvoices } from "../context/InvoiceContext";
import { fetchPaymentApprovalInvoices, processPaymentAPI } from "../api/Service";

export default function PaymentProcessing() {
  const { getDaysPending } = useInvoices();
  const [selected, setSelected] = useState(null);
  const [bankRef, setBankRef] = useState("");
  const [filter, setFilter] = useState("pending");
  const [invoices, setInvoices] = useState([])
  const readyToPay = invoices.filter(i => i.paymentApprovalStatus === "Approved" && i.paymentStatus !== "Processed");
  const paid = invoices.filter(i => i.paymentStatus === "Processed");

  const displayed = filter === "pending" ? readyToPay : paid;

  const handleProcess = async () => {
    if (!bankRef.trim()) {
      alert("Bank Reference Number is required.");
      return;
    }
    try {
      await processPaymentAPI(selected.id, bankRef)

    }
    catch (error) {
      alert(error);
    }
    // processPayment(selected.id, bankRef);
    fetchPaymentApprovalInvoices();
    setSelected(null);
    setBankRef("");
  };

  const totalPending = readyToPay.reduce((s, i) => s + i.amount, 0);
  const totalPaid = paid.reduce((s, i) => s + i.amount, 0);

  const fmt = (n) => "₹" + n.toLocaleString("en-IN");

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
        <h1 className="page-title">Payment Processing Tracker</h1>
        <p className="page-subtitle">Process approved payments and record bank transactions</p>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Ready to Pay</div>
          <div className="kpi-value">{readyToPay.length}</div>
          <div className="kpi-meta">{fmt(totalPending)}</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Payments Processed</div>
          <div className="kpi-value">{paid.length}</div>
          <div className="kpi-meta">{fmt(totalPaid)} disbursed</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Overdue Payments</div>
          <div className="kpi-value">{readyToPay.filter(i => isOverdue(i.dueDate)).length}</div>
          <div className="kpi-meta">Past due date</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Avg Cycle Time</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>
            {paid.length ? (paid.reduce((s, i) => s + Math.floor((new Date(i.paymentDate) - new Date(i.dateOfReceipt)) / 86400000), 0) / paid.length).toFixed(0) + "d" : "—"}
          </div>
          <div className="kpi-meta">Receipt to payment</div>
        </div>
      </div>

      {readyToPay.length > 0 && (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          💳 {readyToPay.length} invoice(s) approved and ready for payment disbursement totalling {fmt(totalPending)}.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setFilter("pending")} className={`btn btn-sm ${filter === "pending" ? "btn-primary" : "btn-outline"}`}>
          Pending Payment ({readyToPay.length})
        </button>
        <button onClick={() => setFilter("paid")} className={`btn btn-sm ${filter === "paid" ? "btn-primary" : "btn-outline"}`}>
          Processed ({paid.length})
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">{filter === "pending" ? "💳 Ready for Payment" : "✅ Processed Payments"}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{displayed.length} records</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Vendor</th>
                <th>Department</th>
                <th>Amount (₹)</th>
                <th style={{ color: 'var(--accent)' }}>📅 Date of Receipt</th>
                <th>Due Date</th>
                <th>Payment Mode</th>
                <th>Priority</th>
                {filter === "paid" && <th>Payment Date</th>}
                {filter === "paid" && <th>Bank Ref</th>}
                {filter === "paid" && <th>Status</th>}
                {filter === "pending" && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <div className="empty-state">
                      <div className="empty-state-icon">{filter === "pending" ? "💤" : "📭"}</div>
                      <div className="empty-state-text">{filter === "pending" ? "No invoices ready for payment" : "No payments processed yet"}</div>
                    </div>
                  </td>
                </tr>
              ) : displayed.map(inv => {
                const overdue = isOverdue(inv.dueDate) && filter === "pending";
                return (
                  <tr key={inv.id} style={overdue ? { background: '#fff5f5' } : {}}>
                    <td>
                      {overdue && <span style={{ color: 'var(--danger)', marginRight: 4 }}>🚨</span>}
                      {inv.id}
                    </td>
                    <td style={{ fontWeight: 600 }}>{inv.vendor}</td>
                    <td>{inv.department}</td>
                    <td className="amount-cell">₹{inv.amount.toLocaleString("en-IN")}</td>
                    <td><span className="receipt-date">{inv.dateOfReceipt}</span></td>
                    <td style={{ color: overdue ? 'var(--danger)' : 'inherit', fontWeight: overdue ? 700 : 400 }}>
                      {inv.dueDate || "—"}
                    </td>
                    <td><span className="badge badge-cyan">{inv.paymentMode || "NEFT"}</span></td>
                    <td>
                      <span className={`badge ${inv.priority === "High" ? "badge-red" : inv.priority === "Normal" ? "badge-green" : "badge-gray"}`}>
                        {inv.priority || "Normal"}
                      </span>
                    </td>
                    {filter === "paid" && (
                      <>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>{inv.paymentDate}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{inv.bankRef}</td>
                        <td><span className="badge badge-green">✅ Processed</span></td>
                      </>
                    )}
                    {filter === "pending" && (
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => { setSelected(inv); setBankRef(""); }}>
                          💳 Process Payment
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Payment Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">💳 Process Payment — {selected.id}</span>
              <button className="close-btn" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Vendor: </span><strong>{selected.vendor}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Amount: </span><strong style={{ color: 'var(--success)', fontSize: 15 }}>₹{selected.amount.toLocaleString("en-IN")}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Payment Mode: </span><strong>{selected.paymentMode || "NEFT"}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Due Date: </span><strong>{selected.dueDate || "—"}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Date of Receipt: </span><strong style={{ color: 'var(--accent)' }}>{selected.dateOfReceipt}</strong></div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Bank Reference Number <span className="required">*</span></label>
                <input
                  className="form-control"
                  value={bankRef}
                  onChange={e => setBankRef(e.target.value)}
                  placeholder="e.g. HDFC2024010800821"
                  style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}
                />
              </div>
              <div style={{ marginTop: 12, padding: '8px 12px', background: '#fffbeb', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
                ⚠️ This action is irreversible. Ensure the bank reference number is correct before confirming.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleProcess}>✅ Confirm Payment Processed</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
