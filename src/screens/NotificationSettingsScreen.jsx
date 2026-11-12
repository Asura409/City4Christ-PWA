import React from "react";
import { Link } from "react-router-dom";
import { NotificationSettings } from "@/notifications/NotificationSettings";
import "@/notifications/inbox.css";

export default function NotificationSettingsScreen() {
  return (
    <section className="screen active notifications-settings-screen" aria-label="Notification settings">
      <Link className="notif-back" to="/notifications">← Notifications</Link>
      <NotificationSettings />
    </section>
  );
}
