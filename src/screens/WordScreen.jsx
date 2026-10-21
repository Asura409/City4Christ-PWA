import React, { useEffect, useState } from "react";
import { api } from "@/auth/session";
import { safeUrl } from "@/lib/sanitize";
export default function WordScreen() {
  const [query, setQuery] = useState(""),
    [items, setItems] = useState([]),
    [cursor, setCursor] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(null);
  async function load(next = "") {
    setBusy(true);
    setError("");
    try {
      const qs = new URLSearchParams({ limit: "20", query });
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
  return (
    <section className="screen active" aria-label="Sermons and media">
      <div className="sh">
        <h1>Word Hub</h1>
      </div>
      {error && <p role="alert">{error}</p>}
      {selected ? (
        <article className="card sermon">
          <button className="btn soft" onClick={() => setSelected(null)}>
            Back to sermons
          </button>
          <h2>{selected.title}</h2>
          <p>{selected.summary}</p>
          <p>{selected.speaker}</p>
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
        </article>
      ) : (
        <>
          <form
            className="wrap"
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
            <button className="btn gold" disabled={busy}>
              Search sermons
            </button>
          </form>
          {!busy && !items.length && <p>No published sermons yet.</p>}
          {items.map((s) => (
            <article key={s.id} className="card sermon">
              <div className="s-text">
                <h2>{s.title}</h2>
                <p>{s.summary}</p>
                <small>{s.speaker}</small>
              </div>
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
