import React, { useEffect, useState } from "react";
import { api } from "./session";
import { SessionConfirmation } from "./SessionConfirmation";

export function MFASettings() {
  const [status, setStatus] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [proofReady, setProofReady] = useState(false);
  const [proofRevision, setProofRevision] = useState(0);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const { data } = await api.mfaStatus();
      setStatus(data);
    } catch (reason) {
      setError(reason.message || "Authenticator status is unavailable.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function start({ keepMessage = false } = {}) {
    setBusy(true); setError(""); if (!keepMessage) setMessage("");
    try {
      const { data } = await api.beginMFA();
      setEnrollment(data);
      setRecoveryCodes([]);
    } catch (reason) {
      setError(reason.message);
      if (["reauthentication_required", "mfa_required"].includes(reason.code)) {
        setProofReady(false);
        setProofRevision((value) => value + 1);
        setConfirmationOpen(true);
      }
    } finally { setBusy(false); }
  }

  function requestProtectedAction(action) {
    if (proofReady) {
      if (action === "setup") void start();
      if (action === "regenerate") void regenerate();
      return;
    }
    setPendingAction(action);
    setConfirmationOpen(true);
  }

  function proofCompleted(ready) {
    setProofReady(ready);
    if (!ready) return;
    if (!confirmationOpen && !pendingAction) return;
    setConfirmationOpen(false);
    if (pendingAction === "setup") {
      setPendingAction("");
      setMessage("Identity confirmed. Continuing to authenticator setup…");
      void start({ keepMessage: true });
    } else {
      setMessage("Identity confirmed. You can now continue with the security action.");
    }
  }

  async function confirm(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const { data } = await api.confirmMFA(enrollment.id, code);
      setRecoveryCodes(data.recoveryCodes || []);
      setEnrollment(null);
      setCode("");
      setMessage("Authenticator protection is enabled. Save your recovery codes securely.");
      await load();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function verify(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      await api.verifyMFA(code);
      setCode(""); setProofReady(true);
      setMessage("Authenticator confirmed for this session.");
      await load();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function useRecovery(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      await api.recoverMFA(recoveryCode);
      setRecoveryCode(""); setProofReady(true);
      setMessage("Recovery code accepted for this session.");
      await load();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function regenerate() {
    setBusy(true); setError(""); setMessage("");
    try {
      const { data } = await api.regenerateMFARecovery();
      setRecoveryCodes(data.recoveryCodes || []);
      setMessage("New recovery codes generated. Previous unused codes are no longer valid.");
      await load();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function disable(event) {
    event.preventDefault();
    if (!proofReady) {
      setConfirmationOpen(true);
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      await api.disableMFA();
      setRecoveryCodes([]); setProofReady(false); setMessage("Authenticator protection is disabled.");
      await load();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  const enabled = Boolean(status?.enabled);
  return (
    <section className="auth-card mfa-settings" aria-label="Authenticator protection">
      <div className="mfa-settings-heading"><div><p className="group-eyebrow">ACCOUNT SECURITY</p><h2>Authenticator protection</h2></div><span className={`mfa-status ${enabled ? "is-enabled" : ""}`}>{enabled ? "Enabled" : "Not enabled"}</span></div>
      <p>Add an authenticator app to protect sensitive account actions and role assignments.</p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {!status && !error && <p role="status">Checking authenticator status…</p>}
      {status && <>
        {!enabled && !enrollment && <>
          <p className="mfa-help">Use an app such as Google Authenticator, Microsoft Authenticator, or 1Password. You will receive recovery codes after setup.</p>
          <SessionConfirmation revision={proofRevision} onReady={setProofReady} />
          <button className="btn gold" type="button" disabled={busy} onClick={() => requestProtectedAction("setup")}>Set up authenticator</button>
        </>}
        {enrollment && <div className="mfa-enrollment">
          <h3>Finish authenticator setup</h3>
          <p>Scan this QR code, or enter the setup key manually in your authenticator app.</p>
          {enrollment.qrImage?.startsWith("data:image/") && <img className="mfa-setup-qr" src={enrollment.qrImage} alt="Authenticator setup QR code" />}
          <div className="mfa-secret-wrap">
            <span>Manual setup key</span>
            <code className="mfa-secret">{enrollment.secret}</code>
          </div>
          <form onSubmit={confirm}>
            <label className="auth-field">Setup verification code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} /></label>
            <button className="btn gold" disabled={busy}>{busy ? "Enabling…" : "Enable authenticator"}</button>
          </form>
        </div>}
        {enabled && !enrollment && <>
          <p className="mfa-help">Authenticator protection is active. Confirm a code when a sensitive action requests it.</p>
          <SessionConfirmation modal open={confirmationOpen} onClose={() => setConfirmationOpen(false)} revision={proofRevision} onReady={proofCompleted} />
          <form onSubmit={verify} className="mfa-inline-form"><label className="auth-field">Authenticator code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} /></label><button className="btn soft" disabled={busy}>Verify authenticator</button></form>
          <form onSubmit={useRecovery} className="mfa-inline-form"><label className="auth-field">Recovery code<input required maxLength={43} value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value)} /></label><button className="btn soft" disabled={busy}>Use recovery code</button></form>
          <div className="mfa-actions"><button className="btn soft" type="button" disabled={busy} onClick={() => requestProtectedAction("regenerate")}>Generate new recovery codes</button><form onSubmit={disable}><label><input type="checkbox" required /> I want to disable authenticator protection</label><button className="btn danger" disabled={busy}>Disable authenticator</button></form></div>
        </>}
        {recoveryCodes.length > 0 && <div className="mfa-recovery-codes"><strong>Save these recovery codes now</strong><p>They are shown only once and each code can be used once.</p><ul>{recoveryCodes.map((item) => <li key={item}><code>{item}</code></li>)}</ul></div>}
      </>}
    </section>
  );
}
