import { api } from "@/auth/session";

const REQUESTS = "/api/v1/prayer/requests";

export async function listPrayerRequests({ status = "open", cursor = "", limit = 20, signal } = {}) {
  const query = new URLSearchParams({ status, limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  const result = await api.request(`${REQUESTS}?${query}`, { signal });
  return {
    requests: Array.isArray(result.data) ? result.data : [],
    nextCursor: result.meta?.nextCursor || "",
  };
}

export async function createPrayerRequest(input) {
  return (await api.request(REQUESTS, { method: "POST", body: input })).data;
}

export async function acknowledgePrayer(requestId) {
  return (await api.request(`${REQUESTS}/${encodeURIComponent(requestId)}/prayed`, {
    method: "PUT",
    body: {},
  })).data;
}

export async function updatePrayerStatus(requestId, status) {
  if (status !== "answered" && status !== "archived") {
    throw new TypeError("Unsupported prayer request status.");
  }
  return (await api.request(`${REQUESTS}/${encodeURIComponent(requestId)}`, {
    method: "PATCH",
    body: { status },
  })).data;
}

export async function getPrayerModerationAccess({ signal } = {}) {
  return (await api.request("/api/v1/me/access", { signal })).data;
}

export async function reportPrayerRequest(requestId, input) {
  return (await api.request(`${REQUESTS}/${encodeURIComponent(requestId)}/reports`, {
    method: "POST",
    body: input,
  })).data;
}

export async function listPrayerReports({ status = "pending", limit = 20, signal } = {}) {
  const query = new URLSearchParams({ status, limit: String(limit) });
  const result = await api.request(`/api/v1/prayer/reports?${query}`, { signal });
  return Array.isArray(result.data) ? result.data : [];
}

export async function reviewPrayerReport(reportId, decision, reason) {
  if (decision !== "hide" && decision !== "dismiss") {
    throw new TypeError("Unsupported prayer report decision.");
  }
  return (await api.request(`/api/v1/prayer/reports/${encodeURIComponent(reportId)}`, {
    method: "PATCH",
    body: { decision, reason },
  })).data;
}
