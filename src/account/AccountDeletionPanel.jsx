import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, useSession } from "@/auth/session";
import { SessionConfirmation } from "@/auth/SessionConfirmation";
import { deletionStatus, isConfirmationError } from "./api";

export function AccountDeletionPanel() {
  const [metadata, setMetadata] = useState(null),
    [error, setError] = useState("");
  const [consent, setConsent] = useState(false),
    [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [proofRevision, setProofRevision] = useState(0);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const { clearSession } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    const c = new AbortController();
    setMetadata(null);
    setConsent(false);
    setError("");
    deletionStatus(c.signal)
      .then((data) => {
        if (c.signal.aborted) return;
        if (
          typeof data?.policyVersion !== "string" ||
          !data.policyVersion ||
          typeof data?.notice !== "string" ||
          typeof data?.requested !== "boolean"
        )
          throw new Error("Deletion request information is unavailable.");
        setMetadata(data);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [revision]);
  async function submit(event) {
    event.preventDefault();
    if (!consent || !metadata || busy) return;
    if (!ready) {
      setConfirmationOpen(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.requestAccountDeletion({
        confirm: true,
        policyVersion: metadata.policyVersion,
      });
      clearSession(
        "Deletion request received. Your account is disabled while it is reviewed. This is not confirmation of permanent deletion.",
      );
      navigate("/login", { replace: true });
    } catch (e) {
      setError(e.message);
      if (isConfirmationError(e)) {
        setReady(false);
        setProofRevision((x) => x + 1);
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-card" aria-label="Request account deletion">
      <h2>Request account deletion</h2>
      {error && <p role="alert">{error}</p>}
      {!metadata && !error && <p role="status">Loading deletion policy…</p>}
      {metadata && (
        <>
          <p>{metadata.notice}</p>
          <p>
            This is a request for review, not immediate permanent erasure.
            Existing content and records are subject to the church’s reviewed
            retention obligations.
          </p>
          {metadata.requested ? (
            <p role="status">A deletion request is already pending review.</p>
          ) : (
            <>
              <SessionConfirmation modal open={confirmationOpen} onClose={() => setConfirmationOpen(false)} revision={proofRevision} onReady={(value) => { setReady(value); if (value) setConfirmationOpen(false); }} />
              <form aria-label="Request account deletion" onSubmit={submit}>
                <label>
                  <input
                    type="checkbox"
                    checked={consent}
                    disabled={busy}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  I understand this disables my account and signs out every
                  session while the deletion request is reviewed.
                </label>
                <button
                  className="btn soft block"
                  disabled={busy || !consent}
                >
                  {busy ? "Submitting request…" : "Request account deletion"}
                </button>
              </form>
            </>
          )}
        </>
      )}
      <button
        className="btn soft"
        disabled={busy}
        onClick={() => setRevision((x) => x + 1)}
      >
        Reload deletion policy
      </button>
    </section>
  );
}
