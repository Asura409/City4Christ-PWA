import { RefreshButton } from "@/components/RefreshButton";
import { hasCapability } from "../../js/access.js";
import React, { useEffect, useRef, useState } from "react";
import { TimedMessage } from "@/components/TimedMessage";
import { useNavigate } from "react-router-dom";
import { api, useSession } from "@/auth/session";
import {GoogleLinkPanel} from '@/auth/GoogleLinkPanel';
import { ChangePasswordPanel } from "@/auth/ChangePasswordPanel";
import { MFASettings } from "@/auth/MFASettings";
import { AccountDeletionPanel } from "@/account/AccountDeletionPanel";
import ProfilePhotoPanel from "@/profiles/ProfilePhotoPanel";

function AccountOption({ title, description, children, danger = false }) {
  return <details className={`account-option ${danger ? "account-option-danger" : ""}`}>
    <summary><span><strong>{title}</strong><small>{description}</small></span><span className="account-option-chevron" aria-hidden="true">+</span></summary>
    <div className="account-option-body">{children}</div>
  </details>;
}

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
  const [canManagePastors, setCanManagePastors] = useState(false);
  const [access, setAccess] = useState(null);
  const [pastorProfile, setPastorProfile] = useState(null);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [authenticatorEnabled, setAuthenticatorEnabled] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState("");

  async function loadAccess() {
    setAccessLoading(true);
    setAccessError("");
    try {
      const { data } = await api.request("/api/v1/me/access");
      if (mounted.current) {
        setAccess(data);
        setCanFollowUp(hasCapability(data, "visitors.follow_up"));
        setCanReviewDeletion(hasCapability(data, "accounts.deletion.review"));
        setCanSearchMembers(hasCapability(data, "members.records.read"));
        setCanManagePastors(hasCapability(data, "roles.privileged.manage"));
        setCanManageSermons(hasCapability(data, "sermons.manage"));
        setStaff(["sermons.manage", "roles.manage", "roles.read"].some((permission) => hasCapability(data, permission)));
      }
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
        if(live)setCanManagePastors(hasCapability(data,"roles.privileged.manage"));
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
    api
      .request("/api/v1/me/pastoral/profile")
      .then(({ data }) => { if (live) setPastorProfile(data); })
      .catch((e) => { if (live && e.status !== 404) setPastorProfile(null); });
    api
      .reauthenticationStatus()
      .then(({ data }) => { if (live) setGoogleLinked(data.googleAvailable === true); })
      .catch(() => { if (live) setGoogleLinked(false); });
    api
      .mfaStatus()
      .then(({ data }) => { if (live) setAuthenticatorEnabled(Boolean(data?.enabled)); })
      .catch(() => { if (live) setAuthenticatorEnabled(false); });
    return () => {
      mounted.current = false;
      live = false;
    };
  }, []);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
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
    <section className="screen active account-screen" aria-label="Your profile">
      <div className="account-page">
        <header className="account-heading"><p className="group-eyebrow">YOUR CITY4CHRIST ACCOUNT</p><h1>My account</h1><p>A little about you. Everything you need to manage your account.</p></header>
        <section className="account-hero" aria-label="Account overview">
          <div className="account-cover" aria-hidden="true"><span>Faith. Community. Connection.</span></div>
          <div className="account-hero-body">
            <ProfilePhotoPanel profile={profile} setProfile={setProfile} compact />
            <div className="account-hero-name"><h2>{profile.firstName} {profile.lastName}</h2><p>{profile.email}</p>{profile.emailVerified === true && <span className="account-verified"><span aria-hidden="true">✓</span> Email verified</span>}</div>
          </div>
        </section>

        <section id="profile-details" className="account-card" aria-labelledby="personal-heading">
          <div className="account-section-heading"><h2 id="personal-heading">Personal information</h2><p>How you appear in the church community.</p></div>
          <form className="account-personal-form" aria-label="Edit profile" onSubmit={save}>
            <label className="auth-field" htmlFor="first">First name<input id="first" required maxLength={100} value={firstName} disabled={busy} onChange={(e) => { setFirst(e.target.value); setMessage(""); }} /></label>
            <label className="auth-field" htmlFor="last">Last name<input id="last" required maxLength={100} value={lastName} disabled={busy} onChange={(e) => { setLast(e.target.value); setMessage(""); }} /></label>
            <div className="account-email"><span>Email address</span><strong>{profile.email}</strong><small>Your email is used to sign in.</small></div>
            <TimedMessage message={message} />
            <TimedMessage tone="error" message={error} />
            <div className="account-save-row"><small>Your name and photo appear in the member directory.</small><button className="btn gold" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button></div>
          </form>
        </section>

        <section id="security-tools" className="account-card" aria-labelledby="security-heading">
          <div className="account-section-heading"><h2 id="security-heading">Sign-in and security</h2><p>Your sign-in options and an extra layer of protection.</p></div>
          <AccountOption title="Password" description={profile.hasPassword ? "Change your current password" : "You use Google to sign in"}><ChangePasswordPanel hasPassword={profile.hasPassword} /></AccountOption>
          <AccountOption title="Google account" description={googleLinked ? "✓ Connected to Google" : "Not connected"}><GoogleLinkPanel googleLinked={googleLinked} /></AccountOption>
          <AccountOption title="Authenticator protection" description={authenticatorEnabled ? "✓ Enabled" : "Not enabled"}><MFASettings onStatus={(status) => setAuthenticatorEnabled(Boolean(status?.enabled))} /></AccountOption>
        </section>

        <section className="account-card" aria-labelledby="preferences-heading">
          <div className="account-section-heading"><h2 id="preferences-heading">Preferences</h2><p>Make City4Christ feel right for you.</p></div>
          <button className="account-destination" onClick={() => navigate("/notifications")}><span><strong>Notifications</strong><small>Manage updates and notifications on this device</small></span><span aria-hidden="true">→</span></button>
          <button className="account-destination" onClick={() => navigate("/settings")}><span><strong>Appearance</strong><small>Light, dark, or your device theme</small></span><span aria-hidden="true">→</span></button>
        </section>

        <section id="account-access" className="account-card" aria-label="My account access">
          <div className="account-section-heading"><h2>Your roles and workspace</h2><p>Your church responsibilities and available tools.</p></div>
          {accessError && <p role="alert">{accessError}</p>}
          {accessLoading && !access && <p role="status">Checking your roles and permissions…</p>}
          {access && <div className="account-role-list">{access.roles?.length ? access.roles.map((role) => <span className="account-role" key={`${role.role}:${role.scope}`}><strong>{readableRole(role.role)}</strong><small>{role.scope || "Church-wide"}</small></span>) : <span className="account-role"><strong>Member</strong><small>Church community</small></span>}</div>}
          {(pastorProfile || canManagePastors || canFollowUp || canReviewDeletion || canSearchMembers || staff || canManageSermons) && <div className="account-workspace">
            {[
              [pastorProfile, "Pastor dashboard", "/pastor-dashboard"],
              [pastorProfile, "Manage availability", "/pastor-availability"],
              [canManagePastors, "Create pastor profile", "/pastors"],
              [canFollowUp, "Visitor follow-up", "/visitors"],
              [canReviewDeletion, "Account deletion requests", "/account-deletion-requests"],
              [canSearchMembers, "Member lookup", "/admin/members"],
              [staff, "Church administration", "/admin"],
              [canManageSermons, "Sermon publishing", "/admin/sermons"],
            ].filter(([allowed]) => allowed).map(([, title, path]) => <button className="account-destination" key={path} onClick={() => navigate(path)}><strong>{title}</strong><span aria-hidden="true">→</span></button>)}
          </div>}
          <RefreshButton className="account-refresh" type="button" onClick={() => loadAccess()} disabled={accessLoading} label="Refresh account access" busy={accessLoading} />
          {access?.capabilities?.length > 0 && <details className="profile-access-details"><summary>View detailed permissions</summary><ul>{access.capabilities.map((capability) => <li key={`${capability.permission}:${capability.scope}`}><span>{capability.permission}</span><small>{capability.scope || "Church-wide"}</small></li>)}</ul></details>}
        </section>

        <section id="account-deletion" className="account-card account-management" aria-labelledby="management-heading">
          <div className="account-section-heading"><h2 id="management-heading">Account management</h2><p>Manage your current session or request to leave.</p></div>
          <div className="account-signout"><div><strong>Sign out</strong><p>End your session on this browser.</p></div><button className="btn soft" disabled={busy} onClick={signOut}>Sign out</button></div>
          <AccountOption title="Request account deletion" description="Understand what happens before submitting a request" danger><AccountDeletionPanel /></AccountOption>
        </section>
        <p className="account-footer-note">Need a conversation? <a href="#/pastors">Find a pastor</a></p>
      </div>
    </section>
  );
}
