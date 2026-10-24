import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/auth/session";
import { Icon } from "@/lib/icons";
import { unreadNotificationCount } from "@/notifications/api";

export function NotificationButton() {
  const { profile } = useSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [unavailable, setUnavailable] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile) {
      setCount(0);
      return;
    }
    try {
      setCount(await unreadNotificationCount());
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    }
  }, [profile]);

  useEffect(() => { void refresh(); }, [refresh, pathname]);
  useEffect(() => {
    window.addEventListener("notifications:refresh", refresh);
    return () => window.removeEventListener("notifications:refresh", refresh);
  }, [refresh]);

  return (
    <button className="notification-bell" aria-label={unavailable ? "Notifications unavailable" : `Notifications${count ? `, ${count} unread` : ""}`} onClick={() => navigate("/notifications")}>
      <Icon name="bell" />
      <span>Notifications</span>
      {count > 0 && <b className="notification-badge" aria-hidden="true">{count > 99 ? "99+" : count}</b>}
    </button>
  );
}
