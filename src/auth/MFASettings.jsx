import React, { useEffect, useState } from "react";
import { TimedMessage } from "@/components/TimedMessage";
import { api } from "./session";
import { useConfirmedAction } from "./identityConfirmation";

export function MFASettings({ onStatus }) {
  const runConfirmed = useConfirmedAction();
  const [status, setStatus] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [disableConsent, setDisableConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const { data } = await api.mfaStatus();
      setStatus(data);
      onStatus?.(data);
    } catch (reason) {
      setError(reason.message || "Authenticator status is unavailable.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function start() {
    setBusy(true); setError(""); setMessage("");
    try {
      const { data } = await runConfirmed(() => api.beginMFA());
      setEnrollment(data);
      setRecoveryCodes([]);
    } catch (reason) {
      setError(reason.message);
    } finally { setBusy(false); }
  }

  async function complete(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const { data } = await runConfirmed(() => api.confirmMFA(enrollment.id, code));
      setRecoveryCodes(data.recoveryCodes || []);
      setEnrollment(null);
      setCode("");
      setMessage("Authenticator protection is enabled. Save your recovery codes securely.");
      await load();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function regenerate() {
    setBusy(true); setError(""); setMessage("");
    try {
      const { data } = await runConfirmed(() => api.regenerateMFARecovery());
      setRecoveryCodes(data.recoveryCodes || []);
      setMessage("New recovery codes generated. Previous unused codes are no longer valid.");
      await load();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function disable(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      await runConfirmed(() => api.disableMFA());
      setRecoveryCodes([]);
      setDisableConsent(false);
      setMessage("Authenticator protection is disabled.");
      await load();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  const enabled = Boolean(status?.enabled);
  return (
    <section className="auth-card mfa-settings" aria-label="Authenticator protection">
      <div className="mfa-settings-heading"><div><p className="group-eyebrow">ACCOUNT SECURITY</p><h2>Authenticator protection</h2></div><span className={`mfa-status ${enabled ? "is-enabled" : ""}`}>{enabled ? "Enabled" : "Not enabled"}</span></div>
      <p>Add an authenticator app to protect sensitive account actions and role assignments.</p>
      <TimedMessage tone="error" message={error} />
      <TimedMessage message={message} />
      {!status && !error && <p role="status">Checking authenticator status…</p>}
      {status && <>
        {!enabled && !enrollment && <>
          <p className="mfa-help">Use an app such as Google Authenticator, Microsoft Authenticator, or 1Password. You will receive recovery codes after setup.</p>
          <button className="btn gold" type="button" disabled={busy} onClick={start}>Set up authenticator</button>
        </>}
        {enrollment && <div className="mfa-enrollment">
          <h3>Finish authenticator setup</h3>
          <p>Scan this QR code, or enter the setup key manually in your authenticator app.</p>
          {enrollment.qrImage?.startsWith("data:image/") && <img className="mfa-setup-qr" src={enrollment.qrImage} alt="Authenticator setup QR code" />}
          <div className="mfa-secret-wrap">
            <span>Manual setup key</span>
            <code className="mfa-secret">{enrollment.secret}</code>
          </div>
          <form onSubmit={complete}>
            <label className="auth-field">Setup verification code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} /></label>
            <button className="btn gold" disabled={busy}>{busy ? "Enabling…" : "Enable authenticator"}</button>
          </form>
        </div>}
        {enabled && !enrollment && <>
          <p className="mfa-help">Authenticator protection is active. When a sensitive action needs confirmation, a popup will ask for your code.</p>
          <div className="mfa-actions"><button className="btn soft" type="button" disabled={busy} onClick={regenerate}>Generate new recovery codes</button><form onSubmit={disable}><label><input type="checkbox" checked={disableConsent} onChange={(event) => setDisableConsent(event.target.checked)} required /> I want to disable authenticator protection</label><button className="btn danger" disabled={busy || !disableConsent}>Disable authenticator</button></form></div>
        </>}
        {recoveryCodes.length > 0 && <div className="mfa-recovery-codes"><strong>Save these recovery codes now</strong><p>They are shown only once and each code can be used once.</p><ul>{recoveryCodes.map((item) => <li key={item}><code>{item}</code></li>)}</ul></div>}
      </>}
    </section>
  );
}
