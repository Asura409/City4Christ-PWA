import React, { useEffect, useState } from "react";
import { api } from "@/auth/session";
import { hasCapability } from "../../js/access.js";
import { getAdminMember, searchAdminMembers } from "./adminApi";
import "./admin-members.css";

export function AdminMemberSearch() {
  const [allowed, setAllowed] = useState(null);
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [cursor, setCursor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    let active = true;
    api.request("/api/v1/me/access")
      .then(({ data }) => { if (active) setAllowed(hasCapability(data, "members.records.read")); })
      .catch((e) => { if (active) { setAllowed(false); setError(e.message); } });
    return () => { active = false; };
  }, []);

  async function search(e) {
    e.preventDefault();
    if (query.trim().length < 3) return;
    setBusy(true); setError(""); setMembers([]); setCursor(""); setSelected(null); setDetailError("");
    try {
      const page = await searchAdminMembers(query);
      setMembers(page.members); setCursor(page.nextCursor);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function more() {
    setBusy(true); setError("");
    try {
      const page = await searchAdminMembers(query, { cursor });
      setMembers((current) => [...current, ...page.members]); setCursor(page.nextCursor);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function showDetails(id) {
    setDetailBusy(true); setDetailError(""); setSelected(null);
    try { setSelected(await getAdminMember(id)); }
    catch (e) { setDetailError(e.message); }
    finally { setDetailBusy(false); }
  }

  return (
    <section className="screen active admin-members" aria-label="Member administration">
      <h1>Member lookup</h1>
      <p>Read-only search for verified, active members. This view shows basic account details only.</p>
      {allowed === null && <p role="status">Checking member lookup access…</p>}
      {allowed === false && <p role="alert">{error || "You do not have permission to search member records."}</p>}
      {allowed && <>
        <form className="admin-members-search" onSubmit={search}>
          <label htmlFor="member-search">Search by name or email</label>
          <div className="admin-members-search-row">
            <input id="member-search" minLength={3} maxLength={100} required value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="btn dark" disabled={busy || query.trim().length < 3}>Search members</button>
          </div>
        </form>
        {error && <p role="alert">{error}</p>}
        {busy && <p role="status">Searching members…</p>}
        {!busy && !error && members.length === 0 && query && <p>No matching members were found.</p>}
        <div className="admin-member-list" aria-label="Search results">
          {members.map((member) => <article className="admin-member-card" key={member.id}>
            <h2>{member.firstName} {member.lastName}</h2>
            <p>Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
            <button className="btn soft" disabled={detailBusy} onClick={() => showDetails(member.id)}>View member details</button>
          </article>)}
        </div>
        {detailBusy && <p role="status">Loading member details…</p>}
        {detailError && <p role="alert">{detailError}</p>}
        {selected && <section className="auth-card" aria-label="Member details">
          <h2>{selected.firstName} {selected.lastName}</h2>
          <dl>
            <dt>Email</dt>
            <dd>{selected.email}</dd>
            <dt>Joined</dt>
            <dd>{new Date(selected.joinedAt).toLocaleDateString()}</dd>
          </dl>
        </section>}
        {cursor && <button className="btn soft" disabled={busy} onClick={more}>Load more members</button>}
      </>}
    </section>
  );
}
