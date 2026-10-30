import React, { useState } from "react";
import { appointPastor } from "./api";
export function PastorAppointmentForm({ onChange }) {
  const [account, setAccount] = useState(""),
    [bio, setBio] = useState(""),
    [zone, setZone] = useState(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ),
    [listed, setListed] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await appointPastor({
        accountId: account.trim(),
        bio,
        timeZone: zone,
        listed,
      });
      setMessage("Pastor directory profile saved.");
      onChange();
    } catch (e) {
      setError(
        ["mfa_required", "reauthentication_required"].includes(e.code)
          ? "Confirm your identity and MFA in account security, then retry."
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-card" aria-label="Pastor directory administration">
      <h2>Publish a pastor profile</h2>
      <p>
        The account must already hold an active Assistant Pastor or Super Admin
        appointment. This form does not grant a church role.
      </p>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      <form onSubmit={save}>
        <div className="auth-field">
          <label htmlFor="pastoral-account">Pastor account ID</label>
          <input
            id="pastoral-account"
            required
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
        </div>
        <div className="auth-field">
          <label htmlFor="pastoral-zone">Pastor time zone (IANA)</label>
          <input
            id="pastoral-zone"
            required
            maxLength={100}
            value={zone}
            onChange={(e) => setZone(e.target.value)}
          />
        </div>
        <div className="auth-field">
          <label htmlFor="pastoral-bio">Public introduction</label>
          <textarea
            id="pastoral-bio"
            maxLength={1000}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
        <label>
          <input
            type="checkbox"
            checked={listed}
            onChange={(e) => setListed(e.target.checked)}
          />{" "}
          Show in pastor directory
        </label>
        <button className="btn gold" disabled={busy}>
          Save pastor profile
        </button>
      </form>
      <a href="#/profile">Account security</a>
    </section>
  );
}
