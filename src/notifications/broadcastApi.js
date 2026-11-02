import { api } from "@/auth/session";
export async function listBroadcasts(audience = "church", groupId = "", signal) {
  const params = new URLSearchParams();
  if (groupId) params.set("groupId", groupId);
  else if (audience !== "church") params.set("audience", audience);
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return (await api.request(`/api/v1/admin/broadcasts${suffix}`, { signal })).data;
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
