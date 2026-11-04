import React, { useEffect, useState } from "react";
import { appointPastor } from "./api";
import { searchAdminMembers } from "@/members/adminApi";
export function PastorAppointmentForm({ onChange }) {
  const [account, setAccount] = useState(null),
    [memberQuery, setMemberQuery] = useState(""),
    [members, setMembers] = useState([]),
    [membersBusy, setMembersBusy] = useState(false),
    [membersError, setMembersError] = useState(""),
    [bio, setBio] = useState(""),
    [zone, setZone] = useState(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ),
    [listed, setListed] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setMembersBusy(true);
      setMembersError("");
      try {
        const page = await searchAdminMembers(memberQuery, {
          limit: 50,
          signal: controller.signal,
        });
        setMembers(page.members);
      } catch (e) {
        if (e.name !== "AbortError") setMembersError(e.message);
      } finally {
        if (!controller.signal.aborted) setMembersBusy(false);
      }
    }, memberQuery.trim() ? 250 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [memberQuery]);

  async function save(e) {
    e.preventDefault();
    if (!account) {
      setError("Choose a member account before saving the pastor profile.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await appointPastor({
        accountId: account.id,
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
        Choose a verified member who already holds an active Assistant Pastor or
        Super Admin appointment. This form publishes their directory profile;
        it does not grant a church role.
      </p>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      <form onSubmit={save}>
        <div className="auth-field">
          <label htmlFor="pastoral-member-search">Choose pastor account</label>
          <input
            id="pastoral-member-search"
            type="search"
            value={account ? `${account.firstName} ${account.lastName}` : memberQuery}
            onChange={(e) => {
              setAccount(null);
              setMemberQuery(e.target.value);
            }}
            placeholder="Search by name or email"
            autoComplete="off"
          />
          {account ? (
            <small className="pastoral-selected-member" role="status">
              Selected: {account.firstName} {account.lastName} · {account.email}
            </small>
          ) : (
            <div className="pastoral-member-options" role="listbox" aria-label="Member accounts">
              {membersBusy && <small>Loading members…</small>}
              {!membersBusy && !membersError && !members.length && <small>No matching members found.</small>}
              {members.map((member) => (
                <button
                  type="button"
                  className="pastoral-member-option"
                  key={member.id}
                  onClick={() => {
                    setAccount(member);
                    setMemberQuery("");
                    setError("");
                  }}
                >
                  <strong>{member.firstName} {member.lastName}</strong>
                  <span>{member.email}</span>
                </button>
              ))}
            </div>
          )}
          {membersError && <small role="alert">Could not load member accounts: {membersError}</small>}
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
