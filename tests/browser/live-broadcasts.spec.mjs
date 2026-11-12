import { test, expect } from "@playwright/test";
import { mocked, STAFF_ACCESS } from "./fixtures/api.mjs";
const VIDEO = "https://www.youtube.com/watch?v=M7lc1UVf-VE";
async function fixture(page, { editor = false, empty = false, failPublish = false } = {}) {
  await mocked(page, { signedIn: true, access: editor ? STAFF_ACCESS : { roles: [], capabilities: [] } });
  await page.route("https://www.youtube-nocookie.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>Video player</p>" }));
  let entries = empty ? [] : [
    { id: "11111111-1111-4111-8111-111111111111", title: "Latest worship", videoUrl: VIDEO, description: "Join our service.", serviceAt: "2026-11-08T10:00:00Z", broadcastStatus: "live", status: "published", version: 2, publishedAt: "2026-11-08T10:00:00Z" },
    { id: "22222222-2222-4222-8222-222222222222", title: "Earlier worship", videoUrl: VIDEO, description: "Our earlier service.", serviceAt: "2026-11-01T10:00:00Z", broadcastStatus: "replay", status: "published", version: 2, publishedAt: "2026-11-01T10:00:00Z" },
  ];
  const calls = [];
  await page.route("**/api/v1/**livebroadcasts**", async (route) => {
    const request = route.request(), url = new URL(request.url()), admin = url.pathname.includes("/admin/"), id = url.pathname.match(/livebroadcasts\/(.+)$/)?.[1], method = request.method();
    const body = request.postDataJSON();
    calls.push({ method, body, admin, id });
    if (admin && !editor) return route.fulfill({ status: 403, json: { error: { code: "forbidden", message: "Editor access required" } } });
    const result = (data, status = 200) => route.fulfill({ status, json: { data, meta: { nextCursor: "" } } });
    if (method === "POST") {
      const entry = { ...body, id: "33333333-3333-4333-8333-333333333333", status: "draft", version: 1, publishedAt: null };
      entries.unshift(entry); return result(entry, 201);
    }
    if (method === "PATCH") {
      if (failPublish && body.status === "published") return route.fulfill({ status: 409, json: { error: { code: "version_conflict", message: "Reload the latest version before editing." } } });
      const index = entries.findIndex((entry) => entry.id === id);
      if (index < 0) return result(null, 404);
      const entry = { ...entries[index], ...body, version: entries[index].version + 1, publishedAt: body.status === "draft" ? null : "2026-11-12T20:00:00Z" };
      if (entry.status === "published") entries = entries.map((value) => value.id !== id && value.broadcastStatus === "live" ? { ...value, broadcastStatus: "replay", version: value.version + 1 } : value);
      entries[index] = entry; return result(entry);
    }
    const visible = entries.filter((entry) => admin || entry.status === "published");
    if (id) return result(visible.find((entry) => entry.id === id) || null, visible.some((entry) => entry.id === id) ? 200 : 404);
    return result(visible);
  });
  return calls;
}
async function fill(page) {
  await page.getByLabel("Service title", { exact: true }).fill("Sunday hope");
  await page.getByLabel("YouTube link", { exact: true }).fill("https://youtu.be/M7lc1UVf-VE?si=share");
  await page.getByLabel("Service date & time (UK time)", { exact: true }).fill("2026-07-19T10:00");
  await page.getByLabel("Description (optional)", { exact: true }).fill("Come worship with us.");
}
test("viewer opens latest and archive without management controls", async ({ page }) => {
  await fixture(page); await page.goto("/#/live");
  await expect(page.getByRole("heading", { name: "Latest worship", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Manage broadcasts", exact: true })).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?playsinline=1");
  await page.getByRole("button", { name: "Past broadcasts", exact: true }).click();
  await page.getByRole("button", { name: /Earlier worship/ }).click();
  await expect(page.getByRole("heading", { name: "Earlier worship", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to latest", exact: false }).click();
  await expect(page.getByRole("heading", { name: "Latest worship", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("editor previews, publishes, sees latest, ends live and unpublishes", async ({ page }) => {
  const calls = await fixture(page, { editor: true }); await page.goto("/#/live");
  await page.getByRole("button", { name: "Manage broadcasts", exact: true }).click(); await fill(page);
  await page.getByLabel("Broadcast status", { exact: true }).selectOption("live");
  await page.getByRole("button", { name: "Preview video", exact: true }).click();
  await expect(page.locator('iframe[title="Sunday hope video"]')).toBeVisible();
  await page.getByRole("button", { name: "Publish broadcast", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible(); expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  await page.getByRole("button", { name: "Confirm publication", exact: true }).click();
  await expect(page.getByText("Broadcast published.", { exact: true })).toBeVisible();
  expect(calls.find((c) => c.method === "POST").body.serviceAt).toBe("2026-07-19T09:00:00.000Z");
  await page.getByRole("button", { name: "View Live", exact: false }).click();
  await expect(page.getByRole("heading", { name: "Sunday hope", exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole("heading", { name: "Sunday hope", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Manage broadcasts", exact: true }).click();
  await page.getByRole("button", { name: /Sunday hope.*Edit/s }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "End live & keep replay", exact: true }).click();
  await expect(page.getByLabel("Broadcast status", { exact: true })).toHaveValue("replay");
  await page.getByRole("button", { name: "Unpublish & save draft", exact: true }).click();
  await expect(page.getByText("Draft saved. This broadcast is hidden from viewers.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View Live", exact: false }).click();
  await expect(page.getByRole("heading", { name: "Latest worship", exact: true })).toBeVisible();
});
test("empty and unavailable are distinct and retry loads broadcasts", async ({ page }) => {
  await fixture(page, { empty: true }); await page.goto("/#/live");
  await expect(page.getByRole("heading", { name: "No broadcasts yet" })).toBeVisible();
  await page.route("**/api/v1/livebroadcasts?*", (route) => route.fulfill({ status: 503, json: { error: { code: "unavailable", message: "Broadcasts unavailable" } } }));
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Broadcasts unavailable");
  await expect(page.getByRole("heading", { name: "No broadcasts yet" })).toHaveCount(0);
  await page.unroute("**/api/v1/livebroadcasts?*"); await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No broadcasts yet" })).toBeVisible();
});
test("publication conflict preserves unsaved fields and does not duplicate the created draft", async ({ page }) => {
  const calls = await fixture(page, { editor: true, failPublish: true }); await page.goto("/#/admin/live"); await fill(page);
  await page.getByRole("button", { name: "Publish broadcast", exact: true }).click(); await page.getByRole("button", { name: "Confirm publication", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("latest version");
  await expect(page.getByLabel("Service title", { exact: true })).toHaveValue("Sunday hope");
  await expect(page.getByRole("button", { name: "Reload latest version", exact: true })).toBeVisible();
  expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
});
test("ordinary member cannot open the management screen", async ({ page }) => {
  const calls = await fixture(page); await page.goto("/#/admin/live");
  await expect(page.getByRole("alert")).toContainText("Content editor access");
  await expect(page.getByLabel("YouTube link", { exact: true })).toHaveCount(0);
  expect(calls.some((c) => c.admin)).toBe(false);
});
