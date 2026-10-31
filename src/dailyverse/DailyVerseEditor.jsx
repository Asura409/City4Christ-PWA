import React, { useEffect, useRef, useState } from "react";
import { useContentList, ContentListState } from "@/content/useContentList";
import { getVerse } from "./api";
import { DailyVerseForm } from "./DailyVerseForm";
export function DailyVerseEditor({ revision, onChange }) {
  const state = useContentList("/api/v1/admin/daily-verses", revision),
    [entry, setEntry] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const [selectionVersion, setSelectionVersion] = useState(0);
  async function open(id) {
    const version = ++generation.current;
    setSelectionVersion(version);
    setBusy(true);
    setError("");
    try {
      const value = await getVerse(id);
      if (version === generation.current) setEntry(value);
    } catch (e) {
      if (version === generation.current) {
        setError(e.message);
        if (e.status === 401 || e.status === 403) onChange();
      }
    } finally {
      if (version === generation.current) setBusy(false);
    }
  }
  function startNew() {
    generation.current++;
    setSelectionVersion(generation.current);
    setBusy(false);
    setError("");
    setEntry(null);
  }
  function saved(value, expectedSelection) {
    if (expectedSelection === generation.current) setEntry(value);
    onChange();
  }
  return (
    <section className="auth-card" aria-label="Manage daily verses">
      <h2>Manage daily verses</h2>
      <button className="btn soft" onClick={startNew}>
        New daily verse
      </button>
      <ContentListState state={state} label="Loading daily verses…" />
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Loading verse…</p>}
      <ul className="devotional-list">
        {state.items.map((e) => (
          <li key={e.id}>
            <button
              className="btn soft"
              aria-label={
                "Edit verse for " + e.displayDate + ": " + e.scriptureReference
              }
              disabled={busy}
              onClick={() => open(e.id)}
            >
              {e.displayDate} · {e.scriptureReference}
            </button>
            <span>{e.status}</span>
          </li>
        ))}
      </ul>
      {!busy && (
        <DailyVerseForm
          key={selectionVersion}
          entry={entry}
          onSaved={(value) => saved(value, selectionVersion)}
          onReload={() => entry && open(entry.id)}
          onForbidden={onChange}
        />
      )}
    </section>
  );
}
