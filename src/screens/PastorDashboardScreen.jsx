import { RefreshButton } from "@/components/RefreshButton";
import { UK_TIME_ZONE } from "../../js/time.js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, useSession } from "@/auth/session";
import { hasCapability } from "../../js/access.js";
import { dateLabel, decideAppointment } from "@/pastoral/api";
import { Avatar } from "@/components/Avatar";
import { TimedMessage } from "@/components/TimedMessage";
import "@/pastoral/pastoral.css";

function dayKey(value, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: UK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function statusLabel(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const TABS = [
  ["today", "Today"],
  ["requests", "Requests"],
  ["appointments", "Appointments"],
  ["availability", "Availability"],
];

export default function PastorDashboardScreen() {
  const { profile } = useSession();
  const navigate = useNavigate();
  const [pastor, setPastor] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [activeTab, setActiveTab] = useState("today");

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

  async function decide(booking, status) {
    setBusyId(booking.id);
    setActionError("");
    try {
      await decideAppointment(booking.id, status, booking.version);
      await load();
    } catch (reason) {
      setActionError(reason.message || "Could not update this appointment.");
      if (reason.status === 401 || reason.status === 403) await load();
    } finally {
      setBusyId("");
    }
  }

  function go(id) {
    if (id === "availability") {
      navigate("/pastor-availability");
      return;
    }
    setActiveTab(id);
    scrollToSection(id);
  }

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
            {TABS.map(([id, label]) => (
              <button key={id} className={`pastor-rail-link ${activeTab === id ? "is-active" : ""}`} type="button" onClick={() => go(id)}>
                <span aria-hidden="true">{id === "today" ? "◉" : id === "requests" ? "✓" : id === "appointments" ? "◷" : "＋"}</span>{label}
              </button>
            ))}
            <Link className="pastor-rail-link" to="/word"><span aria-hidden="true">▣</span>Sermons</Link>
          </nav>
          <Link className="pastor-rail-return" to="/pastors">Pastoral care ↗</Link>
        </aside>

        <div className="pastor-dashboard-main">
          <nav className="pastor-mobile-tabs" aria-label="Pastor workspace shortcuts">
            {TABS.map(([id, label]) => (
              <button key={id} type="button" className={`pastor-mobile-tab ${activeTab === id ? "is-active" : ""}`} onClick={() => go(id)}>
                {label}
                {id === "requests" && pending.length > 0 && <span className="pastor-mobile-count">{pending.length}</span>}
              </button>
            ))}
          </nav>

          <header className="pastor-dashboard-header">
            <div>
              <p className="pastoral-eyebrow">{new Intl.DateTimeFormat("en-GB", { timeZone: UK_TIME_ZONE, dateStyle: "full" }).format(new Date())}</p>
              <div className="pastor-dashboard-greeting">
                <Avatar name={`${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || "Pastor"} src={pastor.avatar?.url || profile?.avatar?.url} size={46} />
                <h1>Good day, {profile?.firstName || "Pastor"}</h1>
              </div>
              <p>Here is your pastoral schedule and care queue.</p>
            </div>
            <div className="pastor-dashboard-header-actions">
              <span className="pastor-live-chip"><i /> {pastor.listed ? "Listed in directory" : "Not listed"}</span>
              <RefreshButton className="btn soft" type="button" onClick={() => load()} label="Refresh" />
            </div>
          </header>

          <div className="pastor-stat-grid" aria-label="Pastor overview">
            <article className="pastor-stat-card pastor-stat-primary"><span>Today</span><strong>{todayBookings.length}</strong><small>Appointments on your schedule</small></article>
            <article className={`pastor-stat-card ${pending.length ? "pastor-stat-accent" : ""}`}><span>Needs response</span><strong>{pending.length}</strong><small>Requests awaiting your decision</small></article>
            <article className="pastor-stat-card"><span>Open slots</span><strong>{slots.filter((slot) => slot.available).length}</strong><small>Available in the next 24 hours</small></article>
          </div>

          <div className="pastor-dashboard-columns">
            <div className="pastor-dashboard-col">
              <section className="pastor-dashboard-card pastor-today" id="today" aria-label="Today's schedule">
                <div className="pastor-card-heading"><div><p className="pastoral-eyebrow">YOUR DAY</p><h2>Today’s schedule</h2></div><span className="pastor-card-count">{todayBookings.length}</span></div>
                {!todayBookings.length ? (
                  <div className="pastor-empty"><span aria-hidden="true">☀</span><p>Your day is clear for now.</p><small>Keep your availability up to date so members can request time with you.</small></div>
                ) : todayBookings.map((booking) => (
                  <article className="pastor-appointment-row" key={booking.id}>
                    <div className="pastor-time"><strong>{dateLabel(booking.startsAt, booking.timeZone || pastor.timeZone)}</strong><small>until {dateLabel(booking.endsAt, booking.timeZone || pastor.timeZone)}</small></div>
                    <Avatar name={`${booking.memberFirstName} ${booking.memberLastName}`} src={booking.memberAvatar?.url} size={32} />
                    <div className="pastor-appointment-copy"><h3>{booking.memberFirstName} {booking.memberLastName}</h3><p>Pastoral appointment</p></div>
                    <span className={`pastor-status pastor-status-${booking.status}`}>{statusLabel(booking.status)}</span>
                  </article>
                ))}
              </section>
            </div>

            <div className="pastor-dashboard-col">
              <section className="pastor-dashboard-card pastor-requests" id="requests" aria-label="Requests awaiting a decision">
                <div className="pastor-card-heading"><div><p className="pastoral-eyebrow">YOUR QUEUE</p><h2>Needs your response</h2></div><span className="pastor-card-count">{pending.length}</span></div>
                <TimedMessage tone="error" message={actionError} />
                {!pending.length ? (
                  <p className="pastor-muted">No requests are waiting for a decision.</p>
                ) : pending.slice(0, 4).map((booking) => (
                  <article className="pastor-request" key={booking.id}>
                    <div className="pastor-request-top">
                      <Avatar name={`${booking.memberFirstName} ${booking.memberLastName}`} src={booking.memberAvatar?.url} size={36} />
                      <div className="pastor-request-copy"><strong>{booking.memberFirstName} {booking.memberLastName}</strong><span>{dateLabel(booking.startsAt, booking.timeZone || pastor.timeZone)}</span></div>
                      <span className="pastor-status pastor-status-pending">{statusLabel(booking.status)}</span>
                    </div>
                    <div className="pastor-request-actions">
                      <button className="btn soft" type="button" disabled={busyId === booking.id} onClick={() => void decide(booking, "declined")}>Decline</button>
                      <button className="btn gold" type="button" disabled={busyId === booking.id} onClick={() => void decide(booking, "approved")}>{busyId === booking.id ? "Saving…" : "Approve"}</button>
                    </div>
                  </article>
                ))}
              </section>

              <section className="pastor-dashboard-card pastor-upcoming" id="appointments" aria-label="Upcoming appointments">
                <div className="pastor-card-heading"><div><p className="pastoral-eyebrow">COMING UP</p><h2>Upcoming appointments</h2></div><Link to="/pastors">View all</Link></div>
                {!upcoming.length ? <p className="pastor-muted">No upcoming appointments.</p> : upcoming.map((booking) => (
                  <article className="pastor-upcoming-row" key={booking.id}>
                    <div className="pastor-date-badge"><strong>{new Intl.DateTimeFormat("en-GB", { timeZone: UK_TIME_ZONE, day: "2-digit" }).format(new Date(booking.startsAt))}</strong><small>{new Intl.DateTimeFormat("en-GB", { timeZone: UK_TIME_ZONE, month: "short" }).format(new Date(booking.startsAt))}</small></div>
                    <Avatar name={`${booking.memberFirstName} ${booking.memberLastName}`} src={booking.memberAvatar?.url} size={30} />
                    <div className="pastor-appointment-copy"><strong>{booking.memberFirstName} {booking.memberLastName}</strong><p>{dateLabel(booking.startsAt, booking.timeZone || pastor.timeZone)}</p></div>
                    <span className={`pastor-status pastor-status-${booking.status}`}>{statusLabel(booking.status)}</span>
                  </article>
                ))}
              </section>
            </div>
          </div>

          <section className="pastor-dashboard-card pastor-dashboard-actions" id="actions" aria-label="Pastor quick actions">
            <div className="pastor-card-heading"><div><p className="pastoral-eyebrow">KEEP MOVING</p><h2>Workspace actions</h2></div></div>
            <div className="pastor-action-grid">
              <Link className="pastor-action-card" to="/pastor-availability"><span aria-hidden="true">＋</span><strong>Manage availability</strong><small>Add or withdraw appointment slots</small></Link>
              <Link className="pastor-action-card" to="/pastors"><span aria-hidden="true">✓</span><strong>Review requests{pending.length ? ` (${pending.length})` : ""}</strong><small>Approve or decline assigned bookings</small></Link>
              <Link className="pastor-action-card" to={canPublishSermons ? "/admin/sermons" : "/word"}><span aria-hidden="true">▣</span><strong>{canPublishSermons ? "Open sermon studio" : "View sermons"}</strong><small>{canPublishSermons ? "Create and publish sermon content" : "Read the Word and media library"}</small></Link>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
