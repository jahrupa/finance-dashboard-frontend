import { useState, useEffect } from "react";
import { useInvoices } from "../context/InvoiceContext";
import {
  createInvoice,
  deleteInvoice,
  downloadFile,
  fetchInvoiceById,
  fetchInvoices,
  updateInvoice,
} from "../api/Service";

// Base URL for document downloads — strip trailing slash
const DOC_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  "",
);

const STATUS_COLORS = {
  "Pending Review": "badge-blue",
  "Under Review": "badge-cyan",
  "HOD Approval": "badge-purple",
  "Payment Approval": "badge-yellow",
  "Ready for Payment": "badge-green",
  "On Hold": "badge-yellow",
  Rejected: "badge-red",
  Paid: "badge-green",
};

const EMPTY_FORM = {
  vendor: "",
  invoiceNo: "",
  invoiceDate: "",
  amount: "",
  department: "",
  uploadedBy: "",
  dueDate: "",
  taxDetails: "",
  remarks: "",
};

// Extract a display-friendly filename from a document path
// e.g. "6a04..._my-invoice.pdf"  →  "my-invoice.pdf"
const friendlyName = (docPath) => {
  if (!docPath) return "";
  const parts = docPath.split("_");
  return parts.length > 1 ? parts.slice(1).join("_") : docPath;
};

// Build a download URL for a stored document
const docDownloadUrl = (docPath) =>
  `${DOC_BASE_URL}/api/v1/invoices/document/${encodeURIComponent(docPath)}`;

export default function InvoiceSubmission() {
  const { getDaysPending, DEPARTMENTS, VENDORS } = useInvoices();

  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState({ dept: "", status: "", search: "" });
  const [submitted, setSubmitted] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [action, setAction] = useState({ edit: false, id: null });

  // Files the user picks to upload (NEW files)
  const [newFiles, setNewFiles] = useState([]);

  // Existing docs already saved on the server (for edit mode)
  // Array of doc path strings
  const [existingDocs, setExistingDocs] = useState([]);
  // Docs the user wants to remove (subset of existingDocs)
  const [docsToRemove, setDocsToRemove] = useState([]);

  // ─── Load invoices ───────────────────────────────────────────
  const loadInvoices = async () => {
    try {
      const res = await fetchInvoices();
      setInvoices(res?.data || []);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setInvoices([]);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // ─── Form input change ───────────────────────────────────────
  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // ─── Open Edit modal ─────────────────────────────────────────
  const handleEdit = async (id) => {
    try {
      const res = await fetchInvoiceById(id);
      const data = res?.data;
      if (!data) return;

      setForm({
        vendor: data.vendor || "",
        invoiceNo: data.invoiceNo || "",
        invoiceDate: data.invoiceDate?.split("T")[0] || "",
        amount: data.amount || "",
        department: data.department || "",
        uploadedBy: data.uploadedBy || "",
        dueDate: data.dueDate?.split("T")[0] || "",
        taxDetails: data.taxDetails || "",
        remarks: data.remarks || "",
      });

      // Normalise: documents may be array or single string
      const docs = Array.isArray(data.documents)
        ? data.documents
        : data.documentUrl
          ? [data.documentUrl]
          : [];

      setExistingDocs(docs);
      setDocsToRemove([]);
      setNewFiles([]);
      setAction({ edit: true, id });
      setShowForm(true);
    } catch (err) {
      console.error("Edit fetch error:", err);
    }
  };

  // ─── Toggle removal of an existing doc ──────────────────────
  const toggleRemoveDoc = (docPath) => {
    setDocsToRemove((prev) =>
      prev.includes(docPath)
        ? prev.filter((d) => d !== docPath)
        : [...prev, docPath],
    );
  };

  // ─── Remove a newly picked file ─────────────────────────────
  const removeNewFile = (index) =>
    setNewFiles((prev) => prev.filter((_, i) => i !== index));

  // ─── Submit / Update ─────────────────────────────────────────
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
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      newFiles.forEach((file) => formData.append("documents", file));

      // Tell the server which existing docs to keep / remove
      if (action.edit) {
        const keepDocs = existingDocs.filter((d) => !docsToRemove.includes(d));
        keepDocs.forEach((d) => formData.append("keepDocuments", d));
        docsToRemove.forEach((d) => formData.append("removeDocuments", d));
        await updateInvoice(action.id, formData);
      } else {
        await createInvoice(formData);
      }

      await loadInvoices();
      closeModal();
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      console.error("Submit error:", err);
    }
  };

  // ─── Delete invoice ──────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await deleteInvoice(id);
      await loadInvoices();
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Download a stored document ──────────────────────────────
  // Extract filename from stored path
const getFileName = (docPath) => {
  if (!docPath) return "";
  return docPath.split("/").pop();
};

const friendlyName = (docPath) => {
  if (!docPath) return "";
  const fileName = getFileName(docPath);
  const parts = fileName.split("_");
  return parts.length > 1 ? parts.slice(1).join("_") : fileName;
};

  // Build correct backend URL (IMPORTANT FIX)

const handleDownloadDoc = async (invoiceId, docPath) => {
  try {
    const fileName = getFileName(docPath);

    const response = await downloadFile(invoiceId, fileName);

    const blob = response.data; // Axios blob fix

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = friendlyName(docPath) || fileName || "document.pdf";

    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download error:", err);
    alert("Unable to download PDF");
  }
};
  // ─── Close modal ─────────────────────────────────────────────
  const closeModal = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setNewFiles([]);
    setExistingDocs([]);
    setDocsToRemove([]);
    setAction({ edit: false, id: null });
  };

  // ─── Filters ─────────────────────────────────────────────────
  const filtered = invoices.filter((inv) => {
    const matchDept = !filter.dept || inv.department === filter.dept;
    const matchStatus = !filter.status || inv.status === filter.status;
    const matchSearch =
      !filter.search ||
      inv.vendor?.toLowerCase().includes(filter.search.toLowerCase()) ||
      inv.invoiceNo?.toLowerCase().includes(filter.search.toLowerCase()) ||
      inv.id?.toLowerCase().includes(filter.search.toLowerCase());
    return matchDept && matchStatus && matchSearch;
  });

  const getAgeClass = (days) => {
    if (days <= 3) return "age-green";
    if (days <= 7) return "age-yellow";
    if (days <= 15) return "age-orange";
    return "age-red";
  };

  const allStatuses = [...new Set(invoices.map((i) => i.status))];

  // ─── Helpers ─────────────────────────────────────────────────
  // Get all docs for a row (for download icon tooltip / count)
  const getRowDocs = (inv) =>
    Array.isArray(inv.documents) && inv.documents.length
      ? inv.documents
      : inv.documentUrl
        ? [inv.documentUrl]
        : [];

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div>
      {/* HEADER */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1 className="page-title">Invoice Submission Tracker</h1>
          <p className="page-subtitle">
            Upload and track all invoices across departments
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm(EMPTY_FORM);
            setNewFiles([]);
            setExistingDocs([]);
            setDocsToRemove([]);
            setAction({ edit: false, id: null });
            setShowForm(true);
          }}
        >
          + Submit Invoice
        </button>
      </div>

      {/* SUCCESS */}
      {submitted && (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          ✅ Invoice {action?.edit ? "updated" : "submitted"} successfully!
        </div>
      )}

      {/* FILTERS */}
      <div className="filter-bar">
        <input
          className="form-control search-input"
          placeholder="🔍 Search vendor, invoice no, ID..."
          value={filter.search}
          onChange={(e) => setFilter((p) => ({ ...p, search: e.target.value }))}
        />
        <select
          className="form-control"
          value={filter.dept}
          onChange={(e) => setFilter((p) => ({ ...p, dept: e.target.value }))}
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          className="form-control"
          value={filter.status}
          onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          {allStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span
          style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}
        >
          {filtered.length} records
        </span>
      </div>

      {/* TABLE */}
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
                <th>📅 Date of Receipt</th>
                <th>Days Pending</th>
                <th>Department</th>
                <th>Amount (₹)</th>
                <th>Uploaded By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    No invoices found
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const days = getDaysPending(inv.dateOfReceipt);
                  const ageClass = getAgeClass(days);
                  const rowDocs = getRowDocs(inv);

                  return (
                    <tr key={inv.id}>
                      <td>
                        <div className="actions-btn">
                          {/* Edit */}
                          <button
                            className="edit-btn"
                            onClick={() => handleEdit(inv.id)}
                            title="Edit invoice"
                          >
                            ✏️
                          </button>

                          {/* Download — only shown when at least one doc exists */}
                          {/* {rowDocs.length > 0 && (
                            <button
                              className="download-doc-btn"
                              title={`Download ${rowDocs.length > 1 ? rowDocs.length + " documents" : friendlyName(rowDocs[0])}`}
                              onClick={() => {
                                // Download all docs for this row
                                rowDocs.forEach((doc, i) => {
                                  setTimeout(() => {
                                    handleDownloadDoc(inv.id, doc);
                                  }, i * 300);
                                });
                              }}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                              {rowDocs.length > 1 && (
                                <span className="doc-count-badge">
                                  {rowDocs.length}
                                </span>
                              )}
                            </button>
                          )} */}

                          {/* Delete */}
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(inv.id)}
                            title="Delete invoice"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                      <td>{inv.id}</td>
                      <td style={{ fontWeight: 600 }}>{inv.vendor}</td>
                      <td>{inv.invoiceNo}</td>
                      <td>{inv.invoiceDate}</td>
                      <td>
                        {inv.dateOfReceipt?.split("T")[0] || inv.dateOfReceipt}
                      </td>
                      <td>
                        <span className={`age-chip ${ageClass}`}>{days}d</span>
                      </td>
                      <td>{inv.department}</td>
                      <td>₹{Number(inv.amount).toLocaleString("en-IN")}</td>
                      <td>{inv.uploadedBy}</td>
                      <td>
                        <span
                          className={`badge ${STATUS_COLORS[inv.status] || "badge-gray"}`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL ───────────────────────────────────────────────── */}
      {showForm && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              {action?.edit ? "Edit Invoice" : "Submit New Invoice"}
              <button className="close-btn" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid form-grid-2">
                {/* Vendor */}
                <div className="form-group">
                  <label className="form-label">Vendor Name *</label>
                  <input
                    name="vendor"
                    className="form-control"
                    value={form.vendor}
                    onChange={handleChange}
                    placeholder="e.g. TechCorp Solutions"
                    list="vendor-list"
                  />
                  <datalist id="vendor-list">
                    {VENDORS.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </div>

                {/* Invoice No */}
                <div className="form-group">
                  <label className="form-label">Invoice Number *</label>
                  <input
                    name="invoiceNo"
                    className="form-control"
                    placeholder="e.g. TC-8821"
                    value={form.invoiceNo}
                    onChange={handleChange}
                  />
                </div>

                {/* Invoice Date */}
                <div className="form-group">
                  <label className="form-label">Invoice Date *</label>
                  <input
                    type="date"
                    name="invoiceDate"
                    className="form-control"
                    value={form.invoiceDate}
                    onChange={handleChange}
                  />
                </div>

                {/* Amount */}
                <div className="form-group">
                  <label className="form-label">Invoice Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    className="form-control"
                    placeholder="e.g. 50000"
                    value={form.amount}
                    onChange={handleChange}
                  />
                </div>

                {/* Department */}
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select
                    name="department"
                    className="form-control"
                    value={form.department}
                    onChange={handleChange}
                  >
                    <option value="">-- Select Department --</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Uploaded By */}
                <div className="form-group">
                  <label className="form-label">Uploaded By *</label>
                  <input
                    name="uploadedBy"
                    className="form-control"
                    placeholder="Your name"
                    value={form.uploadedBy}
                    onChange={handleChange}
                  />
                </div>

                {/* Due Date */}
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    className="form-control"
                    value={form.dueDate}
                    onChange={handleChange}
                  />
                </div>

                {/* Tax */}
                <div className="form-group">
                  <label className="form-label">Tax Details</label>
                  <input
                    name="taxDetails"
                    className="form-control"
                    placeholder="e.g. GST 18%"
                    value={form.taxDetails}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* ── EXISTING DOCUMENTS (edit mode only) ──────────── */}
              {action.edit && existingDocs.length > 0 && (
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">
                    Existing Documents
                    <span
                      style={{
                        fontWeight: 400,
                        color: "var(--text-muted)",
                        marginLeft: 6,
                      }}
                    >
                      (click ✕ to mark for removal)
                    </span>
                  </label>
                  <div className="doc-chip-list">
                    {existingDocs.map((doc) => {
                      const markedForRemoval = docsToRemove.includes(doc);
                      return (
                        <div
                          key={doc}
                          className={`doc-chip ${markedForRemoval ? "doc-chip-removed" : "doc-chip-existing"}`}
                        >
                          {/* Download existing doc */}
                          <button
                            className="doc-chip-download"
                            onClick={() => handleDownloadDoc(doc.id, doc)}
                            title={`Download ${friendlyName(doc)}`}
                            type="button"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </button>

                          <span className="doc-chip-name" title={doc}>
                            📄 {friendlyName(doc)}
                          </span>

                          {/* Toggle removal */}
                          <button
                            className="doc-chip-remove"
                            onClick={() => toggleRemoveDoc(doc)}
                            title={
                              markedForRemoval
                                ? "Undo removal"
                                : "Remove this document"
                            }
                            type="button"
                          >
                            {markedForRemoval ? "↩" : "✕"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {docsToRemove.length > 0 && (
                    <p className="doc-remove-warning">
                      ⚠ {docsToRemove.length} document
                      {docsToRemove.length > 1 ? "s" : ""} will be removed on
                      save.
                    </p>
                  )}
                </div>
              )}

              {/* ── NEW FILE PICKER ───────────────────────────────── */}
              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">
                  {action.edit ? "Add More Documents" : "Supporting Documents"}
                </label>
                <input
                  type="file"
                  multiple
                  accept="application/pdf"
                  className="form-control"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files);
                    const valid = selected.filter(
                      (f) => f.type === "application/pdf",
                    );
                    if (valid.length !== selected.length)
                      alert("Only PDF files allowed");
                    setNewFiles((prev) => {
                      // Avoid duplicate filenames
                      const existingNames = new Set(prev.map((f) => f.name));
                      return [
                        ...prev,
                        ...valid.filter((f) => !existingNames.has(f.name)),
                      ];
                    });
                    // Reset input so same file can be re-picked after removal
                    e.target.value = "";
                  }}
                />
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 4,
                  }}
                >
                  Only PDF files · Multiple allowed
                </p>

                {/* Chips for newly picked files */}
                {newFiles.length > 0 && (
                  <div className="doc-chip-list" style={{ marginTop: 8 }}>
                    {newFiles.map((file, idx) => (
                      <div key={idx} className="doc-chip doc-chip-new">
                        <span className="doc-chip-name" title={file.name}>
                          📄 {file.name}
                          <span
                            style={{
                              fontSize: 10,
                              opacity: 0.7,
                              marginLeft: 4,
                            }}
                          >
                            ({(file.size / 1024).toFixed(0)} KB)
                          </span>
                        </span>
                        <button
                          className="doc-chip-remove"
                          onClick={() => removeNewFile(idx)}
                          title="Remove this file"
                          type="button"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* REMARKS */}
              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">Remarks</label>
                <textarea
                  name="remarks"
                  className="form-control"
                  value={form.remarks}
                  onChange={handleChange}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>

              {/* Date of receipt info */}
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  background: "#f8fafc",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                  }}
                >
                  📅 Date of Receipt:{" "}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--accent)",
                  }}
                >
                  {new Date().toISOString().split("T")[0]}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginLeft: 8,
                  }}
                >
                  (Auto-captured · Non-editable)
                </span>
              </div>
            </div>

            {/* FOOTER */}
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                {action?.edit ? "Update Invoice" : "Submit Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
