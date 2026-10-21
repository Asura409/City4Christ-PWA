import { api } from "@/auth/session";

export async function listGroups() {
  const { data, meta } = await api.request("/api/v1/groups?limit=100");
  return { groups: Array.isArray(data) ? data : [], nextCursor: meta?.nextCursor || "" };
}

export async function joinGroup(groupId) {
  return (await api.request(`/api/v1/groups/${groupId}/membership`, {
    method: "POST",
    body: {},
  })).data;
}

export async function leaveGroup(groupId) {
  return (await api.request(`/api/v1/groups/${groupId}/membership`, {
    method: "DELETE",
  })).data;
}

export async function listGroupMembers(groupId) {
  return (await api.request(`/api/v1/groups/${groupId}/members`)).data || [];
}

export async function listPendingRequests(groupId) {
  return (await api.request(`/api/v1/groups/${groupId}/membership-requests`)).data || [];
}

export async function decideMembership(groupId, accountId, decision) {
  return (await api.request(`/api/v1/groups/${groupId}/membership-requests/${accountId}`, {
    method: "PATCH",
    body: { decision, reason: `Reviewed in the ${decision === "approve" ? "approval" : "decline"} queue.` },
  })).data;
}

export async function getAccess() {
  return (await api.request("/api/v1/me/access")).data;
}
