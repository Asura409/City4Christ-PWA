import React, { useEffect, useRef, useState } from "react";
import { useDevotionals, DevotionalListState } from "./useDevotionals";
import { readPublished } from "./api";
export function DevotionalReader({ revision }) {
  const state = useDevotionals(false, revision),
    [selected, setSelected] = useState(null),
    [error, setError] = useState(""),
    [opening, setOpening] = useState(false),
    generation = useRef(0);
  useEffect(() => {
    generation.current++;
    setSelected(null);
    setError("");
    setOpening(false);
    return () => {
      generation.current++;
    };
  }, [revision]);
  async function open(id) {
    const version = ++generation.current;
    setOpening(true);
    setError("");
    setSelected(null);
    try {
      const entry = await readPublished(id);
      if (version === generation.current) setSelected(entry);
    } catch (e) {
      if (version === generation.current) setError(e.message);
    } finally {
      if (version === generation.current) setOpening(false);
    }
  }
  return (
    <section className="auth-card" aria-label="Published devotionals">
      <h2>Published devotionals</h2>
      <DevotionalListState state={state} />
      {!state.busy && !state.error && !state.items.length && (
        <p>No published devotionals yet.</p>
      )}
      <ul className="devotional-list">
        {state.items.map((e) => (
          <li key={e.id}>
            <button
              className="btn soft"
              aria-label={"Read " + e.title}
              onClick={() => open(e.id)}
            >
              {e.title}
            </button>
            {e.author && <span>{e.author}</span>}
          </li>
        ))}
      </ul>
      {opening && <p role="status">Opening devotional…</p>}
      {error && <p role="alert">{error}</p>}
      {selected && (
        <article className="devotional-reading">
          <h3>{selected.title}</h3>
          {selected.scriptureReference && (
            <p className="devotional-reference">
              {selected.scriptureReference}
            </p>
          )}
          {selected.author && <p>By {selected.author}</p>}
          <div className="devotional-body">{selected.body}</div>
        </article>
      )}
    </section>
  );
}
