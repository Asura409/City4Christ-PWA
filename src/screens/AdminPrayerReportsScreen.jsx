import React, { useEffect, useState } from "react";
import { TimedMessage } from "@/components/TimedMessage";
import { getPrayerModerationAccess, listPrayerReports, reviewPrayerReport } from "@/prayer/api";
import "@/prayer/prayer.css";

export default function AdminPrayerReportsScreen() {
  const [allowed, setAllowed] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const [pendingIds, setPendingIds] = useState(() => new Set());

  useEffect(() => {
    let live = true;
    getPrayerModerationAccess()
      .then((access) => {
        const canModerate = (access.capabilities || []).some((capability) => capability.permission === "prayer.moderate");
        if (live) setAllowed(canModerate);
        if (!canModerate) {
          if (live) setError("You do not have permission to review prayer reports.");
          return;
        }
        return listPrayerReports()
          .then((items) => { if (live) setReports(items); })
          .catch((err) => { if (live) setError(err.message || "Could not load prayer reports."); });
      })
      .catch((err) => { if (live) setError(err.message || "Could not verify moderation access."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  async function review(report, decision) {
    if (pendingIds.has(report.id) || reason.trim().length < 3) return;
    setPendingIds((current) => new Set(current).add(report.id));
    setError("");
    setNotice("");
    try {
      await reviewPrayerReport(report.id, decision, reason.trim());
      setReports((current) => current.filter((item) => item.id !== report.id));
      setReason("");
      setNotice(decision === "hide" ? "Request hidden from the prayer wall." : "Report dismissed.");
    } catch (err) {
      setError(err.message || "Could not review this report.");
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(report.id);
        return next;
      });
    }
  }

  return (
    <section className="screen active admin-prayer-reports" aria-label="Prayer reports">
      <header className="prayer-v2-admin-head">
        <p className="prayer-v2-eyebrow">STAFF TOOLS</p>
        <h1>Prayer reports</h1>
        <p>Review reported requests and keep the prayer wall safe.</p>
      </header>

      <TimedMessage message={notice} />
      {error && <TimedMessage tone="error" message={error} />}
      {loading ? (
        <p role="status">Loading prayer reports…</p>
      ) : allowed === false ? null : reports.length === 0 ? (
        <div className="prayer-v2-empty">
          <span className="prayer-v2-empty-icon" aria-hidden="true">♡</span>
          <h2>No pending reports.</h2>
          <p>Reported prayer requests will appear here for review.</p>
        </div>
      ) : (
        <div className="prayer-v2-admin-list">
          {reports.map((report) => (
            <article className="prayer-v2-admin-card" key={report.id}>
              <p className="prayer-v2-eyebrow">
                {report.requestVisibility === "group" ? "GROUP REQUEST" : "CHURCH COMMUNITY"} · {report.reason}
              </p>
              <p className="prayer-v2-body">{report.requestBody}</p>
              {report.details && <p className="prayer-v2-help">Report detail: {report.details}</p>}
              <label htmlFor={`moderation-reason-${report.id}`}>Moderation reason</label>
              <textarea
                id={`moderation-reason-${report.id}`}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <div className="prayer-v2-admin-actions">
                <button className="btn soft" type="button" disabled={pendingIds.has(report.id) || reason.trim().length < 3} onClick={() => void review(report, "hide")}>Hide request</button>
                <button className="btn soft" type="button" disabled={pendingIds.has(report.id) || reason.trim().length < 3} onClick={() => void review(report, "dismiss")}>Dismiss report</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
