import { useState } from "react";
import { useInvoices } from "../context/InvoiceContext";
import { createInvoice, deleteInvoice, fetchInvoiceById, fetchInvoices, updateInvoice } from "../api/Service";
import { useEffect } from "react";

const STATUS_COLORS = {
  "Pending Review": "badge-blue",
  "Under Review": "badge-cyan",
  "HOD Approval": "badge-purple",
  "Payment Approval": "badge-yellow",
  "Ready for Payment": "badge-green",
  "On Hold": "badge-yellow",
  "Rejected": "badge-red",
  "Paid": "badge-green",
};

const EMPTY_FORM = {
  vendor: "", invoiceNo: "", invoiceDate: "", amount: "",
  department: "", uploadedBy: "", dueDate: "", taxDetails: "", remarks: ""
};

export default function InvoiceSubmission() {
  const { addInvoice, getDaysPending, getAgingBucket, DEPARTMENTS, VENDORS } = useInvoices();
  const [form, setForm] = useState(EMPTY_FORM);
  console.log(form,'form')
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState({ dept: "", status: "", search: "" });
  const [submitted, setSubmitted] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [action, setAction] = useState({
    edit: false,
    delete: false
  })
  console.log(invoices, 'invoices')
  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (
      !form.vendor ||
      !form.invoiceNo ||
      !form.invoiceDate ||
      !form.amount ||
      !form.department ||
      !form.uploadedBy
    ) {
      alert("Please fill all required fields.");
      return;
    }

    const payload = {
      invoiceNo: form.invoiceNo,
      vendor: form.vendor,
      invoiceDate: form.invoiceDate,
      department: form.department,
      uploadedBy: form.uploadedBy,
      amount: Number(form.amount),
      dueDate: form.dueDate,
      taxDetails: form.taxDetails,
      remarks: form.remarks
    };

    try {
      let response;

      if (action?.edit && action?.id) {
        // ✅ UPDATE
        response = await updateInvoice(action.id, payload);

        // update local state properly
        setInvoices(prev =>
          prev.map(inv =>
            inv._id === action.id ? response.data : inv
          )
        );

        setAction({ edit: false, delete: false });

      } else {
        // ✅ CREATE
        response = await createInvoice(payload);

        // add new invoice to list
        setInvoices(prev => [...prev, response.data]);
      }

      // reset form
      setForm(EMPTY_FORM);
      setShowForm(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);

    } catch (error) {
      console.error("Submission error:", error?.response?.data || error.message);
    }
  };
const handleDelete = async (id) => {
  try {
    await deleteInvoice(id);
    setInvoices(prev => prev.filter(inv => inv._id !== id));
  } catch (err) {
    console.error(err);
  }
};
  const filtered = invoices.filter(inv => {
    const matchDept = !filter.dept || inv.department === filter.dept;
    const matchStatus = !filter.status || inv.status === filter.status;
    const matchSearch = !filter.search || inv.vendor.toLowerCase().includes(filter.search.toLowerCase()) || inv.invoiceNo.toLowerCase().includes(filter.search.toLowerCase()) || inv.id.toLowerCase().includes(filter.search.toLowerCase());
    return matchDept && matchStatus && matchSearch;
  });

  const getAgeClass = (days) => {
    if (days <= 3) return "age-green";
    if (days <= 7) return "age-yellow";
    if (days <= 15) return "age-orange";
    return "age-red";
  };

  const allStatuses = [...new Set(invoices.map(i => i.status))];
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (action?.edit && action?.id) {
          const response = await fetchInvoiceById(action.id);
          const data = response?.data;

          if (data) {
            // API → Form field mapping
            setForm({
              vendor: data.vendor || "",
              invoiceNo: data.invoiceNo || "",
              invoiceDate: data.invoiceDate?.split("T")[0] || "",
              amount: data.amount || "",
              department: data.department || "",
              uploadedBy: data.uploadedBy || "",
              dueDate: data.dueDate?.split("T")[0] || "",
              taxDetails: data.taxDetails || "",
              remarks: data.remarks || ""
            });

            setShowForm(true);
          }
        } else {
          const response = await fetchInvoices();
          setInvoices(response?.data || []);
        }
      } catch (error) {
        console.error("Error fetching invoices:", error);
        setInvoices([]);
      }
    };

    fetchData();
  }, [action?.edit, action?.id]);
  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Invoice Submission Tracker</h1>
          <p className="page-subtitle">Upload and track all invoices across departments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Submit Invoice
        </button>
      </div>

      {submitted && (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          ✅ Invoice submitted successfully! Finance team has been notified.
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <input
          className="form-control search-input"
          placeholder="🔍 Search vendor, invoice no, ID..."
          value={filter.search}
          onChange={e => setFilter(p => ({ ...p, search: e.target.value }))}
        />
        <select className="form-control" value={filter.dept} onChange={e => setFilter(p => ({ ...p, dept: e.target.value }))}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select className="form-control" value={filter.status} onChange={e => setFilter(p => ({ ...p, status: e.target.value }))}>
          <option value="">All Statuses</option>
          {allStatuses.map(s => <option key={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>{filtered.length} records</span>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Invoice ID</th>
                <th>Vendor</th>
                <th>Invoice No.</th>
                <th>Invoice Date</th>
                <th style={{ color: 'var(--accent)' }}>📅 Date of Receipt</th>
                <th>Days Pending</th>
                <th>Department</th>
                <th>Amount (₹)</th>
                <th>Uploaded By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No invoices found</td></tr>
              ) : filtered.map(inv => {
                const days = getDaysPending(inv.dateOfReceipt);
                const ageClass = getAgeClass(days);
                return (
                  <tr key={inv.id}>
                    <td>
                      <div className="actions-btn">
                        <button className="edit-btn" onClick={() => {
                          setShowForm(true);
                          setAction({ edit: true, id: inv.id })
                        }
                        } >✏️</button>
                        <button className="delete-btn" onClick={() => handleDelete(inv.id)} >🗑️</button>
                      </div>
                    </td>
                    <td>{inv.id}</td>
                    <td style={{ fontWeight: 600 }} className="space-remove">{inv.vendor}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{inv.invoiceNo}</td>
                    <td>{inv.invoiceDate}</td>
                    <td><span className="receipt-date">{inv.dateOfReceipt}</span></td>
                    <td>
                      <span className={`age-chip ${ageClass}`}>{days}d</span>
                    </td>
                    <td>{inv.department}</td>
                    <td className="amount-cell">₹{inv.amount.toLocaleString("en-IN")}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{inv.uploadedBy}</td>
                    <td><span className={`badge ${STATUS_COLORS[inv.status] || 'badge-gray'}`}>{inv.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Invoice Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              {action?.edit ? "Edit Invoice" : "Submit New Invoice"}
              <button className="close-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info">
                📌 Date of Receipt will be auto-captured as today's date and cannot be modified.
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Vendor Name <span className="required">*</span></label>
                  <input name="vendor" className="form-control" value={form.vendor} onChange={handleChange} placeholder="e.g. TechCorp Solutions" list="vendor-list" />
                  <datalist id="vendor-list">{VENDORS.map(v => <option key={v} value={v} />)}</datalist>
                </div>
                <div className="form-group">
                  <label className="form-label">Invoice Number <span className="required">*</span></label>
                  <input name="invoiceNo" className="form-control" value={form.invoiceNo} onChange={handleChange} placeholder="e.g. TC-8821" />
                </div>
                <div className="form-group">
                  <label className="form-label">Invoice Date <span className="required">*</span></label>
                  <input type="date" name="invoiceDate" className="form-control" value={form.invoiceDate} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Invoice Amount (₹) <span className="required">*</span></label>
                  <input type="number" name="amount" className="form-control" value={form.amount} onChange={handleChange} placeholder="e.g. 50000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Department <span className="required">*</span></label>
                  <select name="department" className="form-control" value={form.department} onChange={handleChange}>
                    <option value="">-- Select Department --</option>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Uploaded By <span className="required">*</span></label>
                  <input name="uploadedBy" className="form-control" value={form.uploadedBy} onChange={handleChange} placeholder="Your name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" name="dueDate" className="form-control" value={form.dueDate} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tax Details</label>
                  <input name="taxDetails" className="form-control" value={form.taxDetails} onChange={handleChange} placeholder="e.g. GST 18%" />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">Supporting Document</label>
                <input type="file" className="form-control" accept=".pdf,.jpg,.png" />
              </div>
              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">Remarks</label>
                <textarea name="remarks" className="form-control" value={form.remarks} onChange={handleChange} placeholder="Any additional notes..." rows={3} />
              </div>
              <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>📅 Date of Receipt: </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{new Date().toISOString().split("T")[0]}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>(Auto-captured · Non-editable)</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}> {action?.edit ? "Update Invoice" : "Submit Invoice"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
