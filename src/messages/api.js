import { api } from "@/auth/session";

export async function listConversations({ signal } = {}) {
  const { data } = await api.request("/api/v1/conversations", { signal });
  return Array.isArray(data) ? data : [];
}

export async function createConversation(recipientId) {
  return (await api.request("/api/v1/conversations", {
    method: "POST",
    body: { recipientId },
  })).data;
}

export async function searchDirectoryMembers(query, { signal } = {}) {
  const params = new URLSearchParams({ query: query.trim(), limit: "20" });
  const { data } = await api.request(`/api/v1/members?${params}`, { signal });
  return Array.isArray(data) ? data : [];
}

export async function listMessages(conversationId, { beforeSequence = 0, limit = 50, signal } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (beforeSequence > 0) params.set("beforeSequence", String(beforeSequence));
  const { data, meta } = await api.request(
    `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages?${params}`,
    { signal },
  );
  return {
    messages: Array.isArray(data) ? data : [],
    nextBeforeSequence: Number(meta?.nextBeforeSequence) || 0,
  };
}

export async function sendMessage(conversationId, body, clientMessageId) {
  return (await api.request(
    `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", body: { clientMessageId, body } },
  )).data;
}

export async function markConversationRead(conversationId, throughMessageId = "") {
  const body = throughMessageId ? { throughMessageId } : {};
  return (await api.request(
    `/api/v1/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: "PUT", body },
  )).data;
}
