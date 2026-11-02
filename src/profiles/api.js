import { api } from "@/auth/session";
import { uploadMedia } from "@/media/api";

export function uploadProfilePhoto(file, options) {
  return uploadMedia(file, "profile_photo", options);
}

export async function setProfilePhoto(uploadId) {
  return (await api.request("/api/v1/me/avatar", {
    method: "PUT",
    body: { uploadId },
  })).data;
}

export async function removeProfilePhoto() {
  return (await api.request("/api/v1/me/avatar", {
    method: "DELETE",
  })).data;
}
