import React, { useEffect, useRef, useState } from "react";
import { useContentList, ContentListState } from "@/content/useContentList";
import { getVerse } from "./api";
import { DailyVerseForm } from "./DailyVerseForm";

function shortDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

export function DailyVerseEditor({ revision, onChange }) {
  const state = useContentList("/api/v1/admin/daily-verses", revision),
    [entry, setEntry] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [mobileEditing, setMobileEditing] = useState(false),
    generation = useRef(0);
  const [selectionVersion, setSelectionVersion] = useState(0);
  useEffect(() => () => { generation.current++; }, []);

  async function open(id) {
    const version = ++generation.current;
    setSelectionVersion(version); setBusy(true); setError("");
    try {
      const value = await getVerse(id);
      if (version === generation.current) { setEntry(value); setMobileEditing(true); }
    } catch (e) {
      if (version === generation.current) { setError(e.message); if (e.status === 401 || e.status === 403) onChange(); }
    } finally { if (version === generation.current) setBusy(false); }
  }
  function startNew() {
    generation.current++; setSelectionVersion(generation.current); setBusy(false); setError(""); setEntry(null); setMobileEditing(true);
  }
  function saved(value, expectedSelection) { if (expectedSelection === generation.current) setEntry(value); onChange(); }
  return (
    <section className="daily-verse-workspace" aria-label="Manage daily verses">
      <header className="daily-verse-heading"><div><p className="devotionals-eyebrow">DAILY SCRIPTURE</p><h2>Daily verse</h2><p>Choose a Scripture passage to publish for a specific day.</p></div></header>
      <div className={`daily-verse-layout ${mobileEditing ? "is-editing" : ""}`}>
        <aside className="daily-verse-schedule">
          <div className="daily-verse-panel-heading"><div><p className="devotionals-eyebrow">SCHEDULE</p><h3>Verse schedule</h3></div><span>{state.items.length}</span></div>
          <button className="daily-new-verse btn soft" type="button" onClick={startNew}>＋ New verse</button>
          <ContentListState state={state} label="Loading verse schedule…" />
          {error && <p className="daily-verse-error" role="alert">{error}</p>}
          <div className="daily-verse-list" role="list">
            {state.items.map((item) => <button key={item.id} type="button" aria-label={`Edit verse for ${item.displayDate}: ${item.scriptureReference || "No reference"}`} className={`daily-verse-list-item ${entry?.id === item.id ? "is-selected" : ""}`} onClick={() => open(item.id)} disabled={busy}><span className="daily-verse-list-date">{shortDate(item.displayDate)}</span><span className="daily-verse-list-reference">{item.scriptureReference || "No reference"}</span><span className={`daily-verse-badge ${item.status === "published" ? "is-published" : ""}`}>{item.status}</span></button>)}
          </div>
        </aside>
        <div className="daily-verse-editor-pane">
          {mobileEditing && <button type="button" className="daily-verse-back" onClick={() => setMobileEditing(false)}>← Back to schedule</button>}
          {error && <p className="daily-verse-error daily-verse-editor-error" role="alert">{error}</p>}
          {busy && <p role="status">Loading verse…</p>}
          {!busy && <DailyVerseForm key={selectionVersion} entry={entry} existingEntries={state.items} onSaved={(value) => saved(value, selectionVersion)} onReload={() => entry && open(entry.id)} onOpenExisting={open} onForbidden={onChange} />}
        </div>
      </div>
    </section>
  );
}
