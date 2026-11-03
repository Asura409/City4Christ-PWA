import { hasCapability } from "../../js/access.js";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, useSession } from "@/auth/session";
import {GoogleLinkPanel} from '@/auth/GoogleLinkPanel';
import { ChangePasswordPanel } from "@/auth/ChangePasswordPanel";
import { AccountDeletionPanel } from "@/account/AccountDeletionPanel";
import ProfilePhotoPanel from "@/profiles/ProfilePhotoPanel";

function readableRole(role) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ProfileScreen() {
  const { profile, setProfile, logout } = useSession(),
    navigate = useNavigate();
  const mounted = useRef(false);
  const [firstName, setFirst] = useState(profile.firstName),
    [lastName, setLast] = useState(profile.lastName),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [staff, setStaff] = useState(false),
 [canManageSermons,setCanManageSermons]=useState(false),
 [canFollowUp,setCanFollowUp]=useState(false),
 [canReviewDeletion,setCanReviewDeletion]=useState(false);
  const [canSearchMembers, setCanSearchMembers] = useState(false);
  const [access, setAccess] = useState(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState("");

  async function loadAccess() {
    setAccessLoading(true);
    setAccessError("");
    try {
      const { data } = await api.request("/api/v1/me/access");
      if (mounted.current) setAccess(data);
    } catch (e) {
      if (mounted.current) setAccessError(e.message || "Could not load account access.");
    } finally {
      if (mounted.current) setAccessLoading(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    let live = true;
    api
      .request("/api/v1/me/access")
      .then(({ data }) => {
 if(live)setAccess(data);
 if(live)setCanFollowUp(hasCapability(data,"visitors.follow_up"));
 if(live)setCanReviewDeletion(hasCapability(data,"accounts.deletion.review"));
        if(live)setCanSearchMembers(hasCapability(data,"members.records.read"));
        if(live)setCanManageSermons(hasCapability(data,"sermons.manage"));
        if (live)
          setStaff(
            ["sermons.manage", "roles.manage", "roles.read"].some(
              (permission) => hasCapability(data, permission),
            ),
          );
      })
      .catch((e) => { if (live) setAccessError(e.message || "Could not load account access."); })
      .finally(() => { if (live) setAccessLoading(false); });
    return () => {
      mounted.current = false;
      live = false;
    };
  }, []);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const patch = {};
      if (firstName !== profile.firstName) patch.firstName = firstName;
      if (lastName !== profile.lastName) patch.lastName = lastName;
      const { data } = await api.updateProfile(patch);
      if (!mounted.current) return;
      setProfile(data);
      setMessage("Your profile has been saved.");
    } catch (e) {
      if (mounted.current) setError(e.message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="screen active" aria-label="Your profile">
      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="profile-identity">
            <div className="banner" />
            <ProfilePhotoPanel profile={profile} setProfile={setProfile} />
            <h1 className="p-name">{profile.firstName} {profile.lastName}</h1>
            <p>{profile.email}</p>
          </div>
          <div className="profile-sidebar-status"><span>Account status</span><strong>Active member</strong></div>
          <nav className="profile-sidebar-nav" aria-label="Profile shortcuts">
            <a href="#profile-details">Profile details</a>
            <a href="#account-access">Account access</a>
            <a href="#security-tools">Security tools</a>
          </nav>
        </aside>
        <div className="profile-content">
      <section id="account-access" className="profile-access auth-card" aria-label="My account access">
        <div className="profile-access-heading">
          <div><p className="group-eyebrow">SECURITY</p><h2>Account access</h2></div>
          <button className="btn soft" type="button" onClick={() => void loadAccess()} disabled={accessLoading}>
            {accessLoading ? "Checking…" : "Refresh"}
          </button>
        </div>
        {accessError && <p role="alert">{accessError}</p>}
        {accessLoading && !access && <p role="status">Checking your roles and permissions…</p>}
        {!accessLoading && access && <>
          <div className="profile-access-status">
            <strong>{access.roles?.length ? "Assigned church roles" : "Member access"}</strong>
            <span>{access.roles?.length ? "Your current roles are shown below." : "No elevated church role is assigned to this account."}</span>
          </div>
          <div className="profile-access-roles">
            {(access.roles || []).length ? access.roles.map((role) => (
              <div className="profile-access-role" key={`${role.role}:${role.scope}`}>
                <b>{readableRole(role.role)}</b><small>{role.scope || "Church-wide access"}</small>
              </div>
            )) : <div className="profile-access-role"><b>Standard member</b><small>Community access</small></div>}
          </div>
          <details className="profile-access-details">
            <summary>View permissions ({(access.capabilities || []).length})</summary>
            <ul>{(access.capabilities || []).map((capability) => <li key={`${capability.permission}:${capability.scope}`}><span>{capability.permission}</span><small>{capability.scope || "Global"}</small></li>)}</ul>
          </details>
        </>}
      </section>
{canFollowUp&&<button className="btn soft" onClick={()=>navigate("/visitors")}>Visitor follow-up</button>}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      <form id="profile-details" className="auth-card" aria-label="Edit profile" onSubmit={save}>
        <div className="auth-field">
          <label htmlFor="first">First name</label>
          <input
            id="first"
            required
            maxLength={100}
            value={firstName}
            onChange={(e) => setFirst(e.target.value)}
          />
        </div>
        <div className="auth-field">
          <label htmlFor="last">Last name</label>
          <input
            id="last"
            required
            maxLength={100}
            value={lastName}
            onChange={(e) => setLast(e.target.value)}
          />
        </div>
        <p className="profile-directory-note">Verified members are visible in the church member directory. Private conversations remain in Messages.</p>
        <button className="btn gold block" disabled={busy}>
          Save profile
        </button>
      </form>
      <div id="security-tools" className="profile-security-tools">
        <GoogleLinkPanel hasPassword={profile.hasPassword}/>
        <ChangePasswordPanel hasPassword={profile.hasPassword} />
      </div>
      <AccountDeletionPanel />
      {canReviewDeletion && <button className="btn soft" onClick={() => navigate("/account-deletion-requests")}>Account deletion requests</button>}
      {canSearchMembers && <button className="btn soft" onClick={() => navigate("/admin/members")}>Member lookup</button>}
      {staff && <button className="btn soft" onClick={() => navigate("/admin")}>Church administration</button>}
      {canManageSermons && <button className="btn gold" onClick={() => navigate("/admin/sermons")}>Sermon publishing</button>}
      <div className="wrap">
<a className="btn soft" href="#/pastors">Pastoral appointments</a>
        <button className="btn gold" disabled={busy} onClick={signOut}>
          Sign out
        </button>
      </div>
      </div>
        </div>
    </section>
  );
}
