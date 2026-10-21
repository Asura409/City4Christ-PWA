import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { api } from "@/auth/session";
export default function VerifyScreen() {
  const { state } = useLocation(),
    navigate = useNavigate();
  const [email, setEmail] = useState(state?.email || ""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(
      "Check your email for the verification code.",
    ),
    [error, setError] = useState("");
  const [resendAt, setResendAt] = useState(0);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.verify(email, code);
      navigate("/login", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setCode("");
      setBusy(false);
    }
  }
  async function resend() {
    if (Date.now() < resendAt) {
      setMessage("Wait sixty seconds before requesting another code.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.resend(email);
      setResendAt(Date.now() + 60000);
      setMessage(
        "If verification is needed, another code will be emailed when eligible.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout title="Verify email">
      <p role="status">{message}</p>
      {error && <p role="alert">{error}</p>}
      <form aria-label="Verify email" onSubmit={submit}>
        <div className="auth-field">
          <label htmlFor="verify-email">Email</label>
          <input
            id="verify-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="auth-field">
          <label htmlFor="verify-code">Verification code</label>
          <input
            id="verify-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{8}"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <button className="btn gold block" disabled={busy}>
          Verify email
        </button>
      </form>
      <button
        className="btn soft block"
        disabled={busy || !email}
        onClick={resend}
      >
        Resend code
      </button>
      <Link to="/login">Back to sign in</Link>
    </AuthLayout>
  );
}
