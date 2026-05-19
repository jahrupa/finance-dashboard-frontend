import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

const ROLES = [
  { value: "", label: "Select a role…" },
  { value: "finance", label: "Finance Reviewer" },
  { value: "hod", label: "Head of Department (HOD)" },
  { value: "payment_approver", label: "Payment Approver" },
  { value: "processor", label: "Payment Processor" },
  { value: "admin", label: "Admin" },
];

export default function RegisterPage() {
  const { register, isAuthenticated, authError, clearError, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (authError) setLocalError(authError);
  }, [authError]);

  const handleChange = (e) => {
    setLocalError("");
    clearError();
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!form.name.trim()) return "Full name is required.";
    if (!form.email.trim()) return "Email address is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Please enter a valid email address.";
    if (form.password.length < 8)
      return "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword)
      return "Passwords do not match.";
    if (!form.role) return "Please select a role.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setLocalError(err);
      return;
    }
    setSubmitting(true);
    const { confirmPassword, ...payload } = form;
    const result = await register(payload);
    setSubmitting(false);
    if (result.success) {
      navigate("/", { replace: true });
    }
  };

  const passwordStrength = (pwd) => {
    if (!pwd) return null;
    if (pwd.length < 6) return { label: "Weak", level: 1 };
    if (pwd.length < 8) return { label: "Fair", level: 2 };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd))
      return { label: "Strong", level: 4 };
    if (/[A-Z]/.test(pwd) || /[0-9]/.test(pwd))
      return { label: "Good", level: 3 };
    return { label: "Fair", level: 2 };
  };

  const strength = passwordStrength(form.password);

  return (
    <div className="auth-page">
      <div className="auth-bg-pattern" aria-hidden="true" />

      <div className="auth-card auth-card-wide">
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-icon">AP</div>
          <div>
            <div className="auth-brand-name">PayFlow</div>
            <div className="auth-brand-sub">Accounts Payable</div>
          </div>
        </div>

        <div className="auth-header">
          <h1 className="auth-title">Create an account</h1>
          <p className="auth-subtitle">Join your team on PayFlow</p>
        </div>

        {localError && (
          <div className="auth-error-banner" role="alert">
            <span className="auth-error-icon">⚠</span>
            <span>{localError}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className="auth-input"
              placeholder="Samir Kapoor"
              value={form.name}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="auth-input"
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              name="role"
              required
              className="auth-input auth-select"
              value={form.role}
              onChange={handleChange}
              disabled={submitting}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value} disabled={!r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <div className="auth-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                className="auth-input auth-input-with-icon"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={handleChange}
                disabled={submitting}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
            {strength && (
              <div className="auth-strength">
                <div className="auth-strength-bars">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className={`auth-strength-bar ${n <= strength.level ? `level-${strength.level}` : ""}`}
                    />
                  ))}
                </div>
                <span className={`auth-strength-label level-${strength.level}`}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              className={`auth-input ${
                form.confirmPassword && form.confirmPassword !== form.password
                  ? "auth-input-error"
                  : form.confirmPassword && form.confirmPassword === form.password
                  ? "auth-input-success"
                  : ""
              }`}
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            className={`auth-submit-btn ${submitting ? "auth-submit-loading" : ""}`}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="auth-btn-spinner" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
