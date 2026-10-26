import React, { useEffect, useState } from "react";
import { api } from "@/auth/session";
import { safeImageUrl, safeUrl, youtubeEmbedUrl } from "@/lib/sanitize";
import { SermonComposer } from "@/sermons/SermonComposer";

function AttachmentList({ items = [] }) {
  return <div className="sermon-attachments">{items.map((item) => {
    const url = safeUrl(item.url);
    if (url === "#") return null;
    if (item.contentType?.startsWith("image/")) return <img key={item.id} src={url} alt="Sermon attachment" loading="lazy" />;
    if (item.contentType?.startsWith("audio/")) return <audio key={item.id} src={url} controls preload="metadata" aria-label="Sermon audio" />;
    if (item.contentType?.startsWith("video/")) return <video key={item.id} src={url} controls playsInline preload="metadata" aria-label="Sermon video" />;
    return null;
  })}</div>;
}
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
      <SermonComposer onPublished={() => { setSelected(null); void load(); }} />
      {error && <p role="alert">{error}</p>}
      {selected ? (
        <article className="card sermon">
          <button className="btn soft" onClick={() => setSelected(null)}>
            Back to sermons
          </button>
          <h2>{selected.title}</h2>
          {safeImageUrl(selected.imageUrl) && <img className="sermon-image sermon-detail-image" src={safeImageUrl(selected.imageUrl)} alt={selected.title} loading="lazy" referrerPolicy="no-referrer" />}
          <p>{selected.summary}</p>
          <p>{selected.speaker}</p>
          {youtubeEmbedUrl(selected.videoUrl) && <div className="sermon-video"><iframe title={`${selected.title} video`} src={youtubeEmbedUrl(selected.videoUrl)} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>}
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
          <AttachmentList items={selected.attachments} />
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
              {safeImageUrl(s.imageUrl) && <img className="sermon-image" src={safeImageUrl(s.imageUrl)} alt={s.title} loading="lazy" referrerPolicy="no-referrer" />}
              <div className="s-text">
                <h2>{s.title}</h2>
                <p>{s.summary}</p>
                <small>{s.speaker}</small>
              </div>
              <AttachmentList items={s.attachments} />
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
