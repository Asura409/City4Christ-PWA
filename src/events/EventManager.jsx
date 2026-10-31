import React, { useEffect, useState } from "react";
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
import { listGroupMembers, listGroups } from "@/groups/api";

const eventTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
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
  const [members, setMembers] = useState([]);
  const [coordinators, setCoordinators] = useState({});
  const [coordinatorGroup, setCoordinatorGroup] = useState("");
  const [coordinatorAccount, setCoordinatorAccount] = useState("");

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

  useEffect(() => {
    setMembers([]);
    setCoordinatorAccount("");
    if (coordinatorGroup)
      void listGroupMembers(coordinatorGroup)
        .then(setMembers)
        .catch((e) => setError(e.message));
  }, [coordinatorGroup]);

  async function assign(item) {
    if (!coordinatorGroup || !coordinatorAccount) return;
    setBusy(true);
    setError("");
    try {
      await assignEventCoordinator(
        item.id,
        coordinatorGroup,
        coordinatorAccount,
      );
      const updated = await listEventCoordinators(item.id);
      setCoordinators((current) => ({ ...current, [item.id]: updated }));
      toast("Event coordinator assigned");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeCoordinator(item, coordinator) {
    setBusy(true);
    setError("");
    try {
      await removeEventCoordinator(item.id, coordinator.accountId);
      setCoordinators((current) => ({
        ...current,
        [item.id]: (current[item.id] || []).filter(
          (entry) => entry.accountId !== coordinator.accountId,
        ),
      }));
      toast("Event coordinator removed");
    } catch (e) {
      setError(e.message);
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

  if (!profile || loading || !canManageEvents(access, groupId)) {
    return loading && profile ? (
      <p role="status">Loading event tools…</p>
    ) : null;
  }

  return (
    <section className="event-manager" aria-label="Event management">
      <div className="sh">
        <h2>{groupId ? "Manage group events" : "Manage church events"}</h2>
      </div>
      {error && (
        <p className="event-error" role="alert">
          {error}
        </p>
      )}
      <form className="event-form" aria-label="Create event" onSubmit={submit}>
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
        {editing && (
          <button
            type="button"
            className="btn soft"
            disabled={busy}
            onClick={clearForm}
          >
            Stop editing
          </button>
        )}
      </form>
      <div className="event-admin-list" aria-label="Managed events">
        {items.length === 0 ? (
          <p className="lead">No events to manage yet.</p>
        ) : (
          items.map((item) => (
            <article className="event-admin-row" key={item.id}>
              <div>
                <h3>{item.title}</h3>
                <p>
                  {item.status} · {item.attendeeCount} reserved
                </p>
              </div>
              {item.status !== "cancelled" && (
                <button
                  className="btn soft"
                  disabled={busy}
                  onClick={() => edit(item)}
                >
                  Edit
                </button>
              )}
              {item.status === "draft" && (
                <button
                  className="btn blue"
                  disabled={busy}
                  onClick={() => transition(item, "published")}
                >
                  Publish event
                </button>
              )}
              {item.status === "published" && (
                <button
                  className="btn soft"
                  disabled={busy}
                  onClick={() => transition(item, "cancelled")}
                >
                  Cancel event
                </button>
              )}
              <div
                className="event-coordinators"
                aria-label={`${item.title} coordinators`}
              >
                {(coordinators[item.id] || []).map((coordinator) => (
                  <div
                    key={coordinator.accountId}
                    className="event-coordinator"
                  >
                    <span>
                      {coordinator.firstName} {coordinator.lastName} ·{" "}
                      {coordinator.groupName}
                    </span>
                    <button
                      className="btn soft"
                      aria-label={`Remove ${coordinator.firstName} ${coordinator.lastName}`}
                      disabled={busy}
                      onClick={() => removeCoordinator(item, coordinator)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {item.status === "published" && (
                  <div className="event-coordinator-form">
                    <label className="auth-field">
                      Coordinator group
                      <select
                        aria-label="Coordinator group"
                        value={coordinatorGroup}
                        onChange={(e) => setCoordinatorGroup(e.target.value)}
                      >
                        <option value="">Choose a church group</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {coordinatorGroup && (
                      <label className="auth-field">
                        Event coordinator
                        <select
                          aria-label="Event coordinator"
                          value={coordinatorAccount}
                          onChange={(e) =>
                            setCoordinatorAccount(e.target.value)
                          }
                        >
                          <option value="">
                            Choose an active group member
                          </option>
                          {members
                            .filter(
                              (member) =>
                                member.status === undefined ||
                                member.status === "active",
                            )
                            .map((member) => (
                              <option
                                key={member.accountId}
                                value={member.accountId}
                              >
                                {member.firstName} {member.lastName}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                    <button
                      className="btn soft"
                      disabled={
                        busy || !coordinatorGroup || !coordinatorAccount
                      }
                      onClick={() => assign(item)}
                    >
                      Assign coordinator
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
