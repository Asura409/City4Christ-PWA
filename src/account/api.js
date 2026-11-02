import { api } from "@/auth/session";
export async function deletionStatus(signal) {
  return (await api.request("/api/v1/me/deletion-request", { signal })).data;
}
export async function listDeletionRequests({
  status = "requested",
  cursor = "",
  signal,
} = {}) {
  const query = new URLSearchParams({ status, limit: "20" });
  if (cursor) query.set("cursor", cursor);
  const result = await api.request(
    "/api/v1/admin/account-deletion-requests?" + query,
    { signal },
  );
  return { items: result.data, nextCursor: result.meta?.nextCursor || "" };
}
export async function deletionDetail(id, signal) {
  return (
    await api.request(
      `/api/v1/admin/account-deletion-requests/${encodeURIComponent(id)}`,
      { signal },
    )
  ).data;
}
export async function markDeletionReviewing(id, version) {
  return (
    await api.request(
      `/api/v1/admin/account-deletion-requests/${encodeURIComponent(id)}`,
      { method: "PATCH", body: { status: "reviewing", version } },
    )
  ).data;
}
export async function restoreDeletionRequest(id, version, reason) {
  return (
    await api.request(
      `/api/v1/admin/account-deletion-requests/${encodeURIComponent(id)}/restore`,
      { method: "POST", body: { version, reason } },
    )
  ).data;
}
export function isConfirmationError(error) {
  return ["reauthentication_required", "mfa_required"].includes(error.code);
}
