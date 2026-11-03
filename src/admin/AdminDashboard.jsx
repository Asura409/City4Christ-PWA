import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, useSession } from "@/auth/session";
import { hasCapability } from "../../js/access.js";
import { Icon } from "@/lib/icons";
import "./admin.css";

const MODULES = [
  { label: "Members", description: "Search verified member records", path: "/admin/members", icon: "users", permission: "members.records.read", accent: "purple" },
  { label: "Staff & roles", description: "Review ministry access", path: "/groups/manage", icon: "shield", permission: "roles.read", accent: "gold" },
  { label: "Visitors", description: "Follow up with visitors", path: "/visitors", icon: "userplus", permission: "visitors.follow_up", accent: "lavender" },
  { label: "Account requests", description: "Review deletion requests", path: "/account-deletion-requests", icon: "lock", permission: "accounts.deletion.review", accent: "lavender" },
  { label: "Events", description: "Manage church gatherings", path: "/events", icon: "cal", permission: "roles.read", accent: "gold" },
  { label: "Content", description: "Manage sermons and devotionals", path: "/word", icon: "book", permission: "sermons.manage", accent: "purple" },
];

function readableRole(role) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useSession();
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.request("/api/v1/me/access")
      .then(({ data }) => active && setAccess(data))
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const availableModules = useMemo(
    () => MODULES.filter(({ permission }) => hasCapability(access, permission)),
    [access],
  );
  const roles = access?.roles || [];
  const globalRoles = roles.filter((role) => !role.scope).length;
  const scopedRoles = roles.filter((role) => role.scope).length;
  const hasAdminAccess = availableModules.length > 0;

  if (loading) return <section className="screen active admin-dashboard-state"><p role="status">Checking administration access…</p></section>;
  if (error) return <section className="screen active admin-dashboard-state"><p role="alert">{error}</p></section>;
  if (!hasAdminAccess) {
    return (
      <section className="screen active admin-dashboard-state" aria-label="Administration access denied">
        <div className="admin-empty-icon"><Icon name="lock" /></div>
        <h1>Administration access required</h1>
        <p>Your account does not have an administration capability. Ask a church administrator to grant access.</p>
        <button className="btn dark" onClick={() => navigate("/home")}>Back to home</button>
      </section>
    );
  }

  return (
    <section className="admin-dashboard" aria-label="Admin dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <img src="/assets/images/logo.jpeg" alt="City4Christ logo" />
          <span>City4Christ</span>
        </div>
        <p className="admin-sidebar-kicker">Church management</p>
        <nav aria-label="Administration">
          <button className="admin-side-link is-active" onClick={() => navigate("/admin")}><Icon name="home" /> Dashboard</button>
          {availableModules.slice(0, 5).map((item) => (
            <button className="admin-side-link" key={item.path} onClick={() => navigate(item.path)}><Icon name={item.icon} /> {item.label}</button>
          ))}
        </nav>
        <button className="admin-side-link admin-side-home" onClick={() => navigate("/home")}><Icon name="back" /> Return to app</button>
        <div className="admin-sidebar-account">
          <span className="admin-sidebar-avatar">{profile?.firstName?.[0]}{profile?.lastName?.[0]}</span>
          <span><strong>{profile?.firstName} {profile?.lastName}</strong><small>{roles[0] ? readableRole(roles[0].role) : "Member"}</small></span>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-dashboard-header">
          <div>
            <span className="admin-eyebrow">Admin / Church management</span>
            <h1>Dashboard</h1>
            <p>Welcome back. Here’s what’s available in your City4Christ workspace.</p>
          </div>
          <div className="admin-header-actions"><span className="admin-live-chip"><i /> Live access</span><button className="admin-date-chip" type="button" onClick={() => navigate("/admin")}><Icon name="shield" /> Access overview</button></div>
        </header>

        <div className="admin-stat-grid" aria-label="Administration overview">
          <article className="admin-stat-card purple"><span>Available modules</span><strong>{availableModules.length}</strong><small>Based on your permissions</small><Icon name="grid" /></article>
          <article className="admin-stat-card gold"><span>Active roles</span><strong>{roles.length}</strong><small>Assigned to your account</small><Icon name="users" /></article>
          <article className="admin-stat-card lavender"><span>Member access</span><strong>{hasCapability(access, "members.records.read") ? "On" : "Off"}</strong><small>Verified records lookup</small><Icon name="shield" /></article>
          <article className="admin-stat-card lavender"><span>Audit access</span><strong>{hasCapability(access, "members.records.audit.read") ? "On" : "Off"}</strong><small>Access history visibility</small><Icon name="lock" /></article>
          <article className="admin-stat-card lavender"><span>Global roles</span><strong>{globalRoles}</strong><small>Church-wide assignments</small><Icon name="globe" /></article>
          <article className="admin-stat-card lavender"><span>Scoped roles</span><strong>{scopedRoles}</strong><small>Ministry-specific assignments</small><Icon name="users" /></article>
        </div>

        <div className="admin-panel-grid">
          <section className="admin-panel admin-chart-panel">
            <div className="admin-panel-heading"><div><span className="admin-eyebrow">Permission overview</span><h2>Workspace coverage</h2></div><span className="admin-panel-badge">Live access</span></div>
            <div className="admin-bars" aria-label="Available administration modules">
              {MODULES.map((item, index) => {
                const enabled = availableModules.includes(item);
                return <div className="admin-bar-row" key={item.label}><span>{item.label}</span><div><i style={{ width: enabled ? `${78 - index * 5}%` : "10%" }} className={enabled ? "enabled" : "disabled"} /></div><b>{enabled ? "Available" : "Restricted"}</b></div>;
              })}
            </div>
          </section>
          <section className="admin-panel admin-roles-panel">
            <div className="admin-panel-heading"><div><span className="admin-eyebrow">Your account</span><h2>Staff & roles</h2></div><Icon name="shield" /></div>
            <div className="admin-role-list">
              {roles.length ? roles.map((role) => <div className="admin-role-row" key={`${role.role}:${role.scope}`}><span className="admin-role-avatar"><Icon name="users" /></span><div><strong>{readableRole(role.role)}</strong><small>{role.scope || "Church-wide access"}</small></div><span className="admin-status">Active</span></div>) : <p className="admin-muted">No roles returned for this account.</p>}
            </div>
          </section>
        </div>

        <section className="admin-section-heading"><div><span className="admin-eyebrow">Quick actions</span><h2>Manage your church</h2></div><span className="admin-muted">Choose an authorized workspace</span></section>
        <div className="admin-module-grid">
          {availableModules.map((item) => <button className="admin-module-card" key={item.path} onClick={() => navigate(item.path)}><span className={`admin-module-icon ${item.accent}`}><Icon name={item.icon} /></span><strong>{item.label}</strong><small>{item.description}</small><span className="admin-module-arrow"><Icon name="next" /></span></button>)}
        </div>

        <section className="admin-notice"><span className="admin-notice-icon"><Icon name="shield" /></span><div><strong>Protected administration</strong><p>Every management action continues to use the backend permission checks and audited API routes.</p></div></section>
      </div>
    </section>
  );
}
