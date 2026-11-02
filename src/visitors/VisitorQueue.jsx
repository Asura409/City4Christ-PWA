import React, { useEffect, useState } from "react";
import { listVisitors } from "./api";
import { VisitorDetail } from "./VisitorDetail";
import "./visitors.css";
export function VisitorQueue() {
  const [status, setStatus] = useState("new"),
    [items, setItems] = useState([]),
    [cursor, setCursor] = useState(""),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setSelected("");
    setItems([]);
    setCursor("");
    setError("");
    setBusy(true);
    listVisitors({ status, signal: c.signal })
      .then((p) => {
        if (!c.signal.aborted) {
          setItems(p.items);
          setCursor(p.nextCursor);
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });
    return () => c.abort();
  }, [status, revision]);
  async function more() {
    setBusy(true);
    setError("");
    try {
      const p = await listVisitors({ status, cursor });
      setItems((x) => [...x, ...p.items]);
      setCursor(p.nextCursor);
    } catch (e) {
      setError(e.message);
      setSelected("");
      if ([401, 403, 404].includes(e.status)) {
        setItems([]);
        setCursor("");
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="screen active visitor-queue"
      aria-label="Visitor follow-up"
    >
      <h1>Visitor follow-up</h1>
      <p>
        Private welcome-team contact requests. Contact details expire after 90
        days.
      </p>
      <label>
        Show visitors
        <select
          value={status}
          disabled={busy}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="new">New visitors</option>
          <option value="contacted">Contacted</option>
          <option value="closed">Closed</option>
        </select>
      </label>
      <button
        className="btn soft"
        disabled={busy}
        onClick={() => setRevision((x) => x + 1)}
      >
        Refresh visitors
      </button>
      {error && <p role="alert">{error}</p>}
      {busy && !items.length && <p role="status">Loading visitors…</p>}
      {!busy && !error && !items.length && <p>No visitors in this queue.</p>}
      <div className="visitor-list">
        {items.map((v) => (
          <article className="auth-card" key={v.id}>
            <h2>{v.fullName}</h2>
            <p>
              {v.status} · Received {new Date(v.createdAt).toLocaleDateString()}{v.assignedTo ? " · Assigned to a volunteer" : " · Unassigned"}
            </p>
            <button
              className="btn soft"
              onClick={() => setSelected(v.id)}
              aria-label={`Open ${v.fullName}`}
            >
              Open details
            </button>
          </article>
        ))}
      </div>
      {cursor && (
        <button className="btn soft" disabled={busy} onClick={more}>
          Load more visitors
        </button>
      )}
      {selected && (
        <VisitorDetail
          key={selected}
          id={selected}
          onDenied={(message) => {
            setSelected("");
            setItems([]);
            setCursor("");
            setError(message);
          }}
          onChange={() => {
            setSelected("");
            setRevision((x) => x + 1);
          }}
        />
      )}
    </section>
  );
}
