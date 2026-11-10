import React, { useEffect, useMemo, useState } from "react";
import { TimedMessage } from "@/components/TimedMessage";
import { nextMonthRange, requestAppointment } from "./api";
import { usePastoralList, ListState } from "./usePastoralList";
import { UK_TIME_ZONE } from "../../js/time.js";

function zoneOf(slot) {
  return slot.timeZone || UK_TIME_ZONE;
}

function dayKey(value, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function dayPart(value, timeZone, options) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, ...options }).format(new Date(value));
}

function timeLabel(value, timeZone) {
  return dayPart(value, timeZone, { hour: "2-digit", minute: "2-digit" });
}

function durationLabel(slot) {
  const minutes = Math.round((new Date(slot.endsAt) - new Date(slot.startsAt)) / 60000);
  return `${minutes} min`;
}

export function AvailabilityPicker({ pastor, revision, onChange, onRequested }) {
  const range = useMemo(nextMonthRange, [pastor.id]);
  const state = usePastoralList(
    "/api/v1/pastors/" + encodeURIComponent(pastor.id) + "/availability?" + range,
    revision,
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [activeDay, setActiveDay] = useState(""),
    [selectedId, setSelectedId] = useState("");

  const groups = useMemo(() => {
    const map = new Map();
    for (const slot of state.items) {
      if (slot.available === false) continue;
      const timeZone = zoneOf(slot);
      const key = dayKey(slot.startsAt, timeZone);
      if (!map.has(key)) {
        map.set(key, {
          key,
          weekday: dayPart(slot.startsAt, timeZone, { weekday: "short" }),
          day: dayPart(slot.startsAt, timeZone, { day: "2-digit" }),
          full: dayPart(slot.startsAt, timeZone, { weekday: "long", day: "numeric", month: "long" }),
          slots: [],
        });
      }
      map.get(key).slots.push(slot);
    }
    return [...map.values()];
  }, [state.items]);

  useEffect(() => {
    if (!groups.length) {
      setActiveDay("");
      return;
    }
    setActiveDay((current) => (groups.some((group) => group.key === current) ? current : groups[0].key));
  }, [groups]);

  const activeGroup = groups.find((group) => group.key === activeDay) || groups[0] || null;

  useEffect(() => {
    if (!activeGroup) {
      setSelectedId("");
      return;
    }
    setSelectedId((current) => (activeGroup.slots.some((slot) => slot.id === current) ? current : activeGroup.slots[0].id));
  }, [activeGroup]);

  async function reserve() {
    if (!selectedId) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await requestAppointment(selectedId);
      const note = "Request sent. Awaiting pastor approval.";
      setMessage(note);
      onChange();
      onRequested?.(note);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card pastoral-picker" aria-label="Available appointments">
      <div className="pastoral-picker-head">
        <p className="pastoral-eyebrow">CHOOSE A TIME</p>
        <h2>Availability for {pastor.firstName} {pastor.lastName}</h2>
        <p>Next 30 days. Times are shown in the pastor’s time zone. A request holds its slot until the pastor reviews it.</p>
      </div>
      <TimedMessage message={message} />
      <TimedMessage tone="error" message={error} />
      {!state.busy && !state.error && !groups.length && (
        <p className="pastor-muted">No available slots in this window.</p>
      )}
      {activeGroup && (
        <>
          <div className="pastoral-datechips" role="group" aria-label="Available dates">
            {groups.map((group) => (
              <button
                key={group.key}
                type="button"
                className={`pastoral-datechip ${group.key === activeGroup.key ? "is-active" : ""}`}
                aria-pressed={group.key === activeGroup.key}
                onClick={() => setActiveDay(group.key)}
              >
                <span>{group.weekday}</span>
                <strong>{group.day}</strong>
              </button>
            ))}
          </div>
          <h3 className="pastoral-day-heading">{activeGroup.full}</h3>
          <div className="pastoral-slots" role="radiogroup" aria-label="Available times">
            {activeGroup.slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                role="radio"
                aria-checked={slot.id === selectedId}
                className={`pastoral-slot-choice ${slot.id === selectedId ? "is-selected" : ""}`}
                onClick={() => setSelectedId(slot.id)}
              >
                <span className="pastoral-slot-radio" aria-hidden="true" />
                <span className="pastoral-slot-copy">
                  <strong>{timeLabel(slot.startsAt, zoneOf(slot))} – {timeLabel(slot.endsAt, zoneOf(slot))}</strong>
                  <span>With {pastor.firstName} {pastor.lastName}</span>
                </span>
                <span className="pastoral-slot-duration">{durationLabel(slot)}</span>
              </button>
            ))}
          </div>
          <button className="btn gold pastoral-request-cta" type="button" disabled={busy || !selectedId} onClick={reserve}>
            {busy ? "Requesting…" : "Request appointment"}
          </button>
          <p className="pastoral-fine">You can cancel before the appointment starts.</p>
        </>
      )}
      <ListState state={state} />
    </section>
  );
}
