import React, { useState, useEffect, useMemo, useCallback } from "react";
import SearchBar from "../components/ui/SearchBar";
import FilterSelect from "../components/ui/FilterSelect";
import Pagination from "../components/ui/Pagination";
import usePagination from "../components/ui/usePagination";
import {
  fetchVendors,
  createVendor,
  updateVendor,
  deleteVendor,
} from "../api/Service";
import"../styles/Vendor.css"

// ── Constants ─────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "active",   label: "Active"   },
  { value: "inactive", label: "Inactive" },
];

const EMPTY_FORM = { name: "", email: "", phone: "", gstNo: "", address: "" };
const EMPTY_ERRORS = { name: "", email: "", phone: "", gstNo: "" };

// ── Helpers ───────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function validateForm(form) {
  const errors = { ...EMPTY_ERRORS };
  if (!form.name.trim())
    errors.name = "Vendor name is required";
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = "Enter a valid email address";
  if (form.phone && !/^[0-9+\-\s()]{7,15}$/.test(form.phone))
    errors.phone = "Enter a valid phone number";
  if (form.gstNo && !/^[0-9A-Z]{15}$/.test(form.gstNo.toUpperCase()))
    errors.gstNo = "GST No must be 15 alphanumeric characters";
  return { errors, hasError: Object.values(errors).some(Boolean) };
}

// ── StatusBadge ───────────────────────────────────────────────
// Uses .vd-status, .vd-status.active/.inactive, .vd-status-dot  (Vendor.css)
function StatusBadge({ isActive }) {
  return (
    <span className={`vd-status ${isActive ? "active" : "inactive"}`}>
      <span className="vd-status-dot" />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

// ── VendorAvatar ──────────────────────────────────────────────
// Uses .vd-avatar  (Vendor.css)
function VendorAvatar({ name }) {
  return (
    <div className="vd-avatar">
      {name?.charAt(0)?.toUpperCase() || "V"}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Add / Edit Modal
//  Global classes: .modal-overlay .modal .modal-header .modal-title
//                  .close-btn .modal-body .modal-footer
//                  .btn .btn-outline .btn-primary .form-control
//  Scoped classes: .vd-form-grid .vd-field .vd-field-full .vd-label
//                  .vd-req .vd-input-error .vd-field-error .vd-error-banner
// ═══════════════════════════════════════════════════════════════
function VendorFormModal({ vendor, onClose, onSaved }) {
  const isEdit = Boolean(vendor);

  const [form,   setForm]   = useState(
    isEdit
      ? { name: vendor.name || "", email: vendor.email || "",
          phone: vendor.phone || "", gstNo: vendor.gstNo || "",
          address: vendor.address || "" }
      : { ...EMPTY_FORM }
  );
  const [errors, setErrors] = useState({ ...EMPTY_ERRORS });
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState("");

  const handleChange = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
    setApiErr("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors: newErrors, hasError } = validateForm(form);
    if (hasError) { setErrors(newErrors); return; }

    const payload = {
      name:    form.name.trim(),
      email:   form.email.trim()                  || undefined,
      phone:   form.phone.trim()                  || undefined,
      gstNo:   form.gstNo.trim().toUpperCase()    || undefined,
      address: form.address.trim()                || undefined,
    };

    try {
      setSaving(true);
      setApiErr("");
      let saved;
      if (isEdit) {
        const res = await updateVendor(vendor.id, payload);
        saved = res.data ?? res;
      } else {
        const res = await createVendor(payload);
        saved = res.data ?? res;
      }
      onSaved(saved, isEdit);
    } catch (err) {
      setApiErr(typeof err === "string" ? err : "Failed to save vendor. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>

        {/* Header — .modal-header .modal-title .close-btn from App.css */}
        <div className="modal-header">
          <span className="modal-title">
            {isEdit ? "✏️ Edit Vendor" : "➕ Add New Vendor"}
          </span>
          <button className="close-btn" onClick={onClose} disabled={saving}>✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">

            {/* Error banner — .vd-error-banner from Vendor.css */}
            {apiErr && (
              <div className="vd-error-banner" style={{ marginBottom: 16 }}>
                ⚠️ {apiErr}
              </div>
            )}

            {/* 2-col grid — .vd-form-grid from Vendor.css */}
            <div className="vd-form-grid">

              {/* Name — full width */}
              <div className="vd-field vd-field-full">
                <label className="vd-label">
                  Vendor Name <span className="vd-req">*</span>
                </label>
                {/* .form-control from App.css + .vd-input-error from Vendor.css */}
                <input
                  className={`form-control${errors.name ? " vd-input-error" : ""}`}
                  placeholder="e.g. Acme Supplies Ltd."
                  value={form.name}
                  onChange={handleChange("name")}
                  disabled={saving}
                  autoFocus
                />
                {errors.name && <span className="vd-field-error">{errors.name}</span>}
              </div>

              {/* Email */}
              <div className="vd-field">
                <label className="vd-label">Email</label>
                <input
                  type="email"
                  className={`form-control${errors.email ? " vd-input-error" : ""}`}
                  placeholder="vendor@example.com"
                  value={form.email}
                  onChange={handleChange("email")}
                  disabled={saving}
                />
                {errors.email && <span className="vd-field-error">{errors.email}</span>}
              </div>

              {/* Phone */}
              <div className="vd-field">
                <label className="vd-label">Phone</label>
                <input
                  className={`form-control${errors.phone ? " vd-input-error" : ""}`}
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={handleChange("phone")}
                  disabled={saving}
                />
                {errors.phone && <span className="vd-field-error">{errors.phone}</span>}
              </div>

              {/* GST No */}
              <div className="vd-field">
                <label className="vd-label">GST Number</label>
                <input
                  className={`form-control${errors.gstNo ? " vd-input-error" : ""}`}
                  placeholder="22AAAAA0000A1Z5"
                  value={form.gstNo}
                  onChange={handleChange("gstNo")}
                  disabled={saving}
                  maxLength={15}
                  style={{ textTransform: "uppercase" }}
                />
                {errors.gstNo && <span className="vd-field-error">{errors.gstNo}</span>}
              </div>

              {/* Address — full width, textarea.form-control from App.css */}
              <div className="vd-field vd-field-full">
                <label className="vd-label">Address</label>
                <textarea
                  className="form-control"
                  placeholder="Street, City, State, PIN"
                  value={form.address}
                  onChange={handleChange("address")}
                  disabled={saving}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Footer — .modal-footer .btn .btn-outline .btn-primary from App.css */}
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (isEdit ? "Saving..." : "Adding...") : (isEdit ? "💾 Save Changes" : "➕ Add Vendor")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  View Detail Modal
//  Global classes: .modal-overlay .modal .modal-header .modal-title
//                  .close-btn .modal-body .modal-footer .btn .btn-outline .btn-primary
//  Scoped classes: .vd-detail-hero .vd-avatar .vd-avatar-lg .vd-detail-name
//                  .vd-divider .vd-detail-grid .vd-detail-item
//                  .vd-detail-label .vd-detail-value
// ═══════════════════════════════════════════════════════════════
function VendorDetailModal({ vendor, onClose, onEdit }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <span className="modal-title">🏢 Vendor Details</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Hero — .vd-detail-hero .vd-avatar-lg from Vendor.css */}
          <div className="vd-detail-hero">
            <div className="vd-avatar vd-avatar-lg">
              {vendor.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <div className="vd-detail-name">{vendor.name}</div>
              <StatusBadge isActive={vendor.isActive} />
            </div>
          </div>

          <hr className="vd-divider" />

          {/* Detail grid — .vd-detail-grid .vd-detail-item .vd-detail-label .vd-detail-value */}
          <div className="vd-detail-grid">
            <div className="vd-detail-item">
              <div className="vd-detail-label">📧 Email</div>
              <div className={`vd-detail-value${!vendor.email ? " muted" : ""}`}>
                {vendor.email || "Not provided"}
              </div>
            </div>
            <div className="vd-detail-item">
              <div className="vd-detail-label">📞 Phone</div>
              <div className={`vd-detail-value${!vendor.phone ? " muted" : ""}`}>
                {vendor.phone || "Not provided"}
              </div>
            </div>
            <div className="vd-detail-item">
              <div className="vd-detail-label">🧾 GST Number</div>
              <div
                className={`vd-detail-value${!vendor.gstNo ? " muted" : ""}`}
                style={{ fontFamily: "monospace", letterSpacing: 1 }}
              >
                {vendor.gstNo || "Not provided"}
              </div>
            </div>
            <div className="vd-detail-item">
              <div className="vd-detail-label">📅 Added On</div>
              <div className="vd-detail-value">{formatDate(vendor.createdAt)}</div>
            </div>
            <div className="vd-detail-item" style={{ gridColumn: "1/-1" }}>
              <div className="vd-detail-label">📍 Address</div>
              <div className={`vd-detail-value${!vendor.address ? " muted" : ""}`}>
                {vendor.address || "Not provided"}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => { onClose(); onEdit(vendor); }}>
            ✏️ Edit
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Delete Confirm Modal
//  Global classes: .modal-overlay .modal .modal-footer .btn .btn-outline .btn-danger
// ═══════════════════════════════════════════════════════════════
function DeleteConfirmModal({ vendor, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: "center", padding: "32px 28px 8px" }}>
          <span style={{ fontSize: 44, display: "block", marginBottom: 14 }}>🗑️</span>
          <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
            Delete Vendor
          </h3>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 6px", lineHeight: 1.6 }}>
            Are you sure you want to delete{" "}
            <strong style={{ color: "var(--text-primary)" }}>{vendor.name}</strong>?
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer" style={{ justifyContent: "center", gap: 12 }}>
          <button className="btn btn-outline" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="btn btn-danger"  onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting..." : "🗑️ Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Main Page
// ═══════════════════════════════════════════════════════════════
function VendorManagement() {
  const [vendors,       setVendors]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [apiError,      setApiError]      = useState("");
  const [successMsg,    setSuccessMsg]    = useState("");

  // modal state
  const [showForm,      setShowForm]      = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [viewTarget,    setViewTarget]    = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // filters
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { page, pageSize, setPage, setPageSize, resetPage, paginate } = usePagination(10);

  useEffect(() => { loadVendors(); }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      setApiError("");
      const res = await fetchVendors();
      setVendors(res.data ?? res ?? []);
    } catch (err) {
      setApiError(typeof err === "string" ? err : "Failed to load vendors.");
    } finally {
      setLoading(false);
    }
  };

  const flashSuccess = useCallback((msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }, []);

  const handleOpenAdd  = ()       => { setEditTarget(null); setShowForm(true); };
  const handleOpenEdit = (vendor) => { setEditTarget(vendor); setShowForm(true); };

  const handleSaved = useCallback((savedVendor, isEdit) => {
    if (isEdit) {
      setVendors((prev) => prev.map((v) => v.id === savedVendor.id ? savedVendor : v));
      flashSuccess(`✅ "${savedVendor.name}" updated successfully.`);
    } else {
      setVendors((prev) => [savedVendor, ...prev]);
      flashSuccess(`✅ "${savedVendor.name}" added successfully.`);
    }
    setShowForm(false);
    setEditTarget(null);
  }, [flashSuccess]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await deleteVendor(deleteTarget.id);
      setVendors((prev) => prev.filter((v) => v.id !== deleteTarget.id));
      flashSuccess(`✅ "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
    } catch (err) {
      setApiError(typeof err === "string" ? err : "Failed to delete vendor.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFilterChange = (setter) => (val) => { setter(val); resetPage(); };

  // KPI stats
  const activeCount   = vendors.filter((v) =>  v.isActive).length;
  const inactiveCount = vendors.filter((v) => !v.isActive).length;
  const withGst       = vendors.filter((v) =>  v.gstNo).length;

  // Filter + paginate
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vendors.filter((v) => {
      const matchSearch = !q ||
        [v.name, v.email, v.phone, v.gstNo, v.address].some((f) => f?.toLowerCase().includes(q));
      const matchStatus =
        !statusFilter ||
        (statusFilter === "active"   &&  v.isActive) ||
        (statusFilter === "inactive" && !v.isActive);
      return matchSearch && matchStatus;
    });
  }, [vendors, search, statusFilter]);

  const pageData = paginate(filtered);

  // ── Loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="vd-loading">
        <div className="vd-spinner" />
        <span className="vd-loading-text">Loading vendors...</span>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="vd-root">

      {/* Modals */}
      {showForm && (
        <VendorFormModal
          vendor={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}
      {viewTarget && (
        <VendorDetailModal
          vendor={viewTarget}
          onClose={() => setViewTarget(null)}
          onEdit={handleOpenEdit}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          vendor={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      {/* Page Header — .page-header .page-title .page-subtitle from App.css */}
      <div className="page-header vd-header">
        <div>
          <h1 className="page-title">Vendor Management</h1>
          <p className="page-subtitle">Manage vendor master data — add, edit, and remove vendors.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>+ Add Vendor</button>
      </div>

      {/* Banners — .vd-error-banner .vd-success-banner from Vendor.css */}
      {apiError && (
        <div className="vd-error-banner">
          ⚠️ {apiError}
          <button
            onClick={() => setApiError("")}
            style={{ marginLeft: "auto", background: "none", border: "none",
              cursor: "pointer", fontSize: 16, color: "inherit", lineHeight: 1 }}
          >✕</button>
        </div>
      )}
      {successMsg && (
        <div className="vd-success-banner">{successMsg}</div>
      )}

      {/* KPI Cards — .kpi-grid .kpi-card .kpi-label .kpi-value .kpi-meta from App.css */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Vendors</div>
          <div className="kpi-value">{vendors.length}</div>
          <div className="kpi-meta">All records</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active</div>
          <div className="kpi-value">{activeCount}</div>
          <div className="kpi-meta">Currently active</div>
        </div>
        <div className="kpi-card yellow">
          <div className="kpi-label">Inactive</div>
          <div className="kpi-value">{inactiveCount}</div>
          <div className="kpi-meta">Deactivated</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">GST Registered</div>
          <div className="kpi-value">{withGst}</div>
          <div className="kpi-meta">With GST number</div>
        </div>
      </div>

      {/* Toolbar — .filter-bar from Components.css, SearchBar + FilterSelect reuse existing */}
      <div className="filter-bar">
        <SearchBar
          value={search}
          onChange={handleFilterChange(setSearch)}
          placeholder="Search by name, email, phone, GST..."
        />
        <FilterSelect
          value={statusFilter}
          onChange={handleFilterChange(setStatusFilter)}
          options={STATUS_OPTIONS}
          placeholder="All Status"
        />
        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {filtered.length} vendor{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table — .card .card-header .card-title .table-wrapper from App.css */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">🏢 Vendors</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{vendors.length} total</span>
        </div>

        {filtered.length === 0 ? (
          /* Empty — .vd-empty .vd-empty-icon .vd-empty-title .vd-empty-sub from Vendor.css */
          <div className="vd-empty">
            <div className="vd-empty-icon">🏢</div>
            <div className="vd-empty-title">
              {vendors.length === 0 ? "No vendors yet" : "No vendors match your filters"}
            </div>
            <p className="vd-empty-sub">
              {vendors.length === 0
                ? "Click \"+ Add Vendor\" to create your first vendor."
                : "Try adjusting your search or status filter."}
            </p>
            {vendors.length === 0 && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleOpenAdd}>
                + Add Vendor
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vendor</th>
                    <th>Phone</th>
                    <th>GST Number</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Added On</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((vendor, idx) => (
                    <tr key={vendor.id}>

                      {/* # */}
                      <td style={{ color: "var(--text-muted)", fontSize: 12, width: 40 }}>
                        {(page - 1) * pageSize + idx + 1}
                      </td>

                      {/* Vendor name + email — .vd-avatar from Vendor.css */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <VendorAvatar name={vendor.name} />
                          <div>
                            <div
                              style={{ fontWeight: 600, fontSize: 14, cursor: "pointer",
                                color: "var(--text-primary)" }}
                              onClick={() => setViewTarget(vendor)}
                            >
                              {vendor.name}
                            </div>
                            {vendor.email && (
                              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                                {vendor.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td>
                        {vendor.phone
                          ? <span style={{ fontSize: 13 }}>{vendor.phone}</span>
                          : <span style={{ color: "var(--text-muted)", fontSize: 13 }}>—</span>}
                      </td>

                      {/* GST */}
                      <td>
                        {vendor.gstNo
                          ? (
                            <span style={{
                              fontFamily: "monospace", fontSize: 12.5, letterSpacing: 1,
                              background: "#f8fafc", padding: "3px 8px", borderRadius: 6,
                              border: "1px solid var(--border)", color: "var(--text-secondary)",
                            }}>
                              {vendor.gstNo}
                            </span>
                          )
                          : <span style={{ color: "var(--text-muted)", fontSize: 13 }}>—</span>}
                      </td>

                      {/* Address — truncated */}
                      <td style={{ maxWidth: 200 }}>
                        {vendor.address
                          ? (
                            <span
                              title={vendor.address}
                              style={{
                                fontSize: 13, color: "var(--text-secondary)", display: "block",
                                overflow: "hidden", textOverflow: "ellipsis",
                                whiteSpace: "nowrap", maxWidth: 180,
                              }}
                            >
                              {vendor.address}
                            </span>
                          )
                          : <span style={{ color: "var(--text-muted)", fontSize: 13 }}>—</span>}
                      </td>

                      {/* Status — .vd-status from Vendor.css */}
                      <td><StatusBadge isActive={vendor.isActive} /></td>

                      {/* Added On */}
                      <td style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {formatDate(vendor.createdAt)}
                      </td>

                      {/* Actions — .actions-btn from App.css, .btn from App.css */}
                      <td>
                        <div className="actions-btn">
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setViewTarget(vendor)}
                            title="View details"
                          >
                            👁
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenEdit(vendor)}
                            title="Edit vendor"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeleteTarget(vendor)}
                            title="Delete vendor"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination — .pagination-bar .pg-btn .pg-btn-active from Components.css */}
            <Pagination
              currentPage={page}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setPage}
              pageSizeOptions={[10, 20, 50]}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default VendorManagement;