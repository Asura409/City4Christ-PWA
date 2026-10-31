import React, { useEffect, useRef, useState } from "react";
import { api } from "@/auth/session";
import { useSession } from "@/auth/session";
import { safeImageUrl, safeUrl, youtubeEmbedUrl } from "@/lib/sanitize";
import { SermonComposer } from "@/sermons/SermonComposer";
import { deleteSermonNote, getSermonNote, getSermonProgress, listPublishedSermonSeries, saveSermonNote, saveSermonProgress } from "@/sermons/api";

function formatPlaybackTime(seconds) {
  const value = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(value / 60);
  return `${minutes}:${String(value % 60).padStart(2, "0")}`;
}

function AttachmentList({ items = [], resumeAt = 0, onPlaybackPosition = () => {} }) {
  const mediaRefs = useRef(new Map());
  useEffect(() => {
    for (const media of mediaRefs.current.values()) {
      if (resumeAt > 0 && media.readyState >= 1 && resumeAt < media.duration && Math.abs(media.currentTime - resumeAt) > 1) media.currentTime = resumeAt;
    }
  }, [resumeAt]);
  return <div className="sermon-attachments">{items.map((item) => {
    const url = safeUrl(item.url);
    if (url === "#") return null;
    if (item.contentType?.startsWith("image/")) return <img key={item.id} src={url} alt="Sermon attachment" loading="lazy" />;
    if (item.contentType?.startsWith("audio/")) return <audio key={item.id} ref={(element) => { if (element) mediaRefs.current.set(item.id, element); else mediaRefs.current.delete(item.id); }} src={url} controls preload="metadata" aria-label="Sermon audio" onLoadedMetadata={(event) => { if (resumeAt > 0 && resumeAt < event.currentTarget.duration) event.currentTarget.currentTime = resumeAt; }} onTimeUpdate={(event) => onPlaybackPosition(event.currentTarget.currentTime)} onPause={(event) => onPlaybackPosition(event.currentTarget.currentTime, true)} />;
    if (item.contentType?.startsWith("video/")) return <video key={item.id} ref={(element) => { if (element) mediaRefs.current.set(item.id, element); else mediaRefs.current.delete(item.id); }} src={url} controls playsInline preload="metadata" aria-label="Sermon video" onLoadedMetadata={(event) => { if (resumeAt > 0 && resumeAt < event.currentTarget.duration) event.currentTarget.currentTime = resumeAt; }} onTimeUpdate={(event) => onPlaybackPosition(event.currentTarget.currentTime)} onPause={(event) => onPlaybackPosition(event.currentTarget.currentTime, true)} />;
    return null;
  })}</div>;
}
export default function WordScreen() {
  const { profile } = useSession();
  const [query, setQuery] = useState(""),
    [seriesFilter, setSeriesFilter] = useState(""),
    [seriesOptions, setSeriesOptions] = useState([]),
    [seriesError, setSeriesError] = useState(""),
    [items, setItems] = useState([]),
    [cursor, setCursor] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(null),
    [memberProgress, setMemberProgress] = useState(0),
    [memberNote, setMemberNote] = useState(""),
    [noteExists, setNoteExists] = useState(false),
    [memberBusy, setMemberBusy] = useState(false),
    [memberError, setMemberError] = useState(""),
    [memberStatus, setMemberStatus] = useState("");
  const lastProgressWrite = useRef({ seconds: 0, at: 0 });
  async function load(next = "") {
    setBusy(true);
    setError("");
    try {
      const qs = new URLSearchParams({ limit: "20", query });
      if (seriesFilter) qs.set("series", seriesFilter);
      if (next) qs.set("cursor", next);
      const result = await api.request("/api/v1/sermons?" + qs, {
        public: true,
      });
      setItems((old) => (next ? [...old, ...result.data] : result.data));
      setCursor(result.meta?.nextCursor || "");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    let live = true;
    listPublishedSermonSeries()
      .then((result) => { if (live) setSeriesOptions(Array.isArray(result) ? result : []); })
      .catch((e) => { if (live) setSeriesError(e.message || "Published series are unavailable."); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    let live = true;
    if (!selected || !profile) {
      setMemberProgress(0);
      setMemberNote("");
      setNoteExists(false);
      setMemberError("");
      return () => { live = false; };
    }
    setMemberBusy(true);
    setMemberProgress(0);
    setMemberNote("");
    setNoteExists(false);
    setMemberError("");
    setMemberStatus("");
    Promise.all([getSermonProgress(selected.id), getSermonNote(selected.id)])
      .then(([progress, note]) => {
        if (!live) return;
        const position = progress?.positionSeconds || 0;
        setMemberProgress(position);
        lastProgressWrite.current = { seconds: position, at: Date.now() };
        setMemberNote(note?.body || "");
        setNoteExists(Boolean(note));
      })
      .catch((e) => { if (live) setMemberError(e.message || "Could not load your sermon notes and progress."); })
      .finally(() => { if (live) setMemberBusy(false); });
    return () => { live = false; };
  }, [selected?.id, profile?.id]);
  async function open(id) {
    setBusy(true);
    setError("");
    try {
      setSelected(
        (
          await api.request("/api/v1/sermons/" + encodeURIComponent(id), {
            public: true,
          })
        ).data,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function updatePlaybackPosition(seconds, force = false) {
    if (!profile || !selected || !Number.isFinite(seconds)) return;
    const position = Math.max(0, Math.floor(seconds));
    setMemberProgress(position);
    const previous = lastProgressWrite.current;
    if (!force && (Math.abs(position - previous.seconds) < 10 || Date.now() - previous.at < 5000)) return;
    lastProgressWrite.current = { seconds: position, at: Date.now() };
    try {
      await saveSermonProgress(selected.id, position);
      setMemberStatus("Playback progress saved.");
      setMemberError("");
    } catch (e) {
      setMemberError(e.message || "Could not save playback progress.");
    }
  }
  async function saveNote(event) {
    event.preventDefault();
    if (!selected || !memberNote.trim()) return;
    setMemberBusy(true); setMemberError(""); setMemberStatus("");
    try {
      await saveSermonNote(selected.id, memberNote);
      setNoteExists(true); setMemberStatus("Note saved.");
    } catch (e) { setMemberError(e.message || "Could not save your note."); }
    finally { setMemberBusy(false); }
  }
  async function removeNote() {
    if (!selected) return;
    setMemberBusy(true); setMemberError(""); setMemberStatus("");
    try {
      await deleteSermonNote(selected.id);
      setMemberNote(""); setNoteExists(false); setMemberStatus("Note deleted.");
    } catch (e) { setMemberError(e.message || "Could not delete your note."); }
    finally { setMemberBusy(false); }
  }
  return (
    <section className="screen active" aria-label="Sermons and media">
      <div className="sh">
        <h1>Word Hub</h1>
<a className="btn soft" href="#/devotionals">Read devotionals</a>
<a className="btn soft" href="#/bible">Open Bible</a>
      </div>
      <SermonComposer onPublished={() => { setSelected(null); void load(); }} />
      {error && <p role="alert">{error}</p>}
      {selected ? (
        <article className="card sermon">
          <button className="btn soft" onClick={() => setSelected(null)}>
            Back to sermons
          </button>
          <h2>{selected.title}</h2>
          {safeImageUrl(selected.imageUrl) && <img className="sermon-image sermon-detail-image" src={safeImageUrl(selected.imageUrl)} alt={selected.title} loading="lazy" referrerPolicy="no-referrer" />}
          <p>{selected.summary}</p>
          <p>{selected.speaker}</p>
          {profile && <section className="sermon-member-tools" aria-label="Your sermon progress and notes">
            <h3>Your sermon notes</h3>
            {memberError && <p role="alert">{memberError}</p>}
            {memberStatus && <p role="status">{memberStatus}</p>}
            {memberProgress > 0 && <p>Resume at {formatPlaybackTime(memberProgress)}</p>}
            <form onSubmit={saveNote}>
              <label htmlFor="private-sermon-notes">Private sermon notes</label>
              <textarea id="private-sermon-notes" aria-label="Private sermon notes" maxLength={10000} value={memberNote} onChange={(event) => setMemberNote(event.target.value)} />
              <div className="sermon-member-actions">
                <button className="btn soft" type="submit" disabled={memberBusy || !memberNote.trim()}>{memberBusy ? "Saving…" : "Save note"}</button>
                {noteExists && <button className="btn soft" type="button" disabled={memberBusy} onClick={() => void removeNote()}>Delete note</button>}
              </div>
            </form>
          </section>}
          {youtubeEmbedUrl(selected.videoUrl) && <div className="sermon-video"><iframe title={`${selected.title} video`} src={youtubeEmbedUrl(selected.videoUrl)} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>}
          {selected.videoUrl && safeUrl(selected.videoUrl) !== "#" && (
            <a
              className="btn gold"
              href={safeUrl(selected.videoUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch sermon
            </a>
          )}
          <AttachmentList items={selected.attachments} resumeAt={memberProgress} onPlaybackPosition={(seconds, force) => void updatePlaybackPosition(seconds, force)} />
        </article>
      ) : (
        <>
          <form
            className="sermon-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <label htmlFor="sermon-query">Search sermons</label>
            <input
              id="sermon-query"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label htmlFor="sermon-series">Sermon series</label>
            <select id="sermon-series" value={seriesFilter} onChange={(event) => setSeriesFilter(event.target.value)}>
              <option value="">All series</option>
              {seriesOptions.map((series) => <option key={series.name} value={series.name}>{series.name} ({series.sermonCount})</option>)}
            </select>
            <button className="btn gold" disabled={busy}>
              Search sermons
            </button>
          </form>
          {seriesError && <p role="status">{seriesError}</p>}
          {!busy && !items.length && <p>No published sermons yet.</p>}
          {items.map((s) => (
            <article key={s.id} className="card sermon">
              {safeImageUrl(s.imageUrl) && <img className="sermon-image" src={safeImageUrl(s.imageUrl)} alt={s.title} loading="lazy" referrerPolicy="no-referrer" />}
              <div className="s-text">
                <h2>{s.title}</h2>
                <p>{s.summary}</p>
                <small>{s.speaker}</small>
              </div>
              <AttachmentList items={s.attachments} />
              <button
                className="btn soft"
                disabled={busy}
                onClick={() => open(s.id)}
              >
                Open sermon
              </button>
            </article>
          ))}
          {cursor && (
            <button
              className="btn soft"
              disabled={busy}
              onClick={() => load(cursor)}
            >
              Load more sermons
            </button>
          )}
        </>
      )}
      {busy && <p role="status">Loading sermons…</p>}
    </section>
  );
}
