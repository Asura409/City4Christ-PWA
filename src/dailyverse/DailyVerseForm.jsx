import React, { useEffect, useState } from "react";
import { PassageLookup } from "@/bible/PassageLookup";
import { formatPassageText } from "@/bible/formatPassageText";
import { createVerse, updateVerse } from "./api";

const empty = { displayDate: new Date(Date.now() + 3600000).toISOString().slice(0, 10), text: "", scriptureReference: "", translation: "" };
function shortDate(value) {
  if (!value) return "the selected date";
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

export function DailyVerseForm({ entry, existingEntries = [], onSaved, onReload, onOpenExisting, onForbidden }) {
  const [fields, setFields] = useState(empty), [busy, setBusy] = useState(false), [error, setError] = useState(""), [conflict, setConflict] = useState(false), [feedback, setFeedback] = useState(null);
  useEffect(() => { setFields(entry ? { displayDate: entry.displayDate, text: entry.text, scriptureReference: entry.scriptureReference, translation: entry.translation } : empty); setError(""); setConflict(false); }, [entry]);
  const field = (name) => ({ value: fields[name], onChange: (e) => setFields((old) => ({ ...old, [name]: e.target.value })) });
  const existingPublished = existingEntries.find((item) => item.displayDate === fields.displayDate && item.status === "published" && item.id !== entry?.id);
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(""); setConflict(false); setFeedback(null);
    const status = event.nativeEvent.submitter?.value || "draft";
    try {
      const value = entry ? await updateVerse(entry.id, { ...fields, status, version: entry.version }) : await createVerse(fields);
      onSaved(value);
      setFeedback({ tone: "success", message: status === "published" ? `Daily verse published successfully for ${shortDate(fields.displayDate)}.` : "Draft saved successfully." });
    } catch (e) {
      const labels = { displayDate: "Display date", text: "Verse text", scriptureReference: "Scripture reference", translation: "Translation" };
      const details = Object.entries(labels).filter(([key]) => typeof e.fields?.[key] === "string").map(([key, label]) => `${label}: ${e.fields[key]}`);
      const message = [e.message, ...details].join(" ");
      setError(message); setFeedback({ tone: "error", message: message || "The daily verse could not be saved." }); setConflict(e.code === "verse_date_conflict" || (e.status === 409 && e.code === "version_conflict"));
      if (e.status === 401 || e.status === 403) onForbidden();
    } finally { setBusy(false); }
  }
  function usePassage(passage) {
    const text = formatPassageText(passage);
    if (!passage.translation.canImport || Array.from(text).length > 4000) return;
    setFields((old) => ({ ...old, text, scriptureReference: passage.reference, translation: passage.translation.name })); setError(""); setConflict(false);
  }
  return (
    <form aria-label="Daily verse editor" className="daily-verse-form" onSubmit={save}>
      <div className="daily-verse-form-title"><div><p className="devotionals-eyebrow">{entry ? "EDIT DAILY VERSE" : "NEW DAILY VERSE"}</p><h3>Edit daily verse</h3></div>{entry && <span className={`daily-verse-badge ${entry.status === "published" ? "is-published" : ""}`}>{entry.status}</span>}</div>
      {entry && <p className="daily-verse-version">Version {entry.version}</p>}
      {feedback && <div className={`daily-verse-feedback is-${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"} aria-live="polite"><span className="daily-verse-feedback-icon" aria-hidden="true">{feedback.tone === "success" ? "✓" : "×"}</span><span>{feedback.message}</span><button type="button" aria-label="Dismiss message" onClick={() => setFeedback(null)}>×</button></div>}
      {error && !feedback && <p className="daily-verse-error" role="alert">{error}</p>}
      {conflict && <div className="daily-verse-conflict" role="status"><strong>This date already has a published verse.</strong><span>Choose another date or open the existing entry.</span>{existingPublished && <button type="button" className="btn soft" onClick={() => onOpenExisting?.(existingPublished.id)}>Open existing entry</button>}</div>}
      <label className="daily-date-field">Display date (GMT+1)<input type="date" required min="0001-01-01" max="9999-12-31" {...field("displayDate")} />{existingPublished && <span className="daily-date-warning">A published verse already exists for this date. <button type="button" onClick={() => onOpenExisting?.(existingPublished.id)}>Open it</button> or choose another date.</span>}</label>
      <section className="daily-passage-section" aria-label="Choose Bible passage"><h4>Choose Bible passage</h4><p className="daily-passage-help">Look up a passage and it will be added to the verse text automatically.</p><PassageLookup embedded autoUse onUse={usePassage} autoLookup={false} initialReference={entry?.scriptureReference || ""} initialTranslationName={entry?.translation || ""} /></section>
      {fields.text && <section className="daily-passage-preview" aria-label="Passage preview"><p className="devotionals-eyebrow">PASSAGE PREVIEW</p><strong>{fields.scriptureReference || "Selected passage"}</strong><span>{fields.translation || "Translation not specified"}</span><p>{fields.text}</p></section>}
      <div className="daily-verse-fields"><label>Verse text<textarea required rows={6} maxLength={4000} {...field("text")} /></label><label>Scripture reference<input required maxLength={200} {...field("scriptureReference")} /></label><label>Translation / attribution<input maxLength={100} {...field("translation")} /></label></div>
      <p className="daily-verse-home-note">Appears on Home on {shortDate(fields.displayDate)} (GMT+1).</p>
      <div className="daily-verse-actions"><button className="btn soft" type="submit" value="draft" disabled={busy}>Save draft</button><button className="btn gold" type="submit" value="published" disabled={busy || !entry}>{entry ? `Publish for ${shortDate(fields.displayDate)}` : "Publish verse"}</button>{!entry && <span>Save a draft before publishing.</span>}</div>
    </form>
  );
}
