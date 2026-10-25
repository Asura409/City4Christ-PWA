import React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/lib/icons";

const COLORS = [
  ["#d69145", "#7543bd"],
  ["#c66c91", "#5637a0"],
  ["#4389bc", "#392879"],
  ["#6a9d75", "#354f8b"],
];

export function GroupCard({ group, onJoin, onLeave, busy = false }) {
  const navigate = useNavigate();
  const [g1, g2] = COLORS[(group.name.length + group.memberCount) % COLORS.length];
  const status = group.membershipStatus;
  const joinDisabled = busy || group.joinPolicy === "closed";

  return (
    <article className="card group group-card">
      <div className="cover" style={{ "--g1": g1, "--g2": g2 }}>
        <div className="g-ic"><Icon name={group.audience === "leadership" ? "shield" : "users"} /></div>
        <span className="group-audience">{group.audience === "leadership" ? "Leadership" : "Church group"}</span>
      </div>
      <div className="g-body">
        <h3>{group.name}</h3>
        <p className="group-description">{group.description || "A place to serve, connect and grow together."}</p>
        <div className="members group-count"><Icon name="users" />{group.memberCount} {group.memberCount === 1 ? "member" : "members"}</div>
        <p className="group-policy">
          {group.joinPolicy === "open" ? "Anyone can join" : group.joinPolicy === "approval" ? "Leader approval required" : "Membership by invitation"}
        </p>
        <div className="group-actions">
          {status === "active" ? (
            <button className="btn soft" disabled={busy} onClick={() => onLeave(group)}>
              Leave group
            </button>
          ) : status === "pending" ? (
            <button className="btn soft" disabled={busy} aria-label={`Cancel request to join ${group.name}`} onClick={() => onLeave(group)}>
              <Icon name="clock" />Cancel request
            </button>
          ) : (
            <button
              className="btn gold"
              disabled={joinDisabled}
              onClick={() => onJoin(group)}
              aria-label={group.joinPolicy === "open" ? `Join ${group.name}` : `Request to join ${group.name}`}
            >
              {group.joinPolicy === "closed" ? "Not accepting members" : group.joinPolicy === "open" ? "Join group" : "Request to join"}
            </button>
          )}
          <button className="btn dark" onClick={() => navigate(`/groups/${group.id}`)}>
            Group details
          </button>
        </div>
      </div>
    </article>
  );
}
