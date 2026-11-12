import React, { useCallback, useEffect, useMemo, useState } from "react";
import { UK_TIME_ZONE } from "../../js/time.js";
import { TimedMessage } from "@/components/TimedMessage";
import { useSession } from "@/auth/session";
import { Avatar } from "@/components/Avatar";
import { listGroups } from "@/groups/api";
import {
  acknowledgePrayer,
  createPrayerEncouragement,
  createPrayerRequest,
  listPrayerEncouragements,
  listPrayerRequests,
  reportPrayerRequest,
  updatePrayerStatus,
} from "@/prayer/api";
import { PrayerComposer } from "@/prayer/PrayerComposer";
import { PrayerSheet } from "@/prayer/PrayerSheet";
import "@/prayer/prayer.css";

function dateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-GB", { timeZone: UK_TIME_ZONE, dateStyle: "medium", timeStyle: "short" }).format(date);
}

function visibilityLabel(visibility) {
  if (visibility === "group") return "Group members";
  if (visibility === "private") return "Only you";
  return "Church community";
}

function expiryLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { timeZone: UK_TIME_ZONE, dateStyle: "medium" }).format(date);
}

const AUDIENCES = [
  ["all", "All"],
  ["church", "Church"],
  ["groups", "My groups"],
  ["mine", "Mine"],
];

export default function PrayerScreen() {
  const { profile } = useSession();
  const [status, setStatus] = useState("open");
  const [audience, setAudience] = useState("all");
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
  const [composeOpen, setComposeOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [encouraging, setEncouraging] = useState(null);
  const [encouragements, setEncouragements] = useState({});
  const [encouragementDraft, setEncouragementDraft] = useState("");
  const [encouragementLoading, setEncouragementLoading] = useState(false);
  const [encouragementBusy, setEncouragementBusy] = useState(false);
  const [encouragementError, setEncouragementError] = useState("");
  const [reporting, setReporting] = useState(null);
  const [reportReason, setReportReason] = useState("safety");
  const [reportDetails, setReportDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportedIds, setReportedIds] = useState(() => new Set());

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
    setAudience("all");
    const controller = new AbortController();
    void load("", controller.signal);
    return () => controller.abort();
  }, [load]);

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

  const visible = useMemo(() => requests.filter((item) => {
    if (audience === "church") return item.visibility === "community";
    if (audience === "groups") return item.visibility === "group";
    if (audience === "mine") return item.isOwner;
    return true;
  }), [requests, audience]);

  const accountName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "You";
  const accountAvatar = profile?.avatar?.url || "";

  async function submit(event) {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody || submitting) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const input = { body: cleanBody, visibility, anonymous };
      if (visibility === "group") input.groupId = groupId;
      await createPrayerRequest(input);
      setBody("");
      setAnonymous(false);
      setGroupId("");
      setComposeOpen(false);
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

  async function openEncouragements(item) {
    setEncouraging(item);
    setEncouragementDraft("");
    setEncouragementError("");
    if (Object.hasOwn(encouragements, item.id)) return;
    setEncouragementLoading(true);
    try {
      const notes = await listPrayerEncouragements(item.id);
      setEncouragements((current) => ({ ...current, [item.id]: notes }));
    } catch (err) {
      setEncouragementError(err.message || "Could not load encouragements.");
    } finally {
      setEncouragementLoading(false);
    }
  }

  async function submitEncouragement(event) {
    event.preventDefault();
    const draft = encouragementDraft.trim();
    if (!draft || !encouraging || encouragementBusy) return;
    setEncouragementBusy(true);
    setEncouragementError("");
    try {
      const created = await createPrayerEncouragement(encouraging.id, draft);
      setEncouragements((current) => ({ ...current, [encouraging.id]: [...(current[encouraging.id] || []), created] }));
      setEncouragementDraft("");
      setNotice("Your encouragement was shared.");
    } catch (err) {
      setEncouragementError(err.message || "Could not share this encouragement.");
    } finally {
      setEncouragementBusy(false);
    }
  }

  function openReport(item) {
    setReporting(item);
    setReportReason("safety");
    setReportDetails("");
    setReportError("");
  }

  async function submitReport(event) {
    event.preventDefault();
    if (!reporting || reportBusy) return;
    setReportBusy(true);
    setReportError("");
    setError("");
    try {
      await reportPrayerRequest(reporting.id, { reason: reportReason, ...(reportDetails.trim() ? { details: reportDetails.trim() } : {}) });
      setReportedIds((current) => new Set(current).add(reporting.id));
      setReporting(null);
      setNotice("Report submitted for review.");
    } catch (err) {
      setReportError(err.message || "Could not send this report.");
    } finally {
      setReportBusy(false);
    }
  }

  function closeMenu(event) {
    event.currentTarget.closest("details")?.removeAttribute("open");
  }

  const notesForSelected = encouraging ? encouragements[encouraging.id] : null;

  return (
    <section className="screen active prayer-v2-screen" aria-label="Prayer wall">
      <div className="prayer-v2-layout">
        <main className="prayer-v2-main">
          <header className="prayer-v2-head">
            <div>
              <p className="prayer-v2-eyebrow">PRAYER COMMUNITY</p>
              <h1>Prayer wall</h1>
              <p>Come together in prayer. Share a request or quietly pray for someone.</p>
            </div>
          </header>

          <button className="prayer-v2-share-mobile" type="button" onClick={() => setComposeOpen(true)}>
            <span aria-hidden="true">＋</span> Share a prayer
          </button>

          <div className="prayer-v2-tabs" role="tablist" aria-label="Prayer wall views">
            <button className="prayer-v2-tab" role="tab" aria-selected={status === "open"} onClick={() => setStatus("open")}>Open</button>
            <button className="prayer-v2-tab" role="tab" aria-selected={status === "answered"} onClick={() => setStatus("answered")}>Answered</button>
          </div>

          <div className="prayer-v2-chips" aria-label="Prayer audiences">
            {AUDIENCES.map(([id, label]) => (
              <button type="button" key={id} className={`prayer-v2-chip${audience === id ? " is-active" : ""}`} onClick={() => setAudience(id)}>
                {label}
              </button>
            ))}
          </div>

          <TimedMessage message={notice} />
          {error && <TimedMessage tone="error" message={error} />}

          {loading ? (
            <p className="prayer-v2-state" role="status">Loading prayer requests…</p>
          ) : requests.length === 0 ? (
            <div className="prayer-v2-empty">
              <span className="prayer-v2-empty-icon" aria-hidden="true">♡</span>
              <h2>{status === "answered" ? "No answered prayers yet." : "No prayers yet."}</h2>
              <p>{status === "answered" ? "Prayers marked answered will gather here." : "Be the first to share a request with the church."}</p>
              {status === "open" && <button type="button" className="btn gold" onClick={() => setComposeOpen(true)}>Share a prayer</button>}
            </div>
          ) : visible.length === 0 ? (
            <div className="prayer-v2-empty">
              <span className="prayer-v2-empty-icon" aria-hidden="true">♡</span>
              <h2>No prayers in this filter.</h2>
              <p>Try another audience or show all requests.</p>
              <button type="button" className="btn soft" onClick={() => setAudience("all")}>Show all</button>
            </div>
          ) : (
            <div className="prayer-v2-feed">
              {visible.map((item) => {
                const busy = pendingIds.has(item.id);
                const noteCount = encouragements[item.id]?.length;
                const hasMenu = item.isOwner || (item.visibility !== "private" && !reportedIds.has(item.id));
                return (
                  <article className="prayer-v2-card" key={item.id}>
                    <div className="prayer-v2-card-head">
                      <Avatar name={item.author || "Church member"} src={item.isOwner ? accountAvatar : item.authorAvatar?.url} size={38} />
                      <div className="prayer-v2-who">
                        <strong>{item.author || "Church member"}</strong>
                        <span>{dateLabel(item.createdAt)} · {visibilityLabel(item.visibility)}</span>
                      </div>
                      {item.status === "answered" && <span className="prayer-v2-answered">Answered</span>}
                    </div>
                    <p className="prayer-v2-body">{item.body}</p>
                    <div className="prayer-v2-actions">
                      <button
                        className={`prayer-v2-pray${item.hasPrayed ? " is-done" : ""}`}
                        type="button"
                        aria-pressed={item.hasPrayed}
                        disabled={item.hasPrayed || busy}
                        onClick={() => void acknowledge(item)}
                      >
                        {item.hasPrayed ? "You prayed" : "I prayed"} · {item.prayerCount}
                      </button>
                      <button className="prayer-v2-soft" type="button" onClick={() => void openEncouragements(item)}>
                        Encourage{noteCount ? ` · ${noteCount}` : ""}
                      </button>
                      {hasMenu && (
                        <details className="prayer-v2-more">
                          <summary aria-label="More actions">⋯</summary>
                          <div className="prayer-v2-menu">
                            {item.isOwner && item.status === "open" && (
                              <button type="button" disabled={busy} onClick={(event) => { closeMenu(event); void changeStatus(item, "answered"); }}>Mark answered</button>
                            )}
                            {item.isOwner && (
                              <button type="button" disabled={busy} onClick={(event) => { closeMenu(event); void changeStatus(item, "archived"); }}>Archive</button>
                            )}
                            {!item.isOwner && item.visibility !== "private" && !reportedIds.has(item.id) && (
                              <button type="button" disabled={busy} onClick={(event) => { closeMenu(event); openReport(item); }}>Report request</button>
                            )}
                            <small>Expires {expiryLabel(item.expiresAt)}</small>
                          </div>
                        </details>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && cursor && <button className="btn soft prayer-v2-load-more" disabled={loadingMore} onClick={() => void load(cursor)}>{loadingMore ? "Loading…" : "Load more prayers"}</button>}
        </main>

        <aside className="prayer-v2-rail" aria-label="Share a prayer">
          <section className="prayer-v2-rail-card">
            <p className="prayer-v2-eyebrow">SHARE A REQUEST</p>
            <h2>Share a prayer</h2>
            <p className="prayer-v2-rail-copy">You can post to the church, one of your groups, or only yourself.</p>
            <PrayerComposer
              idPrefix="rail"
              compact
              body={body} setBody={setBody}
              visibility={visibility} setVisibility={setVisibility}
              groupId={groupId} setGroupId={setGroupId}
              groups={groups} groupsLoading={groupsLoading} groupsError={groupsError}
              anonymous={anonymous} setAnonymous={setAnonymous}
              submitting={submitting}
              onSubmit={submit}
            />
          </section>
          <section className="prayer-v2-guide">
            <h3>A gentle guide</h3>
            <p>Keep requests specific and kind. Avoid sharing another person’s private details without permission.</p>
          </section>
        </aside>
      </div>

      <PrayerSheet open={composeOpen} title="Share a prayer" onClose={() => setComposeOpen(false)}>
        <PrayerComposer
          idPrefix="sheet"
          body={body} setBody={setBody}
          visibility={visibility} setVisibility={setVisibility}
          groupId={groupId} setGroupId={setGroupId}
          groups={groups} groupsLoading={groupsLoading} groupsError={groupsError}
          anonymous={anonymous} setAnonymous={setAnonymous}
          submitting={submitting}
          onSubmit={submit}
        />
      </PrayerSheet>

      <PrayerSheet open={Boolean(encouraging)} title="Encouragements" onClose={() => setEncouraging(null)}>
        {encouraging && (
          <>
            <p className="prayer-v2-sheet-label">For {encouraging.isOwner ? "your request" : `${encouraging.author || "this request"}`}</p>
            <p className="prayer-v2-quoted">{encouraging.body}</p>
            {encouragementLoading ? (
              <p role="status">Loading encouragements…</p>
            ) : encouragementError ? (
              <p role="alert">{encouragementError}</p>
            ) : notesForSelected?.length ? (
              <div className="prayer-v2-notes">
                {notesForSelected.map((note) => (
                  <div className="prayer-v2-note" key={note.id}>
                    <span className="prayer-v2-note-avatar" aria-hidden="true">{note.author?.[0] || "C"}</span>
                    <div><strong>{note.author || "Church member"}</strong><p>{note.body}</p><small>{dateLabel(note.createdAt)}</small></div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="prayer-v2-help">Be the first to share a kind word.</p>
            )}
            <form className="prayer-v2-note-form" aria-label="Share encouragement" onSubmit={submitEncouragement}>
              <label htmlFor="prayer-encouragement">Your encouragement</label>
              <textarea id="prayer-encouragement" maxLength={1000} value={encouragementDraft} onChange={(event) => setEncouragementDraft(event.target.value)} />
              <button className="btn soft" type="submit" disabled={encouragementBusy || !encouragementDraft.trim()}>Share encouragement</button>
            </form>
          </>
        )}
      </PrayerSheet>

      <PrayerSheet open={Boolean(reporting)} title="Report prayer request" onClose={() => setReporting(null)}>
        {reporting && (
          <form className="prayer-v2-report-form" aria-label="Report prayer request" onSubmit={submitReport}>
            <p className="prayer-v2-quoted">{reporting.body}</p>
            <label htmlFor="prayer-report-reason">Reason for report</label>
            <select id="prayer-report-reason" value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
              <option value="safety">Safety concern</option>
              <option value="spam">Spam</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="other">Other</option>
            </select>
            <label htmlFor="prayer-report-details">More detail (optional)</label>
            <textarea id="prayer-report-details" maxLength={1000} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} />
            {reportError && <p role="alert">{reportError}</p>}
            <button className="btn soft" type="submit" disabled={reportBusy}>Submit report</button>
          </form>
        )}
      </PrayerSheet>
    </section>
  );
}
