import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, useSession } from "./session";

export function ChangePasswordPanel({ hasPassword }) {
  const formRef = useRef(null);
  const mounted = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { clearSession } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    mounted.current = true;
    const form = formRef.current;
    return () => {
      mounted.current = false;
      form?.reset();
    };
  }, [hasPassword]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const values = new FormData(event.currentTarget);
    const currentPassword = values.get("currentPassword");
    const newPassword = values.get("newPassword");
    if (newPassword !== values.get("confirmation")) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      formRef.current?.reset();
      clearSession(
        "Password changed. Sign in again with your new password. Your other sessions have also been signed out.",
      );
      navigate("/login", { replace: true });
    } catch (error) {
      if (mounted.current) setError(error.message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <section className="auth-card" aria-label="Change password">
      <h2>Change password</h2>
      {hasPassword ? (
        <>
          <p>
            Changing your password signs you out on every device, including this
            one.
          </p>
          <p>
            Use at least 15 characters for your new password, up to 1,024 UTF-8
            bytes.
          </p>
          {error && <p role="alert">{error}</p>}
          <form ref={formRef} onSubmit={submit} aria-label="Change password">
            {[
              ["currentPassword", "Current password", "current-password"],
              ["newPassword", "New password", "new-password"],
              ["confirmation", "Confirm new password", "new-password"],
            ].map(([name, label, autoComplete]) => (
              <label className="auth-field" key={name}>
                {label}
                <input
                  name={name}
                  type="password"
                  autoComplete={autoComplete}
                  required
                  minLength={name === "currentPassword" ? undefined : 15}
                  maxLength={1024}
                  disabled={busy}
                />
              </label>
            ))}
            <button className="btn gold block" disabled={busy}>
              {busy ? "Changing password…" : "Change password"}
            </button>
          </form>
        </>
      ) : (
        <p>
          This account does not have a local password. Continue using Google to
          sign in.
        </p>
      )}
    </section>
  );
}
