import React, { useEffect, useState } from "react";
import { listGroupMembers } from "@/groups/api";
import { EventDialog } from "./EventDialog";

export function EventCoordinatorsDialog({ item, groups, coordinators, busy, onAssign, onRemove, onClose }) {
  const [group, setGroup] = useState("");
  const [account, setAccount] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setMembers([]);
    setAccount("");
    setError("");
    setLoading(Boolean(group));
    if (group) listGroupMembers(group)
      .then((data) => { if (live) setMembers(data); })
      .catch((e) => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [group]);
  const eligible = members.filter((member) =>
    (!member.status || member.status === "active") &&
    !coordinators.some((entry) => entry.accountId === member.accountId));
  async function assign(event) {
    event.preventDefault();
    setError("");
    try { await onAssign(item, group, account); setAccount(""); }
    catch (e) { setError(e.message); }
  }
  async function remove(coordinator) {
    setError("");
    try { await onRemove(item, coordinator); }
    catch (e) { setError(e.message); }
  }
  return <EventDialog title="Coordinators" subtitle={item.title} busy={busy} onClose={onClose}>
    <div className="event-assigned-list" aria-label="Assigned coordinators">
      {coordinators.length ? coordinators.map((coordinator) => <div key={coordinator.accountId} className="event-assigned-person">
        <span className="event-person-avatar" aria-hidden="true">{coordinator.firstName?.[0]}{coordinator.lastName?.[0]}</span>
        <div><strong>{coordinator.firstName} {coordinator.lastName}</strong><small>{coordinator.groupName}</small></div>
        <button type="button" className="event-remove-coordinator" aria-label={`Remove ${coordinator.firstName} ${coordinator.lastName}`} disabled={busy} onClick={() => remove(coordinator)}>Remove</button>
      </div>) : <p className="event-help">No coordinators assigned yet.</p>}
    </div>
    <form onSubmit={assign}>
      <label className="event-coordinator-field">Coordinator group
        <span className="event-select-wrap"><select value={group} disabled={busy} onChange={(event) => { setGroup(event.target.value); setAccount(""); }}>
          <option value="">Choose a church group</option>
          {groups.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select></span>
      </label>
      <label className="event-coordinator-field">Event coordinator
        <span className="event-select-wrap"><select value={account} disabled={busy || loading || !group} onChange={(event) => setAccount(event.target.value)}>
          <option value="">{loading ? "Loading members…" : !group ? "Choose a group first" : "Choose an active group member"}</option>
          {eligible.map((member) => <option key={member.accountId} value={member.accountId}>{member.firstName} {member.lastName}</option>)}
        </select></span>
      </label>
      <p className="event-help">{!groups.length ? "No eligible church groups are available." : group && !loading && !error && !eligible.length ? "No unassigned active members are available in this group." : "Choose an active member from the selected group to coordinate this event."}</p>
      {error && <p className="event-error" role="alert">{error}</p>}
      <footer className="event-dialog-actions">
        <button type="button" className="event-control" disabled={busy} onClick={onClose}>Close</button>
        <button className="event-control event-control-gold" disabled={busy || loading || !group || !account || !eligible.some((member) => member.accountId === account)}>Assign coordinator</button>
      </footer>
    </form>
  </EventDialog>;
}
