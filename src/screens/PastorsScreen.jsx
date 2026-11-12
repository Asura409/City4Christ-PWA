import { RefreshButton } from "@/components/RefreshButton";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/auth/session";
import { hasCapability } from "../../js/access.js";
import { PastorDirectory } from "@/pastoral/PastorDirectory";
import { AvailabilityPicker } from "@/pastoral/AvailabilityPicker";
import { BookingList } from "@/pastoral/BookingList";
import { PastorAppointmentForm } from "@/pastoral/PastorAppointmentForm";
import { TimedMessage } from "@/components/TimedMessage";
import "@/pastoral/pastoral.css";

export default function PastorsScreen() {
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0),
    [selected, setSelected] = useState(null),
    [pastor, setPastor] = useState(null),
    [admin, setAdmin] = useState(false),
    [view, setView] = useState("book"),
    [flash, setFlash] = useState(""),
    [error, setError] = useState("");
  const reload = () => setRevision((v) => v + 1);

  useEffect(() => {
    let active = true;
    setError("");
    api
      .request("/api/v1/me/pastoral/profile")
      .then(({ data }) => {
        if (active) setPastor(data);
      })
      .catch((e) => {
        if (active) {
          setPastor(null);
          if (e.status !== 404) setError(e.message);
        }
      });
    api
      .request("/api/v1/me/access")
      .then(({ data }) => {
        if (active) setAdmin(hasCapability(data, "roles.privileged.manage"));
      })
      .catch(() => {
        if (active) setAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  function choose(pastorProfile) {
    setFlash("");
    setSelected(pastorProfile);
    setView("book");
  }

  return (
    <section className="screen active pastoral-screen" aria-label="Pastoral appointments">
      <header className="pastoral-hero">
        <div>
          <p className="pastoral-eyebrow">PASTORAL CARE</p>
          <h1>Pastor appointments</h1>
          <p>Connect with a pastor for prayer, guidance, and a personal conversation.</p>
        </div>
        <div className="pastoral-hero-actions">
          <RefreshButton className="btn soft" type="button" onClick={reload} label="Reload" />
          {pastor && <button className="btn soft" type="button" onClick={() => navigate("/pastor-availability")}>Manage availability</button>}
          {pastor && <button className="btn gold" type="button" onClick={() => navigate("/pastor-dashboard")}>Pastor dashboard</button>}
        </div>
      </header>

      {error && <p role="alert">{error}</p>}

      <div className="pastoral-mobile-seg" role="tablist" aria-label="Pastoral care views">
        <button type="button" role="tab" aria-selected={view === "book"} className={`pastoral-seg ${view === "book" ? "is-active" : ""}`} onClick={() => setView("book")}>Book</button>
        <button type="button" role="tab" aria-selected={view === "mine"} className={`pastoral-seg ${view === "mine" ? "is-active" : ""}`} onClick={() => setView("mine")}>My appointments</button>
      </div>

      <div className="pastoral-booking-layout">
        <div className="pastoral-booking-main">
          <section id="pastor-book" className={`pastoral-panel pastoral-panel-booking ${view === "book" ? "is-mobile-visible" : ""}`} aria-label="Book a pastor">
            <PastorDirectory revision={revision} onSelect={choose} />
          </section>

          <section id="pastor-mine" className={`pastoral-panel pastoral-my-appointments ${view === "mine" ? "is-mobile-visible" : ""}`} aria-label="My pastor appointments">
            <TimedMessage message={flash} />
            <BookingList revision={revision} onChange={reload} />
          </section>
        </div>

        <aside className={`pastoral-booking-drawer ${selected ? "is-open" : ""}`} aria-label="Choose a time">
          {selected ? (
            <>
              <button className="pastoral-drawer-back" type="button" onClick={() => setSelected(null)}>‹ Pastors</button>
              <AvailabilityPicker
                key={selected.id}
                pastor={selected}
                revision={revision}
                onChange={reload}
                onRequested={(message) => {
                  setFlash(message);
                  setView("mine");
                  setSelected(null);
                }}
              />
            </>
          ) : (
            <div className="pastoral-booking-empty">
              <p className="pastoral-eyebrow">BOOKING</p>
              <h2>Choose a pastor</h2>
              <p>Select a pastor from the directory to see their next available times.</p>
            </div>
          )}
        </aside>
      </div>

      {admin && (
        <section className="pastoral-panel pastoral-panel-admin" aria-label="Pastoral administration">
          <div className="pastoral-panel-heading"><div><p className="pastoral-eyebrow">ADMINISTRATION</p><h2>Pastor directory administration</h2></div></div>
          <PastorAppointmentForm onChange={reload} />
        </section>
      )}
    </section>
  );
}
