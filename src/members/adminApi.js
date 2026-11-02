import { api } from "@/auth/session";

export async function searchAdminMembers(query, { cursor = "", limit = 20, signal } = {}) {
  const params = new URLSearchParams({ query: query.trim(), limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  const { data, meta } = await api.request(`/api/v1/admin/members?${params}`, { signal });
  return { members: Array.isArray(data) ? data : [], nextCursor: meta?.nextCursor || "" };
}

export async function getAdminMember(id, { signal } = {}) {
  return (await api.request(`/api/v1/admin/members/${encodeURIComponent(id)}`, { signal })).data;
}

export async function getAdminMemberAccessAudit(id, { cursor = "", limit = 20, signal } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  const { data, meta } = await api.request(
    `/api/v1/admin/members/${encodeURIComponent(id)}/access-audit?${params}`,
    { signal },
  );
  return { events: Array.isArray(data) ? data : [], nextCursor: meta?.nextCursor || "" };
}
