import React, { useMemo, useState } from "react";
import { TimedMessage } from "@/components/TimedMessage";
import { createSlot, withdrawSlot, nextMonthRange, dateLabel } from "./api";
import { usePastoralList, ListState } from "./usePastoralList";
import { ukInputToInstant } from "../../js/time.js";

export function AvailabilityEditor({ revision, onChange, listed = true }) {
  const range = useMemo(nextMonthRange, []),
    state = usePastoralList("/api/v1/me/pastoral/availability?" + range, revision);
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
        startsAt: ukInputToInstant(starts),
        endsAt: ukInputToInstant(ends),
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
    <section className="auth-card pastoral-availability" aria-label="Manage my availability">
      <div className="pastoral-availability-grid">
        <div className="pastoral-availability-form">
          <p className="pastoral-eyebrow">PUBLISH</p>
          <h2>My availability</h2>
          <p className="pastoral-availability-intro">Publish explicit slots lasting 15–120 minutes. Inputs use UK time (GMT/BST). Slots cannot overlap.</p>
          <TimedMessage message={message} />
          <TimedMessage tone="error" message={error} />
          {!listed && <p className="pastoral-warning">Your profile is not listed. Existing appointments remain available, but new availability cannot be published.</p>}
          <form onSubmit={save} aria-label="Publish availability">
            <div className="pastoral-field-row">
              <div className="auth-field">
                <label htmlFor="pastoral-start">Starts at (UK time)</label>
                <input id="pastoral-start" type="datetime-local" required value={starts} onChange={(e) => setStarts(e.target.value)} />
              </div>
              <div className="auth-field">
                <label htmlFor="pastoral-end">Ends at (UK time)</label>
                <input id="pastoral-end" type="datetime-local" required value={ends} onChange={(e) => setEnds(e.target.value)} />
              </div>
            </div>
            <button className="btn gold" disabled={busy || !listed}>{busy ? "Publishing…" : "Publish slot"}</button>
          </form>
        </div>

        <div className="pastoral-availability-slots">
          <div className="pastoral-slots-head"><div><p className="pastoral-eyebrow">LIVE SCHEDULE</p><h3>Upcoming slots</h3></div><span className="pastoral-count">{state.items.length}</span></div>
          {!state.busy && !state.error && !state.items.length && <p className="pastor-muted">No slots published in the next 30 days.</p>}
          {state.items.map((slot) => (
            <div className="pastoral-slot-row" key={slot.id}>
              <div className="pastoral-slot-copy">
                <strong>{dateLabel(slot.startsAt, slot.timeZone)} – {dateLabel(slot.endsAt, slot.timeZone)}</strong>
                <span>{slot.timeZone || "UK time"}</span>
              </div>
              <span className={`pastoral-status ${slot.available ? "is-available" : "is-held"}`}>{slot.available ? "Available" : "Held"}</span>
              <button className="btn soft" type="button" disabled={busy || !slot.available} onClick={() => remove(slot.id)}>Withdraw slot</button>
            </div>
          ))}
          <ListState state={state} />
        </div>
      </div>
    </section>
  );
}
