import React, { useState } from "react";
import { searchAdminMembers } from "@/members/adminApi";
import { assignVisitor } from "./api";

export function VisitorAssignmentPanel({ visitor, onAssigned, onError }) {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [removeReason, setRemoveReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function search(e) {
    e.preventDefault(); setBusy(true); setMessage(""); setSelected("");
    try { setMembers((await searchAdminMembers(query)).members); }
    catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }
  async function save(accountId, assignmentReason = reason) {
    setBusy(true); setMessage("");
    try {
      await assignVisitor(visitor.id, { accountId, reason: assignmentReason, version: visitor.version });
      setMessage(accountId ? "Follow-up task assigned." : "Follow-up task unassigned.");
      onAssigned();
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  return <section className="visitor-assignment" aria-label="Assign visitor follow-up">
    <h3>Welcome Team assignment</h3>
    <p>Assignment grants this verified member access to this visitor’s contact details only.</p>
    {visitor.assignedTo && <p>Currently assigned to a volunteer.</p>}
    <form onSubmit={search}>
      <label htmlFor="visitor-volunteer-search">Find a verified member by name or email</label>
      <div className="visitor-assignment-row">
        <input id="visitor-volunteer-search" minLength={3} maxLength={100} required value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn soft" disabled={busy || query.trim().length < 3}>Find volunteer</button>
      </div>
    </form>
    {members.length > 0 && <>
      <label htmlFor="visitor-volunteer-choice">Select a volunteer</label>
      <select id="visitor-volunteer-choice" value={selected} disabled={busy} onChange={(e) => setSelected(e.target.value)}>
        <option value="">Choose a verified member</option>
        {members.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName} · {member.email}</option>)}
      </select>
      <label htmlFor="visitor-assignment-reason">Assignment reason</label>
      <input id="visitor-assignment-reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      <button className="btn dark" disabled={busy || !selected || reason.trim().length < 3} onClick={() => save(selected)}>Assign follow-up</button>
    </>}
    {visitor.assignedTo && <>
      <label htmlFor="visitor-unassign-reason">Reason to unassign</label>
      <input id="visitor-unassign-reason" maxLength={500} value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} />
      <button className="btn soft" disabled={busy || removeReason.trim().length < 3} onClick={() => save("", removeReason)}>Unassign follow-up</button>
    </>}
    {message && <p role="status">{message}</p>}
  </section>;
}
