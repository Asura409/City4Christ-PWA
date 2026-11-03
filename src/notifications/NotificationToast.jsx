import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/auth/session";
import { listNotifications } from "./api";
import { Icon } from "@/lib/icons";

export function NotificationToast() {
  const { profile } = useSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const seenId = useRef("");
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!profile) {
      seenId.current = "";
      setNotice(null);
      return undefined;
    }
    let active = true;
    let firstCheck = true;
    const check = async () => {
      try {
        const { items } = await listNotifications({ limit: 1 });
        if (!active || !items[0]) return;
        const latest = items[0];
        if (firstCheck || !seenId.current) {
          seenId.current = latest.id;
          firstCheck = false;
          return;
        }
        if (latest.id !== seenId.current) {
          seenId.current = latest.id;
          if (!latest.readAt && pathname !== "/notifications") setNotice(latest);
        }
      } catch {
        // The inbox remains the source of truth when the background check fails.
      }
    };
    void check();
    const timer = setInterval(check, 20000);
    return () => { active = false; clearInterval(timer); };
  }, [profile?.id, pathname]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;
  return (
    <aside className="notification-toast" role="status" aria-live="polite">
      <span className="notification-toast-icon"><Icon name="bell" /></span>
      <button className="notification-toast-content" type="button" onClick={() => { setNotice(null); navigate("/notifications"); }}>
        <strong>{notice.title}</strong>
        {notice.body && <span>{notice.body}</span>}
        <small>Tap to view notifications</small>
      </button>
      <button className="notification-toast-close" type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}><Icon name="close" /></button>
    </aside>
  );
}
