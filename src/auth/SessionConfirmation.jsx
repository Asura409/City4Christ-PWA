import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./session";
import { googleProviderURL, googleReturnURL } from "./google";

export function SessionConfirmation({
  requireMFA = false,
  revision = 0,
  onReady,
  modal = false,
  open = true,
  onClose,
}) {
  const [primary, setPrimary] = useState(null),
    [factor, setFactor] = useState(null),
    [method, setMethod] = useState(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const passwordRef = useRef(null),
    codeRef = useRef(null),
    generation = useRef(0);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const load = useCallback(async () => {
    const version = ++generation.current;
    readyRef.current?.(false);
    const [{ data: p }, { data: m }] = await Promise.all([
      api.reauthenticationStatus(),
      api.mfaStatus(),
    ]);
    if (version !== generation.current) return;
    if (typeof p?.fresh !== "boolean" || typeof m?.enabled !== "boolean")
      throw new Error("Identity confirmation is unavailable.");
    setPrimary(p);
    setFactor(m);
    setMethod(
      p.fresh
        ? null
        : p.passwordAvailable && !p.googleAvailable
          ? "password"
          : !p.passwordAvailable && p.googleAvailable
            ? "google"
            : null,
    );
    const fresh = p.fresh && Date.parse(p.freshUntil) > Date.now();
    const second = m.enabled
      ? Date.parse(m.freshUntil) > Date.now()
      : !requireMFA;
    readyRef.current?.(fresh && second);
  }, [requireMFA]);
  useEffect(() => {
    setError("");
    void load().catch((e) => setError(e.message));
    return () => {
      ++generation.current;
      if (passwordRef.current) passwordRef.current.value = "";
      if (codeRef.current) codeRef.current.value = "";
    };
  }, [load, revision]);
  async function confirm(event, kind) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (kind === "password")
        await api.reauthenticatePassword(passwordRef.current.value);
      else await api.verifyMFA(codeRef.current.value);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      if (passwordRef.current) passwordRef.current.value = "";
      if (codeRef.current) codeRef.current.value = "";
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.beginGoogleReauthentication(
        googleReturnURL("link"),
      );
      location.assign(googleProviderURL(data.url));
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  const panel = (
    <section className="auth-card" aria-label="Confirm sensitive action">
      <h3>Confirm your identity</h3>
      <p>
        Confirmation applies only to this session. After confirming, choose the
        action yourself; confirmation does not submit a request.
      </p>
      {error && <p role="alert">{error}</p>}
      {!primary && !error && (
        <p role="status">Checking identity confirmation…</p>
      )}
      {primary && (
        <>
          {primary.fresh && <p role="status">Primary identity is confirmed.</p>}
          {!primary.fresh && (
            <>
              <p>Choose how you want to confirm this session.</p>
              {!method && (
                <div className="confirmation-methods" aria-label="Identity confirmation methods">
                  {primary.passwordAvailable && <button className="btn soft" type="button" disabled={busy} onClick={() => setMethod("password")}>Confirm with password</button>}
                  {primary.googleAvailable && <button className="btn soft" type="button" disabled={busy} onClick={google}>Confirm with Google</button>}
                </div>
              )}
            </>
          )}
          {primary.passwordAvailable && method === "password" && !primary.fresh && (
            <form
              aria-label="Confirm password for sensitive action"
              onSubmit={(e) => confirm(e, "password")}
            >
              <label className="auth-field">
                Current password
                <input
                  ref={passwordRef}
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={1024}
                  disabled={busy}
                />
              </label>
              <button className="btn soft" disabled={busy}>
                Confirm with password
              </button>
            </form>
          )}
          {primary.googleAvailable && method === "google" && !primary.fresh && (
            <div className="confirmation-selected-method">
              <button className="btn soft" disabled={busy} onClick={google}>Confirm with Google</button>
              {primary.passwordAvailable && !busy && <button className="confirmation-change-method" type="button" onClick={() => setMethod(null)}>Use password instead</button>}
            </div>
          )}
          {primary.passwordAvailable && method === "password" && !primary.fresh && primary.googleAvailable && (
            <button className="confirmation-change-method" type="button" disabled={busy} onClick={() => setMethod(null)}>Use Google instead</button>
          )}
          {!primary.passwordAvailable && !primary.googleAvailable && (
            <p>No confirmation method is available. Contact church support.</p>
          )}
        </>
      )}
      {primary?.fresh && factor?.enabled && (
        <form
          aria-label="Confirm authenticator for sensitive action"
          onSubmit={(e) => confirm(e, "mfa")}
        >
          <label className="auth-field">
            Authenticator code
            <input
              ref={codeRef}
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
              maxLength={6}
              disabled={busy}
            />
          </label>
          <button className="btn soft" disabled={busy}>
            Confirm authenticator
          </button>
        </form>
      )}
      {requireMFA && factor && !factor.enabled && (
        <p>
          Authenticator protection is required for review. Set it up using{" "}
          <a href="/profile.html">Advanced security tools</a>, then return here.
        </p>
      )}
      <button
        className="confirmation-refresh"
        type="button"
        disabled={busy}
        onClick={() => {
          setError("");
          void load().catch((e) => setError(e.message));
        }}
      >
        Check confirmation
      </button>
    </section>
  );
  if (!modal) return panel;
  return (
    <dialog className="confirmation-dialog" open={open} aria-label="Confirm sensitive action">
      <div className="confirmation-dialog-card">
        <button className="confirmation-dialog-close" type="button" aria-label="Close confirmation" onClick={onClose} disabled={busy}>×</button>
        {panel}
      </div>
    </dialog>
  );
}
