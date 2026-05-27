import { useState, useEffect } from "react";
import { useInvoices } from "../context/InvoiceContext";
import { useAuth } from "../context/AuthContext";
import {
  createInvoice,
  deleteInvoice,
  downloadFile,
  downloadZipFile,
  fetchInvoiceById,
  fetchInvoices,
  updateInvoice,
} from "../api/Service";
import SearchBar from "../components/ui/SearchBar";
import FilterSelect from "../components/ui/FilterSelect";
import Pagination from "../components/ui/Pagination";
import usePagination from "../components/ui/usePagination";

// Base URL for document downloads — strip trailing slash


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
const TAX_TYPE_OPTIONS = [
  { value: "GST Invoice",      label: "GST Invoice"      },
  { value: "Non GST Invoice",  label: "Non GST Invoice"  },
  { value: "Proforma Invoice", label: "Proforma Invoice" },
  { value: "Advance Voucher",  label: "Advance Voucher"  },
];
// ── Filename helpers (module-level) ──────────────────────────
// Extract just the filename from a stored path (no subdirs expected, but safe)
const getFileName = (docPath) => {
  if (!docPath) return "";
  return docPath.split("/").pop();            // handles "folder/file.pdf" or "file.pdf"
};

// "1779183565_file-sample_150kB.pdf"  →  "file-sample_150kB.pdf"
const friendlyName = (docPath) => {
  const fileName = getFileName(docPath);
  if (!fileName) return "";
  // filename format: <timestamp/id>_<original_name>
  const underscore = fileName.indexOf("_");
  return underscore !== -1 ? fileName.slice(underscore + 1) : fileName;
};


export default function InvoiceSubmission({ userDepartment = null, isAdmin = true }) {
  const { getDaysPending, DEPARTMENTS, VENDORS } = useInvoices();
  // Issue 3 fix: get logged-in user to auto-fill uploadedBy and department
  const { user } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  // Issue 3 fix: auto-populate uploadedBy and department whenever user changes or form opens
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        uploadedBy: user.name || prev.uploadedBy,
        // Non-admins are locked to their own department
        department: (!isAdmin && user.department) ? user.department : prev.department,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, showForm]);

  // If a non-admin user has a department, lock the dept filter to their department
  const [filter, setFilter] = useState({ dept: userDepartment || "", status: "", search: "", fromDate: "", toDate: "" });
  const { page, pageSize, setPage, setPageSize, resetPage, paginate } = usePagination(10);
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
  const loadInvoices = async (f = filter) => {
    try {
      const params = {};
      // Non-admin users are always scoped to their department
      const dept = (!isAdmin && userDepartment) ? userDepartment : f.dept;
      if (dept)       params.department = dept;
      if (f.status)   params.status     = f.status;
      if (f.search)   params.search     = f.search;
      if (f.fromDate) params.fromDate   = f.fromDate;
      if (f.toDate)   params.toDate     = f.toDate;
      const res = await fetchInvoices(params);
      setInvoices(res?.data || []);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setInvoices([]);
    }
  };
useEffect(() => {
  let isMounted = true;

  const fetchData = async () => {
    try {
      const res = await fetchInvoices();
      if (isMounted) {
        setInvoices(res?.data || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      if (isMounted) {
        setInvoices([]);
      }
    }
  };

  fetchData();

  return () => {
    isMounted = false;
  };
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

  // ─── Download documents — single file or zip (multiple) ─────
  const handleDownloadDoc = async (invoiceId, docPath) => {
    const fileName = getFileName(docPath);
    if (!fileName) return;
    try {
      const response = await downloadFile(invoiceId, fileName);
      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/octet-stream",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = friendlyName(docPath) || fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("Unable to download document. Please try again.");
    }
  };

  // Download all docs for an invoice as a ZIP
const handleDownloadZip = async (invoiceId) => {
  if (!invoiceId || typeof invoiceId !== "string") {
    console.error("Invalid invoiceId:", invoiceId);
    return;
  }

  try {
    const response = await downloadZipFile(invoiceId);

    const blob = new Blob([response.data], {
      type: "application/zip",
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-documents.zip`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("ZIP download error:", err);
    alert("Unable to download ZIP file.");
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
    const matchDept   = !filter.dept   || inv.department === filter.dept;
    const matchStatus = !filter.status || inv.status     === filter.status;
    const matchSearch =
      !filter.search ||
      inv.vendor?.toLowerCase().includes(filter.search.toLowerCase()) ||
      inv.invoiceNo?.toLowerCase().includes(filter.search.toLowerCase()) ||
      inv.id?.toLowerCase().includes(filter.search.toLowerCase());
    // Date range: compare invoice_date string lexicographically (ISO format)
    const invDate     = inv.invoiceDate ? inv.invoiceDate.split("T")[0] : "";
    const matchFrom   = !filter.fromDate || (invDate && invDate >= filter.fromDate);
    const matchTo     = !filter.toDate   || (invDate && invDate <= filter.toDate);
    return matchDept && matchStatus && matchSearch && matchFrom && matchTo;
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
            {userDepartment && !isAdmin
              ? `Showing invoices for your department: ${userDepartment}`
              : "Upload and track all invoices across departments"}
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
        <SearchBar
          // className="form-control search-input"
          placeholder="🔍 Search vendor, invoice no, ID..."
          value={filter.search}
          onChange={(v) => { setFilter((p) => ({ ...p, search: v })); resetPage(); }}

        // value={filter.search}
        // onChange={(v) => { setFilter((p) => ({ ...p, search: v })); resetPage(); }}
        // placeholder="Search vendor, invoice no, ID..."
        // className="form-control search-input"
        />
        <FilterSelect
          value={filter.dept}
          onChange={(v) => { if (!userDepartment || isAdmin) { setFilter((p) => ({ ...p, dept: v })); resetPage(); } }}
          options={DEPARTMENTS}
          placeholder={userDepartment && !isAdmin ? `Dept: ${userDepartment}` : "All Departments"}
          className="form-control"
          disabled={!isAdmin && Boolean(userDepartment)}
        />
        <FilterSelect
          value={filter.status}
          onChange={(v) => { setFilter((p) => ({ ...p, status: v })); resetPage(); }}
          options={allStatuses}
          placeholder="All Statuses"
        />
        {/* ── Date range pickers ─────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>From</span>
          <input
            type="date"
            className="form-control"
            style={{ width: 145, fontSize: 13 }}
            value={filter.fromDate}
            max={filter.toDate || new Date().toISOString().split("T")[0]}
            onChange={(e) => {
              const v = e.target.value;
              setFilter((p) => ({ ...p, fromDate: v }));
              resetPage();
            }}
          />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>To</span>
          <input
            type="date"
            className="form-control"
            style={{ width: 145, fontSize: 13 }}
            value={filter.toDate}
            min={filter.fromDate || undefined}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => {
              const v = e.target.value;
              setFilter((p) => ({ ...p, toDate: v }));
              resetPage();
            }}
          />
          {(filter.fromDate || filter.toDate) && (
            <button
              className="btn btn-outline"
              style={{ fontSize: 11, padding: "3px 8px", whiteSpace: "nowrap" }}
              onClick={() => { setFilter((p) => ({ ...p, fromDate: "", toDate: "" })); resetPage(); }}
              title="Clear date range"
            >
              ✕ Clear dates
            </button>
          )}
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
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
                paginate(filtered).map((inv) => {
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

                            <button
                              className="download-doc-btn"
                              title={
                                rowDocs.length > 1
                                  ? `Download ${rowDocs.length} documents as ZIP`
                                  : `Download ${friendlyName(rowDocs[0])}`
                              }
                              onClick={() => handleDownloadZip(inv.id)}
                            >
                              <svg
                                width="11"
                                height="11"
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
                              {rowDocs.length > 0 && (
                                <span className="doc-count-badge">
                                  {rowDocs.length}
                                </span>
                              )}
                            </button>
                         

                          {/* Delete */}
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(inv.id)}
                            title="Delete invoice"
                          >
                            🗑️
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
        <Pagination
          currentPage={page}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          pageSizeOptions={[10, 20, 50]}
          onPageSizeChange={setPageSize}
        />
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
                    // max = today, min = 365 days ago
                    max={new Date().toISOString().split("T")[0]}
                    min={(() => {
                      const d = new Date();
                      d.setFullYear(d.getFullYear() - 1);
                      return d.toISOString().split("T")[0];
                    })()}
                    onChange={(e) => {
                      const chosen = e.target.value;
                      const minDate = (() => {
                        const d = new Date();
                        d.setFullYear(d.getFullYear() - 1);
                        return d.toISOString().split("T")[0];
                      })();
                      if (chosen < minDate) {
                        alert(`Invoice date cannot be older than 365 days. Earliest allowed: ${minDate}`);
                        return;
                      }
                      if (chosen > new Date().toISOString().split("T")[0]) {
                        alert("Invoice date cannot be a future date.");
                        return;
                      }
                      handleChange(e);
                    }}
                  />
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                    Invoices older than 365 days cannot be submitted.
                  </p>
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
                  {/* Issue 3: non-admins see their dept as read-only */}
                  {!isAdmin && user?.department ? (
                    <input
                      className="form-control"
                      value={user.department}
                      readOnly
                      style={{ background: "#f8fafc", color: "#475569", cursor: "not-allowed" }}
                    />
                  ) : (
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
                  )}
                </div>

                {/* Uploaded By */}
                <div className="form-group">
                  <label className="form-label">Uploaded By</label>
                  {/* Issue 3: always shows logged-in user name, read-only */}
                  <input
                    name="uploadedBy"
                    className="form-control"
                    value={user?.name || form.uploadedBy || ""}
                    readOnly
                    style={{ background: "#f8fafc", color: "#475569", cursor: "not-allowed" }}
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
                  {/* Tax Type — dropdown, not free text */}
                <div className="form-group">
                  <label className="form-label">Tax Type</label>
                  <select
                    name="taxDetails"
                    className="form-control"
                    value={form.taxDetails}
                    onChange={handleChange}
                  >
                    <option value="">— Select Tax Type —</option>
                    {TAX_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {/* {editTarget.taxDetails && editForm.taxDetails !== editTarget.taxDetails && (
                    <span style={{ fontSize: 11, color: "var(--warning)" }}>
                      Was: {editTarget.taxDetails}
                    </span>
                  )} */}
                </div>
                {/* <div className="form-group">
                  <label className="form-label">Tax Details</label>
                  <input
                    name="taxDetails"
                    className="form-control"
                    placeholder="e.g. GST 18%"
                    value={form.taxDetails}
                    onChange={handleChange}
                  />
                </div> */}
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
                            onClick={() => handleDownloadDoc(action.id, doc)}
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