import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./session";
import { googleProviderURL, googleReturnURL } from "./google";

export function SessionConfirmation({
  requireMFA = false,
  revision = 0,
  onReady,
}) {
  const [primary, setPrimary] = useState(null),
    [factor, setFactor] = useState(null);
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
  return (
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
          <p>
            {primary.fresh
              ? "Primary identity is confirmed."
              : "Confirm your password or linked Google account."}
          </p>
          {primary.passwordAvailable && (
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
          {primary.googleAvailable && (
            <button className="btn soft" disabled={busy} onClick={google}>
              Confirm with Google
            </button>
          )}
          {!primary.passwordAvailable && !primary.googleAvailable && (
            <p>No confirmation method is available. Contact church support.</p>
          )}
        </>
      )}
      {factor?.enabled && (
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
        className="btn soft"
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
}
