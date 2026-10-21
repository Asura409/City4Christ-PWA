import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { SessionProvider } from "./auth/session";
import "./index.css";

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
