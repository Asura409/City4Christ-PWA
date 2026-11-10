import React, { useState } from "react";
import { TimedMessage } from "@/components/TimedMessage";
import { api } from "./session";
import { useConfirmedAction } from "./identityConfirmation";
import { googleProviderURL, googleReturnURL } from "./google";

export function GoogleLinkPanel({ googleLinked = false }) {
  const runConfirmed = useConfirmedAction();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function link() {
    setBusy(true);
    setError("");
    try {
      const { data } = await runConfirmed(() =>
        api.beginGoogleLink(googleReturnURL("link")),
      );
      location.assign(googleProviderURL(data.url));
    } catch (e) {
      setError(e.message || "Google linking is unavailable. Please try again.");
      setBusy(false);
    }
  }
  if (googleLinked) {
    return (
      <section className="auth-card google-linked-status" aria-label="Google account linking">
        <h2>Google account</h2>
        <p>Google is already linked to this account.</p>
        <p role="status">Account already linked to Google</p>
      </section>
    );
  }
  return (
    <section className="auth-card" aria-label="Google account linking">
      <h2>Google account</h2>
      <p>
        Link a verified Google account with the same email so you can use
        Continue with Google.
      </p>
      <TimedMessage tone="error" message={error} />
      <button className="btn soft block" disabled={busy} onClick={link}>
        {busy ? "Connecting…" : "Link Google"}
      </button>
    </section>
  );
}
