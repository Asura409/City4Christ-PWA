import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/auth/session";
import { hasCapability } from "../../js/access.js";
import { PastorDirectory } from "@/pastoral/PastorDirectory";
import { AvailabilityPicker } from "@/pastoral/AvailabilityPicker";
import { AvailabilityEditor } from "@/pastoral/AvailabilityEditor";
import { BookingList } from "@/pastoral/BookingList";
import { PastorAppointmentForm } from "@/pastoral/PastorAppointmentForm";
import "@/pastoral/pastoral.css";
export default function PastorsScreen() {
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0),
    [selected, setSelected] = useState(null),
    [pastor, setPastor] = useState(null),
    [admin, setAdmin] = useState(false),
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
  return (
    <section
      className="screen active pastoral-screen"
      aria-label="Pastoral appointments"
    >
      <header className="pastoral-hero">
        <div><p className="pastoral-eyebrow">PASTORAL CARE</p><h1>Pastor appointments</h1><p>Connect with a pastor for prayer, guidance, and a personal conversation.</p></div>
        <div className="pastoral-hero-actions"><button className="btn soft" onClick={reload}>Reload</button>{pastor && <button className="btn gold" onClick={() => navigate("/pastor-dashboard")}>Pastor dashboard</button>}</div>
      </header>
      {error && <p role="alert">{error}</p>}
      <section className="pastoral-panel pastoral-panel-booking" aria-label="Book a pastor">
        <PastorDirectory revision={revision} onSelect={setSelected} />
        {selected && <AvailabilityPicker key={selected.id} pastor={selected} revision={revision} onChange={reload} />}
      </section>
      <section className="pastoral-panel" aria-label="My pastor appointments">
        <BookingList revision={revision} onChange={reload} />
      </section>
      {pastor && (
        <section className="pastoral-panel pastoral-panel-tools" aria-label="Pastor tools">
          <div className="pastoral-panel-heading"><div><p className="pastoral-eyebrow">PASTOR TOOLS</p><h2>Manage your pastoral care</h2></div><span className="pastoral-role-badge">Pastor</span></div>
          <AvailabilityEditor revision={revision} onChange={reload} listed={pastor.listed} />
          <BookingList assigned revision={revision} onChange={reload} />
        </section>
      )}
      {admin && <section className="pastoral-panel pastoral-panel-admin" aria-label="Pastoral administration"><div className="pastoral-panel-heading"><div><p className="pastoral-eyebrow">ADMINISTRATION</p><h2>Pastor directory administration</h2></div></div><PastorAppointmentForm onChange={reload} /></section>}
    </section>
  );
}
