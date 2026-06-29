import { useState, useEffect, useMemo } from "react";
import { fetchUsers, createUser, updateUser, deleteUser, changePassword } from "../api/Service";
import { useInvoices } from "../context/InvoiceContext";
import { useToast } from "../context/ToastContext";
import { getErrorMessage, getSuccessMessage } from "../utils/apiMessage";
import SearchBar from "../components/ui/SearchBar";
import FilterSelect from "../components/ui/FilterSelect";
import Pagination from "../components/ui/Pagination";
import usePagination from "../components/ui/usePagination";
import "../styles/UserAccessForm.css";

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin",       label: "Admin"       },
  { value: "finance",     label: "Finance"     },
  { value: "hod",         label: "HOD"         },
  { value: "payment",     label: "Payment"     },
  { value: "employee",    label: "Employee"    },
];

const ROLE_COLORS = {
  super_admin: { bg: "#f0f0ff", color: "#4f46e5", border: "#c7d2fe" },
  admin:       { bg: "#fdf2f8", color: "#9333ea", border: "#e9d5ff" },
  finance:     { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  hod:         { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  payment:     { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  employee:    { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
};

// Pages a user can be granted access to (matches the app's permission names)
const ALL_PAGES = [
  "KPI Dashboard",
  "Invoice Submission",
  "Finance Review",
  "HOD Approval",
  "Payment Approval",
  "Payment Processing",
  "User List",
  "User Access",
  "Vendor List",
];
const CRUD_OPERATIONS = ["create", "read", "update", "delete"];
const DEFAULT_CRUD = { create: false, read: false, update: false, delete: false };

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.employee;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:20,
      fontSize:12, fontWeight:600, background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
      {ROLE_OPTIONS.find(r => r.value === role)?.label || role}
    </span>
  );
}

function Avatar({ name, size = 36 }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
  const colors = ["#2563eb","#7c3aed","#16a34a","#ea580c","#0891b2","#d97706"];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:color,
      color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
      fontWeight:700, fontSize:size*0.38, flexShrink:0 }}>
      {initials}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Create / Edit User Modal — full profile + page/CRUD permissions
// ═══════════════════════════════════════════════════════════════
function UserFormModal({ user, departments, onClose, onSaved }) {
  const isEdit = Boolean(user);
  const toast = useToast();

  const [form, setForm] = useState(() => ({
    name:        user?.name || "",
    email:       user?.email || "",
    password:    "",
    department:  user?.department || "",
    role:        user?.role || "",
    phone:       user?.phone || "",
    gstNo:       user?.gstNo || "",
    address:     user?.address || "",
    status:      user?.status || (user?.isActive === false ? "inactive" : "active"),
    page_access: user?.pageAccess || [],
    crud_access: user?.crudAccess || {},
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const togglePage = (page) => {
    setForm((prev) => {
      const isSelected = prev.page_access.includes(page);
      const page_access = isSelected
        ? prev.page_access.filter((p) => p !== page)
        : [...prev.page_access, page];
      const crud_access = { ...prev.crud_access };
      if (isSelected) delete crud_access[page];
      else crud_access[page] = { ...DEFAULT_CRUD };
      return { ...prev, page_access, crud_access };
    });
    setErrors((prev) => ({ ...prev, page_access: undefined }));
  };

  const toggleCrud = (page, op) => {
    setForm((prev) => ({
      ...prev,
      crud_access: {
        ...prev.crud_access,
        [page]: {
          ...(prev.crud_access[page] || DEFAULT_CRUD),
          [op]: !prev.crud_access?.[page]?.[op],
        },
      },
    }));
  };

  const selectAllCrud = (page) => {
    setForm((prev) => {
      const current = prev.crud_access[page] || DEFAULT_CRUD;
      const allSelected = CRUD_OPERATIONS.every((op) => current[op]);
      return {
        ...prev,
        crud_access: {
          ...prev.crud_access,
          [page]: Object.fromEntries(CRUD_OPERATIONS.map((op) => [op, !allSelected])),
        },
      };
    });
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!isEdit && !form.password.trim()) e.password = "Password is required";
    if (!isEdit && form.password && form.password.length < 6) e.password = "Min 6 characters";
    if (!form.department) e.department = "Department is required";
    if (!form.role) e.role = "Role is required";
    if (form.page_access.length === 0) e.page_access = "Select at least one page";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length > 0) { setErrors(v); return; }

    const payload = {
      name:       form.name.trim(),
      email:      form.email.trim(),
      role:       form.role,
      department: form.department,
      phone:      form.phone.trim(),
      gstNo:      form.gstNo.trim().toUpperCase(),
      address:    form.address.trim(),
      status:     form.status,
      isActive:   form.status === "active",
      pageAccess: form.page_access,
      crudAccess: form.crud_access,
    };

    try {
      setSaving(true);
      let res;
      if (isEdit) {
        res = await updateUser(user.id, payload);
      } else {
        payload.password = form.password;
        res = await createUser(payload);
      }
      toast.success(
        getSuccessMessage(res, isEdit ? "User updated successfully." : "User created successfully."),
      );
      onSaved();
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to save user. Please try again.");
      setErrors((prev) => ({ ...prev, submit: msg }));
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 880, width: "96%" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? `✏️ Edit User — ${user.name}` : "➕ Add New User"}</span>
          <button className="close-btn" onClick={onClose} disabled={saving}>✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {errors.submit && <div className="ua-error-banner">{errors.submit}</div>}

            {/* ── User Details ── */}
            <div className="ua-section" style={{ boxShadow: "none", padding: 0, border: "none", marginBottom: 24 }}>
              <h2 className="ua-section-title">User Details</h2>
              <div className="ua-row">
                <div className="ua-field">
                  <label className="ua-label">User Name <span className="ua-req">*</span></label>
                  <input
                    className={`ua-input ${errors.name ? "ua-input-error" : ""}`}
                    placeholder="Enter user name"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    disabled={saving}
                  />
                  {errors.name && <span className="ua-field-error">{errors.name}</span>}
                </div>

                <div className="ua-field">
                  <label className="ua-label">User Email <span className="ua-req">*</span></label>
                  <input
                    type="email"
                    className={`ua-input ${errors.email ? "ua-input-error" : ""}`}
                    placeholder="Enter user email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    disabled={saving || isEdit}
                  />
                  {errors.email && <span className="ua-field-error">{errors.email}</span>}
                </div>

                {!isEdit && (
                  <div className="ua-field">
                    <label className="ua-label">Password <span className="ua-req">*</span></label>
                    <input
                      type="password"
                      className={`ua-input ${errors.password ? "ua-input-error" : ""}`}
                      placeholder="Enter password"
                      value={form.password}
                      onChange={(e) => setField("password", e.target.value)}
                      disabled={saving}
                    />
                    {errors.password && <span className="ua-field-error">{errors.password}</span>}
                  </div>
                )}

                <div className="ua-field">
                  <label className="ua-label">Department <span className="ua-req">*</span></label>
                  <select
                    className={`ua-select ${errors.department ? "ua-input-error" : ""}`}
                    value={form.department}
                    onChange={(e) => setField("department", e.target.value)}
                    disabled={saving}
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {errors.department && <span className="ua-field-error">{errors.department}</span>}
                </div>

                <div className="ua-field">
                  <label className="ua-label">User Role <span className="ua-req">*</span></label>
                  <select
                    className={`ua-select ${errors.role ? "ua-input-error" : ""}`}
                    value={form.role}
                    onChange={(e) => setField("role", e.target.value)}
                    disabled={saving}
                  >
                    <option value="">Select role</option>
                    {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  {errors.role && <span className="ua-field-error">{errors.role}</span>}
                </div>

                <div className="ua-field">
                  <label className="ua-label">Status</label>
                  <select
                    className="ua-select"
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                    disabled={saving}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="ua-field">
                  <label className="ua-label">Phone</label>
                  <input
                    className="ua-input"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="ua-field">
                  <label className="ua-label">GST Number</label>
                  <input
                    className="ua-input"
                    placeholder="22AAAAA0000A1Z5"
                    value={form.gstNo}
                    maxLength={15}
                    style={{ textTransform: "uppercase" }}
                    onChange={(e) => setField("gstNo", e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="ua-field">
                  <label className="ua-label">Address</label>
                  <input
                    className="ua-input"
                    placeholder="Street, City, State"
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* ── Page Access & Permissions ── */}
            <div className="ua-section" style={{ boxShadow: "none", padding: 0, border: "none" }}>
              <h2 className="ua-section-title">Page Access & Permissions</h2>
              {errors.page_access && <div className="ua-error-banner">{errors.page_access}</div>}
              <p className="ua-hint">Select pages to grant access, then configure CRUD permissions per page.</p>

              <div className="ua-pages-grid">
                {ALL_PAGES.map((page) => {
                  const selected = form.page_access.includes(page);
                  const crud = form.crud_access[page] || DEFAULT_CRUD;
                  const allSelected = CRUD_OPERATIONS.every((op) => crud[op]);
                  return (
                    <div key={page} className={`ua-page-card ${selected ? "ua-page-card--active" : ""}`}>
                      <div className="ua-page-card-header">
                        <label className="ua-page-check-label">
                          <input
                            type="checkbox"
                            className="ua-checkbox"
                            checked={selected}
                            onChange={() => togglePage(page)}
                          />
                          <span className="ua-page-name">{page}</span>
                        </label>
                      </div>

                      {selected && (
                        <div className="ua-crud-section">
                          <div className="ua-crud-header">
                            <span className="ua-crud-label">Permissions</span>
                            <button type="button" className="ua-select-all-btn" onClick={() => selectAllCrud(page)}>
                              {allSelected ? "Deselect All" : "Select All"}
                            </button>
                          </div>
                          <div className="ua-crud-ops">
                            {CRUD_OPERATIONS.map((op) => (
                              <label key={op} className={`ua-crud-op ${crud[op] ? "ua-crud-op--on" : ""}`}>
                                <input
                                  type="checkbox"
                                  checked={crud[op] || false}
                                  onChange={() => toggleCrud(page, op)}
                                />
                                <span>{op.charAt(0).toUpperCase() + op.slice(1)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (isEdit ? "Saving…" : "Adding…") : (isEdit ? "💾 Save Changes" : "➕ Add User")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordModal({ user, onClose }) {
  const [form, setForm] = useState({ oldPassword:"", newPassword:"", confirm:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const toast = useToast();

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async () => {
    if (!form.oldPassword || !form.newPassword) return setError("All fields required");
    if (form.newPassword !== form.confirm) return setError("Passwords do not match");
    if (form.newPassword.length < 6) return setError("New password must be at least 6 characters");
    try {
      setLoading(true);
      const res = await changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword });
      setSuccess(true);
      toast.success(getSuccessMessage(res, "Password changed successfully."));
    } catch (err) {
      const msg = getErrorMessage(err, "Password change failed");
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:420 }}>
        <div className="modal-header">
          <span className="modal-title">🔑 Change My Password</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <p style={{ fontSize:12, color:"var(--text-muted)", margin:0 }}>
            Updates the password of your own ({user?.name}) account.
          </p>
          {success ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
              <p style={{ fontWeight:600, color:"#16a34a" }}>Password changed successfully!</p>
            </div>
          ) : (
            <>
              {error && <div style={{ background:"#fef2f2", color:"#dc2626", padding:"10px 14px", borderRadius:8, fontSize:13 }}>{error}</div>}
              <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:13, fontWeight:600 }}>
                Current Password
                <input className="form-input" name="oldPassword" type="password" value={form.oldPassword} onChange={handle} />
              </label>
              <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:13, fontWeight:600 }}>
                New Password
                <input className="form-input" name="newPassword" type="password" value={form.newPassword} onChange={handle} />
              </label>
              <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:13, fontWeight:600 }}>
                Confirm New Password
                <input className="form-input" name="confirm" type="password" value={form.confirm} onChange={handle} />
              </label>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          {!success && <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? "Changing…" : "Change Password"}</button>}
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ user, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:400 }}>
        <div style={{ textAlign:"center", padding:"28px 24px 8px" }}>
          <div style={{ fontSize:44, marginBottom:10 }}>⚠️</div>
          <h3 style={{ margin:"0 0 8px", fontSize:18 }}>Deactivate User?</h3>
          <p style={{ fontSize:14, color:"var(--text-secondary)", margin:"0 0 24px" }}>
            This will deactivate <strong>{user.name}</strong>. They will no longer be able to sign in. You can re-activate them later by editing their status.
          </p>
        </div>
        <div className="modal-footer" style={{ justifyContent:"center", gap:12 }}>
          <button className="btn btn-outline" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>{loading ? "Deactivating…" : "🗑 Deactivate"}</button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { DEPARTMENTS } = useInvoices();
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [formTarget, setFormTarget] = useState(null); // null = create, object = edit
  const [pwdTarget, setPwdTarget]   = useState(null);
  const [delTarget, setDelTarget]   = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const { page, pageSize, setPage, setPageSize, resetPage, paginate } = usePagination(10);
  const toast = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchUsers();
      setUsers(res.users || res.data || res || []);
    } catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e, "Failed to load users."));
    }
    finally { setLoading(false); }
  };

  // Departments — prefer those configured in the app, fall back to ones already in use
  const usedDepartments = useMemo(() => [...new Set(users.map(u => u.department).filter(Boolean))], [users]);
  const formDepartments = useMemo(
    () => [...new Set([...(DEPARTMENTS || []), ...usedDepartments])],
    [DEPARTMENTS, usedDepartments],
  );
  const deptOptions = usedDepartments.map(d => ({ value: d, label: d }));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => {
      const matchQ = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      const matchR = !roleFilter || u.role === roleFilter;
      const matchD = !deptFilter || u.department === deptFilter;
      return matchQ && matchR && matchD;
    });
  }, [users, search, roleFilter, deptFilter]);

  const pageData = paginate(filtered);

  const openCreate = () => { setFormTarget(null); setShowForm(true); };
  const openEdit = (u) => { setFormTarget(u); setShowForm(true); };

  const handleSaved = () => {
    setShowForm(false);
    setFormTarget(null);
    load();
  };

  const handleDelete = async () => {
    try {
      setDelLoading(true);
      const res = await deleteUser(delTarget.id);
      toast.success(getSuccessMessage(res, `"${delTarget.name}" deactivated successfully.`));
      setDelTarget(null);
      await load();
    }
    catch (e) {
      console.error(e);
      toast.error(getErrorMessage(e, "Failed to deactivate user."));
    }
    finally { setDelLoading(false); }
  };

  const mkFilter = setter => val => { setter(val); resetPage(); };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, flexDirection:"column", gap:12 }}>
      <div style={{ width:40, height:40, border:"3px solid var(--border)", borderTopColor:"var(--accent)", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <span style={{ color:"var(--text-muted)", fontSize:14 }}>Loading users…</span>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div>
      {showForm && (
        <UserFormModal
          user={formTarget}
          departments={formDepartments}
          onClose={() => { setShowForm(false); setFormTarget(null); }}
          onSaved={handleSaved}
        />
      )}
      {pwdTarget && <ChangePasswordModal user={pwdTarget} onClose={() => setPwdTarget(null)} />}
      {delTarget && <DeleteModal user={delTarget} onConfirm={handleDelete} onCancel={() => setDelTarget(null)} loading={delLoading} />}

      {/* Header */}
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <h1 className="page-title">👥 User Management</h1>
          <p className="page-subtitle">Create, view, edit and manage all system users</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add User</button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns:"repeat(4,1fr)", marginBottom:24 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Users</div>
          <div className="kpi-value">{users.length}</div>
          <div className="kpi-meta">Registered accounts</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Admins</div>
          <div className="kpi-value">{users.filter(u => ["admin","super_admin"].includes(u.role)).length}</div>
          <div className="kpi-meta">Admin + Super Admin</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active</div>
          <div className="kpi-value">{users.filter(u => u.isActive !== false).length}</div>
          <div className="kpi-meta">Active accounts</div>
        </div>
        <div className="kpi-card yellow">
          <div className="kpi-label">Departments</div>
          <div className="kpi-value">{usedDepartments.length}</div>
          <div className="kpi-meta">Unique departments</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <SearchBar value={search} onChange={mkFilter(setSearch)} placeholder="Search by name or email…" />
        <FilterSelect value={roleFilter} onChange={mkFilter(setRoleFilter)} options={ROLE_OPTIONS} placeholder="All Roles" />
        <FilterSelect value={deptFilter} onChange={mkFilter(setDeptFilter)} options={deptOptions} placeholder="All Departments" />
        <span style={{ fontSize:12, color:"var(--text-muted)", whiteSpace:"nowrap" }}>{filtered.length} user{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">All Users</span>
          <span style={{ fontSize:12, color:"var(--text-muted)" }}>{users.length} total</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>👤</div>
            <p style={{ color:"var(--text-muted)", fontSize:14 }}>No users found.</p>
            <button className="btn btn-primary" style={{ marginTop:14 }} onClick={openCreate}>+ Add User</button>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((u, idx) => (
                    <tr key={u.id}>
                      <td style={{ color:"var(--text-muted)", fontSize:12 }}>{(page-1)*pageSize+idx+1}</td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <Avatar name={u.name} />
                          <span style={{ fontWeight:600, fontSize:14 }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize:13, color:"var(--text-secondary)" }}>{u.email}</td>
                      <td><RoleBadge role={u.role} /></td>
                      <td>
                        <span style={{ fontSize:13, color:"var(--text-secondary)", background:"var(--bg)", padding:"3px 8px", borderRadius:6, border:"1px solid var(--border)" }}>
                          {u.department || "—"}
                        </span>
                      </td>
                      <td>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:12, fontWeight:600,
                          color: u.isActive !== false ? "#16a34a" : "#dc2626",
                          background: u.isActive !== false ? "#f0fdf4" : "#fef2f2",
                          padding:"3px 10px", borderRadius:20, border:`1px solid ${u.isActive !== false ? "#bbf7d0" : "#fecaca"}` }}>
                          {u.isActive !== false ? "● Active" : "● Inactive"}
                        </span>
                      </td>
                      <td style={{ fontSize:12, color:"var(--text-muted)" }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—"}
                      </td>
                      <td>
                        <div className="action-row">
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>✏ Edit</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setPwdTarget(u)} style={{ color:"var(--warning)" }} title="Change my password">🔑</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDelTarget(u)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalItems={filtered.length} pageSize={pageSize}
              onPageChange={setPage} pageSizeOptions={[10,20,50]} onPageSizeChange={setPageSize} />
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
