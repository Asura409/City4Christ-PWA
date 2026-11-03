import React, { useEffect, useState } from "react";
import { hasCapability } from "../../js/access.js";
import { api } from "@/auth/session";
import { EditorialSermonList } from "@/sermons/EditorialSermonList";
import { SermonComposer } from "@/sermons/SermonComposer";

export default function SermonPublishingScreen() {
  const [access, setAccess] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let current = true;
    api.request("/api/v1/me/access")
      .then(({ data }) => {
        if (current) setAccess(hasCapability(data, "sermons.manage"));
      })
      .catch(() => {
        if (current) setAccess(false);
      });
    return () => {
      current = false;
    };
  }, []);

  return (
    <section className="screen active sermon-publishing-screen" aria-label="Sermon publishing">
      <header className="sh">
        <div>
          <p className="group-eyebrow">STAFF TOOLS</p>
          <h1>Sermon publishing</h1>
          <p className="lead">Create a draft, add media, and publish it when it is ready.</p>
        </div>
        <a className="btn soft" href="#/word">View sermon library</a>
      </header>
      {access === null ? (
        <p role="status">Checking sermon publishing access…</p>
      ) : !access ? (
        <p role="alert">Your account does not have permission to manage sermons.</p>
      ) : (
        <>
          <SermonComposer onPublished={() => setRefreshKey((value) => value + 1)} onChanged={() => setRefreshKey((value) => value + 1)} />
          <EditorialSermonList refreshKey={refreshKey} />
        </>
      )}
    </section>
  );
}
