import { api } from "@/auth/session";

export async function createSermonDraft(input) {
  return (await api.request("/api/v1/admin/sermons", { method: "POST", body: input })).data;
}

export async function publishSermon(id, version) {
  return (await api.request(`/api/v1/admin/sermons/${encodeURIComponent(id)}`, {
    method: "PATCH", body: { version, status: "published" },
  })).data;
}
