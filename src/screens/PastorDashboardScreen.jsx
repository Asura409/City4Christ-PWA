import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, useSession } from "@/auth/session";
import { hasCapability } from "../../js/access.js";
import { dateLabel } from "@/pastoral/api";
import "@/pastoral/pastoral.css";

function dayKey(value, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function statusLabel(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function PastorDashboardScreen() {
  const { profile } = useSession();
  const [pastor, setPastor] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 86400000);
      const [pastorResult, bookingResult, slotResult, accessResult] = await Promise.all([
        api.request("/api/v1/me/pastoral/profile"),
        api.request("/api/v1/me/pastoral/bookings?limit=100"),
        api.request(`/api/v1/me/pastoral/availability?from=${encodeURIComponent(now.toISOString())}&to=${encodeURIComponent(tomorrow.toISOString())}&limit=100`),
        api.request("/api/v1/me/access"),
      ]);
      setPastor(pastorResult.data);
      setBookings(bookingResult.data || []);
      setSlots(slotResult.data || []);
      setAccess(accessResult.data);
    } catch (reason) {
      setPastor(null);
      setError(reason.status === 404 ? "" : reason.message || "Could not load your pastor workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const today = useMemo(() => dayKey(new Date(), pastor?.timeZone || "UTC"), [pastor?.timeZone]);
  const todayBookings = bookings.filter((booking) => dayKey(booking.startsAt, booking.timeZone || pastor?.timeZone || "UTC") === today && ["pending", "approved"].includes(booking.status));
  const pending = bookings.filter((booking) => booking.status === "pending");
  const upcoming = bookings.filter((booking) => new Date(booking.startsAt) > new Date() && ["pending", "approved"].includes(booking.status)).slice(0, 4);
  const canPublishSermons = hasCapability(access, "sermons.manage");

  if (loading) return <section className="screen active pastor-dashboard-state"><p role="status">Loading your pastor workspace…</p></section>;
  if (error) return <section className="screen active pastor-dashboard-state"><p role="alert">{error}</p><button className="btn soft" onClick={() => void load()}>Try again</button></section>;
  if (!pastor) return <section className="screen active pastor-dashboard-state"><h1>Pastor workspace unavailable</h1><p>Your account does not have an eligible pastoral profile yet.</p><Link className="btn soft" to="/pastors">Open pastoral care</Link></section>;

  return (
    <section className="screen active pastor-dashboard-screen" aria-label="Pastor dashboard">
      <div className="pastor-dashboard-layout">
        <aside className="pastor-dashboard-rail">
          <div className="pastor-dashboard-mark">C<span>4</span>C</div>
          <p className="pastoral-eyebrow">PASTOR WORKSPACE</p>
          <nav aria-label="Pastor workspace">
            <a className="pastor-rail-link is-active" href="#today"><span>◉</span>Today</a>
            <a className="pastor-rail-link" href="#appointments"><span>◷</span>Appointments</a>
            <a className="pastor-rail-link" href="#availability"><span>＋</span>Availability</a>
            <Link className="pastor-rail-link" to="/word"><span>▣</span>Sermons</Link>
          </nav>
          <Link className="pastor-rail-return" to="/pastors">Pastoral care ↗</Link>
        </aside>

        <div className="pastor-dashboard-main">
          <header className="pastor-dashboard-header">
            <div>
              <p className="pastoral-eyebrow">{new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(new Date())}</p>
              <h1>Good day, {profile?.firstName || "Pastor"}</h1>
              <p>Here is your pastoral schedule and care queue.</p>
            </div>
            <div className="pastor-dashboard-header-actions"><span className="pastor-live-chip"><i /> {pastor.listed ? "Listed in directory" : "Not listed"}</span><button className="btn soft" type="button" onClick={() => void load()}>Refresh</button></div>
          </header>

          <div className="pastor-stat-grid" aria-label="Pastor overview">
            <article className="pastor-stat-card pastor-stat-primary"><span>Today</span><strong>{todayBookings.length}</strong><small>Appointments on your schedule</small></article>
            <article className="pastor-stat-card"><span>Needs response</span><strong>{pending.length}</strong><small>Requests awaiting your decision</small></article>
            <article className="pastor-stat-card"><span>Open slots</span><strong>{slots.filter((slot) => slot.available).length}</strong><small>Available in the next 24 hours</small></article>
          </div>

          <div className="pastor-dashboard-columns">
            <section className="pastor-dashboard-card" id="today" aria-label="Today's schedule">
              <div className="pastor-card-heading"><div><p className="pastoral-eyebrow">YOUR DAY</p><h2>Today’s schedule</h2></div><span className="pastor-card-count">{todayBookings.length}</span></div>
              {!todayBookings.length ? <div className="pastor-empty"><span>☀</span><p>Your day is clear for now.</p><small>Keep your availability up to date so members can request time with you.</small></div> : todayBookings.map((booking) => <article className="pastor-appointment-row" key={booking.id}><div className="pastor-time"><strong>{dateLabel(booking.startsAt, booking.timeZone || pastor.timeZone)}</strong><small>until {dateLabel(booking.endsAt, booking.timeZone || pastor.timeZone)}</small></div><div><h3>{booking.memberFirstName} {booking.memberLastName}</h3><p>Pastoral appointment</p></div><span className={`pastor-status pastor-status-${booking.status}`}>{statusLabel(booking.status)}</span></article>)}
            </section>

            <section className="pastor-dashboard-card" id="appointments" aria-label="Upcoming appointments">
              <div className="pastor-card-heading"><div><p className="pastoral-eyebrow">COMING UP</p><h2>Upcoming appointments</h2></div><Link to="/pastors">View all</Link></div>
              {!upcoming.length ? <p className="pastor-muted">No upcoming appointments.</p> : upcoming.map((booking) => <article className="pastor-upcoming-row" key={booking.id}><div className="pastor-date-badge"><strong>{new Intl.DateTimeFormat(undefined, { day: "2-digit" }).format(new Date(booking.startsAt))}</strong><small>{new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(booking.startsAt))}</small></div><div><strong>{booking.memberFirstName} {booking.memberLastName}</strong><p>{dateLabel(booking.startsAt, booking.timeZone || pastor.timeZone)}</p></div><span className={`pastor-status pastor-status-${booking.status}`}>{statusLabel(booking.status)}</span></article>)}
            </section>
          </div>

          <section className="pastor-dashboard-card pastor-dashboard-actions" id="availability" aria-label="Pastor quick actions">
            <div className="pastor-card-heading"><div><p className="pastoral-eyebrow">KEEP MOVING</p><h2>Workspace actions</h2></div></div>
            <div className="pastor-action-grid">
              <Link className="pastor-action-card" to="/pastors"><span>＋</span><strong>Manage availability</strong><small>Add or withdraw appointment slots</small></Link>
              <Link className="pastor-action-card" to="/pastors"><span>✓</span><strong>Review requests{pending.length ? ` (${pending.length})` : ""}</strong><small>Approve or decline assigned bookings</small></Link>
              <Link className="pastor-action-card" to={canPublishSermons ? "/admin/sermons" : "/word"}><span>▣</span><strong>{canPublishSermons ? "Open sermon studio" : "View sermons"}</strong><small>{canPublishSermons ? "Create and publish sermon content" : "Read the Word and media library"}</small></Link>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
