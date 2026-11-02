import React, { useEffect, useRef, useState } from "react";
import { hasCapability } from "../../js/access.js";
import { api } from "@/auth/session";
import { listEditorialSermons } from "@/sermons/api";

function displayStatus(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function EditorialSermonList({ refreshKey = 0 }) {
  const [allowed, setAllowed] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);

  useEffect(() => {
    let live = true;
    api.request("/api/v1/me/access")
      .then(({ data }) => {
        if (live) setAllowed(hasCapability(data, "sermons.manage"));
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!allowed) return undefined;
    const controller = new AbortController();
    const current = ++generation.current;
    setBusy(true);
    setError("");
    setCursor("");
    listEditorialSermons({ query, status, signal: controller.signal })
      .then((page) => {
        if (current !== generation.current) return;
        setItems(page.items);
        setCursor(page.nextCursor);
      })
      .catch((cause) => {
        if (current === generation.current && cause.name !== "AbortError") setError(cause.message || "Could not load editorial sermons.");
      })
      .finally(() => {
        if (current === generation.current) setBusy(false);
      });
    return () => controller.abort();
  }, [allowed, query, status, refreshKey]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const page = await listEditorialSermons({ query, status, cursor });
      setItems((previous) => [...previous, ...page.items]);
      setCursor(page.nextCursor);
    } catch (cause) {
      setError(cause.message || "Could not load more editorial sermons.");
    } finally {
      setLoadingMore(false);
    }
  }

  if (!allowed) return null;
  return (
    <section className="editorial-sermon-list" aria-label="Sermon editorial list">
      <h2>Manage sermons</h2>
      <form className="editorial-sermon-filters" role="search" onSubmit={(event) => { event.preventDefault(); setQuery(queryInput.trim()); }}>
        <label>
          Search sermons
          <input type="search" value={queryInput} maxLength={200} onChange={(event) => setQueryInput(event.target.value)} />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
        </label>
        <button className="btn soft" type="submit">Search editorial sermons</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Loading sermons…</p>}
      {!busy && items.length === 0 && <p>No sermons match these filters.</p>}
      <div className="editorial-sermon-items">
        {items.map((item) => (
          <article className="editorial-sermon-item" key={item.id}>
            <div>
              <h3>{item.title}</h3>
              <p>{item.speaker} · {new Date(item.preachedAt).toLocaleDateString()}</p>
            </div>
            <span className={`editorial-sermon-status status-${item.status}`}>{displayStatus(item.status)}</span>
            <small>Version {item.version}</small>
          </article>
        ))}
      </div>
      {cursor && <button className="btn soft" type="button" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Loading…" : "Load more editorial sermons"}</button>}
    </section>
  );
}
