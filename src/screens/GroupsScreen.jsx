import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/components/Toast";
import { GroupCard } from "@/groups/GroupCard";
import { canManageGroup } from "@/groups/access";
import {
  decideMembership,
  getAccess,
  joinGroup,
  leaveGroup,
  listGroupMembers,
  listGroups,
  listPendingRequests,
} from "@/groups/api";

export default function GroupsScreen() {
  const { groupId } = useParams();
  return groupId ? <GroupDetailScreen groupId={groupId} /> : <GroupDirectory />;
}

function GroupDirectory() {
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [tab, setTab] = useState("all");
  const [busyGroup, setBusyGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    listGroups()
      .then(({ groups: items }) => { if (current) setGroups(items); })
      .catch((e) => { if (current) setError(e.message); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  async function join(group) {
    setBusyGroup(group.id);
    setError("");
    try {
      const membership = await joinGroup(group.id);
      setGroups((items) => items.map((item) => item.id === group.id ? {
        ...item,
        membershipStatus: membership.status,
        memberCount: membership.status === "active" && item.membershipStatus !== "active" ? item.memberCount + 1 : item.memberCount,
      } : item));
      toast(membership.status === "active" ? `You joined ${group.name}` : `Request sent to ${group.name}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyGroup("");
    }
  }

  async function leave(group) {
    setBusyGroup(group.id);
    setError("");
    try {
      await leaveGroup(group.id);
      setGroups((items) => items.map((item) => item.id === group.id ? {
        ...item,
        membershipStatus: "left",
        memberCount: item.membershipStatus === "active" ? Math.max(0, item.memberCount - 1) : item.memberCount,
      } : item));
      toast(`You left ${group.name}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyGroup("");
    }
  }

  const shown = tab === "mine"
    ? groups.filter((group) => ["active", "pending"].includes(group.membershipStatus))
    : groups;

  return (
    <section className="screen active groups-screen" aria-label="Church groups">
      <div className="groups-heading">
        <div>
          <p className="group-eyebrow">CITY4CHRIST COMMUNITY</p>
          <h1>Find your group</h1>
          <p className="lead">Connect, serve and grow with people across the church.</p>
        </div>
      </div>
      <div className="tabs group-tabs" role="tablist" aria-label="Groups">
        <button className="tab" role="tab" aria-selected={tab === "all"} onClick={() => setTab("all")}>All groups</button>
        <button className="tab" role="tab" aria-selected={tab === "mine"} onClick={() => setTab("mine")}>My groups</button>
      </div>
      {error && <p className="group-error" role="alert">{error}</p>}
      {loading ? <p className="group-state" role="status">Loading groups…</p> : shown.length === 0 ? (
        <p className="group-state">{tab === "mine" ? "You have not joined or requested a group yet." : "There are no groups to show right now."}</p>
      ) : (
        <div className="group-grid">
          {shown.map((group) => <GroupCard key={group.id} group={group} busy={busyGroup === group.id} onJoin={join} onLeave={leave} />)}
        </div>
      )}
    </section>
  );
}

function GroupDetailScreen({ groupId }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showRoster, setShowRoster] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyAccount, setBusyAccount] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    async function load() {
      setLoading(true);
      setGroup(null);
      setMembers([]);
      setRequests([]);
      setShowRoster(false);
      setError("");
      try {
        const [{ groups }, access] = await Promise.all([listGroups(), getAccess()]);
        const found = groups.find((item) => item.id === groupId);
        if (!found) throw new Error("This group is unavailable to your account.");
        if (!current) return;
        setGroup(found);
        const manager = canManageGroup(access, found);
        setShowRoster(manager || found.membershipStatus === "active");
        const reads = [];
        if (manager) reads.push(listPendingRequests(groupId).then((items) => ["requests", items]));
        if (manager || found.membershipStatus === "active") reads.push(listGroupMembers(groupId).then((items) => ["members", items]));
        const results = await Promise.all(reads);
        if (!current) return;
        for (const [kind, items] of results) {
          if (kind === "requests") setRequests(items);
          if (kind === "members") setMembers(items);
        }
      } catch (e) {
        if (current) setError(e.message);
      } finally {
        if (current) setLoading(false);
      }
    }
    void load();
    return () => { current = false; };
  }, [groupId]);

  async function decide(request, decision) {
    setBusyAccount(request.accountId);
    setError("");
    try {
      await decideMembership(groupId, request.accountId, decision);
      setRequests((items) => items.filter((item) => item.accountId !== request.accountId));
      if (decision === "approve") {
        const [{ groups }, roster] = await Promise.all([listGroups(), listGroupMembers(groupId)]);
        const refreshed = groups.find((item) => item.id === groupId);
        if (refreshed) setGroup(refreshed);
        setMembers(roster);
      }
      toast(`Request ${decision === "approve" ? "approved" : "declined"}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyAccount("");
    }
  }

  if (loading) return <section className="screen active" aria-label="Group details"><p role="status">Loading group…</p></section>;
  if (!group) return <section className="screen active" aria-label="Group details"><p role="alert">{error || "This group is unavailable."}</p><button className="btn soft" onClick={() => navigate("/groups")}>Back to groups</button></section>;

  const canSeeRoster = showRoster;
  return (
    <section className="screen active groups-screen" aria-label={`${group.name} details`}>
      <button className="group-back" onClick={() => navigate("/groups")}>← All groups</button>
      <div className="group-detail-hero">
        <span className="group-eyebrow">{group.audience === "leadership" ? "LEADERSHIP" : "CHURCH GROUP"}</span>
        <h1>{group.name}</h1>
        <p>{group.description || "A place to serve, connect and grow together."}</p>
        <span className="detail-count">{group.memberCount} {group.memberCount === 1 ? "member" : "members"}</span>
      </div>
      {error && <p className="group-error" role="alert">{error}</p>}
      {requests.length > 0 && (
        <section className="group-panel" aria-label="Pending membership requests">
          <div className="sh"><h2>Pending requests</h2><span className="group-number">{requests.length}</span></div>
          <p className="lead">Review people who want to join this group.</p>
          <div className="group-list">
            {requests.map((request) => {
              const name = `${request.firstName} ${request.lastName}`.trim();
              return <article className="group-person" key={request.accountId}>
                <div className="person-initials" aria-hidden="true">{request.firstName?.[0]}{request.lastName?.[0]}</div>
                <div className="person-name"><b>{name}</b><span>Requested to join</span></div>
                <div className="person-actions">
                  <button className="btn gold" disabled={busyAccount === request.accountId} aria-label={`Approve ${name}`} onClick={() => decide(request, "approve")}>Approve</button>
                  <button className="btn soft" disabled={busyAccount === request.accountId} aria-label={`Decline ${name}`} onClick={() => decide(request, "decline")}>Decline</button>
                </div>
              </article>;
            })}
          </div>
        </section>
      )}
      {canSeeRoster && (
        <section className="group-panel" aria-label="Group roster">
          <div className="sh"><h2>Members</h2><span className="group-number">{members.length || group.memberCount}</span></div>
          {members.length === 0 ? <p className="lead">No active members are listed yet.</p> : <div className="group-list">
            {members.map((member) => <article className="group-person" key={member.accountId}>
              <div className="person-initials" aria-hidden="true">{member.firstName?.[0]}{member.lastName?.[0]}</div>
              <div className="person-name"><b>{member.firstName} {member.lastName}</b><span>Group member</span></div>
            </article>)}
          </div>}
        </section>
      )}
      <div className="group-detail-footer"><span>{group.membershipStatus === "active" ? "You are a member" : group.membershipStatus === "pending" ? "Your request is awaiting approval" : "Membership"}</span></div>
    </section>
  );
}
