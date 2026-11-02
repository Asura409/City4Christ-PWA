import { api } from "@/auth/session";
import { uploadMedia } from "@/media/api";

export { uploadMedia };

export async function listPosts({
  cursor = "",
  limit = 20,
  signal,
  groupId = "",
} = {}) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  if (groupId) query.set("groupId", groupId);
  const result = await api.request(`/api/v1/posts?${query}`, { signal });
  return {
    posts: Array.isArray(result.data) ? result.data : [],
    nextCursor: result.meta?.nextCursor || "",
  };
}

export async function createPost(body) {
  return (await api.request("/api/v1/posts", { method: "POST", body })).data;
}

export async function updatePost(postId, body, attachmentIds = []) {
  return (
    await api.request(`/api/v1/posts/${encodeURIComponent(postId)}`, {
      method: "PUT",
      body: { body, attachmentIds },
    })
  ).data;
}

export async function deletePost(postId) {
  await api.request(`/api/v1/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
  });
}

export async function setPostAmen(postId) {
  return (
    await api.request(`/api/v1/posts/${encodeURIComponent(postId)}/reaction`, {
      method: "PUT",
      body: { reaction: "amen" },
    })
  ).data;
}

export async function removePostAmen(postId) {
  return (
    await api.request(`/api/v1/posts/${encodeURIComponent(postId)}/reaction`, {
      method: "DELETE",
    })
  ).data;
}

export async function listPostComments(
  postId,
  { cursor = "", limit = 20, signal } = {},
) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  const result = await api.request(
    `/api/v1/posts/${encodeURIComponent(postId)}/comments?${query}`,
    { signal },
  );
  return {
    comments: Array.isArray(result.data) ? result.data : [],
    nextCursor: result.meta?.nextCursor || "",
  };
}

export async function createPostComment(postId, body) {
  return (
    await api.request(`/api/v1/posts/${encodeURIComponent(postId)}/comments`, {
      method: "POST",
      body: { body },
    })
  ).data;
}

export async function deletePostComment(postId, commentId) {
  await api.request(
    `/api/v1/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function reportCommunityContent(
  targetType,
  targetId,
  reason,
  details = "",
) {
  return (
    await api.request("/api/v1/content-reports", {
      method: "POST",
      body: {
        targetType,
        targetId,
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
      },
    })
  ).data;
}

export async function listCommunityReports({
  status = "pending",
  cursor = "",
  limit = 20,
  signal,
  groupId = "",
} = {}) {
  const query = new URLSearchParams({ status, limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  if (groupId) query.set("groupId", groupId);
  const result = await api.request(
    `/api/v1/moderation/content-reports?${query}`,
    { signal },
  );
  return {
    reports: Array.isArray(result.data) ? result.data : [],
    nextCursor: result.meta?.nextCursor || "",
  };
}

export async function getCommunityModerationAccess({ signal } = {}) {
  return (await api.request("/api/v1/me/access", { signal })).data;
}

export async function reviewCommunityReport(reportId, decision, reason) {
  if (decision !== "hide" && decision !== "dismiss")
    throw new TypeError("Unsupported community report decision.");
  await api.request(
    `/api/v1/moderation/content-reports/${encodeURIComponent(reportId)}/review`,
    {
      method: "POST",
      body: { decision, reason },
    },
  );
}

export function uploadPostMedia(file, options) {
  return uploadMedia(file, "post_attachment", options);
}

export function uploadMessageMedia(file, options) {
  return uploadMedia(file, "message_attachment", options);
}
