import React, { useEffect, useState } from "react";
import { api } from "@/auth/session";
import { hasCapability } from "../../js/access.js";
import { visitorDetail, updateVisitor } from "./api";
import { VisitorAssignmentPanel } from "./VisitorAssignmentPanel";
export function VisitorDetail({ id, onChange, onDenied }) {
  const [data, setData] = useState(null),
    [status, setStatus] = useState("new"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [confirmed, setConfirmed] = useState(false),
    [canManage, setCanManage] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    setData(null);
    setError("");
    setConfirmed(false);
    setCanManage(false);
    api.request("/api/v1/me/access").then(({ data: access }) => {
      setCanManage(hasCapability(access, "visitors.follow_up"));
    }).catch(() => setCanManage(false));
    visitorDetail(id, c.signal)
      .then((d) => {
        setData(d);
        setStatus(d.status);
      })
      .catch((e) => {
        if (!c.signal.aborted) {
          if ([401, 403, 404].includes(e.status)) {
            setData(null);
            onDenied?.(e.message);
          } else setError(e.message);
        }
      });
    return () => c.abort();
  }, [id, revision]);
  async function save(value) {
    setBusy(true);
    setError("");
    try {
      await updateVisitor(id, { status: value, version: data.version });
      onChange();
    } catch (e) {
      if ([401, 403, 404].includes(e.status)) {
        setData(null);
        onDenied?.(e.message);
      } else setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="auth-card visitor-detail"
      aria-label="Visitor contact details"
    >
      <h2>Visitor contact details</h2>
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            className="btn soft"
            disabled={busy}
            onClick={() => setRevision((x) => x + 1)}
          >
            Reload details
          </button>
        </p>
      )}
      {!data && !error && <p role="status">Loading contact details…</p>}
      {data && (
        <>
          <h3>{data.fullName}</h3>
          <p>
            These contact details have not been verified. Verify identity
            separately before making account changes.
          </p>
          <dl>
            <dt>Email</dt>
            <dd>{data.email || "Not provided"}</dd>
            <dt>Phone</dt>
            <dd>{data.phone || "Not provided"}</dd>
            <dt>Consent received</dt>
            <dd>{new Date(data.createdAt).toLocaleString()}</dd>
            <dt>Contact expiry</dt>
            <dd>{new Date(data.expiresAt).toLocaleString()}</dd>
          </dl>
          <p>{data.consentText}</p>
          {canManage && <VisitorAssignmentPanel visitor={data} onAssigned={onChange} onError={setError} />}
          <label>
            Follow-up status
            <select
              value={status}
              disabled={busy}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <button
            className="btn gold"
            disabled={busy}
            onClick={() => save(status)}
          >
            Save follow-up status
          </button>
          {canManage && <div className="visitor-withdraw">
            <label>
              <input
                type="checkbox"
                checked={confirmed}
                disabled={busy}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I have confirmed a request to stop follow-up and remove contact
              details.
            </label>
            <button
              className="btn soft"
              disabled={busy || !confirmed}
              onClick={() => save("withdrawn")}
            >
              Remove contact details
            </button>
          </div>}
        </>
      )}
    </section>
  );
}
