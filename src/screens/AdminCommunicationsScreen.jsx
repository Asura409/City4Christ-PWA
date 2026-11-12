import React from "react";
import { BroadcastPanel } from "@/notifications/BroadcastPanel";
import "@/notifications/notifications.css";
import "@/notifications/inbox.css";

export default function AdminCommunicationsScreen() {
  return (
    <section className="screen active admin-communications" aria-label="Church communications">
      <p className="eyebrow">STAFF TOOLS</p>
      <h1>Communications</h1>
      <p className="lead">Draft, review and send church announcements.</p>
      <BroadcastPanel />
    </section>
  );
}
