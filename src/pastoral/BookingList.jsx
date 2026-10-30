import React, { useState } from "react";
import { cancelAppointment, decideAppointment, dateLabel } from "./api";
import { usePastoralList, ListState } from "./usePastoralList";
export function BookingList({ assigned = false, revision, onChange }) {
  const state = usePastoralList(
    assigned ? "/api/v1/me/pastoral/bookings" : "/api/v1/me/pastor-bookings",
    revision,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function change(b, status) {
    setBusy(true);
    setError("");
    try {
      if (assigned) await decideAppointment(b.id, status, b.version);
      else await cancelAppointment(b.id);
      onChange();
    } catch (e) {
      setError(e.message);
      if (e.status === 401 || e.status === 403) onChange();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label={assigned ? "Assigned appointments" : "My appointments"}
    >
      <h2>{assigned ? "Assigned appointments" : "My appointments"}</h2>
      {error && <p role="alert">{error}</p>}
      {!state.busy && !state.error && !state.items.length && (
        <p>No appointments yet.</p>
      )}
      {state.items.map((b) => (
        <article className="auth-card" key={b.id}>
          <h3>
            {assigned
              ? b.memberFirstName + " " + b.memberLastName
              : b.pastorFirstName + " " + b.pastorLastName}
          </h3>
          <p>
            {dateLabel(b.startsAt, b.timeZone)} –{" "}
            {dateLabel(b.endsAt, b.timeZone)}
          </p>
          <p>
            Status: <strong>{b.status}</strong>
          </p>
          <div className="wrap">
            {assigned && b.status === "pending" && (
              <>
                <button
                  className="btn gold"
                  disabled={busy}
                  onClick={() => change(b, "approved")}
                >
                  Approve
                </button>
                <button
                  className="btn soft"
                  disabled={busy}
                  onClick={() => change(b, "declined")}
                >
                  Decline
                </button>
              </>
            )}
            {["pending", "approved"].includes(b.status) && (
              <button
                className="btn soft"
                disabled={busy}
                onClick={() => change(b, "cancelled")}
              >
                Cancel appointment
              </button>
            )}
          </div>
        </article>
      ))}
      <ListState state={state} />
    </section>
  );
}
