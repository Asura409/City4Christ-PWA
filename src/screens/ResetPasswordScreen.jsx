import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { TimedMessage } from "@/components/TimedMessage";
import { api } from "@/auth/session";

export default function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [token] = useState(() => params.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (token) navigate("/reset-password", { replace: true });
  }, [navigate, token]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      setError("This reset link is invalid or expired. Request a new one.");
      return;
    }
    if (password.length < 15) {
      setError("Your new password must be at least 15 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (reason) {
      setError(reason.message || "The password could not be reset.");
    } finally {
      setBusy(false);
      setPassword("");
      setConfirm("");
    }
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Secure your City4Christ account">
      {done ? (
        <>
          <TimedMessage message="Your password has been updated. Sign in with your new password." />
          <Link className="btn gold block" to="/login">Back to sign in</Link>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          {error && <p className="auth-err" role="alert">{error}</p>}
          <p>Use at least 15 characters. This link works once and expires after 15 minutes.</p>
          <div className="auth-field"><label htmlFor="reset-password">New password</label><input id="reset-password" type="password" autoComplete="new-password" minLength={15} maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} required /></div>
          <div className="auth-field"><label htmlFor="reset-confirm">Confirm new password</label><input id="reset-confirm" type="password" autoComplete="new-password" minLength={15} maxLength={1024} value={confirm} onChange={(event) => setConfirm(event.target.value)} disabled={busy} required /></div>
          <button className="btn gold block" disabled={busy}>{busy ? "Saving password…" : "Save new password"}</button>
          <Link to="/login">Back to sign in</Link>
        </form>
      )}
    </AuthLayout>
  );
}
