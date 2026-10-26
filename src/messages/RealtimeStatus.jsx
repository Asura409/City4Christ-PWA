import React from "react";

const labels = {
  connecting: "Connecting to live updates…",
  connected: "Live",
  reconnecting: "Reconnecting…",
  auth_required: "Live updates paused. Sign in again.",
  unavailable: "Live updates unavailable",
};

export default function RealtimeStatus({ status }) {
  const label = labels[status];
  if (!label) return null;
  return <span className={`realtime-status realtime-status-${status}`} role="status">{label}</span>;
}
