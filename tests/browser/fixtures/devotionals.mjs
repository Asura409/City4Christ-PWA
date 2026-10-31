import { mocked } from "./api.mjs";
export const DEVOTIONAL = "77777777-7777-4777-8777-777777777777";
export async function devotionalMock(
  page,
  { editor = false, published = false } = {},
) {
  await mocked(page, {
    signedIn: true,
    access: editor
      ? {
          roles: [{ role: "content_editor", scope: "" }],
          capabilities: [{ permission: "devotionals.manage", scope: "" }],
        }
      : { roles: [], capabilities: [] },
  });
  const calls = [];
  let entry = published
    ? {
        id: DEVOTIONAL,
        title: "Hope today",
        body: '<img src=x onerror="window.devotionalXss=true">\nReflect and pray.',
        author: "City4Christ",
        scriptureReference: "Psalm 28:7",
        status: "published",
        version: 2,
        publishedAt: "2026-11-01T10:00:00Z",
        createdAt: "2026-11-01T09:00:00Z",
        updatedAt: "2026-11-01T10:00:00Z",
      }
    : null;
  await page.route(
    /\/api\/v1\/(?:admin\/)?devotionals(?:\/[^?]+)?(?:\?.*)?$/,
    async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname,
        method = request.method();
      let body;
      try {
        body = request.postDataJSON();
      } catch {}
      calls.push({ path, method, body });
      const admin = path.includes("/admin/");
      if (admin && !editor)
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
          id: DEVOTIONAL,
          status: "draft",
          version: 1,
          publishedAt: null,
          createdAt: "2026-11-01T10:00:00Z",
          updatedAt: "2026-11-01T10:00:00Z",
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
                message:
                  "The devotional changed. Reload its latest version before editing.",
              },
            },
          });
        entry = {
          ...entry,
          ...body,
          version: entry.version + 1,
          publishedAt:
            body.status === "draft" ? null : new Date().toISOString(),
        };
        return route.fulfill({ json: { data: entry } });
      }
      const visible = entry && (admin || entry.status === "published");
      const data =
        admin || !entry
          ? entry
          : (({ status, version, createdAt, updatedAt, ...rest }) => rest)(
              entry,
            );
      if (path.endsWith("/" + DEVOTIONAL)) {
        if (!visible)
          return route.fulfill({
            status: 404,
            json: {
              error: {
                code: "devotional_not_found",
                message: "Devotional not found.",
              },
            },
          });
        return route.fulfill({ json: { data } });
      }
      return route.fulfill({
        json: { data: visible ? [data] : [], meta: { nextCursor: "" } },
      });
    },
  );
  return { calls };
}
