import React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/lib/icons";

export default function LiveScreen() {
  const navigate = useNavigate();
  const liveUrl = globalThis.City4ChristConfig?.LIVE_URL || "";
  return <section className="screen active public-feature-screen live-screen" aria-label="Live worship">
    <button className="btn soft" type="button" onClick={() => navigate(-1)}><Icon name="back" /> Back</button>
    <header className="feature-hero live-hero"><p className="feature-eyebrow">WORSHIP ONLINE</p><h1>Join us live</h1><p>Stay connected to worship, teaching, and fellowship wherever you are.</p></header>
    <section className="feature-panel live-player" aria-label="Live service"><div className="live-player-placeholder"><Icon name="play" /><span>{liveUrl ? "Live service is ready" : "Live stream coming soon"}</span></div>{liveUrl ? <a className="btn gold" href={liveUrl}>Watch live service</a> : <button className="btn gold" type="button" onClick={() => navigate("/notifications")}>Notify me about services</button>}</section>
    <section className="feature-panel"><h2>Stay connected</h2><div className="feature-actions"><button className="btn soft" type="button" onClick={() => navigate("/word")}>Recent messages</button><button className="btn soft" type="button" onClick={() => navigate("/events")}>Upcoming gatherings</button><button className="btn soft" type="button" onClick={() => navigate("/pastors")}>Book a pastor</button></div></section>
  </section>;
}
