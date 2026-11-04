import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { SessionProvider } from "./auth/session";
import "./index.css";
import {googleCallbackRoute} from './auth/google';

const googleRoute = googleCallbackRoute(location.pathname, location.search);
if (googleRoute) history.replaceState(null, '', googleRoute);

// Password recovery links arrive with a one-time token in the URL fragment.
// Move that token into the React route before HashRouter starts, without sending
// it to the server in a request path.
if (!googleRoute && location.hash.startsWith("#reset_token=")) {
  const token = location.hash.slice("#reset_token=".length);
  history.replaceState(null, "", `#/reset-password?token=${encodeURIComponent(token)}`);
}

// HashRouter normally survives a refresh because the route is part of the URL.
// When an installed PWA is reopened without its hash, restore the last ordinary
// app screen from this session rather than unexpectedly starting at the shell.
const LAST_ROUTE_KEY = "city4christ:last-route";
const isAuthRoute = (hash) => /^#\/(login|signup|welcome|verify|forgot-password|google-return|new-user)(?:[/?]|$)/.test(hash);
if (!googleRoute && !location.hash) {
  try {
    const lastRoute = sessionStorage.getItem(LAST_ROUTE_KEY);
    if (lastRoute && lastRoute.startsWith("#/") && !isAuthRoute(lastRoute)) {
      history.replaceState(null, "", lastRoute);
    }
  } catch {
    // Some privacy modes disable sessionStorage; the router can still start normally.
  }
}
if (!isAuthRoute(location.hash)) {
  try {
    if (location.hash.startsWith("#/")) sessionStorage.setItem(LAST_ROUTE_KEY, location.hash);
  } catch {
    // Route persistence is a convenience, not a requirement for app startup.
  }
}
addEventListener("hashchange", () => {
  if (isAuthRoute(location.hash)) return;
  try {
    if (location.hash.startsWith("#/")) sessionStorage.setItem(LAST_ROUTE_KEY, location.hash);
  } catch {
    // Ignore unavailable browser storage.
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}

createRoot(document.getElementById("root")).render(
  <SessionProvider>
    <HashRouter>
      <App />
    </HashRouter>
  </SessionProvider>,
);
