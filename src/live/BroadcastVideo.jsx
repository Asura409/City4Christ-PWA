import React from "react";
import { youtubeEmbedUrl } from "../lib/sanitize";
import { youtubeWatchUrl } from "../media/youtube";
export function BroadcastVideo({ entry }) {
  const watch = youtubeWatchUrl(entry.videoUrl);
  return watch ? <div className="broadcast-video"><iframe key={`${entry.id || "preview"}:${watch}`} title={`${entry.title || "Broadcast"} video`} src={`${youtubeEmbedUrl(watch)}?playsinline=1`} referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div> : <p role="alert">This video link is unavailable.</p>;
}
export function BroadcastStatus({ entry }) {
  const labels = { upcoming: "Upcoming", live: "Live now", replay: "Replay" };
  return <span className={`broadcast-status ${entry.broadcastStatus === "live" ? "is-live" : ""}`}>{entry.broadcastStatus === "live" && "● "}{labels[entry.broadcastStatus] || "Broadcast"}</span>;
}
export function BroadcastDate({ value }) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return <time dateTime={value}>{new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "long", timeStyle: "short" }).format(new Date(value))} (UK)</time>;
}
