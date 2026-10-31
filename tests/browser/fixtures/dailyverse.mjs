import { devotionalMock } from "./devotionals.mjs";
export const VERSE = "88888888-8888-4888-8888-888888888888";
export async function dailyVerseMock(
  page,
  { editor = false, available = true, rollover = false } = {},
) {
  await devotionalMock(page, { editor });
  const calls = [];
  let reads = 0;
  let entry = available
    ? {
        id: VERSE,
        displayDate: "2026-10-31",
        text: "Synthetic daily verse.",
        scriptureReference: "Test 1:1",
        translation: "Test translation",
        status: "published",
        version: 2,
        publishedAt: "2026-10-31T09:00:00Z",
        createdAt: "2026-10-31T09:00:00Z",
        updatedAt: "2026-10-31T09:00:00Z",
      }
    : null;
  await page.route(
    /\/api\/v1\/(?:daily-verse|admin\/daily-verses(?:\/[^?]+)?)(?:\?.*)?$/,
    async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname,
        method = request.method();
      let body;
      try {
        body = request.postDataJSON();
      } catch {}
      calls.push({ path, method, body });
      if (path === "/api/v1/daily-verse") {
        reads++;
        const next = rollover && reads > 1,
          date = next ? "2026-11-01" : "2026-10-31",
          serverTime = next
            ? "2026-10-31T23:00:00Z"
            : rollover
              ? "2026-10-31T22:59:59Z"
              : "2026-10-31T10:00:00Z";
        const verse =
          entry?.status === "published" && entry.displayDate === date
            ? {
                id: entry.id,
                displayDate: entry.displayDate,
                text: entry.text,
                scriptureReference: entry.scriptureReference,
                translation: entry.translation,
              }
            : null;
        return route.fulfill({
          json: {
            data: {
              date,
              timeZone: "UTC+01:00",
              serverTime,
              nextDayAt: date + "T23:00:00Z",
              verse,
            },
          },
        });
      }
      if (!editor)
        return route.fulfill({
          status: 403,
          json: {
            error: {
              code: "forbidden",
              message: "Editor permission required.",
            },
          },
        });
      if (method === "POST") {
        entry = {
          ...body,
          id: VERSE,
          status: "draft",
          version: 1,
          publishedAt: null,
          createdAt: "2026-10-31T10:00:00Z",
          updatedAt: "2026-10-31T10:00:00Z",
        };
        return route.fulfill({ status: 201, json: { data: entry } });
      }
      if (method === "PATCH") {
        if (body.version !== entry.version)
          return route.fulfill({
            status: 409,
            json: {
              error: {
                code: "version_conflict",
                message: "Reload the latest verse before editing.",
              },
            },
          });
        entry = {
          ...entry,
          ...body,
          version: entry.version + 1,
          publishedAt: body.status === "draft" ? null : "2026-10-31T10:00:00Z",
        };
        return route.fulfill({ json: { data: entry } });
      }
      if (path.endsWith("/" + VERSE))
        return route.fulfill({ json: { data: entry } });
      return route.fulfill({
        json: { data: entry ? [entry] : [], meta: { nextCursor: "" } },
      });
    },
  );
  return { calls };
}
