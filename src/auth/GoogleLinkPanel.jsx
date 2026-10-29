import React, { useState } from "react";
import { api } from "./session";
import {
  googleProviderURL,
  googleReturnURL,
  googleErrorMessage,
} from "./google";

export function GoogleLinkPanel({ hasPassword }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [mfa, setMFA] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  async function link() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.beginGoogleLink(googleReturnURL("link"));
      location.assign(googleProviderURL(data.url));
    } catch (e) {
      if (e.status === 401 || e.code === "fresh_auth_required") {
        setConfirm(true);
        setError("Confirm your identity below, then try Link Google again.");
      } else if (e.code === "mfa_required") {
        setMFA(true);
        setError(googleErrorMessage(e.code));
      } else
        setError(
          e.message || "Google linking is unavailable. Please try again.",
        );
    } finally {
      setBusy(false);
    }
  }
  async function confirmIdentity(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mfa) await api.verifyMFA(code);
      else await api.reauthenticatePassword(password);
      setMessage("Identity confirmed. Choose Link Google to continue.");
      setConfirm(false);
      setMFA(false);
    } catch (e) {
      setError(e.message || "Identity confirmation failed.");
    } finally {
      setPassword("");
      setCode("");
      setBusy(false);
    }
  }
  async function confirmGoogle() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.beginGoogleReauthentication(
        googleReturnURL("link"),
      );
      location.assign(googleProviderURL(data.url));
    } catch (e) {
      setError(e.message || "Google identity confirmation failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-card" aria-label="Google account linking">
      <h2>Google account</h2>
      <p>
        Link a verified Google account with the same email so you can use
        Continue with Google.
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <button className="btn soft block" disabled={busy} onClick={link}>
        Link Google
      </button>
      {(mfa || (confirm && hasPassword)) && (
        <form
          aria-label="Confirm identity for Google linking"
          onSubmit={confirmIdentity}
        >
          <div className="auth-field">
            <label htmlFor="google-link-confirmation">
              {mfa ? "Authenticator code" : "Current password"}
            </label>
            <input
              id="google-link-confirmation"
              type={mfa ? "text" : "password"}
              autoComplete={mfa ? "one-time-code" : "current-password"}
              inputMode={mfa ? "numeric" : undefined}
              required
              maxLength={mfa ? 6 : 1024}
              value={mfa ? code : password}
              onChange={(e) =>
                mfa ? setCode(e.target.value) : setPassword(e.target.value)
              }
              disabled={busy}
            />
          </div>
          <button className="btn soft" disabled={busy}>
            Confirm identity
          </button>
        </form>
      )}
      {confirm && !hasPassword && (
        <button className="btn soft" disabled={busy} onClick={confirmGoogle}>
          Confirm with Google
        </button>
      )}
    </section>
  );
}
