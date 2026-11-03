import { api } from "@/auth/session";

export async function listMembers({ query = "", cursor = "", limit = 20, signal } = {}) {
  const params = new URLSearchParams({ query: query.trim(), limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  const { data, meta } = await api.request(`/api/v1/members?${params}`, { signal });
  return { members: Array.isArray(data) ? data : [], nextCursor: meta?.nextCursor || "" };
}
