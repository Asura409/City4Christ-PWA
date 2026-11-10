import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/auth/session";
import { Icon } from "@/lib/icons";
import { hasCapability } from "../../js/access.js";
import { getEventsAccess, listEvents } from "@/events/api";
import { dateKeyInZone } from "@/events/date";
import { EventManager } from "@/events/EventManager";
import { UK_TIME_ZONE } from "../../js/time.js";
import "@/events/events.css";

const DAY_MS = 86400000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function addDays(date, count) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}
function dayKey(value) {
  return dateKeyInZone(value, UK_TIME_ZONE);
}
function todayKey() {
  return dayKey(new Date().toISOString());
}
function partsOfDay(key) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}
function dayHeading(key) {
  const { year, month, day } = partsOfDay(key);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}
function weekdayShort(key) {
  const { year, month, day } = partsOfDay(key);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}
function monthTitle(date) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
}
function eventTime(event) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: UK_TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(event.startsAt));
}
function eventMonth(event) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: UK_TIME_ZONE, month: "short" }).format(new Date(event.startsAt));
}
function eventDayNumber(event) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: UK_TIME_ZONE, day: "numeric" }).format(new Date(event.startsAt));
}
function monthCells(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
function cellKey(date) {
  return dayKey(date.toISOString());
}
function remainingSeats(event) {
  return event.capacity == null ? null : Math.max(0, event.capacity - event.attendeeCount);
}
function capacityLabel(event) {
  const remaining = remainingSeats(event);
  if (remaining === null) return "Open";
  if (remaining === 0) return "Full";
  return `${remaining} left`;
}

function EventCard({ event, past = false }) {
  const going = (event.myAttendeeCount || 0) > 0;
  const remaining = remainingSeats(event);
  return (
    <article className="ev-card">
      <div className="ev-date-block"><span>{eventMonth(event)}</span><strong>{eventDayNumber(event)}</strong></div>
      <div className="ev-copy">
        <h3><Link to={`/events/${event.id}`}>{event.title}</Link></h3>
        {event.description && <p>{event.description}</p>}
        <div className="ev-meta">
          <span><Icon name="clock" />{eventTime(event)}</span>
          <span><Icon name="pin" />{event.location || "Location to be announced"}</span>
          {event.groupId && <span><Icon name="users" />Ministry group</span>}
        </div>
      </div>
      <div className="ev-card-side">
        {past ? (
          <span className="ev-seats full">Ended</span>
        ) : going ? (
          <span className="ev-going"><Icon name="check" /> Going · {event.myAttendeeCount}</span>
        ) : (
          <span className={remaining === 0 ? "ev-seats full" : remaining !== null && remaining <= 5 ? "ev-seats" : "ev-seats ok"}>{capacityLabel(event)}</span>
        )}
        <Link className="btn soft tiny" to={`/events/${event.id}`}>Details</Link>
        {!past && !going && (remaining === null || remaining > 0) && (
          <Link className="btn gold tiny" to={`/events/${event.id}`}>Reserve</Link>
        )}
      </div>
    </article>
  );
}

function MonthView({ cursor, selectedDay, events, onSelectDay, onMoveMonth, onToday }) {
  const cells = monthCells(cursor);
  const eventsFor = (key) => events.filter((event) => dayKey(event.startsAt) === key);
  const selectedEvents = eventsFor(selectedDay);
  return (
    <>
      <div className="ev-month-head">
        <h2>{monthTitle(cursor)}</h2>
        <div className="ev-month-controls">
          <button className="btn soft tiny" type="button" onClick={onToday}>Today</button>
          <button className="btn soft tiny" type="button" aria-label="Previous month" onClick={() => onMoveMonth(-1)}>‹</button>
          <button className="btn soft tiny" type="button" aria-label="Next month" onClick={() => onMoveMonth(1)}>›</button>
        </div>
      </div>
      <div className="ev-month-layout">
        <div className="ev-month-grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div className="ev-dow" key={day}>{day}</div>)}
          {cells.map((date) => {
            const key = cellKey(date);
            const dayEvents = eventsFor(key);
            const outside = date.getMonth() !== cursor.getMonth();
            const classes = ["ev-cell", outside ? "is-outside" : "", key === selectedDay ? "is-selected" : "", key === todayKey() ? "is-today" : ""].filter(Boolean).join(" ");
            return (
              <div className={classes} key={key}>
                <div className="ev-cell-top">
                  <button className="ev-cell-day" type="button" onClick={() => onSelectDay(key)} aria-label={dayHeading(key)}>{date.getDate()}</button>
                  {dayEvents.length > 0 && <span>{dayEvents.length}</span>}
                </div>
                {dayEvents.slice(0, 2).map((event) => {
                  const going = (event.myAttendeeCount || 0) > 0;
                  const remaining = remainingSeats(event);
                  const chipClass = going ? "is-going" : remaining !== null && remaining <= 5 ? "is-limited" : "";
                  return <Link className={`ev-cell-event ${chipClass}`} to={`/events/${event.id}`} key={event.id}>{event.title}</Link>;
                })}
                {dayEvents.length > 2 && <button className="ev-more" type="button" onClick={() => onSelectDay(key)}>+{dayEvents.length - 2} more</button>}
              </div>
            );
          })}
        </div>
        <aside className="ev-month-panel">
          <p className="ev-eyebrow">Selected day</p>
          <h3>{dayHeading(selectedDay)}</h3>
          <p className="sub">{selectedEvents.length} gathering{selectedEvents.length === 1 ? "" : "s"}</p>
          {selectedEvents.length === 0 && <p className="ev-empty">No events on this day.</p>}
          {selectedEvents.map((event) => {
            const going = (event.myAttendeeCount || 0) > 0;
            const remaining = remainingSeats(event);
            return (
              <div className="ev-month-event" key={event.id}>
                <strong>{event.title}</strong>
                <span>{eventTime(event)} · {event.location || "Location to be announced"} · {going ? `Going · ${event.myAttendeeCount}` : capacityLabel(event)}</span>
                <Link className={going || remaining === 0 ? "btn soft tiny" : "btn gold tiny"} to={`/events/${event.id}`}>{going || remaining === 0 ? "Details" : "Reserve"}</Link>
              </div>
            );
          })}
        </aside>
      </div>
    </>
  );
}

function MiniMonth({ cursor, selectedDay, events, onSelectDay }) {
  const cells = monthCells(cursor);
  const has = (key) => events.some((event) => dayKey(event.startsAt) === key);
  return (
    <div className="ev-mini-cal">
      {["M", "T", "W", "T", "F", "S", "S"].map((day) => <small key={day}>{day}</small>)}
      {cells.map((date) => {
        const key = cellKey(date);
        const classes = ["ev-mini-day", has(key) ? "has" : "", key === selectedDay ? "is-selected" : "", key === todayKey() ? "is-today" : ""].filter(Boolean).join(" ");
        return <button className={classes} type="button" key={key} onClick={() => onSelectDay(key)}>{date.getDate()}</button>;
      })}
    </div>
  );
}

export default function EventsScreen({ groupId = "" }) {
  const { profile } = useSession();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("agenda");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedDay, setSelectedDay] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedMonthDay, setSelectedMonthDay] = useState(() => todayKey());
  const [showPast, setShowPast] = useState(false);
  const [canManage, setCanManage] = useState(false);

  const load = useCallback(async (signal) => {
    setError("");
    try {
      const result = await listEvents({ signal, groupId, signedIn: Boolean(profile) });
      setEvents(result);
    } catch (reason) {
      if (!signal?.aborted) setError(reason.message);
    }
  }, [groupId, profile?.id]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void load(controller.signal).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (!profile || groupId) {
      setCanManage(false);
      return undefined;
    }
    let live = true;
    getEventsAccess()
      .then((data) => { if (live) setCanManage(hasCapability(data, "events.manage")); })
      .catch(() => { if (live) setCanManage(false); });
    return () => { live = false; };
  }, [profile?.id, groupId]);

  const now = Date.now();
  const upcoming = useMemo(
    () => events.filter((event) => new Date(event.startsAt).getTime() >= now).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
    [events, now],
  );
  const past = useMemo(
    () => events.filter((event) => new Date(event.startsAt).getTime() < now).sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt)),
    [events, now],
  );

  function matches(event) {
    const query = search.trim().toLowerCase();
    if (query) {
      const haystack = [event.title, event.description, event.location].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    const starts = new Date(event.startsAt).getTime();
    if (filter === "week" && (starts < now || starts > now + 7 * DAY_MS)) return false;
    if (filter === "30" && (starts < now || starts > now + 30 * DAY_MS)) return false;
    if (filter === "mine" && !(event.myAttendeeCount > 0)) return false;
    return true;
  }

  const visibleUpcoming = upcoming.filter(matches);
  const visiblePast = past.filter(matches);
  const byDay = new Map();
  for (const event of [...upcoming, ...past]) {
    if (!matches(event)) continue;
    const key = dayKey(event.startsAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(event);
  }
  const grouped = [];
  for (const event of visibleUpcoming) {
    const key = dayKey(event.startsAt);
    if (!grouped.some(([groupKey]) => groupKey === key)) {
      grouped.push([key, byDay.get(key).filter((item) => new Date(item.startsAt).getTime() >= now)]);
    }
  }
  const agendaGroups = selectedDay ? grouped.filter(([key]) => key === selectedDay) : grouped;
  const nextEvent = upcoming[0] || null;
  const nextGoing = (nextEvent?.myAttendeeCount || 0) > 0;
  const nextRemaining = nextEvent ? remainingSeats(nextEvent) : null;
  const railDays = Array.from({ length: 14 }, (_, index) => addDays(new Date(), index));
  const myRsvps = upcoming.filter((event) => event.myAttendeeCount > 0).slice(0, 2);

  function selectDay(key) {
    if (!key) return;
    setSelectedDay(key);
    setView("agenda");
  }
  function moveMonth(offset) {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }
  function goToday() {
    setMonthCursor(new Date());
    setSelectedMonthDay(todayKey());
  }
  function openMonth() {
    setView("month");
    setSelectedMonthDay(selectedDay || todayKey());
    if (selectedDay) {
      const { year, month } = partsOfDay(selectedDay);
      setMonthCursor(new Date(year, month - 1, 1));
    }
  }

  return (
    <section className="screen active ev-screen" aria-label={groupId ? "Group events" : "Events"}>
      <div className="ev-page">
        {view === "agenda" && (
          <section className="ev-hero">
            <div className="ev-hero-copy">
              <p className="ev-eyebrow">{groupId ? "Group calendar" : "What’s on"}</p>
              <h1>{groupId ? "Gather with your group" : "Gather with City4Christ"}</h1>
              <p>{groupId ? "Events shared with this group. Times are shown in UK time." : "From Sunday worship to serve days and midweek prayer, find the next place to belong."}</p>
              <div className="ev-hero-actions">
                <button className="btn dark" type="button" onClick={openMonth}>View this month</button>
                <button className="btn soft" type="button" onClick={() => { setFilter("mine"); setSelectedDay(""); }}>My RSVPs</button>
              </div>
              <span className="ev-hero-note">Times shown in UK time (GMT/BST)</span>
            </div>
            {nextEvent ? (
              <article className="ev-feature">
                <img className="ev-feature-img" src="/assets/images/churchActivities.jpeg" alt="" />
                <span className="ev-feature-kicker">Featured · Next gathering</span>
                <div className="ev-feature-date"><strong>{eventDayNumber(nextEvent)}</strong><span>{eventMonth(nextEvent)}</span></div>
                <div className="ev-feature-body">
                  <h2>{nextEvent.title}</h2>
                  <div className="ev-feature-meta">
                    <span><Icon name="clock" />{eventTime(nextEvent)}</span>
                    <span><Icon name="pin" />{nextEvent.location || "Location to be announced"}</span>
                    <span><Icon name="users" />{groupId || nextEvent.groupId ? "Ministry group" : "Church-wide"}</span>
                  </div>
                  <div className="ev-feature-actions">
                    <Link className="btn gold" to={`/events/${nextEvent.id}`}>{nextGoing ? "View your RSVP" : nextRemaining === 0 ? "View details" : "Reserve a seat"}</Link>
                    <span className="ev-feature-seats">{nextGoing ? `Going · ${nextEvent.myAttendeeCount} seat${nextEvent.myAttendeeCount === 1 ? "" : "s"}` : nextRemaining === null ? "Open to all" : nextRemaining === 0 ? "Event full" : `${nextRemaining} seats left`}</span>
                  </div>
                </div>
              </article>
            ) : (
              <div className="ev-empty-state"><h2>No upcoming gatherings</h2><p>New events will appear here when they are published.</p></div>
            )}
          </section>
        )}

        <div className="ev-toolbar">
          <div className="ev-seg" role="tablist" aria-label="Event views">
            <button type="button" role="tab" aria-selected={view === "agenda"} className={view === "agenda" ? "is-active" : ""} onClick={() => setView("agenda")}>Agenda</button>
            <button type="button" role="tab" aria-selected={view === "month"} className={view === "month" ? "is-active" : ""} onClick={openMonth}>Month</button>
          </div>
          <label className="ev-search"><Icon name="search" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search events by title or place" aria-label="Search events" /></label>
          <div className="ev-chips">
            <button type="button" className={`ev-chip ${filter === "all" ? "is-active" : ""}`} onClick={() => setFilter("all")}>All</button>
            <button type="button" className={`ev-chip ${filter === "week" ? "is-active" : ""}`} onClick={() => setFilter("week")}>This week</button>
            <button type="button" className={`ev-chip ${filter === "30" ? "is-active" : ""}`} onClick={() => setFilter("30")}>Next 30 days</button>
            <button type="button" className={`ev-chip ${filter === "mine" ? "is-active" : ""}`} onClick={() => { setFilter("mine"); setSelectedDay(""); }}>My RSVPs</button>
          </div>
          {canManage && <Link className="ev-manage" to="/admin/events">Manage events →</Link>}
        </div>

        {error && <p role="alert">{error}</p>}
        {loading && !events.length && <p role="status">Loading events…</p>}

        {view === "agenda" ? (
          <>
            <div className="ev-date-rail" aria-label="Next 14 days">
              {railDays.map((date) => {
                const key = cellKey(date);
                const classes = ["ev-date", byDay.has(key) ? "has" : "", key === selectedDay ? "is-active" : ""].filter(Boolean).join(" ");
                return (
                  <button className={classes} type="button" key={key} onClick={() => selectDay(key)} aria-pressed={key === selectedDay}>
                    <span>{new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date)}</span>
                    <strong>{date.getDate()}</strong>
                  </button>
                );
              })}
            </div>

            {selectedDay && (
              <div className="ev-selected-day">
                <span>{dayHeading(selectedDay)}</span>
                <button className="ev-past-link" type="button" onClick={() => setSelectedDay("")}>Show all upcoming</button>
              </div>
            )}

            <div className="ev-hub">
              <div className="ev-agenda">
                {agendaGroups.length === 0 && !loading && (
                  <div className="ev-empty">
                    {filter === "mine" && !profile ? "Sign in to see your RSVPs." : selectedDay ? "No events on this day." : "No upcoming events match these filters."}
                  </div>
                )}
                {agendaGroups.map(([key, dayEvents]) => {
                  const { day, month } = partsOfDay(key);
                  return (
                    <div className="ev-day" key={key}>
                      <div className="ev-day-rail"><i /><strong>{day}</strong><span>{MONTHS[month - 1]} · {weekdayShort(key)}</span></div>
                      <div className="ev-events">{dayEvents.map((event) => <EventCard event={event} key={event.id} />)}</div>
                    </div>
                  );
                })}
                {visiblePast.length > 0 && (
                  <div>
                    <button className="ev-past-link" type="button" onClick={() => setShowPast((value) => !value)}>
                      {showPast ? "Hide past events" : `Past events (${visiblePast.length}) →`}
                    </button>
                    {showPast && <div className="ev-events" style={{ marginTop: 10 }}>{visiblePast.map((event) => <EventCard event={event} key={event.id} past />)}</div>}
                  </div>
                )}
              </div>

              <aside className="ev-side">
                <section className="ev-side-card">
                  <div className="ev-side-head"><h3>{monthTitle(monthCursor)}</h3><span>{byDay.size} days</span></div>
                  <MiniMonth cursor={monthCursor} selectedDay={selectedDay} events={events} onSelectDay={selectDay} />
                </section>
                <section className="ev-side-card">
                  <div className="ev-side-head"><h3>My RSVPs</h3><button className="ev-past-link" type="button" onClick={() => { setFilter("mine"); setSelectedDay(""); }}>View all</button></div>
                  {myRsvps.length === 0 ? <p className="ev-empty" style={{ padding: 12 }}>No RSVPs yet.</p> : myRsvps.map((event) => (
                    <div className="ev-rsvp-mini" key={event.id} style={{ marginBottom: 7 }}>
                      <strong>{event.title}</strong>
                      <span>{dayHeading(dayKey(event.startsAt))} · {eventTime(event)} · {event.myAttendeeCount} seat{event.myAttendeeCount === 1 ? "" : "s"}</span>
                      <Link to={`/events/${event.id}`}>View or cancel</Link>
                    </div>
                  ))}
                </section>
                <div className="ev-side-note"><strong>Stay in the loop</strong>Members get a private notification when a saved event changes or is cancelled.</div>
              </aside>
            </div>
          </>
        ) : (
          <MonthView
            cursor={monthCursor}
            selectedDay={selectedMonthDay}
            events={events.filter(matches)}
            onSelectDay={setSelectedMonthDay}
            onMoveMonth={moveMonth}
            onToday={goToday}
          />
        )}

        {groupId && <EventManager profile={profile} groupId={groupId} />}
      </div>
    </section>
  );
}
