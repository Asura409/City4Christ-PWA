import { api } from "@/auth/session";
export const getTranslations = async (signal) =>
  (await api.request("/api/v1/bible/translations", { public: true, signal }))
    .data;
export const lookupPassage = async (reference, translation, signal) =>
  (
    await api.request(
      "/api/v1/bible/passages?" +
        new URLSearchParams({ reference, translation }),
      { public: true, signal },
    )
  ).data;
export function bibleLink(reference, translationName = "") {
  const q = new URLSearchParams({ reference });
  if (translationName) q.set("translationName", translationName);
  return "#/bible?" + q;
}
