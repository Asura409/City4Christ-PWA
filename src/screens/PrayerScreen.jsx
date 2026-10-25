import React, { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { listGroups } from "@/groups/api";
import {
  acknowledgePrayer,
  createPrayerRequest,
  getPrayerModerationAccess,
  listPrayerReports,
  listPrayerRequests,
  reportPrayerRequest,
  reviewPrayerReport,
  updatePrayerStatus,
} from "@/prayer/api";

function dateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function visibilityLabel(visibility) {
  if (visibility === "group") return "Group members";
  if (visibility === "private") return "Only you";
  return "Church community";
}

export default function PrayerScreen() {
  const [status, setStatus] = useState("open");
  const [requests, setRequests] = useState([]);
  const [cursor, setCursor] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState("community");
  const [groupId, setGroupId] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [moderationAllowed, setModerationAllowed] = useState(false);
  const [moderationUnavailable, setModerationUnavailable] = useState(false);
  const [view, setView] = useState("requests");
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportingId, setReportingId] = useState("");
  const [reportReason, setReportReason] = useState("safety");
  const [reportDetails, setReportDetails] = useState("");
  const [reportedIds, setReportedIds] = useState(() => new Set());
  const [moderationReason, setModerationReason] = useState("");

  const load = useCallback(async (nextCursor = "", signal) => {
    try {
      setError("");
      if (nextCursor) setLoadingMore(true);
      else setLoading(true);
      const page = await listPrayerRequests({ status, cursor: nextCursor, signal });
      setRequests((current) => nextCursor ? [...current, ...page.requests] : page.requests);
      setCursor(page.nextCursor);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || "Could not load prayer requests.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [status]);

  useEffect(() => {
    setRequests([]);
    setCursor("");
    const controller = new AbortController();
    void load("", controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    let current = true;
    getPrayerModerationAccess()
      .then((access) => {
        if (current) setModerationAllowed((access.capabilities || []).some((capability) => capability.permission === "prayer.moderate"));
      })
      .catch(() => { if (current) setModerationUnavailable(true); });
    return () => { current = false; };
  }, []);

  async function loadReports() {
    setReportsLoading(true);
    setError("");
    try {
      setReports(await listPrayerReports());
      setView("reports");
    } catch (err) {
      setError(err.message || "Could not load prayer reports.");
    } finally {
      setReportsLoading(false);
    }
  }

  async function submitReport(item) {
    if (pendingIds.has(item.id)) return;
    setPendingIds((current) => new Set(current).add(item.id));
    setError("");
    try {
      await reportPrayerRequest(item.id, { reason: reportReason, ...(reportDetails.trim() ? { details: reportDetails.trim() } : {}) });
      setReportedIds((current) => new Set(current).add(item.id));
      setReportingId("");
      setReportDetails("");
    } catch (err) {
      setError(err.message || "Could not send this report.");
    } finally {
      setPendingIds((current) => { const next = new Set(current); next.delete(item.id); return next; });
    }
  }

  async function reviewReport(report, decision) {
    if (pendingIds.has(report.id)) return;
    setPendingIds((current) => new Set(current).add(report.id));
    setError("");
    setNotice("");
    try {
      await reviewPrayerReport(report.id, decision, moderationReason.trim());
      setNotice(decision === "hide" ? "Request hidden from the prayer wall." : "Report dismissed.");
      setModerationReason("");
      setReports((current) => current.filter((item) => item.id !== report.id));
    } catch (err) {
      setError(err.message || "Could not review this report.");
    } finally {
      setPendingIds((current) => { const next = new Set(current); next.delete(report.id); return next; });
    }
  }

  useEffect(() => {
    if (visibility !== "group") return undefined;
    let current = true;
    setGroupsLoading(true);
    setGroupsError("");
    listGroups()
      .then(({ groups: available }) => {
        if (current) setGroups(available.filter((group) => group.membershipStatus === "active" && !group.archived));
      })
      .catch((err) => {
        if (current) setGroupsError(err.message || "Could not load your active groups.");
      })
      .finally(() => {
        if (current) setGroupsLoading(false);
      });
    return () => { current = false; };
  }, [visibility]);

  async function submit(event) {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody || submitting || (visibility === "group" && (!groupId || groupsLoading))) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const input = { body: cleanBody, visibility, anonymous };
      if (visibility === "group") input.groupId = groupId;
      await createPrayerRequest(input);
      setBody("");
      setAnonymous(false);
      setNotice("Your prayer request was shared.");
      if (status !== "open") setStatus("open");
      else await load();
    } catch (err) {
      setError(err.message || "Could not share your prayer request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function acknowledge(item) {
    if (item.hasPrayed || pendingIds.has(item.id)) return;
    setPendingIds((current) => new Set(current).add(item.id));
    setError("");
    try {
      const result = await acknowledgePrayer(item.id);
      setRequests((current) => current.map((request) => request.id === item.id
        ? { ...request, hasPrayed: true, prayerCount: request.prayerCount + (result.changed ? 1 : 0) }
        : request));
    } catch (err) {
      setError(err.message || "Could not record your prayer.");
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function changeStatus(item, nextStatus) {
    if (pendingIds.has(item.id)) return;
    setPendingIds((current) => new Set(current).add(item.id));
    setError("");
    setNotice("");
    try {
      await updatePrayerStatus(item.id, nextStatus);
      setNotice(nextStatus === "answered" ? "Prayer marked as answered." : "Prayer request archived.");
      await load();
    } catch (err) {
      setError(err.message || "Could not update this prayer request.");
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  const groupUnavailable = visibility === "group" && (!groupId || groupsLoading || groups.length === 0);

  return (
    <section className="screen active prayer-screen" aria-label="Prayer wall">
      <header className="prayer-heading">
        <p className="group-eyebrow">PRAYER COMMUNITY</p>
        <h1>Prayer wall</h1>
        <p className="lead">Share a request, encourage one another, and let your church know when it has been answered.</p>
      </header>

      <form className="prayer-compose" aria-label="Share a prayer request" onSubmit={submit}>
        <h2>Share a prayer request</h2>
        <label htmlFor="prayer-body">Your request</label>
        <textarea
          id="prayer-body"
          aria-label="Prayer request"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={3000}
          required
          placeholder="What would you like us to pray about?"
        />
        <label htmlFor="prayer-visibility">Who can see this request?</label>
        <select id="prayer-visibility" value={visibility} onChange={(event) => { setVisibility(event.target.value); setGroupId(""); }}>
          <option value="community">Church community</option>
          <option value="group">One of my groups</option>
          <option value="private">Only me</option>
        </select>
        {visibility === "group" && (
          <div className="prayer-group-choice">
            {groupsLoading ? <p role="status">Loading your active groups…</p> : groupsError ? <p className="prayer-inline-error" role="alert">{groupsError}</p> : groups.length === 0 ? <p className="prayer-help">You need to be an active member of a group to share a group request.</p> : (
              <>
                <label htmlFor="prayer-group">Group</label>
                <select id="prayer-group" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                  <option value="">Choose a group</option>
                  {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </>
            )}
          </div>
        )}
        <label className="prayer-anonymous">
          <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
          <span><b>Post anonymously</b><small>Your identity stays hidden from other members. You can still manage your request.</small></span>
        </label>
        <button className="btn gold block" type="submit" disabled={submitting || !body.trim() || groupUnavailable}>
          {submitting ? "Sharing…" : "Submit request"}
        </button>
      </form>

      {notice && <p className="prayer-notice" role="status">{notice}</p>}
      {error && <div className="prayer-error" role="alert"><span>{error}</span><button className="btn soft" onClick={() => void load()} type="button">Try again</button></div>}

      <div className="tabs prayer-tabs" role="tablist" aria-label="Prayer wall views">
        <button className="tab" role="tab" aria-selected={view === "requests"} onClick={() => { setView("requests"); void load(); }}>Requests</button>
        {view === "requests" && <>
          <button className="tab" role="tab" aria-selected={status === "open"} onClick={() => setStatus("open")}>Open</button>
          <button className="tab" role="tab" aria-selected={status === "answered"} onClick={() => setStatus("answered")}>Answered</button>
        </>}
        {moderationAllowed && <button className="tab" role="tab" aria-selected={view === "reports"} onClick={() => void loadReports()}>Moderation reports</button>}
      </div>

      {view === "requests" && loading && <p className="prayer-state" role="status">Loading prayer requests…</p>}
      {view === "requests" && !loading && !error && requests.length === 0 && <div className="empty">{status === "answered" ? "No answered requests to show." : "No prayer requests yet. Share the first one."}</div>}
      {view === "requests" && <div className="prayer-feed">
        {requests.map((item) => {
          const busy = pendingIds.has(item.id);
          return (
            <article className="card prayer-card" key={item.id}>
              <div className="prayer-card-heading">
                <div className="who">
                  <Avatar name={item.author || "Church member"} size={42} />
                  <div><b>{item.author || "Church member"}</b><span>{dateLabel(item.createdAt)} · {visibilityLabel(item.visibility)}</span><small>Expires {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(item.expiresAt))}</small></div>
                </div>
                {item.status === "answered" && <span className="prayer-answered">Answered</span>}
              </div>
              <p className="prayer-body">{item.body}</p>
              <div className="prayer-actions">
                <button className="btn soft" type="button" aria-pressed={item.hasPrayed} disabled={item.hasPrayed || busy} onClick={() => void acknowledge(item)}>
                  {item.hasPrayed ? "You prayed" : "I prayed for this"} · {item.prayerCount}
                </button>
                {item.isOwner && item.status === "open" && <button className="btn soft" type="button" disabled={busy} onClick={() => void changeStatus(item, "answered")}>Mark answered</button>}
                {item.isOwner && <button className="prayer-archive" type="button" disabled={busy} onClick={() => void changeStatus(item, "archived")}>Archive</button>}
                {!item.isOwner && item.visibility !== "private" && !reportedIds.has(item.id) && <button className="prayer-archive" type="button" disabled={busy} onClick={() => { setReportingId(reportingId === item.id ? "" : item.id); setReportReason("safety"); }}>Report request</button>}
              </div>
              {reportingId === item.id && <form className="prayer-report-form" aria-label="Report prayer request" onSubmit={(event) => { event.preventDefault(); void submitReport(item); }}>
                <label htmlFor={`report-reason-${item.id}`}>Reason for report</label>
                <select id={`report-reason-${item.id}`} value={reportReason} onChange={(event) => setReportReason(event.target.value)}><option value="safety">Safety concern</option><option value="spam">Spam</option><option value="inappropriate">Inappropriate content</option><option value="other">Other</option></select>
                <label htmlFor={`report-details-${item.id}`}>More detail (optional)</label>
                <textarea id={`report-details-${item.id}`} maxLength={1000} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} />
                <button className="btn soft" type="submit" disabled={busy}>Submit report</button>
              </form>}
              {reportedIds.has(item.id) && <p className="prayer-notice" role="status">Report submitted for review.</p>}
            </article>
          );
        })}
      </div>}
      {view === "requests" && !loading && cursor && <button className="btn soft prayer-more" disabled={loadingMore} onClick={() => void load(cursor)}>{loadingMore ? "Loading…" : "Load more prayers"}</button>}
      {view === "reports" && <section className="prayer-moderation" aria-label="Prayer moderation reports">
        <h2>Prayer reports</h2>
        {moderationUnavailable && <p role="alert">Could not verify moderation access.</p>}
        {reportsLoading && <p role="status">Loading prayer reports…</p>}
        {!reportsLoading && reports.length === 0 && <div className="empty">No pending reports in your moderation scope.</div>}
        {reports.map((report) => <article className="card prayer-card" key={report.id}>
          <p className="group-eyebrow">{report.requestVisibility === "group" ? "GROUP REQUEST" : "CHURCH COMMUNITY"} · {report.reason}</p>
          <p className="prayer-body">{report.requestBody}</p>
          {report.details && <p className="prayer-help">Report detail: {report.details}</p>}
          <label htmlFor={`moderation-reason-${report.id}`}>Moderation reason</label>
          <textarea id={`moderation-reason-${report.id}`} maxLength={500} value={moderationReason} onChange={(event) => setModerationReason(event.target.value)} />
          <div className="prayer-actions"><button className="btn soft" disabled={pendingIds.has(report.id) || moderationReason.trim().length < 3} onClick={() => void reviewReport(report, "hide")}>Hide request</button><button className="prayer-archive" disabled={pendingIds.has(report.id) || moderationReason.trim().length < 3} onClick={() => void reviewReport(report, "dismiss")}>Dismiss report</button></div>
        </article>)}
      </section>}
    </section>
  );
}
