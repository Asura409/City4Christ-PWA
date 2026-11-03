import React, { useEffect, useState } from "react";
import { api } from "@/auth/session";
import { Avatar } from "@/components/Avatar";
import { hasCapability } from "../../js/access.js";
import { changeChurchRole, getAdminMember, getAdminMemberAccessAudit, getChurchRoles, searchAdminMembers, updateAdminMemberName } from "./adminApi";
import "./admin-members.css";

const PRIVILEGED_ROLE_OPTIONS = [
  ["staff", "Staff"],
  ["assistant_pastor", "Assistant pastor"],
  ["finance_officer", "Finance officer"],
  ["super_administrator", "Super administrator"],
];
const OPERATIONAL_ROLE_OPTIONS = [["content_editor", "Content editor"]];

export function AdminMemberSearch() {
  const [allowed, setAllowed] = useState(null);
  const [auditAllowed, setAuditAllowed] = useState(false);
  const [manageAllowed, setManageAllowed] = useState(false);
  const [roleManageAllowed, setRoleManageAllowed] = useState(false);
  const [privilegedRoleAllowed, setPrivilegedRoleAllowed] = useState(false);
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [cursor, setCursor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [auditEvents, setAuditEvents] = useState([]);
  const [auditCursor, setAuditCursor] = useState("");
  const [auditBusy, setAuditBusy] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [roles, setRoles] = useState([]);
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [roleNotice, setRoleNotice] = useState("");
  const [roleToAssign, setRoleToAssign] = useState("staff");
  const [roleReason, setRoleReason] = useState("");

  useEffect(() => {
    let active = true;
    api.request("/api/v1/me/access")
      .then(({ data }) => {
        if (active) {
          setAllowed(hasCapability(data, "members.records.read"));
          const systemAuditRole = (data.roles || []).some(({ role, scope }) => ["super_administrator", "system_administrator"].includes(role) && scope === "");
          setAuditAllowed(systemAuditRole && hasCapability(data, "members.records.audit.read"));
          setManageAllowed(hasCapability(data, "members.records.manage"));
          const privileged = hasCapability(data, "roles.privileged.manage");
          setPrivilegedRoleAllowed(privileged);
          setRoleManageAllowed(privileged || hasCapability(data, "roles.operational.manage") || hasCapability(data, "roles.manage"));
        }
      })
      .catch((e) => { if (active) { setAllowed(false); setError(e.message); } });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (allowed !== true) {
      setMembers([]);
      setCursor("");
      setSelected(null);
      setError("");
      setBusy(false);
      return undefined;
    }
    if (trimmed.length > 0 && trimmed.length < 3) {
      setMembers([]);
      setCursor("");
      setSelected(null);
      setError("");
      setBusy(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true); setError(""); setMembers([]); setCursor(""); setSelected(null); setDetailError("");
      try {
        const page = await searchAdminMembers(trimmed, { signal: controller.signal });
        setMembers(page.members); setCursor(page.nextCursor);
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [allowed, query]);

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
    setAuditEvents([]); setAuditCursor(""); setAuditError("");
    setRoles([]); setRoleError(""); setRoleNotice(""); setRoleReason("");
    try {
      const detail = await getAdminMember(id);
      setSelected(detail);
      setEditFirstName(detail.firstName);
      setEditLastName(detail.lastName);
      setEditReason("");
      setEditError("");
      if (roleManageAllowed) setRoles(await getChurchRoles(id));
    }
    catch (e) { setDetailError(e.message); }
    finally { setDetailBusy(false); }
  }

  async function updateRole(event, revoke = false) {
    event.preventDefault();
    if (!selected || !roleReason.trim()) return;
    setRoleBusy(true); setRoleError(""); setRoleNotice("");
    try {
      await changeChurchRole(selected.id, { role: roleToAssign, reason: roleReason.trim(), revoke });
      setRoles(await getChurchRoles(selected.id));
      setRoleReason("");
      setRoleNotice(revoke ? "Role revoked." : "Role assigned.");
    } catch (e) { setRoleError(e.message); }
    finally { setRoleBusy(false); }
  }

  async function revokeRole(role, scope = "") {
    if (!selected || !roleReason.trim()) {
      setRoleError("Enter a reason before revoking a role.");
      return;
    }
    setRoleBusy(true); setRoleError(""); setRoleNotice("");
    try {
      await changeChurchRole(selected.id, { role, scope, reason: roleReason.trim(), revoke: true });
      setRoles(await getChurchRoles(selected.id));
      setRoleReason("");
      setRoleNotice("Role revoked.");
    } catch (e) { setRoleError(e.message); }
    finally { setRoleBusy(false); }
  }

  async function showAudit(id, cursor = "") {
    setAuditBusy(true); setAuditError("");
    if (!cursor) setAuditEvents([]);
    try {
      const page = await getAdminMemberAccessAudit(id, { cursor });
      setAuditEvents((current) => cursor ? [...current, ...page.events] : page.events);
      setAuditCursor(page.nextCursor);
    } catch (e) { setAuditError(e.message); }
    finally { setAuditBusy(false); }
  }

  async function correctName(e) {
    e.preventDefault();
    if (!selected) return;
    setEditBusy(true); setEditError("");
    const input = { expectedVersion: selected.version, reason: editReason.trim() };
    if (editFirstName.trim() !== selected.firstName) input.firstName = editFirstName;
    if (editLastName.trim() !== selected.lastName) input.lastName = editLastName;
    if (!input.firstName && !input.lastName) {
      setEditError("Change a first or last name before saving.");
      setEditBusy(false);
      return;
    }
    try {
      const updated = await updateAdminMemberName(selected.id, input);
      setSelected((current) => ({ ...current, ...updated }));
      setEditFirstName(updated.firstName);
      setEditLastName(updated.lastName);
      setEditReason("");
      if (auditAllowed) await showAudit(selected.id);
    } catch (e) { setEditError(e.message); }
    finally { setEditBusy(false); }
  }

  return (
    <section className="screen active admin-members" aria-label="Member administration">
      <h1>Member lookup</h1>
      <p>Read-only search for verified, active members. This view shows basic account details only.</p>
      {allowed === null && <p role="status">Checking member lookup access…</p>}
      {allowed === false && <p role="alert">{error || "You do not have permission to search member records."}</p>}
      {allowed && <>
        <form className="admin-members-search" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="member-search">Search by name or email</label>
          <div className="admin-members-search-row">
            <input id="member-search" type="search" minLength={3} maxLength={100} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Start typing a name or email…" autoComplete="off" />
          </div>
          <small className="admin-members-search-hint">All members load automatically. Type at least 3 characters to filter the roster.</small>
        </form>
        {error && <p role="alert">{error}</p>}
        {busy && <p role="status">Searching members…</p>}
        {!busy && !error && members.length === 0 && <p>{query ? "No matching members were found." : "No verified active members were found."}</p>}
        <div className="admin-member-list" aria-label="Search results">
          {members.map((member) => <article className="admin-member-card" key={member.id}>
            <div className="admin-member-card-heading">
              <Avatar name={`${member.firstName} ${member.lastName}`} src={member.avatar?.url || member.avatarUrl} size={48} />
              <div><h2>{member.firstName} {member.lastName}</h2><p>Joined {new Date(member.joinedAt).toLocaleDateString()}</p></div>
            </div>
            <button className="btn soft" disabled={detailBusy} onClick={() => showDetails(member.id)}>View member details</button>
            {roleManageAllowed && <button className="btn gold" disabled={detailBusy} onClick={() => showDetails(member.id)}>Assign role</button>}
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
          {manageAllowed && <form className="admin-member-edit" onSubmit={correctName}>
            <h3>Correct member name</h3>
            <label htmlFor="admin-member-first-name">First name</label>
            <input id="admin-member-first-name" maxLength={100} required value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
            <label htmlFor="admin-member-last-name">Last name</label>
            <input id="admin-member-last-name" maxLength={100} required value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
            <label htmlFor="admin-member-edit-reason">Reason for correction</label>
            <input id="admin-member-edit-reason" maxLength={500} required value={editReason} onChange={(e) => setEditReason(e.target.value)} />
            <p>Only names can be changed here. Do not include private care information in the reason.</p>
            <button className="btn dark" disabled={editBusy || !editReason.trim()}>{editBusy ? "Saving…" : "Save name correction"}</button>
            {editError && <p role="alert">{editError}</p>}
          </form>}
          {roleManageAllowed && <section className="admin-member-roles" aria-label="Assign church role">
            <h3>Church roles</h3>
            {roles.length > 0 ? <ul>{roles.map((assignment) => <li key={`${assignment.role}:${assignment.scope}`}><span>{assignment.role.replaceAll("_", " ")}{assignment.scope ? ` · ${assignment.scope}` : ""}</span><button className="btn soft" type="button" disabled={roleBusy || !roleReason.trim()} onClick={() => void revokeRole(assignment.role, assignment.scope)}>Revoke</button></li>)}</ul> : <p>No elevated roles assigned.</p>}
            <form onSubmit={(event) => updateRole(event)}>
              <label htmlFor="admin-member-role">Role<select id="admin-member-role" value={roleToAssign} onChange={(event) => setRoleToAssign(event.target.value)}>{(privilegedRoleAllowed ? [...PRIVILEGED_ROLE_OPTIONS, ...OPERATIONAL_ROLE_OPTIONS] : OPERATIONAL_ROLE_OPTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label htmlFor="admin-member-role-reason">Reason<input id="admin-member-role-reason" required maxLength={500} value={roleReason} onChange={(event) => setRoleReason(event.target.value)} placeholder="Why is this role needed?" /></label>
              <button className="btn gold" disabled={roleBusy || !roleReason.trim()}>{roleBusy ? "Saving…" : "Assign role"}</button>
            </form>
            {roleNotice && <p role="status">{roleNotice}</p>}
            {roleError && <p role="alert">{roleError}</p>}
            <small>Role changes require a fresh administrator session. Protected roles also require the member to have verified MFA.</small>
          </section>}
          {auditAllowed && <>
            <button className="btn soft" disabled={auditBusy} onClick={() => showAudit(selected.id)}>Review member record history</button>
            {auditBusy && <p role="status">Loading access history…</p>}
            {auditError && <p role="alert">{auditError}</p>}
            {auditEvents.length > 0 && <section aria-label="Member email access history">
              <h3>Member record history</h3>
              <div className="admin-audit-table-wrap">
                <table className="admin-audit-table">
                  <caption className="sr-only">Member record access history</caption>
                  <thead><tr><th scope="col">Action</th><th scope="col">Staff account</th><th scope="col">Fields accessed</th><th scope="col">Reason</th><th scope="col">Date</th></tr></thead>
                  <tbody>{auditEvents.map((event) => <tr key={event.id}>
                    <td><span className="admin-audit-action">{event.action.replaceAll("_", " ")}</span></td>
                    <td><code>{event.actorId}</code></td>
                    <td><div className="admin-audit-fields">{event.sensitiveFields.map((field) => <span key={field}>{field}</span>)}</div></td>
                    <td>{event.reason || "—"}</td>
                    <td><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString()}</time></td>
                  </tr>)}</tbody>
                </table>
              </div>
              {auditCursor && <button className="btn soft" disabled={auditBusy} onClick={() => showAudit(selected.id, auditCursor)}>Load more access history</button>}
            </section>}
          </>}
        </section>}
        {cursor && <button className="btn soft" disabled={busy} onClick={more}>Load more members</button>}
      </>}
    </section>
  );
}
