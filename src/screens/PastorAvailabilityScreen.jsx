import { RefreshButton } from "@/components/RefreshButton";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/auth/session";
import { AvailabilityEditor } from "@/pastoral/AvailabilityEditor";
import { BookingList } from "@/pastoral/BookingList";
import "@/pastoral/pastoral.css";

export default function PastorAvailabilityScreen() {
  const [pastor, setPastor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [profileRevision, setProfileRevision] = useState(0);
  const reload = () => setRevision((value) => value + 1);
  const reloadAll = () => {
    setRevision((value) => value + 1);
    setProfileRevision((value) => value + 1);
  };

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    api
      .request("/api/v1/me/pastoral/profile")
      .then(({ data }) => {
        if (live) setPastor(data);
      })
      .catch((reason) => {
        if (live) {
          setPastor(null);
          setError(reason.status === 404 ? "" : reason.message || "Could not load your availability.");
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [profileRevision]);

  if (loading) return <section className="screen active pastor-dashboard-state"><p role="status">Loading your availability…</p></section>;
  if (error) return <section className="screen active pastor-dashboard-state"><p role="alert">{error}</p><button className="btn soft" onClick={reloadAll}>Try again</button></section>;
  if (!pastor) return <section className="screen active pastor-dashboard-state"><h1>Pastor workspace unavailable</h1><p>Your account does not have an eligible pastoral profile yet.</p><Link className="btn soft" to="/pastors">Open pastoral care</Link></section>;

  return (
    <section className="screen active pastor-availability-screen" aria-label="Manage availability">
      <header className="pastor-tools-head">
        <div className="pastor-tools-heading">
          <p className="pastoral-eyebrow">PASTOR TOOLS</p>
          <h1>Manage availability</h1>
          <p>Publish slots members can request, and review the appointments assigned to you.</p>
        </div>
        <div className="pastor-tools-actions">
          <span className="pastor-live-chip"><i /> {pastor.listed ? "Listed in directory" : "Not listed"}</span>
          <RefreshButton className="btn soft" type="button" onClick={reloadAll} label="Reload" />
          <Link className="btn soft" to="/pastor-dashboard">Dashboard</Link>
        </div>
      </header>

      <AvailabilityEditor revision={revision} onChange={reload} listed={pastor.listed} />

      <section className="pastor-dashboard-card pastor-tools-assigned">
        <BookingList assigned revision={revision} onChange={reload} />
      </section>

      <Link className="pastor-tools-back" to="/pastors">← Back to pastoral care</Link>
    </section>
  );
}
