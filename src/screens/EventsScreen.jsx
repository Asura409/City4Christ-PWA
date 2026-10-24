import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/auth/session";
import { useToast } from "@/components/Toast";
import { Icon } from "@/lib/icons";
import { cancelEventRSVP, listEvents, rsvpEvent } from "@/events/api";
import { dateKeyInZone, formatEventDateTime, localDateKey } from "@/events/date";
import { EventManager } from "@/events/EventManager";

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const addDays = (date, count) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
const eventDay = (event) => dateKeyInZone(event.startsAt, event.timeZone);

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function selectedWeekOffset(key) {
  const selected = dateFromKey(key);
  const selectedSunday = addDays(selected, -selected.getDay());
  const currentSunday = addDays(TODAY, -TODAY.getDay());
  return Math.round((selectedSunday - currentSunday) / (7 * 24 * 60 * 60 * 1000));
}

export default function EventsScreen() {
  const toast = useToast();
  const navigate = useNavigate();
  const { profile } = useSession();
  const [events, setEvents] = useState([]);
  const [selectedDay, setSelectedDay] = useState(localDateKey(TODAY));
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyEvent, setBusyEvent] = useState("");
  const [attendeeCounts, setAttendeeCounts] = useState({});
  const [error, setError] = useState("");
  const initialDaySet = useRef(false);

  async function loadEvents(signal) {
    setError("");
    try {
      const result = await listEvents({ signal });
      setEvents(result);
      if (!initialDaySet.current && result.length) {
        const firstDay = eventDay(result[0]);
        setSelectedDay(firstDay);
        setWeekOffset(selectedWeekOffset(firstDay));
        initialDaySet.current = true;
      }
    } catch (e) {
      if (!signal?.aborted) setError(e.message);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void loadEvents(controller.signal).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [profile?.id]);

  const weekBase = addDays(TODAY, -TODAY.getDay() + weekOffset * 7);
  const weekEnd = addDays(weekBase, 6);
  const monthTitle = weekBase.getMonth() === weekEnd.getMonth()
    ? weekBase.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : `${weekBase.toLocaleDateString(undefined, { month: "short" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
  const selectedEvents = useMemo(() => events.filter((event) => eventDay(event) === selectedDay), [events, selectedDay]);

  function moveWeek(offset) {
    const nextOffset = weekOffset + offset;
    const nextSunday = addDays(TODAY, -TODAY.getDay() + nextOffset * 7);
    setWeekOffset(nextOffset);
    setSelectedDay(localDateKey(nextSunday));
  }

  function selectDay(date) {
    setSelectedDay(localDateKey(date));
  }

  function updateLocalEvent(eventId, transform) {
    setEvents((items) => items.map((item) => item.id === eventId ? transform(item) : item));
  }

  async function submitRSVP(event) {
    if (!profile) {
      navigate("/login", { state: { from: "/events" } });
      return;
    }
    const input = attendeeCounts[event.id] || 1;
    setBusyEvent(event.id);
    setError("");
    const previous = event.myAttendeeCount || 0;
    try {
      const saved = await rsvpEvent(event.id, input);
      updateLocalEvent(event.id, (current) => ({
        ...current,
        attendeeCount: current.attendeeCount - previous + saved.attendeeCount,
        myAttendeeCount: saved.attendeeCount,
      }));
      toast(previous ? "Your RSVP was updated" : `You and ${saved.attendeeCount - 1} guest${saved.attendeeCount === 2 ? "" : "s"} are registered`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyEvent("");
    }
  }

  async function cancelRSVP(event) {
    setBusyEvent(event.id);
    setError("");
    try {
      const result = await cancelEventRSVP(event.id);
      if (result.cancelled) {
        const previous = event.myAttendeeCount || 0;
        updateLocalEvent(event.id, (current) => ({ ...current, attendeeCount: Math.max(0, current.attendeeCount - previous), myAttendeeCount: 0 }));
        toast("Your RSVP was cancelled");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyEvent("");
    }
  }

  return (
    <section className="screen active events-screen" aria-label="Events">
      <header className="events-heading"><p className="event-eyebrow">CITY4CHRIST CHURCH</p><h1>Events</h1><p className="lead">Gather, worship, and serve together.</p></header>
      <div className="card cal">
        <div className="cal-h">
          <button className="round" onClick={() => moveWeek(-1)} aria-label="Previous week" style={{ width: 36, height: 36, background: "var(--surface-2)" }}><Icon name="back" /></button>
          <b>{monthTitle}</b>
          <button className="round" onClick={() => moveWeek(1)} aria-label="Next week" style={{ width: 36, height: 36, background: "var(--surface-2)" }}><Icon name="next" /></button>
        </div>
        <div className="week">
          {DAYS.map((name) => <small key={name}>{name}</small>)}
          {Array.from({ length: 7 }, (_, index) => {
            const date = addDays(weekBase, index);
            const key = localDateKey(date);
            const hasEvent = events.some((event) => eventDay(event) === key);
            return <button key={key} className={`day${key === localDateKey(TODAY) ? " today" : ""}${hasEvent ? " has" : ""}`} aria-pressed={key === selectedDay} aria-label={date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) + (hasEvent ? ", has events" : "")} onClick={() => selectDay(date)}>{date.getDate()}</button>;
          })}
        </div>
      </div>

      <div className="sh"><h2>{dateFromKey(selectedDay).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h2></div>
      {loading ? <p role="status">Loading events…</p> : error && events.length === 0 ? <p role="alert">{error}</p> : selectedEvents.length === 0 ? <div className="empty">No published events on this day.</div> : selectedEvents.map((event) => {
        const mine = event.myAttendeeCount || 0;
        const isFull = event.capacity != null && event.attendeeCount >= event.capacity && mine === 0;
        return <article key={event.id} className={`ticket${mine ? " going" : ""}`}>
          <div className="t-main">
            <div className="t-top">
              <div className="dt"><small>{new Intl.DateTimeFormat(undefined, { month: "short", timeZone: event.timeZone }).format(new Date(event.startsAt))}</small><b>{new Intl.DateTimeFormat(undefined, { day: "numeric", timeZone: event.timeZone }).format(new Date(event.startsAt))}</b></div>
              <div className="t-info"><h3>{event.title}</h3><p><Icon name="clock" />{formatEventDateTime(event)}</p><p><Icon name="pin" />{event.location || "Location to be announced"}</p><p><Icon name="users" /><span>{event.capacity == null ? `${event.attendeeCount} attendees registered` : `${event.attendeeCount} / ${event.capacity} seats reserved`}</span></p></div>
              <span className="when">{event.timeZone}</span>
            </div>
            {event.description && <p className="event-description">{event.description}</p>}
            {mine > 0 ? <div className="going-row"><span className="stub-ck"><Icon name="check" /></span><div><b>Your RSVP: {mine} attendee{mine === 1 ? "" : "s"}</b><small>Your place and guest seats are saved</small></div><button className="undo" disabled={busyEvent === event.id} onClick={() => cancelRSVP(event)}>Cancel RSVP</button></div> : <div className="rsvp-controls">
              {profile && <label className="auth-field">You and your guests<select value={attendeeCounts[event.id] || 1} onChange={(e) => setAttendeeCounts((values) => ({ ...values, [event.id]: Number(e.target.value) }))}>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>}
              <button className="btn gold block rsvp-btn" disabled={busyEvent === event.id || isFull} onClick={() => submitRSVP(event)}><Icon name="ticket" />{!profile ? "Sign in to RSVP" : isFull ? "Event full" : "RSVP"}</button>
            </div>}
          </div>
          {error && <p className="event-error" role="alert">{error}</p>}
        </article>;
      })}
      <EventManager profile={profile} />
    </section>
  );
}
