import React, { useEffect, useState } from "react";
import { useSession } from "@/auth/session";
import { hasCapability } from "../../js/access.js";
import { getEventsAccess } from "@/events/api";
import { EventManager } from "@/events/EventManager";

export default function AdminEventsScreen() {
  const { profile } = useSession();
  const [allowed, setAllowed] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getEventsAccess()
      .then((data) => { if (live) setAllowed(hasCapability(data, "events.manage")); })
      .catch((reason) => { if (live) { setAllowed(false); setError(reason.message); } });
    return () => { live = false; };
  }, []);

  if (allowed === null) return <p role="status">Checking event management access…</p>;
  if (!allowed) return <p role="alert">{error || "Your account does not have permission to manage events."}</p>;
  return <EventManager profile={profile} />;
}
