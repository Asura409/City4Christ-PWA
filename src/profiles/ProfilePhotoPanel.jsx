import React, { useRef, useState } from "react";
import { removeProfilePhoto, setProfilePhoto, uploadProfilePhoto } from "@/profiles/api";

const maxPhotoBytes = 5 * 1024 * 1024;
const photoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function safePhotoURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}

export default function ProfilePhotoPanel({ profile, setProfile }) {
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const photoURL = safePhotoURL(profile.avatar?.url);

  function choosePhoto(event) {
    const selected = event.target.files?.[0] || null;
    setError("");
    setStatus("");
    if (selected && !photoTypes.has(selected.type)) {
      setFile(null);
      event.target.value = "";
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (selected && selected.size > maxPhotoBytes) {
      setFile(null);
      event.target.value = "";
      setError("Choose an image smaller than 5 MB.");
      return;
    }
    setFile(selected);
  }

  async function upload(event) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const uploadId = await uploadProfilePhoto(file, { onStatus: setStatus });
      const updated = await setProfilePhoto(uploadId);
      setProfile(updated);
      setFile(null);
      if (input.current) input.current.value = "";
      setStatus("Profile photo updated.");
    } catch (cause) {
      setError(cause.message || "Could not update your profile photo.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      setProfile(await removeProfilePhoto());
      setStatus("Profile photo removed.");
    } catch (cause) {
      setError(cause.message || "Could not remove your profile photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="profile-photo-panel" aria-label="Profile photo settings">
      <div className="profile-photo-frame">
        {photoURL ? (
          <img className="profile-photo-image" src={photoURL} alt="Your profile photo" />
        ) : (
          <span className="profile-photo-fallback" aria-label="No profile photo">
            {[profile.firstName, profile.lastName].filter(Boolean).map((name) => name[0]).join("").toUpperCase()}
          </span>
        )}
      </div>
      <form className="profile-photo-form" onSubmit={upload}>
        <label className="auth-field" htmlFor="profile-photo-file">
          Profile photo
          <input
            ref={input}
            id="profile-photo-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={choosePhoto}
            disabled={busy}
          />
        </label>
        <p className="profile-photo-help">JPEG, PNG or WebP, up to 5 MB. Your photo appears in the member directory only while your profile is visible there.</p>
        <div className="wrap">
          <button className="btn gold" type="submit" disabled={!file || busy}>
            {busy ? "Working…" : "Upload photo"}
          </button>
          {profile.avatar && <button className="btn soft" type="button" onClick={remove} disabled={busy}>Remove photo</button>}
        </div>
        {status && <p role="status">{status}</p>}
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
}
