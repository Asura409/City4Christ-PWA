import { api } from "@/auth/session";
export const requestAppointment = (slotId) =>
  api.request("/api/v1/pastor-bookings", { method: "POST", body: { slotId } });
export const cancelAppointment = (id) =>
  api.request("/api/v1/pastor-bookings/" + encodeURIComponent(id), {
    method: "DELETE",
  });
export const decideAppointment = (id, status, version) =>
  api.request("/api/v1/me/pastoral/bookings/" + encodeURIComponent(id), {
    method: "PATCH",
    body: { status, version },
  });
export const createSlot = (body) =>
  api.request("/api/v1/me/pastoral/availability", { method: "POST", body });
export const withdrawSlot = (id) =>
  api.request("/api/v1/me/pastoral/availability/" + encodeURIComponent(id), {
    method: "DELETE",
  });
export const appointPastor = (body) =>
  api.request("/api/v1/admin/pastors", { method: "POST", body });
export function nextMonthRange() {
  const from = new Date();
  return new URLSearchParams({
    from: from.toISOString(),
    to: new Date(from.getTime() + 30 * 86400000).toISOString(),
  }).toString();
}
export function dateLabel(value, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}
