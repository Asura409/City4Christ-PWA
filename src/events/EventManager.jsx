import React, { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import {
  assignEventCoordinator,
  createEvent,
  getEventsAccess,
  listEventCoordinators,
  listManagedEvents,
  removeEventCoordinator,
  updateEvent,
} from "@/events/api";
import { instantToLocalDateTime, localDateTimeToInstant } from "@/events/date";
import { listGroups } from "@/groups/api";
import { UK_TIME_ZONE } from "../../js/time.js";
import { EventCoordinatorsDialog } from "./EventCoordinatorsDialog";
import { EventDialog } from "./EventDialog";

const eventTimeZone = UK_TIME_ZONE;
function EventIcon({ name }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={name === "edit" ? "M16 4l4 4M4 20l4-1 12-12-4-4L4 15z" : "M9 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16.5 5.2a3.5 3.5 0 010 6.6M21.5 20c0-2.5-1.4-4.2-3.4-5"} /></svg>;
}
function EventMenu({ item, busy, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    function dismiss(event) {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "keydown" || !ref.current?.contains(event.target)) {
        if (event.type === "keydown" && ref.current?.open) ref.current.querySelector("summary").focus();
        ref.current?.removeAttribute("open");
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", dismiss); };
  }, []);
  return <details ref={ref} className="event-more">
    <summary aria-label={`More actions for ${item.title}`}>⋯</summary>
    <div className="event-more-menu"><button type="button" disabled={busy} onClick={() => { ref.current.removeAttribute("open"); onCancel(item); }}>Cancel event</button></div>
  </details>;
}
const eventDate = (value, options) => new Intl.DateTimeFormat("en-GB", { timeZone: eventTimeZone, ...options }).format(new Date(value));
const canManageEvents = (access, groupId = "") =>
  (access?.capabilities || []).some(
    (item) =>
      (item.permission === "events.manage" && item.scope === "") ||
      (groupId &&
        item.permission === "ministry.members.manage" &&
        item.scope === groupId),
  );

export function EventManager({ profile, groupId = "" }) {
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
  const [groups, setGroups] = useState([]);
  const [coordinators, setCoordinators] = useState({});
  const [coordinatorEvent, setCoordinatorEvent] = useState(null);
  const [cancelEvent, setCancelEvent] = useState(null);
  const [cancelError, setCancelError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef(null);
  useEffect(() => {
    if (showForm) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      formRef.current?.querySelector("input")?.focus({ preventScroll: true });
    }
  }, [showForm, editing]);

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
      const managed = canManageEvents(current, groupId)
        ? await listManagedEvents(groupId)
        : [];
      setItems(managed);
      if (canManageEvents(current, groupId)) {
        const [{ groups: availableGroups }, ...assignments] = await Promise.all(
          [
            listGroups(),
            ...managed.map((item) =>
              item.status === "published"
                ? listEventCoordinators(item.id)
                : Promise.resolve([]),
            ),
          ],
        );
        setGroups(
          availableGroups.filter(
            (group) =>
              group.audience === "church" &&
              !group.archived &&
              (!groupId || group.id === groupId),
          ),
        );
        setCoordinators(
          Object.fromEntries(
            managed.map((item, index) => [item.id, assignments[index]]),
          ),
        );
      } else {
        setGroups([]);
        setCoordinators({});
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [profile?.id, groupId]);

  async function assign(item, coordinatorGroup, coordinatorAccount) {
    if (!coordinatorGroup || !coordinatorAccount) return;
    setBusy(true);
    try {
      await assignEventCoordinator(item.id, coordinatorGroup, coordinatorAccount);
      const updated = await listEventCoordinators(item.id);
      setCoordinators((current) => ({ ...current, [item.id]: updated }));
      toast("Event coordinator assigned");
    } finally {
      setBusy(false);
    }
  }

  async function removeCoordinator(item, coordinator) {
    setBusy(true);
    try {
      await removeEventCoordinator(item.id, coordinator.accountId);
      setCoordinators((current) => ({
        ...current,
        [item.id]: (current[item.id] || []).filter(
          (entry) => entry.accountId !== coordinator.accountId,
        ),
      }));
      toast("Event coordinator removed");
    } finally {
      setBusy(false);
    }
  }

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
        await updateEvent(editing.id, {
          ...body,
          status: editing.status,
          version: editing.version,
        });
      } else {
        await createEvent({ ...body, ...(groupId ? { groupId } : {}) });
      }
      setTitle("");
      setDescription("");
      setLocation("");
      setStartsAt("");
      setCapacity("");
      setEditing(null);
      setShowForm(false);
      toast(editing ? "Event details updated" : "Event draft created");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function edit(item) {
    setShowForm(true);
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description);
    setLocation(item.location);
    setStartsAt(instantToLocalDateTime(item.startsAt));
    setCapacity(item.capacity == null ? "" : String(item.capacity));
  }

  function clearForm() {
    setShowForm(false);
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
        timeZone: eventTimeZone,
        capacity: item.capacity,
        status,
        version: item.version,
      });
      toast(status === "published" ? "Event published" : "Event cancelled");
      setCancelEvent(null);
      await load();
    } catch (e) {
      if (status === "cancelled") setCancelError(e.message);
      else setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!profile || loading || !canManageEvents(access, groupId)) {
    return loading && profile ? (
      <p role="status">Loading event tools…</p>
    ) : null;
  }

  const visibleItems = items.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="event-manager" aria-label="Event management">
      <div className="event-management-heading">
        <div><span className="event-eyebrow">ADMINISTRATION / EVENTS</span><h2>{groupId ? "Manage group events" : "Manage church events"}</h2><p>Plan gatherings. Bring people together.</p></div>
        <button type="button" className="event-control event-control-gold" disabled={busy} onClick={() => { clearForm(); setShowForm(true); }}>+ New event</button>
      </div>
      {error && (
        <p className="event-error" role="alert">
          {error}
        </p>
      )}
      {showForm && <form ref={formRef} className="event-form" aria-label={editing ? "Edit event" : "Create event"} onSubmit={submit}>
        <h3>{editing ? `Edit ${editing.title}` : "Create an event draft"}</h3>
        <label className="auth-field">
          Title
          <input
            required
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="auth-field">
          Description
          <textarea
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="auth-field">
          Location
          <input
            maxLength={300}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <label className="auth-field">
          Start time in {eventTimeZone}
          <input
            required
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>
        <label className="auth-field">
          Seat capacity (leave blank for unlimited)
          <input
            type="number"
            min="1"
            max="100000"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </label>
        <p className="event-timezone">
          Times are saved as UTC instants with the displayed IANA timezone.
        </p>
        <button className="btn gold" disabled={busy}>
          {editing ? "Save changes" : "Create draft"}
        </button>
        <button
            type="button"
            className="btn soft"
            disabled={busy}
            onClick={clearForm}
          >
            {editing ? "Stop editing" : "Close form"}
        </button>
      </form>}
      <div className="event-list-toolbar">
        <input type="search" aria-label="Search managed events" placeholder="Search your events…" value={search} onChange={(event) => setSearch(event.target.value)} />
        <span>{visibleItems.length} {visibleItems.length === 1 ? "event" : "events"}</span>
      </div>
      <div className="event-admin-list" aria-label="Managed events">
        {items.length === 0 ? <p className="lead">No events to manage yet.</p> :
          !visibleItems.length ? <p className="event-help">No matching events.</p> :
          visibleItems.map((item) => {
            const assigned = coordinators[item.id] || [];
            const first = assigned[0];
            return <article className="event-admin-row" key={item.id} aria-label={item.title}>
              <div className="event-date-tile" aria-hidden="true"><small>{eventDate(item.startsAt, { month: "short" })}</small><strong>{eventDate(item.startsAt, { day: "numeric" })}</strong></div>
              <div className="event-admin-copy">
                <div className="event-admin-title"><h3>{item.title}</h3><span className={`event-status event-status-${item.status}`}>{item.status}</span></div>
                <p><time dateTime={item.startsAt}>{eventDate(item.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</time> · {item.attendeeCount} reserved</p>
              </div>
              <div className="event-coordinator-summary" aria-label={`${item.title} coordinators`}>
                {first ? <><span className="event-person-avatar" aria-hidden="true">{first.firstName?.[0]}{first.lastName?.[0]}</span><div><strong>{first.firstName} {first.lastName}{assigned.length > 1 ? ` +${assigned.length - 1}` : ""}</strong><small>{first.groupName}</small></div></> : <span>No coordinator assigned</span>}
              </div>
              <div className="event-admin-actions">
                {item.status !== "cancelled" && <button type="button" className="event-control" disabled={busy} onClick={() => edit(item)}><EventIcon name="edit" />Edit</button>}
                {item.status === "draft" && <button type="button" className="event-control event-control-gold" disabled={busy} onClick={() => transition(item, "published")}>Publish event</button>}
                {item.status === "published" && <>
                  <button type="button" className="event-control" disabled={busy} onClick={() => setCoordinatorEvent(item)}><EventIcon name="users" />Coordinators{assigned.length ? ` · ${assigned.length}` : ""}</button>
                  <EventMenu item={item} busy={busy} onCancel={(event) => { setCancelError(""); setCancelEvent(event); }} />
                </>}
              </div>
            </article>;
          })}
      </div>
      {coordinatorEvent && <EventCoordinatorsDialog key={coordinatorEvent.id} item={coordinatorEvent} groups={groups} coordinators={coordinators[coordinatorEvent.id] || []} busy={busy} onAssign={assign} onRemove={removeCoordinator} onClose={() => setCoordinatorEvent(null)} />}
      {cancelEvent && <EventDialog title="Cancel event?" subtitle={cancelEvent.title} busy={busy} onClose={() => setCancelEvent(null)}>
        <p className="event-help">This event will be removed from upcoming events and will no longer accept reservations.</p>
        {cancelError && <p className="event-error" role="alert">{cancelError}</p>}
        <footer className="event-dialog-actions"><button type="button" className="event-control" disabled={busy} onClick={() => setCancelEvent(null)}>Keep event</button><button type="button" className="event-control event-control-danger" disabled={busy} onClick={() => transition(cancelEvent, "cancelled")}>Cancel event</button></footer>
      </EventDialog>}
    </section>
  );
}
