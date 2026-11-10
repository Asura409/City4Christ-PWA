import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./session";
import { googleProviderURL, googleReturnURL } from "./google";

export function SessionConfirmation({
  requireMFA = false,
  reason = "",
  revision = 0,
  open = true,
  onReady,
  onClose,
}) {
  const [primary, setPrimary] = useState(null),
    [factor, setFactor] = useState(null),
    [method, setMethod] = useState(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const passwordRef = useRef(null),
    codeRef = useRef(null),
    dialogRef = useRef(null),
    generation = useRef(0),
    notifiedReady = useRef(false);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (typeof dialog.showModal === "function" && !dialog.matches(":modal")) {
        if (dialog.open) dialog.close();
        dialog.showModal();
      } else if (typeof dialog.showModal !== "function") {
        dialog.setAttribute("open", "");
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  const load = useCallback(async () => {
    const version = ++generation.current;
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
    const second = m.enabled ? Date.parse(m.freshUntil) > Date.now() : !requireMFA;
    if (fresh && second && !notifiedReady.current) {
      notifiedReady.current = true;
      readyRef.current?.(true);
    }
  }, [requireMFA]);

  useEffect(() => {
    notifiedReady.current = false;
    setError("");
    setPrimary(null);
    setFactor(null);
    setMethod(null);
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
      // The OAuth callback is a full browser navigation, so remember the
      // protected screen that opened this confirmation. The callback screen
      // restores it after the server has recorded fresh authentication.
      sessionStorage.setItem(
        "city4christ:reauth-return",
        `${location.pathname}${location.search}${location.hash}`,
      );
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
    <dialog
      ref={dialogRef}
      className="confirmation-dialog"
      aria-label="Confirm sensitive action"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose?.();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !busy) onClose?.();
      }}
    >
      <div className="confirmation-dialog-card">
        <button
          className="confirmation-dialog-close"
          type="button"
          aria-label="Cancel confirmation"
          onClick={onClose}
          disabled={busy}
        >
          ×
        </button>
        <section className="auth-card" aria-label="Confirm sensitive action">
          <h3>Confirm your identity</h3>
          <p>
            {reason ||
              "This action needs a fresh confirmation. It applies only to this session and does not submit anything until you continue."}
          </p>
          {error && <p role="alert">{error}</p>}
          {!primary && !error && (
            <p role="status">Checking identity confirmation…</p>
          )}
          {primary && (
            <>
              {primary.fresh && (
                <p role="status">Primary identity is confirmed.</p>
              )}
              {!primary.fresh && (
                <>
                  <p>Choose how you want to confirm this session.</p>
                  {!method && (
                    <div
                      className="confirmation-methods"
                      aria-label="Identity confirmation methods"
                    >
                      {primary.passwordAvailable && (
                        <button
                          className="btn soft"
                          type="button"
                          disabled={busy}
                          onClick={() => setMethod("password")}
                        >
                          Confirm with password
                        </button>
                      )}
                      {primary.googleAvailable && (
                        <button
                          className="btn soft"
                          type="button"
                          disabled={busy}
                          onClick={google}
                        >
                          Confirm with Google
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
              {primary.passwordAvailable &&
                method === "password" &&
                !primary.fresh && (
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
                        autoFocus
                      />
                    </label>
                    <button className="btn soft" disabled={busy}>
                      Confirm with password
                    </button>
                  </form>
                )}
              {primary.googleAvailable && method === "google" && !primary.fresh && (
                <div className="confirmation-selected-method">
                  <button className="btn soft" disabled={busy} onClick={google}>
                    Confirm with Google
                  </button>
                  {primary.passwordAvailable && !busy && (
                    <button
                      className="confirmation-change-method"
                      type="button"
                      onClick={() => setMethod(null)}
                    >
                      Use password instead
                    </button>
                  )}
                </div>
              )}
              {primary.passwordAvailable &&
                method === "password" &&
                !primary.fresh &&
                primary.googleAvailable && (
                  <button
                    className="confirmation-change-method"
                    type="button"
                    disabled={busy}
                    onClick={() => setMethod(null)}
                  >
                    Use Google instead
                  </button>
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
                  autoFocus
                />
              </label>
              <button className="btn soft" disabled={busy}>
                Confirm authenticator
              </button>
            </form>
          )}
          {requireMFA && factor && !factor.enabled && (
            <p>
              Authenticator protection is required for this action. Set it up
              from Sign-in and security, then return here.
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
      </div>
    </dialog>
  );
}
