import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, useSession } from "@/auth/session";
import { hasCapability } from "../../js/access.js";
import { Icon } from "@/lib/icons";
import "./admin.css";

const MODULES = [
  { label: "Live broadcasts", description: "Publish live services and replays", path: "/admin/live", icon: "play", permission: "sermons.manage", accent: "purple" },
  { label: "Members", description: "Search verified member records", path: "/admin/members", icon: "users", permission: "members.records.read" },
  { label: "Staff & roles", description: "Review ministry access", path: "/groups/manage", icon: "shield", permission: "roles.read" },
  { label: "Visitors", description: "Follow up with visitors", path: "/visitors", icon: "userplus", permission: "visitors.follow_up" },
  { label: "Account requests", description: "Review deletion requests", path: "/account-deletion-requests", icon: "lock", permission: "accounts.deletion.review" },
  { label: "Content", description: "Manage sermons and devotionals", path: "/admin/sermons", icon: "book", permission: "sermons.manage" },
  { label: "Communications", description: "Draft and send church announcements", path: "/admin/communications", icon: "chat", permission: "broadcasts.send" },
  { label: "Prayer reports", description: "Review reported prayer requests", path: "/admin/prayer-reports", icon: "flame", permission: "prayer.moderate" },
  { label: "Events", description: "Create and publish church events", path: "/admin/events", icon: "cal", permission: "events.manage" },
  { label: "Pastor profiles", description: "Create and manage pastor directory profiles", path: "/pastors", icon: "users", permission: "roles.privileged.manage" },
];

function readableRole(role) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AdminShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useSession();
  const [access, setAccess] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.request("/api/v1/me/access")
      .then(({ data }) => active && setAccess(data))
      .catch((reason) => active && setError(reason.message || "Could not load administration access."));
    return () => { active = false; };
  }, []);

  const availableModules = useMemo(() => MODULES.filter(({ permission }) => hasCapability(access, permission)), [access]);
  const roles = access?.roles || [];
  const currentModule = MODULES.find((item) => item.path === location.pathname);
  const pageLabel = currentModule?.label || (location.pathname === "/admin" ? "Overview" : "Workspace");

  if (error) return <section className="screen active admin-dashboard-state"><p role="alert">{error}</p></section>;
  if (!access) return <section className="screen active admin-dashboard-state"><p role="status">Checking administration access…</p></section>;

  return (
    <section className="admin-dashboard admin-subpage-shell" aria-label="Church administration">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand"><img src="/assets/images/logo.jpeg" alt="City4Christ logo" /><span>City4Christ</span></div>
        <p className="admin-sidebar-kicker">Church management</p>
        <nav aria-label="Administration">
          <button className={`admin-side-link ${location.pathname === "/admin" ? "is-active" : ""}`} onClick={() => navigate("/admin")}><Icon name="home" /> Dashboard</button>
          {availableModules.map((item) => <button className={`admin-side-link ${location.pathname === item.path ? "is-active" : ""}`} key={item.path} onClick={() => navigate(item.path)}><Icon name={item.icon} /> {item.label}</button>)}
        </nav>
        <button className="admin-side-link admin-side-home" onClick={() => navigate("/home")}><Icon name="back" /> Return to app</button>
        <div className="admin-sidebar-account"><span className="admin-sidebar-avatar">{profile?.firstName?.[0]}{profile?.lastName?.[0]}</span><span><strong>{profile?.firstName} {profile?.lastName}</strong><small>{roles[0] ? readableRole(roles[0].role) : "Member"}</small></span></div>
      </aside>
      <div className="admin-main admin-subpage-main">
        <div className="admin-topbar">
          <div className="admin-breadcrumb"><span>Administration</span><b>/</b><strong>{pageLabel}</strong></div>
          <div className="admin-topbar-actions">
            <span className="admin-role-chip"><Icon name="shield" /> {roles[0] ? readableRole(roles[0].role) : "Member"}</span>
            <button className="admin-topbar-link" type="button" onClick={() => navigate("/admin")}>Dashboard <Icon name="next" /></button>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}
