import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/auth/session";
import {
  canCreateLeadershipGroup,
  canManageChurchGroups,
} from "@/groups/access";
import {
  changeGroupLeader,
  createGroup,
  getAccess,
  listGroupLeaders,
  listManagedGroups,
  searchRoleCandidates,
  setGroupLifecycle,
} from "@/groups/api";

export default function GroupAdminScreen() {
  const { groupId } = useParams();
  return groupId ? <GroupLeaders groupId={groupId} /> : <GroupLifecycle />;
}

function GroupLifecycle() {
  const [access, setAccess] = useState(null);
  const [groups, setGroups] = useState([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("church");
  const [joinPolicy, setJoinPolicy] = useState("approval");
  const [reasons, setReasons] = useState({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const current = await getAccess();
      setAccess(current);
      if (!canManageChurchGroups(current)) {
        setGroups([]);
        return;
      }
      setGroups(await listManagedGroups(includeArchived));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [includeArchived]);

  async function submitCreate(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createGroup({ name, description, audience, joinPolicy });
      setName("");
      setDescription("");
      setAudience("church");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function transition(group, status) {
    const reason = (reasons[group.id] || "").trim();
    if (!reason) return;
    setBusy(true);
    setError("");
    try {
      await setGroupLifecycle(group.id, status, reason);
      setReasons((old) => ({ ...old, [group.id]: "" }));
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="screen active" aria-label="Group administration"><p role="status">Loading group administration…</p></section>;
  if (!canManageChurchGroups(access)) return <section className="screen active groups-screen"><p role="alert">You are not authorized to manage church groups.</p><Link className="btn soft" to="/groups">Back to groups</Link></section>;

  return (
    <section className="screen active groups-screen group-admin-screen" aria-label="Group administration">
      <Link className="group-back" to="/groups">← Church groups</Link>
      <div className="groups-heading">
        <div><p className="group-eyebrow">STAFF TOOLS</p><h1>Manage church groups</h1><p className="lead">Create ministries, review group leaders, and archive groups that have closed.</p></div>
      </div>
      {error && <p className="group-error" role="alert">{error}</p>}
      <form className="group-admin-form" aria-label="Create church group" onSubmit={submitCreate}>
        <h2>Create a group</h2>
        <label className="auth-field">Group name<input required minLength={1} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="auth-field">Description<textarea maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <div className="group-admin-fields">
          {canCreateLeadershipGroup(access) && <label className="auth-field">Audience<select value={audience} onChange={(e) => setAudience(e.target.value)}><option value="church">Church</option><option value="leadership">Leadership</option></select></label>}
          <label className="auth-field">Join policy<select value={joinPolicy} onChange={(e) => setJoinPolicy(e.target.value)}><option value="approval">Leader approval</option><option value="open">Open membership</option><option value="closed">Invitation only</option></select></label>
        </div>
        <button className="btn gold" disabled={busy}>Create group</button>
      </form>
      <section className="group-panel" aria-label="Manage existing groups">
        <div className="sh"><h2>Groups</h2><label className="group-archived-toggle"><input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} /> Include archived</label></div>
        {groups.length === 0 ? <p className="lead">No groups to manage in this view.</p> : <div className="group-admin-list">
          {groups.map((group) => <article className="group-admin-row" key={group.id}>
            <div className="group-admin-summary"><div><h3>{group.name}</h3><p>{group.audience === "leadership" ? "Leadership group" : "Church group"} · {group.memberCount} active {group.memberCount === 1 ? "member" : "members"}</p></div><span className={`group-status ${group.archived ? "archived" : "active"}`}>{group.archived ? "Archived" : "Active"}</span></div>
            <div className="group-admin-actions">
              {!group.archived && <Link className="btn dark" to={`/groups/manage/${group.id}`}>Manage leaders</Link>}
              <label className="auth-field">Reason<input required minLength={1} maxLength={500} value={reasons[group.id] || ""} onChange={(e) => setReasons((old) => ({ ...old, [group.id]: e.target.value }))} /></label>
              <button className="btn soft" disabled={busy || !(reasons[group.id] || "").trim()} onClick={() => transition(group, group.archived ? "active" : "archived")}>{group.archived ? "Restore group" : "Archive group"}</button>
            </div>
          </article>)}
        </div>}
      </section>
    </section>
  );
}

function GroupLeaders({ groupId }) {
  const navigate = useNavigate();
  const [access, setAccess] = useState(null);
  const [group, setGroup] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingChange, setPendingChange] = useState(null);
  const [reauth, setReauth] = useState(null);
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const current = await getAccess();
      setAccess(current);
      if (!canManageChurchGroups(current)) return;
      const groups = await listManagedGroups(true);
      const found = groups.find((item) => item.id === groupId);
      if (!found) throw new Error("This group is not available to your account.");
      setGroup(found);
      if (!found.archived) setLeaders(await listGroupLeaders(groupId));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [groupId]);

  async function search(event) {
    event.preventDefault();
    setError("");
    setSelected(null);
    try {
      setCandidates(await searchRoleCandidates(query));
    } catch (e) {
      setError(e.message);
    }
  }

  async function prepareChange(accountId, revoke) {
    setBusy(true);
    setError("");
    try {
      const [{ data: identity }, { data: factor }] = await Promise.all([
        api.reauthenticationStatus(),
        api.mfaStatus(),
      ]);
      if (!factor.enabled) {
        setError("An authenticator must be enrolled before group leader appointments. Set it up in account security, then return here.");
        return;
      }
      const identityFresh = identity.fresh;
      const mfaFresh = factor.freshUntil && Date.parse(factor.freshUntil) > Date.now();
      const pending = { accountId, revoke };
      setPendingChange(pending);
      setReauth(identity);
      if (!identityFresh || !mfaFresh || !reason.trim()) return;
      await submitChange(pending);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitChange(change = pendingChange) {
    if (!change || !group) return;
    if (!reason.trim()) {
      setError("Enter a reason for this leadership change.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const status = reauth || (await api.reauthenticationStatus()).data;
      if (!status.fresh) {
        if (status.passwordAvailable && password) await api.reauthenticatePassword(password);
        else throw new Error("Confirm your identity below before changing group leadership.");
      }
      const factor = (await api.mfaStatus()).data;
      if (!factor.enabled) throw new Error("Enroll an authenticator in account security before changing group leadership.");
      if (!factor.freshUntil || Date.parse(factor.freshUntil) <= Date.now()) {
        if (!mfaCode.trim()) throw new Error("Enter your current authenticator code to confirm this appointment.");
        await api.verifyMFA(mfaCode.trim());
      }
      await changeGroupLeader(change.accountId, groupId, reason.trim(), change.revoke);
      setReason("");
      setPassword("");
      setMfaCode("");
      setPendingChange(null);
      setReauth(null);
      setSelected(null);
      setCandidates([]);
      setLeaders(await listGroupLeaders(groupId));
    } catch (e) {
      if (e.code === "reauthentication_required") setReauth({ ...(reauth || {}), fresh: false, passwordAvailable: true });
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function beginGoogleConfirmation() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.beginGoogleReauthentication(window.location.href);
      const destination = new URL(data.url);
      if (destination.protocol !== "https:" || destination.hostname !== "accounts.google.com") throw new Error("Invalid Google confirmation destination.");
      window.location.assign(destination.href);
    } catch (e) {
      setBusy(false);
      setError(e.message);
    }
  }

  if (loading) return <section className="screen active" aria-label="Group leaders"><p role="status">Loading group leaders…</p></section>;
  if (!canManageChurchGroups(access) || !group) return <section className="screen active groups-screen"><p role="alert">{error || "You are not authorized to manage this group."}</p><button className="btn soft" onClick={() => navigate("/groups/manage")}>Back to group management</button></section>;

  return (
    <section className="screen active groups-screen group-admin-screen" aria-label={`${group.name} leaders`}>
      <Link className="group-back" to="/groups/manage">← Manage groups</Link>
      <div className="groups-heading"><div><p className="group-eyebrow">GROUP LEADERSHIP</p><h1>{group.name} leaders</h1><p className="lead">Appointments apply only to this group and require fresh identity and authenticator confirmation.</p></div></div>
      {error && <p className="group-error" role="alert">{error}</p>}
      {group.archived ? <p className="group-state">Restore this group before changing its leaders.</p> : <>
        <section className="group-panel" aria-label="Current group leaders"><div className="sh"><h2>Current leaders</h2><span className="group-number">{leaders.length}</span></div>
          {leaders.length === 0 ? <p className="lead">No leaders are currently appointed to this group.</p> : <div className="group-list">{leaders.map((leader) => <article className="group-person" key={leader.accountId}><div className="person-initials" aria-hidden="true">{leader.firstName?.[0]}{leader.lastName?.[0]}</div><div className="person-name"><b>{leader.firstName} {leader.lastName}</b><span>Ministry Leader</span></div><button className="btn soft" disabled={busy} onClick={() => { setReason(""); void prepareChange(leader.accountId, true); }}>Remove leader</button></article>)}</div>}
        </section>
        <section className="group-panel" aria-label="Appoint a group leader"><h2>Appoint a leader</h2><form className="group-admin-fields" aria-label="Search verified members" onSubmit={search}><label className="auth-field">Search by name or email<input required minLength={3} maxLength={100} value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} /></label><button className="btn dark" disabled={query.trim().length < 3}>Search</button></form>
          {candidates.length > 0 && <div className="group-list" aria-label="Eligible members">{candidates.map((candidate) => <button type="button" className={`group-candidate ${selected?.id === candidate.id ? "selected" : ""}`} key={candidate.id} onClick={() => setSelected(candidate)}><b>{candidate.firstName} {candidate.lastName}</b><span>{candidate.email}{candidate.mfaEnabled ? " · Authenticator ready" : " · Authenticator required"}</span></button>)}</div>}
          {selected && <div className="group-appointment-form"><p>Appoint <b>{selected.firstName} {selected.lastName}</b> as a leader of this group only.</p><button className="btn gold" disabled={busy} onClick={() => void prepareChange(selected.id, false)}>Appoint leader</button></div>}
        </section>
        {pendingChange && <section className="group-panel" aria-label="Confirm sensitive appointment"><h2>Confirm this change</h2><p className="lead">The server requires a recent sign-in and a current authenticator confirmation.</p>
          {!reauth?.fresh && <>{reauth?.passwordAvailable && <label className="auth-field">Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>}{reauth?.googleAvailable && <button type="button" className="btn dark" disabled={busy} onClick={beginGoogleConfirmation}>Confirm with Google</button>}</>}
          <label className="auth-field">Reason<input required minLength={1} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <label className="auth-field">Authenticator code<input inputMode="numeric" autoComplete="one-time-code" maxLength={12} value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} /></label>
          <button type="button" className="btn gold" disabled={busy} onClick={() => void submitChange()}>{pendingChange.revoke ? "Confirm removal" : "Confirm appointment"}</button>
        </section>}
      </>}
    </section>
  );
}
