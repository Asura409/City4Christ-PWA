import { mocked } from "./api.mjs";
import { dailyVerseMock } from "./dailyverse.mjs";
export const TRANSLATIONS = [
  {
    id: "web",
    name: "World English Bible",
    language: "English",
    license: "Public domain",
    canImport: true,
  },
  {
    id: "webbe",
    name: "World English Bible, British Edition",
    language: "English (UK)",
    license: "Public domain",
    canImport: true,
  },
  {
    id: "asv",
    name: "American Standard Version (1901)",
    language: "English",
    license: "Public domain",
    canImport: true,
  },
];
export async function bibleMock(
  page,
  { daily = false, editor = false, available = false } = {},
) {
  const state = daily
    ? await dailyVerseMock(page, { editor, available })
    : await mocked(page, { signedIn: false });
  const requests = [];
  await page.route("**/api/v1/bible/**", (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.endsWith("/translations"))
      return route.fulfill({ json: { data: TRANSLATIONS } });
    const reference = u.searchParams.get("reference"),
      id = u.searchParams.get("translation") || "web",
      translation = TRANSLATIONS.find((t) => t.id === id);
    requests.push({ reference, translation: id });
    if (!translation)
      return route.fulfill({
        status: 422,
        json: {
          error: {
            code: "validation_failed",
            message: "Choose a supported translation.",
          },
        },
      });
    const verses = [
      {
        bookId: "JHN",
        bookName: "John",
        chapter: 3,
        number: 16,
        text: translation.name + " synthetic passage.",
      },
    ];
    if (reference === "John 3")
      verses.push({
        bookId: "JHN",
        bookName: "John",
        chapter: 3,
        number: 17,
        text: "Synthetic next verse.",
      });
    return route.fulfill({
      json: {
        data: {
          reference: reference || "John 3:16",
          translation,
          text: verses.map((v) => v.text).join("\n"),
          verses,
          source: "bible-api.com",
          sourceUrl: "https://bible-api.com/John%203:16?translation=" + id,
        },
      },
    });
  });
  return { requests, calls: state?.calls || [] };
}
