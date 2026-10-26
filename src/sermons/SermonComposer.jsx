import React, { useEffect, useState } from "react";
import { hasCapability } from "../../js/access.js";
import { api } from "@/auth/session";
import { uploadMedia } from "@/posts/api";
import { createSermonDraft, publishSermon } from "@/sermons/api";

export function SermonComposer({ onPublished }) {
  const [allowed, setAllowed] = useState(false);
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [summary, setSummary] = useState("");
  const [preachedAt, setPreachedAt] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [files, setFiles] = useState([]);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    api.request("/api/v1/me/access").then(({ data }) => {
      if (live) setAllowed(hasCapability(data, "sermons.manage"));
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  if (!allowed) return null;

  async function create(event) {
    event.preventDefault();
    setBusy(true); setError(""); setStatus("");
    try {
      const attachmentIds = [];
      for (const file of files) attachmentIds.push(await uploadMedia(file, "sermon_attachment", { onStatus: setStatus }));
      const created = await createSermonDraft({ title: title.trim(), speaker: speaker.trim(), summary: summary.trim(), preachedAt: new Date(preachedAt).toISOString(), ...(attachmentIds.length ? { attachmentIds } : {}) });
      setDraft(created); setStatus("Draft created. Publish it when you are ready.");
    } catch (e) { setError(e.message || "Could not create the sermon draft."); }
    finally { setBusy(false); }
  }

  async function publish() {
    setBusy(true); setError("");
    try {
      await publishSermon(draft.id, draft.version);
      setStatus("Sermon published."); setDraft(null); setFiles([]); setTitle(""); setSpeaker(""); setSummary("");
      onPublished?.();
    } catch (e) { setError(e.message || "Could not publish the sermon."); }
    finally { setBusy(false); }
  }

  function selectFiles(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    const allowed = selected.filter((file) => /^(image\/(jpeg|png|webp|gif)|audio\/(mpeg|mp4|wav|x-wav|ogg)|video\/(mp4|webm))$/.test(file.type));
    if (allowed.length !== selected.length) { setError("Choose JPG, PNG, WebP, GIF, MP3, WAV, OGG, MP4, or WebM files."); return; }
    if (allowed.length > 10) { setError("A sermon can include up to 10 files."); return; }
    const oversized = allowed.find((file) => file.size > (file.type.startsWith("image/") ? 20 : file.type.startsWith("audio/") ? 50 : 100) * 1024 * 1024);
    if (oversized) { setError(`${oversized.name} is too large for this media type.`); return; }
    setError(""); setFiles(allowed);
  }

  return <form className="sermon-composer card" aria-label="Create a sermon" onSubmit={create}>
    <h2>Share a sermon</h2>
    {error && <p role="alert">{error}</p>}
    {status && <p role="status">{status}</p>}
    {!draft && <>
      <label className="auth-field">Sermon title<input aria-label="Sermon title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="auth-field">Speaker<input aria-label="Speaker" required maxLength={200} value={speaker} onChange={(e) => setSpeaker(e.target.value)} /></label>
      <label className="auth-field">Summary<textarea maxLength={10000} value={summary} onChange={(e) => setSummary(e.target.value)} /></label>
      <label className="auth-field">Preached at<input type="datetime-local" required value={preachedAt} onChange={(e) => setPreachedAt(e.target.value)} /></label>
      <label className="auth-field">Photos, audio, or video<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/ogg,video/mp4,video/webm" onChange={selectFiles} /></label>
      {files.length > 0 && <p>{files.map((file) => file.name).join(", ")}</p>}
      <button className="btn gold" disabled={busy || !title.trim() || !speaker.trim()}>{busy ? "Creating…" : "Create draft"}</button>
    </>}
    {draft && <button type="button" className="btn gold" disabled={busy} onClick={publish}>{busy ? "Publishing…" : "Publish sermon"}</button>}
  </form>;
}
