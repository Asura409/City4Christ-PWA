import { api } from "@/auth/session";

export async function listGroupConversations({ signal } = {}) {
  const { data } = await api.request("/api/v1/group-conversations", { signal });
  return Array.isArray(data) ? data : [];
}

export async function listGroupMessages(groupId, { beforeSequence, signal } = {}) {
  const query = new URLSearchParams();
  if (beforeSequence) query.set("beforeSequence", String(beforeSequence));
  const suffix = query.size ? `?${query}` : "";
  const { data, meta = {} } = await api.request(`/api/v1/groups/${encodeURIComponent(groupId)}/messages${suffix}`, { signal });
  return { messages: Array.isArray(data) ? data : [], nextBeforeSequence: meta.nextBeforeSequence || 0 };
}

export async function sendGroupMessage(groupId, body, clientMessageId) {
  return (await api.request(`/api/v1/groups/${encodeURIComponent(groupId)}/messages`, {
    method: "POST",
    body: { body, clientMessageId },
  })).data;
}

export async function markGroupConversationRead(groupId, throughMessageId = "") {
  return (await api.request(`/api/v1/groups/${encodeURIComponent(groupId)}/read`, {
    method: "PUT",
    body: { throughMessageId },
  })).data;
}

export async function deleteGroupMessage(groupId, messageId) {
  return api.request(`/api/v1/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}`, { method: "DELETE" });
}
