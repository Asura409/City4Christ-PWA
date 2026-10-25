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

export async function listManagedGroups(includeArchived = false) {
  const query = includeArchived ? "?includeArchived=true" : "";
  const { data } = await api.request(`/api/v1/admin/groups${query}`);
  return Array.isArray(data) ? data : [];
}

export async function createGroup(body) {
  return (await api.request("/api/v1/admin/groups", {
    method: "POST",
    body,
  })).data;
}

export async function setGroupLifecycle(groupId, status, reason) {
  return (await api.request(`/api/v1/admin/groups/${groupId}`, {
    method: "PATCH",
    body: { status, reason },
  })).data;
}

export async function listGroupLeaders(groupId) {
  return (await api.request(`/api/v1/admin/groups/${groupId}/leaders`)).data || [];
}

export async function searchRoleCandidates(query) {
  const params = new URLSearchParams({ query: query.trim(), limit: "20" });
  return (await api.request(`/api/v1/admin/role-candidates?${params}`)).data || [];
}

export async function changeGroupLeader(accountId, groupId, reason, revoke = false) {
  const suffix = revoke ? "/revoke" : "";
  return (await api.request(`/api/v1/admin/accounts/${accountId}/church-roles${suffix}`, {
    method: "POST",
    body: { role: "ministry_leader", scope: groupId, reason },
  })).data;
}
