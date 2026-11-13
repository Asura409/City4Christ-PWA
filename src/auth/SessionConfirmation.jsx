import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./session";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { RefreshButton } from "@/components/RefreshButton";

export function SessionConfirmation({ requireMFA = false, reason = "", revision = 0, open = true, onReady, onClose }) {
  const [primary, setPrimary] = useState(null);
  const [factor, setFactor] = useState(null);
  const [method, setMethod] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef(null), codeRef = useRef(null), dialogRef = useRef(null);
  const generation = useRef(0), notifiedReady = useRef(false), readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement;
    if (open) {
      if (typeof dialog.showModal === "function" && !dialog.matches(":modal")) {
        if (dialog.open) dialog.close();
        dialog.showModal();
      } else if (typeof dialog.showModal !== "function") dialog.setAttribute("open", "");
    } else if (dialog.open) dialog.close();
    return () => { dialog.close(); if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, [open]);

  const load = useCallback(async () => {
    const version = ++generation.current;
    const [{ data: p }, { data: m }] = await Promise.all([api.reauthenticationStatus(), api.mfaStatus()]);
    if (version !== generation.current) return;
    if (typeof p?.fresh !== "boolean" || typeof p.passwordAvailable !== "boolean" || typeof m?.enabled !== "boolean")
      throw new Error("Identity confirmation is unavailable.");
    const fresh = p.fresh && Date.parse(p.freshUntil) > Date.now();
    const second = m.enabled ? Date.parse(m.freshUntil) > Date.now() : !requireMFA;
    setPrimary({ ...p, fresh });
    setFactor(m);
    setMethod(m.enabled && (fresh || requireMFA || !p.passwordAvailable) ? "authenticator" : p.passwordAvailable ? "password" : null);
    if (fresh && second && !notifiedReady.current) {
      notifiedReady.current = true;
      readyRef.current?.(true);
    }
  }, [requireMFA]);

  useEffect(() => {
    notifiedReady.current = false;
    setError(""); setPrimary(null); setFactor(null); setMethod(null);
    void load().catch((e) => setError(e.message));
    return () => {
      ++generation.current;
      if (passwordRef.current) passwordRef.current.value = "";
      if (codeRef.current) codeRef.current.value = "";
    };
  }, [load, revision]);

  async function confirm(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (method === "password") await api.reauthenticatePassword(passwordRef.current.value);
      else await api.reauthenticateAuthenticator(codeRef.current.value);
      await load();
    } catch (e) { setError(e.message); }
    finally {
      if (passwordRef.current) passwordRef.current.value = "";
      if (codeRef.current) codeRef.current.value = "";
      setBusy(false);
    }
  }
  function changeMethod(next) {
    if (passwordRef.current) passwordRef.current.value = "";
    if (codeRef.current) codeRef.current.value = "";
    setError(""); setMethod(next);
  }

  return <dialog ref={dialogRef} className="confirmation-dialog" aria-label="Confirm sensitive action"
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose?.(); }}
    onClick={(event) => { if (event.target === dialogRef.current && !busy) onClose?.(); }}>
    <div className="confirmation-dialog-card">
      <button className="confirmation-dialog-close" type="button" aria-label="Cancel confirmation" onClick={onClose} disabled={busy}>×</button>
      <section className="auth-card" aria-label="Confirm sensitive action">
        <h3>Confirm your identity</h3>
        <p>{reason || "Confirm this sensitive action using your account password or authenticator app."}</p>
        {error && <p role="alert">{error}</p>}
        {!primary && !error && <LoadingSpinner label="Checking identity confirmation" />}
        {primary && factor && <>
          {primary.fresh && <p role="status">Primary identity is confirmed.</p>}
          {method === "password" && !primary.fresh && <form aria-label="Confirm password for sensitive action" onSubmit={confirm}>
            <label className="auth-field">Current password
              <input ref={passwordRef} type="password" autoComplete="current-password" required maxLength={1024} disabled={busy} autoFocus />
            </label>
            <button className="btn soft" disabled={busy}>Confirm with password</button>
          </form>}
          {method === "authenticator" && factor.enabled && <form aria-label="Confirm authenticator for sensitive action" onSubmit={confirm}>
            <label className="auth-field">Authenticator code
              <input ref={codeRef} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required minLength={6} maxLength={6} disabled={busy} autoFocus />
            </label>
            <button className="btn soft" disabled={busy}>Confirm authenticator</button>
          </form>}
          {!primary.fresh && primary.passwordAvailable && factor.enabled && !requireMFA && <button className="confirmation-change-method" type="button" disabled={busy} onClick={() => changeMethod(method === "password" ? "authenticator" : "password")}>
            {method === "password" ? "Use authenticator app instead" : "Use password instead"}
          </button>}
          {primary.passwordAvailable && factor.enabled && method === "password" && <p>Your account also requires an authenticator code before continuing.</p>}
          {!primary.passwordAvailable && !factor.enabled && <p>This account has no password or authenticator configured. Contact church support to set up a confirmation method.</p>}
          {requireMFA && !factor.enabled && <p>Authenticator protection is required for this action. Set it up from Sign-in and security, then return here.</p>}
        </>}
        <RefreshButton label="Check confirmation" busy={busy} onClick={async () => { setError(""); try { await load(); } catch (e) { setError(e.message); } }} />
      </section>
    </div>
  </dialog>;
}
