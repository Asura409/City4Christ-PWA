import React, { useEffect, useState } from "react";
import { api } from "@/auth/session";
import { hasCapability } from "../../js/access.js";
import { PastorDirectory } from "@/pastoral/PastorDirectory";
import { AvailabilityPicker } from "@/pastoral/AvailabilityPicker";
import { AvailabilityEditor } from "@/pastoral/AvailabilityEditor";
import { BookingList } from "@/pastoral/BookingList";
import { PastorAppointmentForm } from "@/pastoral/PastorAppointmentForm";
import "@/pastoral/pastoral.css";
export default function PastorsScreen() {
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
      <h1>Book a pastor</h1>
      <p>
        Choose an available slot and send a request. Appointments require pastor
        approval.
      </p>
      <button className="btn soft" onClick={reload}>
        Reload appointments
      </button>
      {error && <p role="alert">{error}</p>}
      <PastorDirectory revision={revision} onSelect={setSelected} />
      {selected && (
        <AvailabilityPicker
          key={selected.id}
          pastor={selected}
          revision={revision}
          onChange={reload}
        />
      )}
      <BookingList revision={revision} onChange={reload} />
      {pastor && (
        <>
          <AvailabilityEditor revision={revision} onChange={reload} listed={pastor.listed} />
          <BookingList assigned revision={revision} onChange={reload} />
        </>
      )}
      {admin && <PastorAppointmentForm onChange={reload} />}
    </section>
  );
}
