import { api } from "@/auth/session";

export async function listNotifications({
  limit = 20,
  cursor = "",
  signal,
} = {}) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  const { data, meta } = await api.request(`/api/v1/notifications?${query}`, {
    signal,
  });
  return {
    items: Array.isArray(data) ? data : [],
    nextCursor: meta?.nextCursor || "",
  };
}

export async function unreadNotificationCount() {
  const { data } = await api.request("/api/v1/notifications/unread-count");
  return Number(data?.unreadCount) || 0;
}

export async function markNotificationRead(id) {
  return (
    await api.request(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {
      method: "PUT",
      body: {},
    })
  ).data;
}

export async function getNotificationPreferences() {
  return (await api.request("/api/v1/notifications/preferences")).data;
}
export async function saveNotificationPreferences(body) {
  return (
    await api.request("/api/v1/notifications/preferences", {
      method: "PUT",
      body,
    })
  ).data;
}
export async function markAllNotificationsRead() {
  return (
    await api.request("/api/v1/notifications/read-all", {
      method: "PUT",
      body: {},
    })
  ).data;
}
export async function getPushConfig() {
  return (await api.request("/api/v1/notifications/push/config")).data;
}
export async function savePushSubscription(body) {
  return (
    await api.request("/api/v1/notifications/push/subscriptions", {
      method: "POST",
      body,
    })
  ).data;
}
export async function removePushSubscription(endpoint) {
  return (
    await api.request("/api/v1/notifications/push/subscriptions", {
      method: "DELETE",
      body: { endpoint },
    })
  ).data;
}
