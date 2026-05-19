import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/UserList.css";
import { deleteUserAccess, getAllUserAccess } from "../api/Service";
import DeleteModal from "../components/DeleteModal";

const USER_ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "team_lead", label: "Team Lead" },
  { value: "client", label: "Client" },
  { value: "employee", label: "Employee" },
];

function getRoleLabel(value) {
  return USER_ROLES.find((r) => r.value === value)?.label || value;
}

function RoleBadge({ role }) {
  return (
    <span className={`ul-badge ul-badge--${role}`}>
      {getRoleLabel(role)}
    </span>
  );
}

function CrudPills({ crud }) {
  if (!crud) return <span className="ul-none">—</span>;

  const ops = ["create", "read", "update", "delete"];
  const active = ops.filter((op) => crud?.[op]);

  if (active.length === 0)
    return <span className="ul-none">No permissions</span>;

  return (
    <div className="ul-crud-pills">
      {active.map((op) => (
        <span key={op} className={`ul-crud-pill ul-crud-pill--${op}`}>
          {op.charAt(0).toUpperCase() + op.slice(1)}
        </span>
      ))}
    </div>
  );
}

// function DeleteModal({ user, onConfirm, onCancel, loading }) {
//   return (
//     <div className="ul-modal-overlay" onClick={onCancel}>
//       <div className="ul-modal" onClick={(e) => e.stopPropagation()}>
//         <div className="ul-modal-icon">&#9888;</div>
//         <h3 className="ul-modal-title">Delete User Access</h3>
//         <p className="ul-modal-msg">
//           Are you sure you want to delete access for{" "}
//           <strong>{user.user_name}</strong>? This action cannot be undone.
//         </p>
//         <div className="ul-modal-actions">
//           <button
//             className="ua-btn ua-btn-secondary"
//             onClick={onCancel}
//             disabled={loading}
//           >
//             Cancel
//           </button>
//           <button
//             className="ua-btn ua-btn-danger"
//             onClick={onConfirm}
//             disabled={loading}
//           >
//             {loading ? "Deleting..." : "Delete"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

function UserList() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // ✅ Fetch Users from API
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getAllUserAccess();
      setUsers(res.data || []);   
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Optimized Filtering
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !search ||
        u.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.user_dept?.toLowerCase().includes(search.toLowerCase());

      const matchRole = !roleFilter || u.user_role === roleFilter;

      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  // ✅ Delete using API
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteLoading(true);
      await deleteUserAccess(deleteTarget.id);

      setUsers((prev) =>
        prev.filter((u) => u.id !== deleteTarget.id)
      );

      setDeleteTarget(null);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <div className="ul-loading">Loading users...</div>;
  }

  return (
    <div className="">
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      <div className="ul-top">
        <div>
          <h1 className="ul-title">User Access Management</h1>
          <p className="ul-subtitle">
            Manage user roles and page permissions
          </p>
        </div>
        <button
          className="ua-btn ua-btn-primary ul-add-btn"
          onClick={() => navigate("")}
        >
          + Add User
        </button>
      </div>

      <div className="ul-filters">
        <input
          className="ul-search"
          type="text"
          placeholder="Search by name or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="ul-filter-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {USER_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <span className="ul-count">
          {filtered.length} user
          {filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="ul-empty">
          <div className="ul-empty-icon">&#128100;</div>
          <p>No users found</p>
        </div>
      ) : (
        <div className="table-wrapper card">
  <table>
    <thead>
      <tr>
        <th>User</th>
        <th>Department</th>
        <th>Role</th>
        <th>Permissions</th>
        <th>Actions</th>
      </tr>
    </thead>

    <tbody>
      {filtered.length === 0 ? (
        <tr>
          <td colSpan={5}>
            <div className="empty-state">
              <div className="empty-state-icon">👤</div>
              <div className="empty-state-text">
                No users found
              </div>
            </div>
          </td>
        </tr>
      ) : (
        filtered.map((user) => {
          const isExpanded = expandedUser === user.id;

          return (
            <React.Fragment key={user.id} >
              <tr>
                {/* User */}
                <td>
                  <div className="ul-name-cell">
                    <div className="ul-avatar">
                      {user.user_name?.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600 }}>
                      {user.user_name}
                    </span>
                  </div>
                </td>

                {/* Department */}
                <td>
                  <span className="badge badge-gray">
                    {user.user_dept}
                  </span>
                </td>

                {/* Role */}
                <td>
                  <span className={`badge ${
                    user.user_role === "Admin"
                      ? "badge-red"
                      : user.user_role === "Manager"
                      ? "badge-cyan"
                      : "badge-green"
                  }`}>
                    {user.user_role}
                  </span>
                </td>

                {/* Permissions */}
                <td>
                  {user.page_access?.length > 0 ? (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() =>
                        setExpandedUser(
                          isExpanded ? null : user.id
                        )
                      }
                    >
                      {isExpanded
                        ? "Hide Permissions"
                        : "View Permissions"}
                    </button>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>
                      No pages
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        navigate(`/user-access`)
                      }
                    >
                       ✏️
                    </button>

                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() =>
                        setDeleteTarget(user)
                      }
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>

              {/* Expand Row */}
              {isExpanded && (
                <tr>
                  <td colSpan={5}>
                    <div
                      style={{
                        background: "#f9fafb",
                        padding: 16,
                        borderRadius: 8,
                      }}
                    >
                      <h4 style={{ marginBottom: 12 }}>
                        Page Permissions for{" "}
                        {user.user_name}
                      </h4>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(220px, 1fr))",
                          gap: 12,
                        }}
                      >
                        {user.page_access.map((page) => (
                          <div
                            key={page}
                            style={{
                              background: "#fff",
                              padding: 12,
                              borderRadius: 6,
                              border: "1px solid #eee",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 600,
                                marginBottom: 6,
                              }}
                            >
                              {page}
                            </div>

                            <CrudPills
                              crud={
                                user.crud_access?.[page]
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })
      )}
    </tbody>
  </table>
</div>
      )}
    </div>
  );
}

export default UserList;