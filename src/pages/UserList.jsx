import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { deleteUserAccess, fetchUsers, getAllUserAccess } from "../api/Service";
import SearchBar from "../components/ui/SearchBar";
import FilterSelect from "../components/ui/FilterSelect";
import Pagination from "../components/ui/Pagination";
import usePagination from "../components/ui/usePagination";

const USER_ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin",       label: "Admin"       },
  { value: "manager",     label: "Manager"     },
  { value: "team_lead",   label: "Team Lead"   },
  { value: "client",      label: "Client"      },
  { value: "employee",    label: "Employee"    },
];

const ROLE_COLORS = {
  super_admin: { bg: "#f0f0ff", color: "#4f46e5", border: "#c7d2fe" },
  admin:       { bg: "#fdf2f8", color: "#9333ea", border: "#e9d5ff" },
  manager:     { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  team_lead:   { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  client:      { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  employee:    { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
};

const CRUD_COLORS = {
  create: { bg: "#dcfce7", color: "#16a34a" },
  read:   { bg: "#dbeafe", color: "#2563eb" },
  update: { bg: "#fef9c3", color: "#b45309" },
  delete: { bg: "#fee2e2", color: "#dc2626" },
};

function getRoleLabel(value) {
  return USER_ROLES.find((r) => r.value === value)?.label || value;
}

function RoleBadge({ role }) {
  const colors = ROLE_COLORS[role] || ROLE_COLORS.employee;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`,
    }}>
      {getRoleLabel(role)}
    </span>
  );
}

function CrudPills({ crud }) {
  if (!crud) return <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>;
  const ops    = ["create", "read", "update", "delete"];
  const active = ops.filter((op) => crud?.[op]);
  if (active.length === 0) return <span style={{ color: "var(--text-muted)", fontSize: 12 }}>No permissions</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {active.map((op) => {
        const c = CRUD_COLORS[op];
        return (
          <span key={op} style={{
            padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
            background: c.bg, color: c.color, textTransform: "capitalize",
          }}>
            {op}
          </span>
        );
      })}
    </div>
  );
}

function DeleteModal({ user, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div style={{ textAlign: "center", padding: "28px 24px 8px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>Delete User Access</h3>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 24px" }}>
            Are you sure you want to delete access for <strong>{user.user_name}</strong>? This cannot be undone.
          </p>
        </div>
        <div className="modal-footer" style={{ justifyContent: "center", gap: 12 }}>
          <button className="btn btn-outline" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="btn btn-danger"  onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting..." : "🗑 Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PermissionsModal({ user, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <span className="modal-title">🔐 Permissions — {user.user_name}</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {!user.page_access?.length ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 20 }}>No page permissions assigned.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {user.page_access.map((page) => (
                <div key={page} style={{
                  background: "#f8fafc", borderRadius: 10, padding: "12px 14px",
                  border: "1px solid var(--border)",
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "var(--text-primary)" }}>{page}</div>
                  <CrudPills crud={user.crud_access?.[page]} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function UserList() {
  const navigate = useNavigate();

  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewUser,      setViewUser]      = useState(null);

  // ── filters ───────────────────────────────────────────────
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const { page, pageSize, setPage, setPageSize, resetPage, paginate } = usePagination(10);

  useEffect(() => { fetchUsersData(); }, []);

  const fetchUsersData = async () => {
    try {
      setLoading(true);
      const res = await fetchUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  const departments = useMemo(
    () => [...new Set(users.map((u) => u.user_dept).filter(Boolean))],
    [users]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch = !q || u.user_name?.toLowerCase().includes(q) || u.user_dept?.toLowerCase().includes(q);
      const matchRole   = !roleFilter || u.user_role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const pageData = paginate(filtered);
  const handleFilterChange = (setter) => (val) => { setter(val); resetPage(); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await deleteUserAccess(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, flexDirection: "column", gap: 12 }}>
        <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading users...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Modals */}
      {deleteTarget && (
        <DeleteModal user={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleteLoading} />
      )}
      {viewUser && <PermissionsModal user={viewUser} onClose={() => setViewUser(null)} />}

      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">User Access Management</h1>
          <p className="page-subtitle">Manage user roles and page permissions</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/user-access")} style={{ whiteSpace: "nowrap" }}>
          + Add User
        </button>
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Users</div>
          <div className="kpi-value">{users.length}</div>
          <div className="kpi-meta">Active accounts</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Admins</div>
          <div className="kpi-value">{users.filter((u) => ["admin", "super_admin"].includes(u.user_role)).length}</div>
          <div className="kpi-meta">Super admin + Admin</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Departments</div>
          <div className="kpi-value">{departments.length}</div>
          <div className="kpi-meta">Unique departments</div>
        </div>
        <div className="kpi-card yellow">
          <div className="kpi-label">Showing</div>
          <div className="kpi-value">{filtered.length}</div>
          <div className="kpi-meta">Matching filters</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="filter-bar">
        <SearchBar
          value={search}
          onChange={handleFilterChange(setSearch)}
          placeholder="Search by name or department..."
        />
        <FilterSelect
          value={roleFilter}
          onChange={handleFilterChange(setRoleFilter)}
          options={USER_ROLES}
          placeholder="All Roles"
        />
        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {filtered.length} user{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">👥 Users</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{users.length} total</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No users found matching your filters.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Pages Access</th>
                    <th>Permissions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((user, idx) => (
                    <tr key={user.id}>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {(page - 1) * pageSize + idx + 1}
                      </td>

                      {/* User cell */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: "linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)",
                            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, fontSize: 14, flexShrink: 0,
                          }}>
                            {user.user_name?.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{user.user_name}</span>
                        </div>
                      </td>

                      <td>
                        <span style={{
                          fontSize: 13, color: "var(--text-secondary)",
                          background: "var(--bg)", padding: "3px 8px", borderRadius: 6,
                          border: "1px solid var(--border)",
                        }}>
                          {user.user_dept || "—"}
                        </span>
                      </td>

                      <td><RoleBadge role={user.user_role} /></td>

                      <td>
                        {user.page_access?.length > 0 ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 13, color: "var(--text-secondary)",
                          }}>
                            <span style={{
                              background: "var(--accent)", color: "#fff",
                              borderRadius: "50%", width: 20, height: 20,
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              fontSize: 11, fontWeight: 700,
                            }}>
                              {user.page_access.length}
                            </span>
                            page{user.page_access.length !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>None</span>
                        )}
                      </td>

                      <td>
                        {user.page_access?.length > 0 ? (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setViewUser(user)}
                            style={{ fontSize: 12 }}
                          >
                            🔐 View
                          </button>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                        )}
                      </td>

                      <td>
                        <div className="action-row">
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => navigate("/user-access")}
                          >
                            ✏ Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeleteTarget(user)}
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default UserList;
