import { api } from "@/auth/session";

export async function listEvents({ signal, groupId = "" } = {}) {
  const result = await api.request(
    "/api/v1/events" + (groupId ? "?" + new URLSearchParams({ groupId }) : ""),
    {
      signal,
      public: !api.isSignedIn(),
    },
  );
  return Array.isArray(result.data) ? result.data : [];
}

export async function listManagedEvents(groupId = "") {
  const { data } = await api.request(
    "/api/v1/admin/events" +
      (groupId ? "?" + new URLSearchParams({ groupId }) : ""),
  );
  return Array.isArray(data) ? data : [];
}

export async function createEvent(body) {
  return (await api.request("/api/v1/admin/events", { method: "POST", body }))
    .data;
}

export async function updateEvent(eventId, body) {
  return (
    await api.request(`/api/v1/admin/events/${eventId}`, {
      method: "PATCH",
      body,
    })
  ).data;
}

export async function rsvpEvent(eventId, attendeeCount) {
  return (
    await api.request(`/api/v1/events/${eventId}/rsvp`, {
      method: "POST",
      body: { attendeeCount },
    })
  ).data;
}

export async function cancelEventRSVP(eventId) {
  return (
    await api.request(`/api/v1/events/${eventId}/rsvp`, { method: "DELETE" })
  ).data;
}

export async function getEventsAccess() {
  return (await api.request("/api/v1/me/access")).data;
}

export async function listEventCoordinators(eventId) {
  const { data } = await api.request(`/api/v1/events/${eventId}/coordinators`);
  return Array.isArray(data) ? data : [];
}

export async function assignEventCoordinator(eventId, groupId, accountId) {
  return (
    await api.request(`/api/v1/events/${eventId}/coordinators`, {
      method: "PUT",
      body: { groupId, accountId },
    })
  ).data;
}

export async function removeEventCoordinator(eventId, accountId) {
  return api.request(`/api/v1/events/${eventId}/coordinators/${accountId}`, {
    method: "DELETE",
  });
}

export async function downloadEventCalendar(eventId) {
  const text = await api.request(
    `/api/v1/events/${encodeURIComponent(eventId)}/calendar.ics`,
    { responseType: "text", public: !api.isSignedIn() },
  );
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "city4christ-event.ics";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
