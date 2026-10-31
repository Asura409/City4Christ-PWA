import { api } from "@/auth/session";
const root = "/api/v1/admin/devotionals";
export const getEditorial = async (id) =>
  (await api.request(root + "/" + encodeURIComponent(id))).data;
export const createDraft = async (content) =>
  (await api.request(root, { method: "POST", body: content })).data;
export const updateDraft = async (id, body) =>
  (
    await api.request(root + "/" + encodeURIComponent(id), {
      method: "PATCH",
      body,
    })
  ).data;
export const readPublished = async (id) =>
  (
    await api.request("/api/v1/devotionals/" + encodeURIComponent(id), {
      public: true,
    })
  ).data;
