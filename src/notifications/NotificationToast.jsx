import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/auth/session";
import { listNotifications, markNotificationRead, unreadNotificationCount } from "./api";
import { notificationRoute } from "./routes";
import { Icon } from "@/lib/icons";

const TOAST_DURATION = 7000;
const POLL_INTERVAL = 20000;
const LOGIN_LIMIT = 50;
const SUMMARY_ID = "__unread-summary__";

export function NotificationToast() {
  const { profile } = useSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pathnameRef = useRef(pathname);
  const seen = useRef(new Set());
  const [queue, setQueue] = useState([]);
  const notice = queue[0] || null;

  useEffect(() => {
    pathnameRef.current = pathname;
    if (pathname === "/notifications") setQueue([]);
  }, [pathname]);

  useEffect(() => {
    seen.current = new Set();
    setQueue([]);
    if (!profile) return undefined;

    let active = true;
    const controller = new AbortController();

    async function check(initial = false) {
      try {
        const { items } = await listNotifications({
          limit: initial ? LOGIN_LIMIT : 10,
          signal: controller.signal,
        });
        const total = initial ? await unreadNotificationCount().catch(() => 0) : 0;
        if (!active) return;

        const fresh = items.filter((item) => !seen.current.has(item.id));
        items.forEach((item) => seen.current.add(item.id));
        const unread = fresh.filter((item) => !item.readAt);

        if (pathnameRef.current !== "/notifications" && unread.length) {
          setQueue((current) => [
            ...current,
            ...unread.filter((item) => !current.some((entry) => entry.id === item.id)),
          ]);
        }

        const remaining = initial ? Number(total) - items.filter((item) => !item.readAt).length : 0;
        if (pathnameRef.current !== "/notifications" && remaining > 0) {
          setQueue((current) => current.some((item) => item.id === SUMMARY_ID)
            ? current
            : [...current, {
                id: SUMMARY_ID,
                summary: true,
                title: `${remaining} more unread notification${remaining === 1 ? "" : "s"}`,
                body: "Open your inbox to review them.",
                resourcePath: "/#/notifications",
              }]);
        }
      } catch {
        // The inbox remains the source of truth when this background check fails.
      }
    }

    void check(true);
    const timer = setInterval(() => void check(false), POLL_INTERVAL);
    return () => {
      active = false;
      clearInterval(timer);
      controller.abort();
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setQueue((current) => current.slice(1)), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [notice?.id]);

  if (!notice || pathname === "/notifications") return null;

  function dismiss() {
    setQueue((current) => current.slice(1));
  }

  function open() {
    const route = notice.summary ? "/notifications" : notificationRoute(notice.resourcePath) || "/notifications";
    if (!notice.summary) {
      void markNotificationRead(notice.id)
        .then(() => window.dispatchEvent(new Event("notifications:refresh")))
        .catch(() => {});
    }
    setQueue((current) => current.slice(1));
    navigate(route);
  }

  return (
    <aside className="notification-toast" role="status" aria-live="polite">
      <span className="notification-toast-icon"><Icon name="bell" /></span>
      <button className="notification-toast-content" type="button" onClick={open}>
        <strong>{notice.title || "New notification"}</strong>
        {notice.body && <span>{notice.body}</span>}
        <small>{notice.summary ? "Open your inbox" : queue.length > 1 ? `${queue.length} unread notifications` : "Tap to view"}</small>
      </button>
      <button className="notification-toast-close" type="button" aria-label="Dismiss notification" onClick={dismiss}><Icon name="close" /></button>
    </aside>
  );
}
