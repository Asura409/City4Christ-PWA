import { api } from "@/auth/session";
export async function listBroadcasts(groupId = "", signal) {
  return (
    await api.request(
      "/api/v1/admin/broadcasts" +
        (groupId ? "?" + new URLSearchParams({ groupId }) : ""),
      { signal },
    )
  ).data;
}
export async function createBroadcast(body) {
  return (
    await api.request("/api/v1/admin/broadcasts", { method: "POST", body })
  ).data;
}
export async function reviewBroadcast(id) {
  return (
    await api.request(`/api/v1/admin/broadcasts/${encodeURIComponent(id)}`)
  ).data;
}
export async function sendBroadcast(id, version) {
  return (
    await api.request(
      `/api/v1/admin/broadcasts/${encodeURIComponent(id)}/send`,
      { method: "POST", body: { version, confirm: true } },
    )
  ).data;
}
