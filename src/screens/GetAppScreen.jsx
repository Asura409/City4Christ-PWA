import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/lib/icons";
import { SocialLinks } from "@/components/SocialLinks";

export default function GetAppScreen() {
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    const capture = (event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);
  async function install() {
    if (!installPrompt) { setStatus("Use your browser menu and choose Add to Home Screen or Install City4Christ."); return; }
    await installPrompt.prompt();
    setInstallPrompt(null);
  }
  return <section className="screen active public-feature-screen" aria-label="Get the app">
    <button className="btn soft" type="button" onClick={() => navigate(-1)}><Icon name="back" /> Back</button>
    <header className="feature-hero app-hero"><p className="feature-eyebrow">CITY4CHRIST</p><h1>Faith. Community. Everywhere.</h1><p>Keep worship, prayer, giving, events, sermons, and pastoral care close at hand.</p></header>
    <section className="feature-panel app-install-panel"><h2>Install City4Christ</h2><p className="lead">On your phone or computer, use your browser’s install or “Add to Home Screen” option to keep the PWA available like an app.</p><div className="feature-actions"><button className="btn gold" type="button" onClick={() => void install()}>Install the PWA</button><button className="btn soft" type="button" onClick={() => navigate("/home")}>Continue in browser</button></div>{status && <p role="status">{status}</p>}<small>Installation availability depends on your browser and device.</small></section>
    <SocialLinks />
  </section>;
}
