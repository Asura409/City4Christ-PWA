import React, { useEffect, useState } from "react";
import { api } from "@/auth/session";
import { Avatar } from "@/components/Avatar";
import { hasCapability } from "../../js/access.js";
import { SessionConfirmation } from "@/auth/SessionConfirmation";
import { changeChurchRole, getAdminMember, getAdminMemberAccessAudit, getChurchRoles, searchAdminMembers } from "./adminApi";
import { listMembers } from "./directoryApi";
import "./admin-members.css";

const PRIVILEGED_ROLE_OPTIONS = [
  ["staff", "Staff"],
  ["assistant_pastor", "Assistant pastor"],
  ["finance_officer", "Finance officer"],
  ["super_administrator", "Super administrator"],
];
const OPERATIONAL_ROLE_OPTIONS = [["content_editor", "Content editor"]];

function readableRole(role) {
  return String(role || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function memberRoleLabels(member, roleByMember) {
  const roles = roleByMember[member.id] || (Array.isArray(member.roles) ? member.roles : (member.role ? [member.role] : []));
  return roles.map((role) => typeof role === "string" ? role : role.role).filter(Boolean).map(readableRole);
}

export function AdminMemberSearch() {
  const [allowed, setAllowed] = useState(null);
  const [auditAllowed, setAuditAllowed] = useState(false);
  const [roleManageAllowed, setRoleManageAllowed] = useState(false);
  const [privilegedRoleAllowed, setPrivilegedRoleAllowed] = useState(false);
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [cursor, setCursor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [roleByMember, setRoleByMember] = useState({});
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [auditEvents, setAuditEvents] = useState([]);
  const [auditCursor, setAuditCursor] = useState("");
  const [auditBusy, setAuditBusy] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [roles, setRoles] = useState([]);
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [roleNotice, setRoleNotice] = useState("");
  const [roleToAssign, setRoleToAssign] = useState("staff");
  const [roleReason, setRoleReason] = useState("");
  const [roleProofReady, setRoleProofReady] = useState(false);
  const [roleProofRevision, setRoleProofRevision] = useState(0);
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api.request("/api/v1/me/access")
      .then(({ data }) => {
        if (active) {
          setAllowed(hasCapability(data, "members.records.read"));
          const systemAuditRole = (data.roles || []).some(({ role, scope }) => ["super_administrator", "system_administrator"].includes(role) && scope === "");
          setAuditAllowed(systemAuditRole && hasCapability(data, "members.records.audit.read"));
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
        const page = trimmed
          ? await searchAdminMembers(trimmed, { signal: controller.signal })
          : await listMembers({ limit: 50, signal: controller.signal });
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
      const page = query.trim()
        ? await searchAdminMembers(query, { cursor })
        : await listMembers({ limit: 50, cursor });
      setMembers((current) => [...current, ...page.members]); setCursor(page.nextCursor);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function showDetails(id) {
    setDetailBusy(true); setDetailError(""); setSelected(null);
    setAuditEvents([]); setAuditCursor(""); setAuditError("");
    setRoles([]); setRoleError(""); setRoleNotice(""); setRoleReason("");
    setRoleProofReady(false);
    setRoleConfirmOpen(false);
    try {
      const detail = await getAdminMember(id);
      setSelected(detail);
      if (roleManageAllowed) {
        const currentRoles = await getChurchRoles(id);
        setRoles(currentRoles);
        setRoleByMember((current) => ({ ...current, [id]: currentRoles }));
      }
    }
    catch (e) { setDetailError(e.message); }
    finally { setDetailBusy(false); }
  }

  async function updateRole(event, revoke = false) {
    event.preventDefault();
    if (!selected || !roleReason.trim()) return;
    if (!roleProofReady) {
      setRoleError("");
      setRoleConfirmOpen(true);
      return;
    }
    if (!revoke && ["super_administrator", "assistant_pastor", "staff", "finance_officer"].includes(roleToAssign) && !selected.mfaEnabled) {
      setRoleError("This member must enable authenticator protection before receiving a protected church role.");
      return;
    }
    setRoleBusy(true); setRoleError(""); setRoleNotice("");
    try {
      await changeChurchRole(selected.id, { role: roleToAssign, reason: roleReason.trim(), revoke });
      const currentRoles = await getChurchRoles(selected.id);
      setRoles(currentRoles);
      setRoleByMember((current) => ({ ...current, [selected.id]: currentRoles }));
      setRoleReason("");
      setRoleNotice(revoke ? "Role revoked." : "Role assigned.");
    } catch (e) {
      setRoleError(e.message);
      if (["reauthentication_required", "mfa_required"].includes(e.code)) {
        setRoleProofReady(false);
        setRoleProofRevision((value) => value + 1);
        setRoleConfirmOpen(true);
      }
    }
    finally { setRoleBusy(false); }
  }

  async function revokeRole(role, scope = "") {
    if (!selected || !roleReason.trim()) {
      setRoleError("Enter a reason before revoking a role.");
      return;
    }
    if (!roleProofReady) {
      setRoleError("");
      setRoleConfirmOpen(true);
      return;
    }
    setRoleBusy(true); setRoleError(""); setRoleNotice("");
    try {
      await changeChurchRole(selected.id, { role, scope, reason: roleReason.trim(), revoke: true });
      const currentRoles = await getChurchRoles(selected.id);
      setRoles(currentRoles);
      setRoleByMember((current) => ({ ...current, [selected.id]: currentRoles }));
      setRoleReason("");
      setRoleNotice("Role revoked.");
    } catch (e) {
      setRoleError(e.message);
      if (["reauthentication_required", "mfa_required"].includes(e.code)) {
        setRoleProofReady(false);
        setRoleProofRevision((value) => value + 1);
        setRoleConfirmOpen(true);
      }
    }
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

  return (
    <section className="screen active admin-members" aria-label="Member administration">
      <h1>Member lookup</h1>
      <p>All verified, active members are listed below. Use search to filter the roster, or load the next page.</p>
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
        <div className="admin-member-table-wrap">
          <table className="admin-member-table">
            <caption className="sr-only">Member role administration</caption>
            <thead><tr><th scope="col">Member</th><th scope="col">Role</th><th scope="col" className="admin-member-actions-heading">Actions</th></tr></thead>
            <tbody>{members.map((member) => {
              const rolesForMember = memberRoleLabels(member, roleByMember);
              return <tr key={member.id}>
                <td>
                  <div className="admin-member-identity">
                    <Avatar name={`${member.firstName} ${member.lastName}`} src={member.avatar?.url || member.avatarUrl} size={44} />
                    <div><strong>{member.firstName} {member.lastName}</strong><small>{member.joinedAt ? `Joined ${new Date(member.joinedAt).toLocaleDateString()}` : "Church member"}</small></div>
                  </div>
                </td>
                <td><div className="admin-member-role-list">{rolesForMember.length ? rolesForMember.map((role) => <span className="admin-member-role" key={role}>{role}</span>) : <span className="admin-member-role member">Member</span>}</div></td>
                <td><div className="admin-member-actions"><button type="button" className="btn soft" disabled={detailBusy} onClick={() => showDetails(member.id)}>View details</button>{roleManageAllowed && <button type="button" className="btn gold" disabled={detailBusy} onClick={() => showDetails(member.id)}>Assign role</button>}</div></td>
              </tr>;
            })}</tbody>
          </table>
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
          <p>Members manage their own names from My account.</p>
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
            <SessionConfirmation modal open={roleConfirmOpen} onClose={() => setRoleConfirmOpen(false)} requireMFA revision={roleProofRevision} onReady={(ready) => { setRoleProofReady(ready); if (ready) { setRoleConfirmOpen(false); setRoleNotice("Identity confirmed. You can now submit the role change."); } }} />
            <small>Protected roles also require the selected member to have verified MFA. Confirmation applies only to this session and does not submit the role change.</small>
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
