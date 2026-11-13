import { UK_TIME_ZONE } from "../../js/time.js";
import React, { useEffect, useRef, useState } from "react";
import { hasCapability } from "../../js/access.js";
import { api } from "@/auth/session";
import { RefreshButton } from "@/components/RefreshButton";
import { TimedMessage } from "@/components/TimedMessage";
import { listEditorialSermons, unpublishSermon } from "@/sermons/api";

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
  const [revision, setRevision] = useState(0), [mutationId, setMutationId] = useState(""), [notice, setNotice] = useState(""), [denied, setDenied] = useState(false), [conflicts, setConflicts] = useState(new Set());
  const generation = useRef(0), mounted = useRef(true), writing = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  function handleDenial(cause) {
    if (cause.status === 401 || cause.status === 403) { setDenied(true); setAllowed(false); setItems([]); }
  }

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
        setConflicts(new Set());
        setCursor(page.nextCursor);
      })
      .catch((cause) => {
        if (current === generation.current && cause.name !== "AbortError") { setError(cause.message || "Could not load editorial sermons."); handleDenial(cause); }
      })
      .finally(() => {
        if (current === generation.current) setBusy(false);
      });
    return () => controller.abort();
  }, [allowed, query, status, refreshKey, revision]);

  async function loadMore() {
    if (!cursor || loadingMore || writing.current) return;
    const current = generation.current;
    setLoadingMore(true);
    setError("");
    try {
      const page = await listEditorialSermons({ query, status, cursor });
      if (!mounted.current || current !== generation.current) return;
      setItems((previous) => [...previous, ...page.items]);
      setCursor(page.nextCursor);
    } catch (cause) {
      if (mounted.current && current === generation.current) { setError(cause.message || "Could not load more editorial sermons."); handleDenial(cause); }
    } finally {
      if (mounted.current) setLoadingMore(false);
    }
  }

  async function withdraw(item) {
    if (writing.current || conflicts.has(item.id)) return;
    if (!window.confirm(`Unpublish “${item.title}”? It will be hidden from readers and kept as a draft.`)) return;
    writing.current = true; setMutationId(item.id); setError(""); setNotice("");
    try {
      const updated = await unpublishSermon(item.id, item.version);
      if (!mounted.current) return;
      setItems((previous) => status && status !== "draft" ? previous.filter((value) => value.id !== item.id) : previous.map((value) => value.id === item.id ? updated : value));
      setNotice("Sermon unpublished. It is now a draft and hidden from readers.");
    } catch (cause) {
      if (!mounted.current) return;
      setError(cause.message || "Could not unpublish this sermon.");
      if (cause.status === 409) setConflicts((previous) => new Set([...previous, item.id]));
      handleDenial(cause);
    } finally { writing.current = false; if (mounted.current) setMutationId(""); }
  }

  if (denied) return <p role="alert">Sermon editor access is no longer available. {error}</p>;
  if (!allowed) return null;
  return (
    <section className="editorial-sermon-list" aria-label="Sermon editorial list">
      <div className="editorial-sermon-heading"><h2>Manage sermons</h2><RefreshButton label="Reload sermons" busy={busy} disabled={Boolean(mutationId)} onClick={() => setRevision((value) => value + 1)} /></div>
      <TimedMessage message={notice} />
      <form className="editorial-sermon-filters" role="search" onSubmit={(event) => { event.preventDefault(); setQuery(queryInput.trim()); }}>
        <label>
          Search sermons
          <input disabled={Boolean(mutationId)} type="search" value={queryInput} maxLength={200} onChange={(event) => setQueryInput(event.target.value)} />
        </label>
        <label>
          Status
          <select disabled={Boolean(mutationId)} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
        </label>
        <button className="btn soft" type="submit" disabled={Boolean(mutationId)}>Search editorial sermons</button>
      </form>
      {error && <p className="editorial-sermon-error" role="alert">{error}{conflicts.size > 0 && " Reload sermons to review the latest version before retrying."}</p>}
      {busy && <p role="status">Loading sermons…</p>}
      {!busy && items.length === 0 && <p>No sermons match these filters.</p>}
      <div className="editorial-sermon-items">
        {items.map((item) => (
          <article className="editorial-sermon-item" key={item.id}>
            <div>
              <h3>{item.title}</h3>
              <p>{item.speaker} · {new Date(item.preachedAt).toLocaleDateString("en-GB", { timeZone: UK_TIME_ZONE })}</p>
            </div>
            <span className={`editorial-sermon-status status-${item.status}`}>{displayStatus(item.status)}</span>
            <small>Version {item.version}</small>
            {(item.status === "published" || item.status === "scheduled") && <button className="btn soft sermon-unpublish" type="button" disabled={busy || loadingMore || Boolean(mutationId) || conflicts.has(item.id)} onClick={() => withdraw(item)}>{mutationId === item.id ? "Unpublishing…" : "Unpublish"}</button>}
          </article>
        ))}
      </div>
      {cursor && <button className="btn soft" type="button" disabled={loadingMore || Boolean(mutationId)} onClick={() => void loadMore()}>{loadingMore ? "Loading…" : "Load more editorial sermons"}</button>}
    </section>
  );
}
