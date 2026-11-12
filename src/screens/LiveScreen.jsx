import { RefreshButton } from "@/components/RefreshButton";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContentList, ContentListState } from "../content/useContentList";
import { publicRoot, readBroadcast } from "../live/api";
import { BroadcastVideo, BroadcastStatus, BroadcastDate } from "../live/BroadcastVideo";
import { useBroadcastAccess } from "../live/useBroadcastAccess";
import { youtubeWatchUrl } from "../media/youtube";
import "../live/live.css";
export default function LiveScreen() {
  const navigate = useNavigate(), access = useBroadcastAccess();
  const [revision, setRevision] = useState(0), [tab, setTab] = useState("latest"), [selectedId, setSelectedId] = useState(""), [detail, setDetail] = useState(null), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const state = useContentList(publicRoot, revision, true);
  const latest = state.items[0], selected = selectedId ? detail : latest;
  useEffect(() => {
    setDetail(null); setError("");
    if (!selectedId) { setLoading(false); return; }
    const controller = new AbortController(); let active = true;
    setLoading(true);
    readBroadcast(selectedId, controller.signal).then((value) => { if (active) setDetail(value); }).catch((e) => { if (active && e.name !== "AbortError") setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [selectedId, revision]);
  function refresh() { setSelectedId(""); setDetail(null); setRevision((value) => value + 1); }
  function open(id) { setDetail(null); setSelectedId(id); setTab("latest"); }
  function archiveRow(entry) {
    return <button className="broadcast-archive-item" key={entry.id} onClick={() => open(entry.id)}><span className="broadcast-thumb" aria-hidden="true">▶</span><span><small><BroadcastDate value={entry.serviceAt} /></small><strong>{entry.title}</strong><BroadcastStatus entry={entry} /></span><span aria-hidden="true">→</span></button>;
  }
  return <section className="screen active broadcasts-screen" aria-label="Live and replays">
    <header className="broadcast-heading"><div><p className="broadcast-eyebrow">WORSHIP ONLINE</p><h1>Live & replays</h1><p>Worship with us, wherever you are.</p></div><div className="broadcast-actions"><RefreshButton className="btn soft" busy={state.busy} onClick={refresh} label="Refresh" />{access.allowed && <button className="btn soft" onClick={() => navigate("/admin/live")}>Manage broadcasts</button>}</div></header>
    <div className="broadcast-tabs" aria-label="Broadcast views"><button aria-pressed={tab === "latest"} onClick={() => { setTab("latest"); setSelectedId(""); setDetail(null); }}>Latest broadcast</button><button aria-pressed={tab === "archive"} onClick={() => { setTab("archive"); setSelectedId(""); setDetail(null); }}>Past broadcasts</button></div>
    {state.error && <p className="broadcast-error" role="alert">{state.error} <button className="btn soft" onClick={refresh}>Retry</button></p>}
    {state.busy && !state.items.length && <p role="status">Loading broadcasts…</p>}
    {!state.busy && !state.error && !latest && <div className="broadcast-panel broadcast-empty"><h2>No broadcasts yet</h2><p>Our next service will appear here when the church team publishes it.</p></div>}
    {latest && tab === "latest" && <div className="broadcast-layout"><article>
      {selectedId && <button className="btn soft broadcast-back" onClick={() => { setSelectedId(""); setDetail(null); }}>← Back to latest</button>}
      {loading && <p role="status">Loading broadcast…</p>}{error && <p role="alert" className="broadcast-error">{error}</p>}
      {selected && <><BroadcastVideo entry={selected} /><div className="broadcast-details"><div className="broadcast-heading"><p className="broadcast-eyebrow">{selectedId && selectedId !== latest.id ? "PAST BROADCAST" : "LATEST BROADCAST"}</p><BroadcastStatus entry={selected} /></div><h2>{selected.title}</h2><p className="broadcast-muted"><BroadcastDate value={selected.serviceAt} /></p><p className="broadcast-description">{selected.description}</p>{selected.broadcastStatus === "upcoming" && <p className="broadcast-muted">This service is upcoming. The player will show YouTube’s waiting screen until the broadcast starts.</p>}{selected.broadcastStatus === "live" && <p className="broadcast-muted">Live status is set by the church team.</p>}{youtubeWatchUrl(selected.videoUrl) && <a className="btn soft" href={youtubeWatchUrl(selected.videoUrl)} target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a>}<p className="broadcast-muted">If playback is unavailable, try opening the video on YouTube.</p></div></>}
    </article><aside className="broadcast-panel"><div className="broadcast-heading"><h2>Past broadcasts</h2><button className="broadcast-text-button" onClick={() => { setTab("archive"); setSelectedId(""); }}>View all →</button></div><p className="broadcast-muted">Catch up on worship and teaching.</p><div className="broadcast-list">{state.items.slice(1, 5).map(archiveRow)}</div>{state.items.length === 1 && <p className="broadcast-muted">Earlier broadcasts will appear here.</p>}</aside></div>}
    {latest && tab === "archive" && <><h2>Worship, whenever you need it.</h2><p className="broadcast-muted">Previous broadcasts from City4Christ.</p><div className="broadcast-archive-grid">{state.items.slice(1).map(archiveRow)}</div>{state.items.length === 1 && !state.more && <p>No earlier broadcasts yet.</p>}<ContentListState state={{ ...state, error: "" }} label="Loading more broadcasts…" /></>}
  </section>;
}
