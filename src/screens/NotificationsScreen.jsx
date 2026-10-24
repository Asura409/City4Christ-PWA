import React, { useCallback, useEffect, useState } from "react";
import { listNotifications, markNotificationRead } from "@/notifications/api";

function createdLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function NotificationsScreen() {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (next = "", signal) => {
    if (next) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const page = await listNotifications({ cursor: next, signal });
      setItems((current) => next ? [...current, ...page.items] : page.items);
      setCursor(page.nextCursor);
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
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
      window.dispatchEvent(new Event("notifications:refresh"));
    } catch (err) {
      setError(err.message || "Could not update this notification.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="screen active notifications-screen" aria-label="Notifications">
      <header className="notifications-heading">
        <p className="eyebrow">YOUR UPDATES</p>
        <h1>Notifications</h1>
        <p className="lead">Church updates for your account.</p>
      </header>
      {error && <p className="notification-error" role="alert">{error} <button className="link" onClick={() => void load()}>Try again</button></p>}
      {loading ? <p role="status">Loading notifications…</p> : items.length === 0 ? <p className="notification-empty">You’re all caught up.</p> : (
        <div className="notification-list" role="list">
          {items.map((item) => (
            <article className={`notification-card${item.readAt ? " is-read" : " is-unread"}`} role="listitem" key={item.id}>
              <div className="notification-card-copy">
                <h2>{item.title}</h2>
                {item.body && <p>{item.body}</p>}
                <time dateTime={item.createdAt}>{createdLabel(item.createdAt)}</time>
              </div>
              {!item.readAt && <button className="btn notification-read" disabled={busyId === item.id} onClick={() => void markRead(item)}>{busyId === item.id ? "Saving…" : "Mark read"}</button>}
            </article>
          ))}
        </div>
      )}
      {cursor && !loading && <button className="btn notification-more" disabled={loadingMore} onClick={() => void load(cursor)}>{loadingMore ? "Loading…" : "Load more"}</button>}
    </section>
  );
}
