import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContentList, ContentListState } from "../content/useContentList";
import { adminRoot, publicRoot, getBroadcast } from "./api";
import { BroadcastDate, BroadcastStatus, BroadcastVideo } from "./BroadcastVideo";
import { BroadcastForm } from "./BroadcastForm";
import { useBroadcastAccess } from "./useBroadcastAccess";
import "./live.css";
export default function BroadcastManager() {
  const access = useBroadcastAccess();
  return access.busy ? <p role="status">Checking broadcast access…</p> : !access.allowed ? <section className="broadcasts-screen"><h1>Broadcast administration</h1><p role="alert">{access.error || "Content editor access is required."}</p></section> : <Manager />;
}
function Manager() {
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0), [entry, setEntry] = useState(null), [selection, setSelection] = useState(0), [busy, setBusy] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState(""), [denied, setDenied] = useState(false), [dirty, setDirty] = useState(false);
  const generation = useRef(0), state = useContentList(adminRoot, revision), published = useContentList(publicRoot, revision, true);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => { function beforeUnload(e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } } window.addEventListener("beforeunload", beforeUnload); return () => window.removeEventListener("beforeunload", beforeUnload); }, [dirty]);
  async function open(id) {
    if (saving || (dirty && !window.confirm("Discard your unsaved broadcast changes?"))) return;
    const current = ++generation.current; setBusy(true); setError(""); setEntry(null);
    try { const result = id ? await getBroadcast(id) : null; if (current === generation.current) { setEntry(result); setSelection(current); setDirty(false); } }
    catch (e) { if (current === generation.current) { setError(e.message); if (e.status === 401 || e.status === 403) setDenied(true); } }
    finally { if (current === generation.current) setBusy(false); }
  }
  if (denied) return <section className="broadcasts-screen"><p className="broadcast-error" role="alert">{state.error || "Broadcast access is no longer available."}</p><button className="btn soft" onClick={() => { setDenied(false); setDirty(false); setSelection(++generation.current); setRevision((v) => v + 1); }}>Retry access</button></section>;
  return <section className="broadcasts-screen broadcast-manager" aria-label="Manage broadcasts"><header className="broadcast-heading"><div><p className="broadcast-eyebrow">ADMINISTRATION / LIVE</p><h1>Manage broadcasts</h1><p>Bring your church together, online.</p></div><div className="broadcast-actions"><button className="btn soft" disabled={saving} onClick={() => { if (!dirty || window.confirm("Discard unsaved changes?")) navigate("/live"); }}>View Live ↗</button><button className="btn gold" disabled={saving} onClick={() => open("")}>+ Add broadcast</button></div></header><div className="broadcast-admin-layout"><aside className="broadcast-panel">{published.items[0] && <section className="broadcast-featured-admin"><p className="broadcast-eyebrow">CURRENT FEATURED BROADCAST</p><h2>{published.items[0].title}</h2><BroadcastStatus entry={published.items[0]} /><p className="broadcast-muted"><BroadcastDate value={published.items[0].serviceAt} /></p><BroadcastVideo entry={published.items[0]} /><button className="btn soft" disabled={busy || saving} onClick={() => open(published.items[0].id)}>Edit featured broadcast</button></section>}<h2>Your broadcasts</h2><button className="btn soft" disabled={saving} onClick={() => setRevision((v) => v + 1)}>Refresh list</button><p className="broadcast-muted">Drafts are hidden from viewers. The latest publication appears first on Live.</p><div className="broadcast-list">{state.items.map((value) => <button className="broadcast-editor-item" key={value.id} disabled={busy || saving} onClick={() => open(value.id)}><strong>{value.title}</strong><small><BroadcastDate value={value.serviceAt} /></small><span>{value.status === "draft" ? "Draft · " : "Published · "}<BroadcastStatus entry={value} /></span><span className="broadcast-text-button">Edit →</span></button>)}</div>{!state.busy && !state.error && !state.items.length && <p>No broadcasts yet. Add your first service.</p>}<ContentListState state={state} label="Loading broadcasts…" /></aside><div className="broadcast-editor-area">{error && <p className="broadcast-error" role="alert">{error}</p>}{busy ? <p role="status">Loading broadcast…</p> : <BroadcastForm key={selection} initial={entry} featured={published.items[0]} onBusy={setSaving} onDirty={setDirty} onSaved={() => setRevision((v) => v + 1)} onReload={open} onForbidden={() => { setEntry(null); setDenied(true); }} />}</div></div></section>;
}
