import { api } from "@/auth/session";

export async function listPublishedSermonSeries() {
  return (await api.request("/api/v1/sermons/series", { public: true })).data;
}

export async function createSermonDraft(input) {
  return (await api.request("/api/v1/admin/sermons", { method: "POST", body: input })).data;
}

export async function publishSermon(id, version) {
  return (await api.request(`/api/v1/admin/sermons/${encodeURIComponent(id)}`, {
    method: "PATCH", body: { version, status: "published" },
  })).data;
}

export async function getSermonProgress(id) {
  return (await api.request(`/api/v1/me/sermons/${encodeURIComponent(id)}/progress`)).data;
}

export async function saveSermonProgress(id, positionSeconds) {
  return (await api.request(`/api/v1/me/sermons/${encodeURIComponent(id)}/progress`, {
    method: "PUT", body: { positionSeconds },
  })).data;
}

export async function getSermonNote(id) {
  return (await api.request(`/api/v1/me/sermons/${encodeURIComponent(id)}/notes`)).data;
}

export async function saveSermonNote(id, body) {
  return (await api.request(`/api/v1/me/sermons/${encodeURIComponent(id)}/notes`, {
    method: "PUT", body: { body },
  })).data;
}

export async function deleteSermonNote(id) {
  await api.request(`/api/v1/me/sermons/${encodeURIComponent(id)}/notes`, { method: "DELETE" });
}
