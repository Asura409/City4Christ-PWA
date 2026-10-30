import React, { useMemo, useState } from "react";
import { dateLabel, nextMonthRange, requestAppointment } from "./api";
import { usePastoralList, ListState } from "./usePastoralList";
export function AvailabilityPicker({ pastor, revision, onChange }) {
  const range = useMemo(nextMonthRange, [pastor.id]);
  const state = usePastoralList(
    "/api/v1/pastors/" +
      encodeURIComponent(pastor.id) +
      "/availability?" +
      range,
    revision,
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function reserve(id) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await requestAppointment(id);
      setMessage("Request sent. Awaiting pastor approval.");
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-card" aria-label="Available appointments">
      <h2>
        Availability for {pastor.firstName} {pastor.lastName}
      </h2>
      <p>
        Next 30 days. Times shown in {pastor.timeZone}. A request holds its slot
        until the pastor reviews it.
      </p>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      {!state.busy && !state.error && !state.items.length && (
        <p>No available slots in this window.</p>
      )}
      {state.items.map((slot) => (
        <article className="pastoral-slot" key={slot.id}>
          <p>
            {dateLabel(slot.startsAt, slot.timeZone)} –{" "}
            {dateLabel(slot.endsAt, slot.timeZone)}
          </p>
          <button
            className="btn gold"
            disabled={busy}
            onClick={() => reserve(slot.id)}
          >
            Request appointment
          </button>
        </article>
      ))}
      <ListState state={state} />
    </section>
  );
}
