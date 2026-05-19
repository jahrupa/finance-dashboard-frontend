import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
// import { ALL_PAGES, USER_ROLES, DEPARTMENTS, CRUD_OPERATIONS } from '../constants/pages'
import "../styles/UserAccessForm.css";
import { createUserAccess, updateUserAccess } from "../api/Service";

const defaultCrud = {
  create: false,
  read: false,
  update: false,
  delete: false,
};
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

const USER_ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "team_lead", label: "Team Lead" },
  { value: "client", label: "Client" },
  { value: "employee", label: "Employee" },
];

const DEPARTMENTS = [
  "Engineering",
  "Design",
  "Product",
  "Marketing",
  "Sales",
  "HR",
  "Finance",
  "Operations",
  "Support",
  "Legal",
];

const CRUD_OPERATIONS = ["create", "read", "update", "delete"];

function UserAccessForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // ✅ Lazy initializer (No useEffect needed)
  const getInitialForm = () => {
    if (!isEdit) {
      return {
        user_name: "",
        user_email: "",
        user_dept: "",
        user_role: "",
        page_access: [],
        crud_access: {},
      };
    }

    const users = JSON.parse(localStorage.getItem("user_access") || "[]");
    const existing = users.find((u) => String(u.id) === String(id));

    if (!existing) {
      return {
        user_name: "",
        user_email: "",
        user_dept: "",
        user_role: "",
        page_access: [],
        crud_access: {},
      };
    }

    return {
      user_name: existing.user_name,
      user_email: existing.user_email,
      user_dept: existing.user_dept,
      user_role: existing.user_role,
      page_access: existing.page_access || [],
      crud_access: existing.crud_access || {},
    };
  };

  const [form, setForm] = useState(getInitialForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ================= VALIDATION =================
  function validate() {
    const e = {};
    if (!form.user_name.trim()) e.user_name = "User name is required";
    if (!form.user_email.trim()) e.user_email = "Email is required";
    if (!form.user_dept) e.user_dept = "Department is required";
    if (!form.user_role) e.user_role = "Role is required";
    if (form.page_access.length === 0)
      e.page_access = "Select at least one page";
    return e;
  }

  // ================= FIELD CHANGE =================
  function handleField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  // ================= PAGE TOGGLE =================
  function togglePage(page) {
    setForm((prev) => {
      const isSelected = prev.page_access.includes(page);

      const updatedPages = isSelected
        ? prev.page_access.filter((p) => p !== page)
        : [...prev.page_access, page];

      const updatedCrud = { ...prev.crud_access };

      if (isSelected) {
        delete updatedCrud[page];
      } else {
        updatedCrud[page] = { ...defaultCrud };
      }

      return {
        ...prev,
        page_access: updatedPages,
        crud_access: updatedCrud,
      };
    });

    setErrors((prev) => ({ ...prev, page_access: undefined }));
  }

  // ================= CRUD TOGGLE =================
  function toggleCrud(page, operation) {
    setForm((prev) => ({
      ...prev,
      crud_access: {
        ...prev.crud_access,
        [page]: {
          ...(prev.crud_access[page] || defaultCrud),
          [operation]: !prev.crud_access?.[page]?.[operation],
        },
      },
    }));
  }

  // ================= SELECT ALL CRUD =================
  function selectAllCrud(page) {
    setForm((prev) => {
      const current = prev.crud_access[page] || defaultCrud;
      const allSelected = CRUD_OPERATIONS.every((op) => current[op]);

      return {
        ...prev,
        crud_access: {
          ...prev.crud_access,
          [page]: Object.fromEntries(
            CRUD_OPERATIONS.map((op) => [op, !allSelected]),
          ),
        },
      };
    });
  }

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    const isAllCrudFalse = Object.values(form.crud_access || {}).every(
      (module) =>
        !module.create && !module.read && !module.update && !module.delete,
    );
    const payload = {
      name: form.user_name.trim(),
      email: form.user_email.trim(),
      user_dept: form.user_dept,
      role: form.user_role,
      page_access: isAllCrudFalse ? [] : form.page_access,
      crud_access: form.crud_access,
    };

    try {
      setLoading(true);

      if (isEdit) {
        await updateUserAccess(id, payload);
      } else {
        await createUserAccess(payload);
      }

      navigate("/user-list");
    } catch (error) {
      console.error("User Access Save Failed:", error);
      setErrors((prev) => ({
        ...prev,
        submit: error?.message || "Something went wrong",
      }));
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  return (
    <div className="">
      <div className="ua-header">
        {/* <button className="ua-back-btn" onClick={() => navigate('/')}>
          &#8592; Back
        </button> */}
        <h1 className="ua-title">
          {isEdit ? "Edit User Access" : "Add User Access"}
        </h1>
      </div>

      <form className="ua-form" onSubmit={handleSubmit}>
        {errors.submit && (
          <div className="ua-error-banner">{errors.submit}</div>
        )}

        <div className="ua-section">
          <h2 className="ua-section-title">User Details</h2>
          <div className="ua-row">
            <div className="ua-field">
              <label className="ua-label">
                User Name <span className="ua-req">*</span>
              </label>
              <input
                className={`ua-input ${errors.user_name ? "ua-input-error" : ""}`}
                type="text"
                placeholder="Enter user name"
                value={form.user_name}
                onChange={(e) => handleField("user_name", e.target.value)}
              />
              {errors.user_name && (
                <span className="ua-field-error">{errors.user_name}</span>
              )}
            </div>
            <div className="ua-field">
              <label className="ua-label">
                User Email <span className="ua-req">*</span>
              </label>
              <input
                className={`ua-input ${errors.user_email ? "ua-input-error" : ""}`}
                type="email"
                placeholder="Enter user email"
                value={form.user_email}
                onChange={(e) => handleField("user_email", e.target.value)}
              />
              {errors.user_email && (
                <span className="ua-field-error">{errors.user_email}</span>
              )}
            </div>

            <div className="ua-field">
              <label className="ua-label">
                Department <span className="ua-req">*</span>
              </label>
              <select
                className={`ua-select ${errors.user_dept ? "ua-input-error" : ""}`}
                value={form.user_dept}
                onChange={(e) => handleField("user_dept", e.target.value)}
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {errors.user_dept && (
                <span className="ua-field-error">{errors.user_dept}</span>
              )}
            </div>

            <div className="ua-field">
              <label className="ua-label">
                User Role <span className="ua-req">*</span>
              </label>
              <select
                className={`ua-select ${errors.user_role ? "ua-input-error" : ""}`}
                value={form.user_role}
                onChange={(e) => handleField("user_role", e.target.value)}
              >
                <option value="">Select role</option>
                {USER_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {errors.user_role && (
                <span className="ua-field-error">{errors.user_role}</span>
              )}
            </div>
          </div>
        </div>

        <div className="ua-section">
          <h2 className="ua-section-title">Page Access & Permissions</h2>
          {errors.page_access && (
            <div className="ua-error-banner">{errors.page_access}</div>
          )}

          <p className="ua-hint">
            Select pages to grant access, then configure CRUD permissions per
            page.
          </p>

          <div className="ua-pages-grid">
            {ALL_PAGES.map((page) => {
              const selected = form.page_access.includes(page);
              const crud = form.crud_access[page] || defaultCrud;
              const allSelected = CRUD_OPERATIONS.every((op) => crud[op]);

              return (
                <div
                  key={page}
                  className={`ua-page-card ${selected ? "ua-page-card--active" : ""}`}
                >
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
                        <button
                          type="button"
                          className="ua-select-all-btn"
                          onClick={() => selectAllCrud(page)}
                        >
                          {allSelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>

                      <div className="ua-crud-ops">
                        {CRUD_OPERATIONS.map((op) => (
                          <label
                            key={op}
                            className={`ua-crud-op ${crud[op] ? "ua-crud-op--on" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={crud[op] || false}
                              onChange={() => toggleCrud(page, op)}
                            />
                            <span>
                              {op.charAt(0).toUpperCase() + op.slice(1)}
                            </span>
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

        <div className="ua-form-actions">
          <button
            type="button"
            className="ua-btn ua-btn-secondary"
            onClick={()=> setForm(getInitialForm())}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="ua-btn ua-btn-primary"
            disabled={loading}
          >
            {loading ? "Saving..." : isEdit ? "Update User" : "Add User"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserAccessForm;
