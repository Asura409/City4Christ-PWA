import { hasCapability } from "../../js/access.js";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, useSession } from "@/auth/session";
import {GoogleLinkPanel} from '@/auth/GoogleLinkPanel';
import { ChangePasswordPanel } from "@/auth/ChangePasswordPanel";
import { AccountDeletionPanel } from "@/account/AccountDeletionPanel";
import ProfilePhotoPanel from "@/profiles/ProfilePhotoPanel";
export default function ProfileScreen() {
  const { profile, setProfile, logout } = useSession(),
    navigate = useNavigate();
  const mounted = useRef(false);
  const [firstName, setFirst] = useState(profile.firstName),
    [lastName, setLast] = useState(profile.lastName),
    [visible, setVisible] = useState(profile.directoryVisible),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [staff, setStaff] = useState(false),
 [canFollowUp,setCanFollowUp]=useState(false),
 [canReviewDeletion,setCanReviewDeletion]=useState(false);
  const [canSearchMembers, setCanSearchMembers] = useState(false);
  useEffect(() => {
    mounted.current = true;
    let live = true;
    api
      .request("/api/v1/me/access")
      .then(({ data }) => {
 if(live)setCanFollowUp(hasCapability(data,"visitors.follow_up"));
 if(live)setCanReviewDeletion(hasCapability(data,"accounts.deletion.review"));
        if(live)setCanSearchMembers(hasCapability(data,"members.records.read"));
        if (live)
          setStaff(
            ["sermons.manage", "roles.manage", "roles.read"].some(
              (permission) => hasCapability(data, permission),
            ),
          );
      })
      .catch(() => {});
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
      if (visible !== profile.directoryVisible)
        patch.directoryVisible = visible;
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
      <div className="banner" />
      <ProfilePhotoPanel profile={profile} setProfile={setProfile} />
      <h1 className="p-name">
        {profile.firstName} {profile.lastName}
      </h1>
      <p>{profile.email}</p>
{canFollowUp&&<button className="btn soft" onClick={()=>navigate("/visitors")}>Visitor follow-up</button>}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      <form className="auth-card" aria-label="Edit profile" onSubmit={save}>
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
        <label>
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />{" "}
          Show my name in the member directory
        </label>
        <button className="btn gold block" disabled={busy}>
          Save profile
        </button>
      </form>
      <GoogleLinkPanel hasPassword={profile.hasPassword}/>
      <ChangePasswordPanel hasPassword={profile.hasPassword} />
      <AccountDeletionPanel />
      {canReviewDeletion && <button className="btn soft" onClick={() => navigate("/account-deletion-requests")}>Account deletion requests</button>}
      {canSearchMembers && <button className="btn soft" onClick={() => navigate("/admin/members")}>Member lookup</button>}
      <div className="wrap">
<a className="btn soft" href="#/pastors">Pastoral appointments</a>
        <a className="btn soft" href="/profile.html">
          Advanced security tools (test console)
        </a>
        <a className="btn soft" href="/members.html">
          Member directory
        </a>
        {staff && (
          <a className="btn soft" href="/staff.html">
            Staff tools
          </a>
        )}
        <button className="btn gold" disabled={busy} onClick={signOut}>
          Sign out
        </button>
      </div>
    </section>
  );
}
