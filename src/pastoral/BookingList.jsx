import React, { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { TimedMessage } from "@/components/TimedMessage";
import { cancelAppointment, decideAppointment, dateLabel } from "./api";
import { usePastoralList, ListState } from "./usePastoralList";

export function BookingList({ assigned = false, revision, onChange }) {
  const state = usePastoralList(
    assigned ? "/api/v1/me/pastoral/bookings" : "/api/v1/me/pastor-bookings",
    revision,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");

  async function change(booking, status) {
    setBusy(true);
    setError("");
    try {
      if (assigned) await decideAppointment(booking.id, status, booking.version);
      else await cancelAppointment(booking.id);
      onChange();
    } catch (e) {
      const started = new Date(booking.startsAt).getTime() <= Date.now();
      if (e.code === "appointment_conflict") {
        setError(
          started
            ? assigned
              ? "This appointment has already started; it can no longer be approved or declined."
              : "This appointment has already started; it can no longer be cancelled."
            : "This appointment changed. Reloaded the latest status; review it before retrying.",
        );
        onChange();
      } else {
        setError(e.message);
        if (e.status === 401 || e.status === 403) onChange();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pastoral-bookings" aria-label={assigned ? "Assigned appointments" : "My appointments"}>
      <div className="pastor-directory-head">
        <div>
          <p className="pastoral-eyebrow">{assigned ? "ASSIGNED TO YOU" : "YOUR REQUESTS"}</p>
          <h2>{assigned ? "Assigned appointments" : "My appointments"}</h2>
        </div>
        <span className="pastoral-count">{state.items.length}</span>
      </div>
      <TimedMessage tone="error" message={error} />
      {!state.busy && !state.error && !state.items.length && (
        <p className="pastor-muted">No appointments yet.</p>
      )}
      {state.items.map((booking) => {
        const first = assigned ? booking.memberFirstName : booking.pastorFirstName;
        const last = assigned ? booking.memberLastName : booking.pastorLastName;
        const started = new Date(booking.startsAt).getTime() <= Date.now();
        const actionable = ["pending", "approved"].includes(booking.status) && !started;
        return (
          <article className="pastoral-appt" key={booking.id}>
            <div className="pastoral-appt-top">
              <Avatar name={`${first} ${last}`} src={assigned ? booking.memberAvatar?.url : booking.pastorAvatar?.url} size={36} />
              <div className="pastoral-appt-copy">
                <strong>{first} {last}</strong>
                <span>Pastoral appointment</span>
              </div>
              <span className={`pastoral-status is-${booking.status}`}>{booking.status}</span>
            </div>
            <div className="pastoral-appt-date">
              <span aria-hidden="true">▣</span>
              <span>{dateLabel(booking.startsAt, booking.timeZone)} – {dateLabel(booking.endsAt, booking.timeZone)}</span>
            </div>
            <div className="pastoral-appt-actions">
              {assigned && booking.status === "pending" && !started && (
                <>
                  <button className="btn soft" type="button" disabled={busy} onClick={() => change(booking, "declined")}>Decline</button>
                  <button className="btn gold" type="button" disabled={busy} onClick={() => change(booking, "approved")}>Approve</button>
                </>
              )}
              {!assigned && actionable && (
                <button className="btn soft" type="button" disabled={busy} onClick={() => change(booking, "cancelled")}>Cancel appointment</button>
              )}
              {started && ["pending", "approved"].includes(booking.status) && (
                <span className="pastoral-appt-closed">Started · changes closed</span>
              )}
            </div>
          </article>
        );
      })}
      <ListState state={state} />
    </section>
  );
}
