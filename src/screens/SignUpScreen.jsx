import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { Icon } from "@/lib/icons";
import { api } from "@/auth/session";

const PW_RULES = [
  { test: (pw) => pw.length >= 15, label: "At least 15 characters" },
  { test: (pw) => /[A-Z]/.test(pw), label: "One uppercase letter" },
  { test: (pw) => /[0-9]/.test(pw), label: "One number" },
];

function strength(pw) {
  const score = PW_RULES.filter((r) => r.test(pw)).length;
  if (!pw) return { score: 0, label: "", color: "var(--muted)" };
  if (score === 1) return { score: 1, label: "Weak", color: "var(--rose)" };
  if (score === 2) return { score: 2, label: "Fair", color: "var(--gold)" };
  return { score: 3, label: "Strong", color: "var(--green)" };
}

export default function SignUpScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const sw = strength(form.password);

  function validate() {
    if (!form.firstName.trim()) return "First name is required.";
    if (!form.lastName.trim()) return "Last name is required.";
    const e = form.email.trim();
    if (!e) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      return "Enter a valid email address.";
    if (form.password.length < 15)
      return "Password must be at least 15 characters.";
    if (form.password !== form.confirm) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setError("");
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setLoading(true);
    try {
      await api.register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate("/verify", {
        replace: true,
        state: { email: form.email.trim() },
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setForm((f) => ({ ...f, password: "", confirm: "" }));
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Join the church"
      subtitle="Create your City4Christ account"
    >
      <form onSubmit={handleSubmit} noValidate autoComplete="on">
        {error && (
          <div className="auth-err" role="alert" aria-live="assertive">
            <Icon name="shield" />
            {error}
          </div>
        )}

        <div className="auth-row">
          <div className="auth-field">
            <label htmlFor="su-fn">First name</label>
            <input
              id="su-fn"
              type="text"
              name="given-name"
              autoComplete="given-name"
              value={form.firstName}
              onChange={set("firstName")}
              placeholder="Grace"
              maxLength={50}
              required
              disabled={loading}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="su-ln">Last name</label>
            <input
              id="su-ln"
              type="text"
              name="family-name"
              autoComplete="family-name"
              value={form.lastName}
              onChange={set("lastName")}
              placeholder="James"
              maxLength={50}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="su-email">Email</label>
          <input
            id="su-email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={form.email}
            onChange={set("email")}
            placeholder="you@example.com"
            maxLength={254}
            required
            disabled={loading}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="su-pw">Password</label>
          <div className="auth-pw-wrap">
            <input
              id="su-pw"
              type={showPw ? "text" : "password"}
              name="new-password"
              autoComplete="new-password"
              value={form.password}
              onChange={set("password")}
              placeholder="Create a strong password"
              maxLength={128}
              required
              disabled={loading}
              aria-describedby="pw-strength"
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              <Icon name={showPw ? "close" : "search"} />
            </button>
          </div>
          {form.password && (
            <div id="pw-strength" className="pw-strength" aria-live="polite">
              <div className="pw-bars">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="pw-bar"
                    style={{
                      background: sw.score >= i ? sw.color : "var(--surface-2)",
                    }}
                  />
                ))}
              </div>
              <span style={{ color: sw.color, fontSize: 12, fontWeight: 700 }}>
                {sw.label}
              </span>
            </div>
          )}
          <ul className="pw-rules" aria-label="Password requirements">
            {PW_RULES.map((r) => (
              <li key={r.label} className={r.test(form.password) ? "met" : ""}>
                <Icon name="check" />
                {r.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-field">
          <label htmlFor="su-confirm">Confirm password</label>
          <input
            id="su-confirm"
            type={showPw ? "text" : "password"}
            name="confirm-password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={set("confirm")}
            placeholder="Re-enter password"
            maxLength={128}
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="btn gold block auth-submit"
          disabled={loading}
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="auth-foot">
        Already have an account?{" "}
        <Link to="/login" className="auth-link">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
