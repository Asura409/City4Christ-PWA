import React, { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { createEvent, getEventsAccess, listManagedEvents, updateEvent } from "@/events/api";
import { instantToLocalDateTime, localDateTimeToInstant } from "@/events/date";

const eventTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const canManageEvents = (access) =>
  (access?.capabilities || []).some((item) => item.permission === "events.manage" && item.scope === "");

export function EventManager({ profile }) {
  const toast = useToast();
  const [access, setAccess] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(Boolean(profile));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [editing, setEditing] = useState(null);

  async function load() {
    if (!profile) {
      setAccess(null);
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const current = await getEventsAccess();
      setAccess(current);
      setItems(canManageEvents(current) ? await listManagedEvents() : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [profile?.id]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        title,
        description,
        location,
        startsAt: localDateTimeToInstant(startsAt),
        timeZone: eventTimeZone,
        ...(capacity === "" ? {} : { capacity: Number(capacity) }),
      };
      if (editing) {
        await updateEvent(editing.id, { ...body, status: editing.status, version: editing.version });
      } else {
        await createEvent(body);
      }
      setTitle("");
      setDescription("");
      setLocation("");
      setStartsAt("");
      setCapacity("");
      setEditing(null);
      toast(editing ? "Event details updated" : "Event draft created");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function edit(item) {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description);
    setLocation(item.location);
    setStartsAt(instantToLocalDateTime(item.startsAt));
    setCapacity(item.capacity == null ? "" : String(item.capacity));
  }

  function clearForm() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setLocation("");
    setStartsAt("");
    setCapacity("");
  }

  async function transition(item, status) {
    setBusy(true);
    setError("");
    try {
      await updateEvent(item.id, {
        title: item.title,
        description: item.description,
        location: item.location,
        startsAt: item.startsAt,
        timeZone: item.timeZone,
        capacity: item.capacity,
        status,
        version: item.version,
      });
      toast(status === "published" ? "Event published" : "Event cancelled");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!profile || loading || !canManageEvents(access)) {
    return loading && profile ? <p role="status">Loading event tools…</p> : null;
  }

  return (
    <section className="event-manager" aria-label="Event management">
      <div className="sh"><h2>Manage church events</h2></div>
      {error && <p className="event-error" role="alert">{error}</p>}
      <form className="event-form" aria-label="Create event" onSubmit={submit}>
        <h3>{editing ? `Edit ${editing.title}` : "Create an event draft"}</h3>
        <label className="auth-field">Title<input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="auth-field">Description<textarea maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <label className="auth-field">Location<input maxLength={300} value={location} onChange={(e) => setLocation(e.target.value)} /></label>
        <label className="auth-field">Start time in {eventTimeZone}<input required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></label>
        <label className="auth-field">Seat capacity (leave blank for unlimited)<input type="number" min="1" max="100000" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></label>
        <p className="event-timezone">Times are saved as UTC instants with the displayed IANA timezone.</p>
        <button className="btn gold" disabled={busy}>{editing ? "Save changes" : "Create draft"}</button>
        {editing && <button type="button" className="btn soft" disabled={busy} onClick={clearForm}>Stop editing</button>}
      </form>
      <div className="event-admin-list" aria-label="Managed events">
        {items.length === 0 ? <p className="lead">No events to manage yet.</p> : items.map((item) => (
          <article className="event-admin-row" key={item.id}>
            <div><h3>{item.title}</h3><p>{item.status} · {item.attendeeCount} reserved</p></div>
            {item.status !== "cancelled" && <button className="btn soft" disabled={busy} onClick={() => edit(item)}>Edit</button>}
            {item.status === "draft" && <button className="btn blue" disabled={busy} onClick={() => transition(item, "published")}>Publish event</button>}
            {item.status === "published" && <button className="btn soft" disabled={busy} onClick={() => transition(item, "cancelled")}>Cancel event</button>}
          </article>
        ))}
      </div>
    </section>
  );
}
