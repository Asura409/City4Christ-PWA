import React, { useEffect, useRef, useState } from "react";
import { useDevotionals, DevotionalListState } from "./useDevotionals";
import { getEditorial } from "./api";
import { DevotionalForm } from "./DevotionalForm";
export function DevotionalEditor({ revision, onChange, onDirty }) {
  const state = useDevotionals(true, revision),
    [entry, setEntry] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [mobileEditing, setMobileEditing] = useState(false),
    [dirty, setDirty] = useState(false),
    generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const [selectionVersion, setSelectionVersion] = useState(0);
  async function open(id) {
    if (dirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    const version = ++generation.current;
    setSelectionVersion(version);
    setBusy(true);
    setError("");
    try {
      const value = await getEditorial(id);
      if (version === generation.current) { setEntry(value); setDirty(false); onDirty?.(false); setMobileEditing(true); }
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
    if (dirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    generation.current++;
    setSelectionVersion(generation.current);
    setBusy(false);
    setError("");
    setEntry(null);
    setDirty(false);
    onDirty?.(false);
    setMobileEditing(true);
  }
  function saved(value, expectedSelection) {
    if (expectedSelection === generation.current) { setEntry(value); setDirty(false); onDirty?.(false); }
    onChange();
  }
  return (
    <section className="devotional-editor-panel" aria-label="Manage devotionals">
      <header className="devotional-editor-heading"><div><p className="devotionals-eyebrow">EDITORIAL WORKSPACE</p><h2>Manage devotionals</h2></div><button className="btn gold" type="button" onClick={startNew}>+ New devotional</button></header>
      <div className={`devotional-editor-layout ${mobileEditing ? "is-editing" : ""}`}>
        <aside className="devotional-editor-list">
          <button className="devotional-new-mobile btn gold" type="button" onClick={startNew}>+ New devotional</button>
          <DevotionalListState state={state} />
          <div className="devotional-list" role="list">
            {state.items.map((e) => <button key={e.id} type="button" aria-label={`Edit ${e.title}`} className={`devotional-editor-item ${entry?.id === e.id ? "is-selected" : ""}`} disabled={busy} onClick={() => open(e.id)}><span><strong>{e.title}</strong><small>{e.status}</small></span><i aria-hidden="true">→</i></button>)}
          </div>
        </aside>
        <div className="devotional-editor-form-area">
          {mobileEditing && <button type="button" className="devotional-back" onClick={() => { if (!dirty || window.confirm("You have unsaved changes. Discard them?")) setMobileEditing(false); }}>← Back to devotionals</button>}
          {error && <p className="devotional-error" role="alert">{error}</p>}
          {busy && <p role="status">Loading draft…</p>}
          {!busy && <DevotionalForm key={selectionVersion} entry={entry} onSaved={(value) => saved(value, selectionVersion)} onReload={() => entry && open(entry.id)} onForbidden={onChange} onDirty={(value) => { setDirty(value); onDirty?.(value); }} />}
        </div>
      </div>
    </section>
  );
}
