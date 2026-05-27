import { useState, useEffect, useMemo } from "react";
import { fetchUsers, updateUser, deleteUser, changePassword } from "../api/Service";
import SearchBar from "../components/ui/SearchBar";
import FilterSelect from "../components/ui/FilterSelect";
import Pagination from "../components/ui/Pagination";
import usePagination from "../components/ui/usePagination";
import { useNavigate } from "react-router-dom";

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

function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ name: user.name || "", role: user.role || "", department: user.department || "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim()) return setError("Name is required");
    try {
      setLoading(true);
      await updateUser(user.id, form);
      onSaved();
    } catch (err) {
      setError(typeof err === "string" ? err : "Update failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:480 }}>
        <div className="modal-header">
          <span className="modal-title">✏️ Edit User — {user.name}</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {error && <div style={{ background:"#fef2f2", color:"#dc2626", padding:"10px 14px", borderRadius:8, fontSize:13 }}>{error}</div>}
          <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:13, fontWeight:600 }}>
            Name *
            <input className="form-input" name="name" value={form.name} onChange={handle} placeholder="Full name" />
          </label>
          <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:13, fontWeight:600 }}>
            Role
            <select className="form-input" name="role" value={form.role} onChange={handle}>
              <option value="">— Select role —</option>
              {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
          <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:13, fontWeight:600 }}>
            Department
            <input className="form-input" name="department" value={form.department} onChange={handle} placeholder="e.g. Finance" />
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? "Saving…" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordModal({ user, onClose }) {
  const [form, setForm] = useState({ oldPassword:"", newPassword:"", confirm:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async () => {
    if (!form.oldPassword || !form.newPassword) return setError("All fields required");
    if (form.newPassword !== form.confirm) return setError("Passwords do not match");
    if (form.newPassword.length < 6) return setError("New password must be at least 6 characters");
    try {
      setLoading(true);
      await changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword });
      setSuccess(true);
    } catch (err) {
      setError(typeof err === "string" ? err : "Password change failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:420 }}>
        <div className="modal-header">
          <span className="modal-title">🔑 Change Password</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display:"flex", flexDirection:"column", gap:14 }}>
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
          <h3 style={{ margin:"0 0 8px", fontSize:18 }}>Delete User?</h3>
          <p style={{ fontSize:14, color:"var(--text-secondary)", margin:"0 0 24px" }}>
            This will permanently delete <strong>{user.name}</strong>. This cannot be undone.
          </p>
        </div>
        <div className="modal-footer" style={{ justifyContent:"center", gap:12 }}>
          <button className="btn btn-outline" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>{loading ? "Deleting…" : "🗑 Delete"}</button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [pwdTarget, setPwdTarget]   = useState(null);
  const [delTarget, setDelTarget]   = useState(null);
  const [delLoading, setDelLoading] = useState(false);

  const { page, pageSize, setPage, setPageSize, resetPage, paginate } = usePagination(10);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchUsers();
      setUsers(res.users || res.data || res || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const departments = useMemo(() => [...new Set(users.map(u => u.department).filter(Boolean))], [users]);
  const deptOptions = departments.map(d => ({ value: d, label: d }));

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

  const handleDelete = async () => {
    try { setDelLoading(true); await deleteUser(delTarget.id); setUsers(p => p.filter(u => u.id !== delTarget.id)); setDelTarget(null); }
    catch (e) { console.error(e); }
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
      {editTarget && <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); load(); }} />}
      {pwdTarget  && <ChangePasswordModal user={pwdTarget} onClose={() => setPwdTarget(null)} />}
      {delTarget  && <DeleteModal user={delTarget} onConfirm={handleDelete} onCancel={() => setDelTarget(null)} loading={delLoading} />}

      {/* Header */}
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <h1 className="page-title">👥 User Management</h1>
          <p className="page-subtitle">View and manage all registered system users</p>
        </div>
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
          <div className="kpi-value">{departments.length}</div>
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
                          <button className="btn btn-outline btn-sm"onClick={() => navigate("/user-access/u.id")}>✏ Edit</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setPwdTarget(u)} style={{ color:"var(--warning)" }}>🔑</button>
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
