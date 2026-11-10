import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { TimedMessage } from "@/components/TimedMessage";
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
        // The build serves this React shell at auth.html while preserving any
        // hosting prefix (for example /City4Christ-PWA/ on GitHub Pages).
        new URL("auth.html", location.href).href,
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
      <TimedMessage message={message} />
      <TimedMessage tone="error" message={error} />
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
