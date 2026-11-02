import { api } from "@/auth/session";
export async function welcomeConfig(signal) {
  return (
    await api.request("/api/v1/visitors/config", { public: true, signal })
  ).data;
}
export async function submitVisitor(body) {
  return (
    await api.request("/api/v1/visitors", {
      method: "POST",
      public: true,
      body,
    })
  ).data;
}
export async function listVisitors({
  status = "new",
  cursor = "",
  signal,
} = {}) {
  const q = new URLSearchParams({ status, limit: "20" });
  if (cursor) q.set("cursor", cursor);
  const r = await api.request("/api/v1/admin/visitors?" + q, { signal });
  return { items: r.data, nextCursor: r.meta?.nextCursor || "" };
}
export async function visitorDetail(id, signal) {
  return (
    await api.request(`/api/v1/admin/visitors/${encodeURIComponent(id)}`, {
      signal,
    })
  ).data;
}
export async function updateVisitor(id, body) {
  return (
    await api.request(`/api/v1/admin/visitors/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
    })
  ).data;
}
export async function assignVisitor(id, body) {
  return (await api.request(`/api/v1/admin/visitors/${encodeURIComponent(id)}/assignment`, {
    method: "POST",
    body,
  })).data;
}
