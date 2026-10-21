import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { api } from "@/auth/session";
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.forgotPassword(
        email,
        new URL("/auth.html", location.origin).href,
      );
      setMessage(
        "If the account is eligible, a password reset email will arrive shortly.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout title="Reset your password">
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      <form aria-label="Request password reset" onSubmit={submit}>
        <div className="auth-field">
          <label htmlFor="recovery-email">Email</label>
          <input
            id="recovery-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button className="btn gold block" disabled={busy}>
          Send reset email
        </button>
      </form>
      <Link to="/login">Back to sign in</Link>
    </AuthLayout>
  );
}
