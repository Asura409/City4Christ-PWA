import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { UK_TIME_ZONE } from "../../js/time.js";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  unreadNotificationCount,
} from "@/notifications/api";
import "@/notifications/inbox.css";

const FILTERS = [
  { id: "all", label: "All notifications" },
  { id: "unread", label: "Unread" },
  { id: "events", label: "Events" },
  { id: "groups", label: "Groups" },
  { id: "pastoral", label: "Pastoral care" },
  { id: "messages", label: "Messages" },
  { id: "announcements", label: "Announcements" },
];

const CATEGORY_ICONS = { events: "▣", groups: "♧", pastoral: "♡", messages: "◌", announcements: "✦", other: "•" };

function categoryFor(item) {
  const kind = String(item.kind || "").toLowerCase();
  if (kind.startsWith("event")) return "events";
  if (kind.startsWith("group")) return "groups";
  if (kind.startsWith("pastoral")) return "pastoral";
  if (kind.startsWith("message") || kind.startsWith("dm")) return "messages";
  if (kind.includes("broadcast") || kind.includes("announcement")) return "announcements";
  return "other";
}

function notificationRoute(value) {
  if (typeof value !== "string" || !value.startsWith("/#/")) return "";
  const route = value.slice(2);
  return /^\/[A-Za-z0-9/_-]+$/.test(route) ? route : "";
}

const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: UK_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function groupLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const key = dayKey.format(date);
  if (key === dayKey.format(new Date())) return "Today";
  if (key === dayKey.format(new Date(Date.now() - 86400000))) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    dateStyle: "medium",
  }).format(date);
}

function timeLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
  if (diff < 172800000) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    dateStyle: "medium",
  }).format(date);
}

function filterMatches(item, filter) {
  if (filter === "all") return true;
  if (filter === "unread") return !item.readAt;
  return categoryFor(item) === filter;
}

export default function NotificationsScreen() {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  const load = useCallback(async (next = "", signal) => {
    if (next) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const [page, count] = await Promise.all([
        listNotifications({ cursor: next, signal }),
        next ? Promise.resolve(null) : unreadNotificationCount().catch(() => 0),
      ]);
      setItems((current) => (next ? [...current, ...page.items] : page.items));
      setCursor(page.nextCursor);
      if (!next && count !== null) setUnreadCount(count);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || "Could not load notifications.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load("", controller.signal);
    return () => controller.abort();
  }, [load]);

  async function markRead(item) {
    if (item.readAt || busyId) return;
    setBusyId(item.id);
    setError("");
    try {
      await markNotificationRead(item.id);
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      window.dispatchEvent(new Event("notifications:refresh"));
    } catch (err) {
      setError(err.message || "Could not update this notification.");
    } finally {
      setBusyId("");
    }
  }

  async function markAllRead() {
    if (busyId) return;
    setBusyId("all");
    setError("");
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt })));
      setUnreadCount(0);
      window.dispatchEvent(new Event("notifications:refresh"));
    } catch (err) {
      setError(err.message || "Could not mark notifications as read.");
    } finally {
      setBusyId("");
    }
  }

  const counts = useMemo(() => {
    const unread = items.filter((item) => !item.readAt).length;
    return {
      all: items.length,
      unread,
      events: items.filter((item) => categoryFor(item) === "events").length,
      groups: items.filter((item) => categoryFor(item) === "groups").length,
      pastoral: items.filter((item) => categoryFor(item) === "pastoral").length,
      messages: items.filter((item) => categoryFor(item) === "messages").length,
      announcements: items.filter((item) => categoryFor(item) === "announcements").length,
    };
  }, [items]);

  const visible = useMemo(() => items.filter((item) => filterMatches(item, filter)), [items, filter]);
  const groups = useMemo(() => {
    const grouped = [];
    for (const item of visible) {
      const label = groupLabel(item.createdAt);
      let group = grouped.find((entry) => entry.label === label);
      if (!group) {
        group = { label, items: [] };
        grouped.push(group);
      }
      group.items.push(item);
    }
    return grouped;
  }, [visible]);

  const activeFilter = FILTERS.find((entry) => entry.id === filter) || FILTERS[0];

  return (
    <section className="screen active notif-screen" aria-label="Notifications">
      <div className="notif-layout">
        <aside className="notif-rail" aria-label="Notification filters">
          <h2>Inbox</h2>
          <p>Church updates for your account.</p>
          <nav className="notif-rail-filters">
            {FILTERS.map((entry) => (
              <button
                type="button"
                key={entry.id}
                className={`notif-filter${filter === entry.id ? " is-active" : ""}`}
                onClick={() => setFilter(entry.id)}
              >
                <span>{entry.label}</span>
                {counts[entry.id] > 0 && <span className="notif-filter-count">{counts[entry.id]}</span>}
              </button>
            ))}
          </nav>
          <div className="notif-rail-divider" />
          <Link className="notif-rail-settings" to="/notifications/settings">⚙ Notification settings</Link>
        </aside>

        <main className="notif-main">
          <header className="notif-head">
            <div>
              <p className="notif-eyebrow">YOUR UPDATES</p>
              <h1>Notifications</h1>
              <p className="notif-summary">
                <b>{unreadCount} unread</b>
                <span>·</span>
                <span>{items.length} notifications</span>
              </p>
            </div>
            <div className="notif-head-actions">
              <Link className="notif-gear" to="/notifications/settings" aria-label="Notification settings" title="Notification settings">⚙</Link>
              <button className="notif-mark-all" type="button" disabled={loading || Boolean(busyId)} onClick={() => void markAllRead()}>
                {busyId === "all" ? "Saving…" : "Mark all read"}
              </button>
            </div>
          </header>

          <div className="notif-mobile-filters" aria-label="Notification filters">
            <div className="notif-chips">
              {FILTERS.map((entry) => (
                <button
                  type="button"
                  key={entry.id}
                  className={`notif-chip${filter === entry.id ? " is-active" : ""}`}
                  onClick={() => setFilter(entry.id)}
                >
                  {entry.id === "all" ? "All" : entry.label}
                  {counts[entry.id] > 0 && <span>{counts[entry.id]}</span>}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="notif-error" role="alert">
              {error}{" "}
              <button type="button" className="link" onClick={() => void load()}>Try again</button>
            </p>
          )}

          {loading ? (
            <div className="notif-loading" role="status">Loading notifications…</div>
          ) : items.length === 0 ? (
            <div className="notif-empty">
              <span className="notif-empty-icon">♧</span>
              <h2>You’re all caught up.</h2>
              <p>New group updates, event changes and pastoral notes will appear here.</p>
              <Link to="/notifications/settings">Notification settings →</Link>
            </div>
          ) : visible.length === 0 ? (
            <div className="notif-empty">
              <span className="notif-empty-icon">♧</span>
              <h2>No {activeFilter.label.toLowerCase()}.</h2>
              <p>There’s nothing in this filter right now.</p>
              <button type="button" className="notif-empty-link" onClick={() => setFilter("all")}>Show all notifications</button>
            </div>
          ) : (
            <div className="notif-panel">
              {groups.map((group) => (
                <section className="notif-group" key={group.label}>
                  <h2 className="notif-section">{group.label}</h2>
                  {group.items.map((item) => {
                    const route = notificationRoute(item.resourcePath);
                    const category = categoryFor(item);
                    const unread = !item.readAt;
                    const content = (
                      <>
                        <span className={`notif-icon ${category}`} aria-hidden="true">{CATEGORY_ICONS[category] || CATEGORY_ICONS.other}</span>
                        <div className="notif-copy">
                          <strong>{item.title}</strong>
                          {item.body && <p>{item.body}</p>}
                          <span className="notif-meta">
                            <time dateTime={item.createdAt}>{timeLabel(item.createdAt)}</time>
                            {route && <span>View →</span>}
                          </span>
                        </div>
                      </>
                    );
                    return (
                      <article className={`notif-row${unread ? " is-unread" : ""}`} key={item.id}>
                        {route ? (
                          <a className="notif-row-link" href={`/#${route}`} onClick={() => { if (unread) void markRead(item); }}>{content}</a>
                        ) : (
                          <div className="notif-row-link">{content}</div>
                        )}
                        {unread ? (
                          <button
                            type="button"
                            className="notif-check"
                            aria-label={`Mark ${item.title} as read`}
                            disabled={busyId === item.id}
                            onClick={() => void markRead(item)}
                          >
                            {busyId === item.id ? "…" : "✓"}
                          </button>
                        ) : (
                          <span className="notif-readmark" aria-hidden="true">✓</span>
                        )}
                      </article>
                    );
                  })}
                </section>
              ))}
            </div>
          )}

          {cursor && !loading && (
            <button className="notif-more" type="button" disabled={loadingMore} onClick={() => void load(cursor)}>
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </main>
      </div>
    </section>
  );
}
