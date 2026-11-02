import React, { useEffect, useState } from "react";
import {
  deletionDetail,
  markDeletionReviewing,
  restoreDeletionRequest,
} from "./api";

export function DeletionReviewDetail({ id, onChanged, onDenied }) {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setData(null);
    setError("");
    deletionDetail(id, c.signal)
      .then((d) => {
        if (!c.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (c.signal.aborted) return;
        if ([401, 403, 404].includes(e.status)) onDenied(e);
        else setError(e.message);
      });
    return () => c.abort();
  }, [id, revision]);
  async function review() {
    setBusy(true);
    setError("");
    try {
      await markDeletionReviewing(id, data.version);
      setData(null);
      onChanged();
    } catch (e) {
      if ([401, 403, 404].includes(e.status)) {
        setData(null);
        onDenied(e);
      } else setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    setBusy(true);
    setError("");
    try {
      await restoreDeletionRequest(id, data.version, reason);
      onChanged("Account sign-in restored. The member must sign in again; their directory profile remains hidden.");
    } catch (e) {
      if ([401, 403, 404].includes(e.status)) {
        setData(null);
        onDenied(e);
      } else setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-card" aria-label="Deletion request details">
      <h2>Deletion request details</h2>
      {error && (
        <p role="alert">{error} Reload the latest version before retrying.</p>
      )}
      {!data && !error && <p role="status">Loading request details…</p>}
      {data && (
        <>
          <h3>
            {data.firstName} {data.lastName}
          </h3>
          <dl>
            <dt>Email</dt>
            <dd>{data.email}</dd>
            <dt>Status</dt>
            <dd>{data.status}</dd>
            <dt>Requested</dt>
            <dd>{new Date(data.createdAt).toLocaleString()}</dd>
            <dt>Consent policy</dt>
            <dd>{data.policyVersion}</dd>
          </dl>
          <p>
            {data.status === "restored"
              ? "Access has been restored. The member must sign in again, and their directory profile remains hidden."
              : "The account is disabled. Review status does not permanently erase records or restore access."}
          </p>
          <button
            className="btn soft"
            disabled={busy || data.status !== "requested" || Boolean(error)}
            onClick={review}
          >
            Mark as reviewing
          </button>
          {data.status !== "restored" && (
            <>
              <p>
                Restoring access clears the deletion hold. It does not show the
                member in the directory or restore old sign-in sessions. They
                must sign in again. Existing role assignments remain, while
                directory visibility can be chosen separately.
              </p>
              <label htmlFor="restore-reason">
                Reason for restoring account access
              </label>
              <textarea
                id="restore-reason"
                rows={3}
                minLength={3}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button
                className="btn soft"
                disabled={
                  busy ||
                  reason.trim().length < 3 ||
                  reason.trim().length > 500 ||
                  Boolean(error)
                }
                onClick={restore}
              >
                Restore account access
              </button>
            </>
          )}
        </>
      )}
      <button
        className="btn soft"
        disabled={busy}
        onClick={() => setRevision((x) => x + 1)}
      >
        Reload request details
      </button>
    </section>
  );
}
