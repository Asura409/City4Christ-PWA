import { UK_TIME_ZONE } from "../../js/time.js";
import React, { useEffect, useState } from "react";
import { useConfirmedAction } from "@/auth/identityConfirmation";
import { TimedMessage } from "@/components/TimedMessage";
import { listDeletionRequests } from "./api";
import { DeletionReviewDetail } from "./DeletionReviewDetail";

export function DeletionReviewQueue() {
  const runConfirmed = useConfirmedAction();
  const [status, setStatus] = useState("requested"),
    [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(""),
    [selected, setSelected] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  function denied(e) {
    setItems([]);
    setCursor("");
    setSelected("");
    setError(e.message);
  }
  useEffect(() => {
    const c = new AbortController();
    setItems([]);
    setCursor("");
    setSelected("");
    setError("");
    setBusy(true);
    runConfirmed(() => listDeletionRequests({ status, signal: c.signal }))
      .then((p) => {
        if (!c.signal.aborted) {
          setItems(p.items);
          setCursor(p.nextCursor);
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) denied(e);
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
      const p = await runConfirmed(() =>
        listDeletionRequests({ status, cursor }),
      );
      setItems((x) => [...x, ...p.items]);
      setCursor(p.nextCursor);
    } catch (e) {
      denied(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="screen active" aria-label="Account deletion requests">
      <h1>Account deletion requests</h1>
      <p>
        Restricted, audited review. Marking a request as reviewing does not
        delete records or restore access.
      </p>
      <label>
        Show requests
        <select
          value={status}
          disabled={busy}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="requested">Requested</option>
          <option value="reviewing">Reviewing</option>
        </select>
      </label>
      <button
        className="btn soft"
        disabled={busy}
        onClick={() => setRevision((x) => x + 1)}
      >
        Refresh requests
      </button>
      {error && <p role="alert">{error}</p>}
      <TimedMessage message={notice} />
      {busy && !items.length && <p role="status">Loading deletion requests…</p>}
      {!busy && !error && !items.length && <p>No requests in this queue.</p>}
      {items.map((item) => (
        <article className="auth-card" key={item.id}>
          <h2>
            {item.firstName} {item.lastName}
          </h2>
          <p>
            {item.status} · Received{" "}
            {new Date(item.createdAt).toLocaleDateString("en-GB", { timeZone: UK_TIME_ZONE })}
          </p>
          <button
            className="btn soft"
            onClick={() => setSelected(item.id)}
            aria-label={`Open ${item.firstName} ${item.lastName}`}
          >
            Open request details
          </button>
        </article>
      ))}
      {cursor && (
        <button className="btn soft" disabled={busy} onClick={more}>
          Load more requests
        </button>
      )}
      {selected && (
        <DeletionReviewDetail
          key={selected}
          id={selected}
          onDenied={denied}
          onChanged={(message) => {
            setNotice(message || "Deletion request updated.");
            setSelected("");
            setRevision((x) => x + 1);
          }}
        />
      )}
    </section>
  );
}
