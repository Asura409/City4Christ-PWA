import { api } from "@/auth/session";
import { parseTodayVerse } from "./model";
const root = "/api/v1/admin/daily-verses";
export const getTodayVerse = async (signal) =>
  parseTodayVerse(
    (await api.request("/api/v1/daily-verse", { public: true, signal })).data,
  );
export const getVerse = async (id) =>
  (await api.request(root + "/" + encodeURIComponent(id))).data;
export const createVerse = async (body) =>
  (await api.request(root, { method: "POST", body })).data;
export const updateVerse = async (id, body) =>
  (
    await api.request(root + "/" + encodeURIComponent(id), {
      method: "PATCH",
      body,
    })
  ).data;
