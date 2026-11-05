import React, { useEffect, useRef, useState } from "react";
import { useDevotionals, DevotionalListState } from "./useDevotionals";
import { readPublished } from "./api";
export function DevotionalReader({ revision }) {
  const state = useDevotionals(false, revision),
    [selected, setSelected] = useState(null),
    [error, setError] = useState(""),
    [opening, setOpening] = useState(false),
    [mobileReading, setMobileReading] = useState(false),
    buttonRefs = useRef(new Map()),
    listScroll = useRef(0),
    listRef = useRef(null),
    readerHeading = useRef(null),
    generation = useRef(0);
  useEffect(() => {
    generation.current++;
    setSelected(null);
    setError("");
    setOpening(false);
    setMobileReading(false);
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
      if (version === generation.current) {
        setSelected(entry);
        setMobileReading(true);
      }
    } catch (e) {
      if (version === generation.current) setError(e.message);
    } finally {
      if (version === generation.current) setOpening(false);
    }
  }
  useEffect(() => {
    if (!selected || opening) return;
    const timer = setTimeout(() => readerHeading.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [selected, opening]);
  function backToList() {
    setMobileReading(false);
    setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = listScroll.current;
      const button = selected && buttonRefs.current.get(selected.id);
      button?.focus();
      if (button) button.scrollIntoView({ block: "nearest" });
    }, 0);
  }
  return (
    <section className="devotional-reader-panel" aria-label="Published devotionals">
      <div className={`devotional-reader-layout ${mobileReading ? "is-reading" : ""}`}>
        <aside className="devotional-library" ref={listRef} onScroll={(event) => { listScroll.current = event.currentTarget.scrollTop; }}>
          <div className="devotional-panel-heading"><div><p className="devotionals-eyebrow">YOUR READING</p><h2>Published devotionals</h2></div><span>{state.items.length}</span></div>
          <DevotionalListState state={state} />
          {!state.busy && !state.error && !state.items.length && <p className="devotional-empty">No published devotionals yet.</p>}
          <div className="devotional-list" role="list">
            {state.items.map((e) => (
              <button
                key={e.id}
                ref={(node) => { if (node) buttonRefs.current.set(e.id, node); else buttonRefs.current.delete(e.id); }}
                type="button"
                className={`devotional-list-item ${selected?.id === e.id ? "is-selected" : ""}`}
                aria-current={selected?.id === e.id ? "true" : undefined}
                onClick={() => open(e.id)}
              >
                <strong>{e.title}</strong>
                {e.scriptureReference && <span>{e.scriptureReference}</span>}
                {e.author && <small>{e.author}</small>}
              </button>
            ))}
          </div>
        </aside>
        <div className="devotional-reading-panel">
          {mobileReading && <button type="button" className="devotional-back" onClick={backToList}>← Back to devotionals</button>}
          {opening && <p role="status">Opening devotional…</p>}
          {error && <p className="devotional-error" role="alert">{error}</p>}
          {!opening && !error && selected && (
            <article className="devotional-reading">
              <p className="devotionals-eyebrow">DEVOTIONAL</p>
              <h2 ref={readerHeading} tabIndex="-1">{selected.title}</h2>
              {selected.author && <p className="devotional-author">By {selected.author}</p>}
              {selected.scriptureReference && <p className="devotional-reference">{selected.scriptureReference}</p>}
              <div className="devotional-body">{selected.body}</div>
            </article>
          )}
          {!opening && !error && !selected && <div className="devotional-reader-empty"><span aria-hidden="true">✦</span><h2>Choose a devotional to start reading.</h2><p>Select a message from the list to open it here.</p></div>}
        </div>
      </div>
    </section>
  );
}
