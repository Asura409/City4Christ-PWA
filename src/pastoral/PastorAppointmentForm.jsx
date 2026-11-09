import React, { useEffect, useState } from "react";
import { appointPastor } from "./api";
import { listMembers } from "@/members/directoryApi";
import { Avatar } from "@/components/Avatar";
import { UK_TIME_ZONE } from "../../js/time.js";
export function PastorAppointmentForm({ onChange }) {
  const [account, setAccount] = useState(null),
    [memberQuery, setMemberQuery] = useState(""),
    [members, setMembers] = useState([]),
    [membersBusy, setMembersBusy] = useState(true),
    [membersError, setMembersError] = useState(""),
    [pageCursors, setPageCursors] = useState([""]),
    [pageIndex, setPageIndex] = useState(0),
    [nextCursor, setNextCursor] = useState(""),
    [retry, setRetry] = useState(0),
    [bio, setBio] = useState(""),
    [listed, setListed] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setMembersBusy(true);
    setMembersError("");
    setMembers([]);
    setNextCursor("");
    const timer = setTimeout(async () => {
      try {
        const page = await listMembers({
          query: memberQuery,
          cursor: pageCursors[pageIndex],
          limit: 20,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setMembers(page.members);
        setNextCursor(page.nextCursor);
      } catch (e) {
        if (!controller.signal.aborted) setMembersError(e.message);
      } finally {
        if (!controller.signal.aborted) setMembersBusy(false);
      }
    }, memberQuery.trim() ? 250 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [memberQuery, pageIndex, pageCursors, retry]);

  function filterMembers(value) {
    setMembersBusy(true);
    setMemberQuery(value);
    setPageCursors([""]);
    setPageIndex(0);
  }

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
        timeZone: UK_TIME_ZONE,
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
    <section className="pastoral-profile-editor" aria-label="Pastor directory administration">
      <h2>Publish a pastor profile</h2>
      <p>
        Select a member account and complete their public pastoral profile.
        Eligibility is checked when you save the profile.
      </p>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      <form onSubmit={save}>
        <div className="auth-field">
          <label htmlFor="pastoral-member-search">Filter members by name</label>
          <input
            id="pastoral-member-search"
            type="search"
            value={memberQuery}
            onChange={(e) => filterMembers(e.target.value)}
            placeholder="Search member names…"
            autoComplete="off"
          />
          {account && (
            <small className="pastoral-selected-member" role="status">
              Selected: {account.firstName} {account.lastName}
            </small>
          )}
          {membersBusy && <p role="status">Loading member accounts…</p>}
          {membersError && <div role="alert"><p>Could not load member accounts: {membersError}</p><button className="btn soft" type="button" onClick={() => setRetry((value) => value + 1)}>Retry loading members</button></div>}
          {!membersBusy && !membersError && <>
            <table className="pastoral-member-table">
              <caption>Member accounts · page {pageIndex + 1}</caption>
              <thead><tr><th scope="col">Member</th><th scope="col">Select account</th></tr></thead>
              <tbody>{members.map((member) => <tr key={member.id} className={account?.id === member.id ? "is-selected" : ""}>
                <td><span className="pastoral-member-identity"><Avatar name={`${member.firstName} ${member.lastName}`} src={member.avatar?.url} size={36} /><strong>{member.firstName} {member.lastName}</strong></span></td>
                <td><input type="radio" name="pastoral-account" aria-label={`Select ${member.firstName} ${member.lastName}`} checked={account?.id === member.id} onChange={() => { setAccount(member); setError(""); setMessage(""); }} /></td>
              </tr>)}{!members.length && <tr><td colSpan={2}>{memberQuery.trim() ? "No matching members found." : "No member accounts available."}</td></tr>}</tbody>
            </table>
          </>}
          <nav className="pastoral-member-pagination" aria-label="Member account pages">
            <button type="button" className="btn soft" disabled={membersBusy || pageIndex === 0} onClick={() => { setMembersBusy(true); setPageIndex((value) => value - 1); }}>Previous</button>
            <span>Page {pageIndex + 1}</span>
            <button type="button" className="btn soft" disabled={membersBusy || Boolean(membersError) || !nextCursor} onClick={() => { setMembersBusy(true); setPageCursors((values) => [...values.slice(0, pageIndex + 1), nextCursor]); setPageIndex((value) => value + 1); }}>Next</button>
          </nav>
        </div>
        <div className="auth-field">
          <label htmlFor="pastoral-zone">Pastor time zone (IANA)</label>
          <input
            id="pastoral-zone"
            required
            maxLength={100}
            value={UK_TIME_ZONE}
            readOnly
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
        <button className="btn gold" disabled={busy || !account}>
          {busy ? "Saving profile…" : "Save pastor profile"}
        </button>
      </form>
      <a href="#/profile">Account security</a>
    </section>
  );
}
