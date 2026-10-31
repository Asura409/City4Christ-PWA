import React, { useEffect, useRef, useState } from "react";
import { useDevotionals, DevotionalListState } from "./useDevotionals";
import { getEditorial } from "./api";
import { DevotionalForm } from "./DevotionalForm";
export function DevotionalEditor({ revision, onChange }) {
  const state = useDevotionals(true, revision),
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
      const value = await getEditorial(id);
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
    <section className="auth-card" aria-label="Manage devotionals">
      <h2>Manage devotionals</h2>
      <button className="btn soft" onClick={startNew}>
        New devotional
      </button>
      <DevotionalListState state={state} />
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Loading draft…</p>}
      <ul className="devotional-list">
        {state.items.map((e) => (
          <li key={e.id}>
            <button
              className="btn soft"
              aria-label={"Edit " + e.title}
              disabled={busy}
              onClick={() => open(e.id)}
            >
              {e.title}
            </button>
            <span>{e.status}</span>
          </li>
        ))}
      </ul>
      {!busy && (
        <DevotionalForm
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
