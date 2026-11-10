import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useSession } from "@/auth/session";
import { Icon } from "@/lib/icons";
import { TimedMessage } from "@/components/TimedMessage";
import {
  cancelEventRSVP,
  downloadEventCalendar,
  eventCalendarURL,
  getEvent,
  listEventCoordinators,
  rsvpEvent,
} from "@/events/api";
import { UK_TIME_ZONE } from "../../js/time.js";
import "@/events/events.css";

function fullDate(event) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(event.startsAt));
}
function eventTime(event) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(event.startsAt));
}
function remainingSeats(event) {
  return event.capacity == null ? null : Math.max(0, event.capacity - event.attendeeCount);
}
function capacityPercent(event) {
  if (event.capacity == null || event.capacity <= 0) return 0;
  return Math.min(100, Math.round((event.attendeeCount / event.capacity) * 100));
}
function initials(first, last) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase() || "•";
}

export default function EventDetailScreen() {
  const { eventId } = useParams();
  const { profile } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState(null);
  const [coordinators, setCoordinators] = useState([]);
  const [attendees, setAttendees] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    getEvent(eventId, { signedIn: Boolean(profile) })
      .then((data) => {
        if (!live) return;
        setEvent(data);
        setAttendees(data.myAttendeeCount > 0 ? data.myAttendeeCount : 1);
      })
      .catch((reason) => {
        if (!live) return;
        setEvent(null);
        setError(reason.status === 404 ? "This event is unavailable or has not been published." : reason.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => { live = false; };
  }, [eventId, profile?.id]);

  useEffect(() => {
    if (!profile || !event) {
      setCoordinators([]);
      return undefined;
    }
    let live = true;
    listEventCoordinators(event.id)
      .then((items) => { if (live) setCoordinators(items); })
      .catch(() => { if (live) setCoordinators([]); });
    return () => { live = false; };
  }, [profile?.id, event?.id]);

  const going = (event?.myAttendeeCount || 0) > 0;
  const remaining = event ? remainingSeats(event) : null;
  const started = event ? new Date(event.startsAt).getTime() <= Date.now() : false;
  const full = remaining === 0 && !going;

  function changeCount(delta) {
    setAttendees((value) => Math.min(10, Math.max(1, value + delta)));
  }

  async function reserve() {
    if (!profile) {
      navigate("/login", { state: { from: location } });
      return;
    }
    if (!event) return;
    setBusy(true);
    setMessage("");
    setActionError("");
    try {
      const saved = await rsvpEvent(event.id, attendees);
      const previous = event.myAttendeeCount || 0;
      setEvent((current) => ({
        ...current,
        attendeeCount: current.attendeeCount - previous + saved.attendeeCount,
        myAttendeeCount: saved.attendeeCount,
      }));
      setMessage("Your RSVP is saved.");
    } catch (reason) {
      setActionError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!event) return;
    setBusy(true);
    setMessage("");
    setActionError("");
    try {
      const result = await cancelEventRSVP(event.id);
      if (result?.cancelled) {
        const previous = event.myAttendeeCount || 0;
        setEvent((current) => ({
          ...current,
          attendeeCount: Math.max(0, current.attendeeCount - previous),
          myAttendeeCount: 0,
        }));
        setMessage("Your RSVP was cancelled.");
      }
    } catch (reason) {
      setActionError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="screen active ev-detail-screen"><p role="status">Loading event…</p></section>;
  if (error || !event) {
    return (
      <section className="screen active ev-detail-screen">
        <Link className="ev-detail-back" to="/events">← All events</Link>
        <div className="ev-empty-state">
          <h2>Event unavailable</h2>
          <p>{error || "This event could not be found."}</p>
          <Link className="btn soft" to="/events">Back to events</Link>
        </div>
      </section>
    );
  }

  const audience = event.groupId ? "Ministry group" : "Church-wide";
  const seatLabel = event.capacity == null
    ? `${event.attendeeCount} attendee${event.attendeeCount === 1 ? "" : "s"} registered`
    : `${event.attendeeCount} of ${event.capacity} seats reserved`;

  return (
    <section className="screen active ev-detail-screen" aria-label={event.title}>
      <Link className="ev-detail-back" to="/events">← All events</Link>
      <div className="ev-detail-layout">
        <div>
          <div className="ev-detail-hero">
            <img src="/assets/images/churchActivities.jpeg" alt="" />
            <div className="ev-detail-hero-copy">
              <p className="ev-eyebrow">{audience}</p>
              <h1>{event.title}</h1>
              <p>{fullDate(event)} · {eventTime(event)}</p>
            </div>
          </div>
          <div className="ev-detail-body">
            <h2>About this gathering</h2>
            <p>{event.description || "More details will be shared soon."}</p>
            <div className="ev-facts">
              <div className="ev-fact"><span>When</span><strong>{fullDate(event)} · {eventTime(event)}</strong></div>
              <div className="ev-fact"><span>Where</span><strong>{event.location || "Location to be announced"}</strong></div>
              <div className="ev-fact"><span>Audience</span><strong>{audience}</strong></div>
              <div className="ev-fact"><span>Time zone</span><strong>UK time (GMT/BST)</strong></div>
            </div>
            <div className="ev-capacity-copy"><span>{seatLabel}</span><span>{remaining == null ? "No limit" : remaining === 0 ? "Full" : `${remaining} remaining`}</span></div>
            {event.capacity != null && <div className="ev-capacity-bar"><i style={{ width: `${capacityPercent(event)}%` }} /></div>}
            {coordinators.length > 0 && (
              <div className="ev-coordinators">
                <div className="ev-coord-avatars">
                  {coordinators.slice(0, 4).map((person) => <span key={person.accountId}>{initials(person.firstName, person.lastName)}</span>)}
                </div>
                <span>Coordinated by {coordinators.map((person) => `${person.firstName} ${person.lastName}`).join(", ")}</span>
              </div>
            )}
          </div>
        </div>

        <aside>
          <div className="ev-rsvp-card">
            <TimedMessage message={message} />
            <TimedMessage tone="error" message={actionError} />
            {going && (
              <div className="ev-going-card">
                <strong>✓ You’re going</strong>
                <span>{event.myAttendeeCount} seat{event.myAttendeeCount === 1 ? "" : "s"} reserved for you.</span>
              </div>
            )}
            <h2>{started ? "This event has started" : going ? "Update your RSVP" : "Reserve your place"}</h2>
            <p className="sub">{started ? "Registration closed when the event began." : "Bring up to 10 people, including yourself."}</p>
            {!started && !full && (
              <>
                <div className="ev-stepper">
                  <span>You and your guests</span>
                  <div className="ev-stepper-controls">
                    <button type="button" aria-label="Remove a guest" disabled={busy || attendees <= 1} onClick={() => changeCount(-1)}>−</button>
                    <b>{attendees}</b>
                    <button type="button" aria-label="Add a guest" disabled={busy || attendees >= 10} onClick={() => changeCount(1)}>＋</button>
                  </div>
                </div>
                <button className="btn gold" type="button" disabled={busy} onClick={reserve}>
                  {busy ? "Saving…" : profile ? (going ? "Update RSVP" : `Reserve ${attendees} seat${attendees === 1 ? "" : "s"}`) : "Sign in to RSVP"}
                </button>
              </>
            )}
            {full && <p className="ev-seats full" style={{ display: "inline-flex", marginBottom: 8 }}>Event full</p>}
            {event.groupId ? (
              <button className="btn soft" type="button" disabled={busy} onClick={() => downloadEventCalendar(event.id).catch((reason) => setActionError(reason.message))}>Add to calendar</button>
            ) : (
              <a className="btn soft" href={eventCalendarURL(event.id)} download="city4christ-event.ics">Add to calendar</a>
            )}
            {going && !started && <button className="btn soft" type="button" disabled={busy} onClick={cancel}>Cancel RSVP</button>}
            <p className="fine">{started ? "This event is in the past." : "You can cancel before the event starts. Seats are released immediately."}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
