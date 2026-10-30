import React, { useMemo, useState } from "react";
import { createSlot, withdrawSlot, nextMonthRange, dateLabel } from "./api";
import { usePastoralList, ListState } from "./usePastoralList";
export function AvailabilityEditor({ revision, onChange, listed = true }) {
  const range = useMemo(nextMonthRange, []),
    state = usePastoralList(
      "/api/v1/me/pastoral/availability?" + range,
      revision,
    );
  const [starts, setStarts] = useState(""),
    [ends, setEnds] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    if (!listed) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await createSlot({
        startsAt: new Date(starts).toISOString(),
        endsAt: new Date(ends).toISOString(),
      });
      setStarts("");
      setEnds("");
      setMessage("Availability published.");
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id) {
    setBusy(true);
    setError("");
    try {
      await withdrawSlot(id);
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-card" aria-label="Manage my availability">
      <h2>My availability</h2>
      <p>
        Publish explicit slots lasting 15–120 minutes. Inputs use your device's
        local time. Slots cannot overlap.
      </p>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      {!listed && <p>Your profile is not listed. Existing appointments remain available, but new availability cannot be published.</p>}
      <form onSubmit={save} aria-label="Publish availability">
        <div className="auth-field">
          <label htmlFor="pastoral-start">Starts at (your local time)</label>
          <input
            id="pastoral-start"
            type="datetime-local"
            required
            value={starts}
            onChange={(e) => setStarts(e.target.value)}
          />
        </div>
        <div className="auth-field">
          <label htmlFor="pastoral-end">Ends at (your local time)</label>
          <input
            id="pastoral-end"
            type="datetime-local"
            required
            value={ends}
            onChange={(e) => setEnds(e.target.value)}
          />
        </div>
        <button className="btn gold" disabled={busy || !listed}>
          Publish slot
        </button>
      </form>
      {state.items.map((s) => (
        <article className="pastoral-slot" key={s.id}>
          <p>
            {dateLabel(s.startsAt, s.timeZone)} –{" "}
            {dateLabel(s.endsAt, s.timeZone)} ·{" "}
            {s.available ? "Available" : "Held by an appointment"}
          </p>
          <button
            className="btn soft"
            disabled={busy || !s.available}
            onClick={() => remove(s.id)}
          >
            Withdraw slot
          </button>
        </article>
      ))}
      <ListState state={state} />
    </section>
  );
}
