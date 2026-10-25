import { api } from "@/auth/session";

export async function listPosts({ cursor = "", limit = 20, signal } = {}) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  const result = await api.request(`/api/v1/posts?${query}`, { signal });
  return { posts: Array.isArray(result.data) ? result.data : [], nextCursor: result.meta?.nextCursor || "" };
}

export async function createPost(body) {
  return (await api.request("/api/v1/posts", { method: "POST", body })).data;
}
