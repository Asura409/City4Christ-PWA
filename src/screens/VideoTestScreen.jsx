import React, { useState } from "react";
import { youtubeWatchUrl } from "../media/youtube.js";
import { youtubeEmbedUrl } from "../lib/sanitize.js";
import "../media/video-test.css";

export default function VideoTestScreen() {
  const [input, setInput] = useState("");
  const [watchUrl, setWatchUrl] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  function load(event) {
    event.preventDefault();
    const url = youtubeWatchUrl(input);
    setError(url ? "" : "Paste a valid HTTPS YouTube video or livestream link.");
    if (!url) return;
    setWatchUrl(url);
    setRevision((value) => value + 1);
  }
  return <section className="screen active public-feature-screen video-test-screen" aria-label="YouTube playback test">
    <header className="feature-hero"><p className="feature-eyebrow">PLAYBACK TEST</p><h1>YouTube in the app</h1><p>Try a sermon, video devotional, or livestream without leaving City4Christ.</p></header>
    <form className="feature-panel video-test-form" onSubmit={load}>
      <label htmlFor="youtube-test-url">YouTube link</label>
      <input id="youtube-test-url" type="url" required value={input} onChange={(event) => setInput(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" aria-describedby="youtube-test-help" />
      <p id="youtube-test-help">Paste a Watch, Share, Shorts, or Live video link. Links are only used for this test and are cleared when you leave.</p>
      <div className="feature-actions"><button className="btn gold" type="submit">Load video</button><button className="btn soft" type="button" onClick={() => { setInput("https://www.youtube.com/watch?v=M7lc1UVf-VE"); setError(""); }}>Use sample link</button></div>
      {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
    </form>
    <section className="feature-panel" aria-label="Video player">
      {watchUrl ? <><div className="video-test-player"><iframe key={revision} title="YouTube playback test" src={`${youtubeEmbedUrl(watchUrl)}?playsinline=1`} referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div><p>Press Play in the player. Try sound, fullscreen, and rotating your phone.</p><div className="feature-actions"><a className="btn soft" href={watchUrl} target="_blank" rel="noopener noreferrer">Open on YouTube</a><button className="btn soft" type="button" onClick={() => setWatchUrl("")}>Stop video</button></div><p>If YouTube shows an error, this video may be private, restricted, or unavailable for embedding. Try another link.</p></> : <p>Load a link above to show the player here.</p>}
    </section>
    <section className="feature-panel"><h2>What this tests</h2><p>The video plays directly from YouTube. No API key or backend changes are needed. Nothing is published to sermons or devotionals.</p><p>For a live service, paste the specific broadcast’s video link. This test does not automatically find a channel’s current livestream.</p></section>
  </section>;
}
