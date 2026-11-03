import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SettingsScreen() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem("city4christ-theme") || "system");
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    localStorage.setItem("city4christ-theme", theme);
  }, [theme]);
  return <section className="screen active public-feature-screen settings-screen" aria-label="Settings">
    <header className="settings-heading"><p className="feature-eyebrow">YOUR ACCOUNT</p><h1>Settings</h1><p className="lead">Manage your City4Christ experience.</p></header>
    <section className="feature-panel settings-panel"><h2>Appearance</h2><label className="settings-select">Theme<select value={theme} onChange={(event) => setTheme(event.target.value)}><option value="system">System default</option><option value="light">Light</option><option value="dark">Dark</option></select></label></section>
    <section className="feature-panel settings-panel"><h2>Account and privacy</h2><button className="settings-link" type="button" onClick={() => navigate("/profile#profile-details")}>Personal information <span>›</span></button><button className="settings-link" type="button" onClick={() => navigate("/profile#security-tools")}>Security and password <span>›</span></button><button className="settings-link" type="button" onClick={() => navigate("/profile#account-access")}>Roles and account access <span>›</span></button><button className="settings-link" type="button" onClick={() => navigate("/profile#account-deletion")}>Account management <span>›</span></button></section>
    <section className="feature-panel settings-panel"><h2>Notifications</h2><p className="lead">Choose how you receive prayer, gathering, and church updates.</p><button className="btn soft" type="button" onClick={() => navigate("/notifications")}>Notification preferences</button></section>
  </section>;
}
