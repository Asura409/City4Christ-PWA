import React, { useEffect, useRef, useState } from "react";
import { createBroadcast, updateBroadcast } from "./api";
import { BroadcastVideo } from "./BroadcastVideo";
import { youtubeWatchUrl } from "../media/youtube";
import { ukDateTimeInput, ukInputToInstant } from "../../js/time";
import { TimedMessage } from "../components/TimedMessage";
export function BroadcastForm({ initial, featured, onSaved, onForbidden, onReload, onDirty, onBusy }) {
  const [entry, setEntry] = useState(initial);
  const [fields, setFields] = useState(() => ({ title: initial?.title || "", videoUrl: initial?.videoUrl || "", serviceAt: initial ? ukDateTimeInput(initial.serviceAt) : "", description: initial?.description || "", broadcastStatus: initial?.broadcastStatus || "upcoming" }));
  const [preview, setPreview] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [conflict, setConflict] = useState(false), [review, setReview] = useState(null);
  const mounted = useRef(true), saving = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function field(name) { return { value: fields[name], onChange: (e) => { setFields((old) => ({ ...old, [name]: e.target.value })); if (name === "videoUrl") setPreview(null); onDirty(true); setReview(null); } }; }
  function content() { const videoUrl = youtubeWatchUrl(fields.videoUrl); if (!videoUrl) throw new Error("Paste a valid HTTPS YouTube video or specific broadcast link."); return { ...fields, title: fields.title.trim(), videoUrl, serviceAt: ukInputToInstant(fields.serviceAt) }; }
  function submit(event) {
    event.preventDefault(); setError(""); setNotice("");
    try {
      const body = content();
      if (event.nativeEvent.submitter?.value === "draft") void save(body, "draft");
      else setReview(body);
    } catch (e) { setError(e.message); }
  }
  async function save(body, status) {
    if (saving.current) return;
    saving.current = true; setBusy(true); onBusy(true); setError(""); setNotice("");
    try {
      let value = entry;
      if (!value) {
        value = await createBroadcast(body);
        if (!mounted.current) return;
        setEntry(value); // Retain a successful draft if the second publication request fails.
        onSaved(value);
        if (status === "published") value = await updateBroadcast(value.id, { ...body, status, version: value.version });
      } else value = await updateBroadcast(value.id, { ...body, status, version: value.version });
      if (!mounted.current) return;
      setEntry(value); setFields({ title:value.title, videoUrl:value.videoUrl, serviceAt:ukDateTimeInput(value.serviceAt), description:value.description, broadcastStatus:value.broadcastStatus }); setReview(null); setConflict(false); onDirty(false); onSaved(value);
      setNotice(value.status === "published" ? "Broadcast published." : "Draft saved. This broadcast is hidden from viewers.");
    } catch (e) {
      if (!mounted.current) return;
      setReview(null); setError([e.message, ...Object.values(e.fields || {}).filter((v) => typeof v === "string")].join(" ")); setConflict(e.status === 409);
      if (e.status === 401 || e.status === 403) onForbidden();
    } finally { saving.current = false; if (mounted.current) { setBusy(false); onBusy(false); } }
  }
  async function endLive() {
    try { const body = { ...content(), broadcastStatus: "replay" }; if (window.confirm("Mark this broadcast as a replay? This does not stop streaming on YouTube.")) await save(body, "published"); }
    catch (e) { setError(e.message); }
  }
  return <form className="broadcast-panel broadcast-form" onSubmit={submit} aria-label="Broadcast editor">
    <h2>{entry ? "Edit broadcast" : "Add a broadcast"}</h2><p className="broadcast-muted">Preview your video before publishing.</p>
    <fieldset disabled={busy || conflict}>
      <label>Service title<input required maxLength={200} {...field("title")} /></label>
      <label>YouTube link<input type="url" required maxLength={2000} placeholder="https://youtu.be/…" {...field("videoUrl")} /></label>
      <button className="btn soft" type="button" onClick={() => { try { const videoUrl = youtubeWatchUrl(fields.videoUrl); if (!videoUrl) throw new Error("Paste a valid HTTPS YouTube link."); setPreview({ title:fields.title, videoUrl }); setError(""); } catch (e) { setError(e.message); } }}>Preview video</button>
      {preview && <BroadcastVideo entry={preview} />}
      <label>Service date & time (UK time)<input type="datetime-local" required min="2000-01-01T00:00" max="2100-12-31T23:59" {...field("serviceAt")} /></label>
      <label>Description (optional)<textarea maxLength={2000} rows={4} {...field("description")} /></label>
      <div className="broadcast-status-field"><label htmlFor="broadcast-editor-status">Broadcast status</label><select id="broadcast-editor-status" {...field("broadcastStatus")}><option value="upcoming">Upcoming</option><option value="live">Live now</option><option value="replay">Replay</option></select></div>
      <p className="broadcast-hint">Live status is set by the church team. This does not start or stop the stream on YouTube.</p>
      <div className="broadcast-actions"><button className="btn soft" name="action" value="draft" type="submit">{entry?.status === "published" ? "Unpublish & save draft" : "Save draft"}</button><button className="btn gold" name="action" value="published" type="submit">{entry?.status === "published" ? "Publish changes" : "Publish broadcast"}</button></div>
      {entry?.status === "published" && entry.broadcastStatus === "live" && <button className="btn soft" type="button" onClick={endLive}>End live & keep replay</button>}
    </fieldset>
    {busy && <p role="status">Saving broadcast…</p>}{error && <p className="broadcast-error" role="alert">{error}</p>}
    {conflict && <button className="btn soft" type="button" onClick={() => onReload(entry.id)}>Reload latest version</button>}
    <TimedMessage message={notice} />
    {review && <div className="broadcast-modal-backdrop"><section className="broadcast-modal broadcast-panel" role="dialog" aria-modal="true" aria-labelledby="broadcast-review-title" onKeyDown={(event) => { if (event.key === "Escape" && !busy) setReview(null); if (event.key === "Tab") { const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled)')]; const first = controls[0], last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } } }}>
      <h2 id="broadcast-review-title">Publish “{review.title}”?</h2><p>{entry?.status === "published" && !(review.broadcastStatus === "live" && entry.broadcastStatus !== "live") ? "Changes will be visible to viewers immediately." : featured && featured.id !== entry?.id ? `This will replace “${featured.title}” as the latest broadcast. The previous broadcast will stay in Past broadcasts.` : "This will become the latest broadcast for viewers."}</p><p>When you publish a replacement or mark a broadcast live, the previous live broadcast is kept as a replay.</p><div className="broadcast-actions"><button autoFocus type="button" className="btn soft" disabled={busy} onClick={() => setReview(null)}>Keep editing</button><button className="btn gold" type="button" disabled={busy} onClick={() => save(review, "published")}>Confirm publication</button></div>
    </section></div>}
  </form>;
}
