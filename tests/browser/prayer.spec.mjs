import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

test("members create a prayer, acknowledge it and mark their own request answered", async ({ page }) => {
  const { calls } = await mocked(page, { signedIn: true });
  await page.goto("/#/prayer");

  await expect(page.getByRole("heading", { name: "Prayer wall" })).toBeVisible();
  await expect(page.getByText("Design preview")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Prayer request" }).fill("Please pray for our youth service.");
  await page.getByLabel("Who can see this request?").selectOption("community");
  await page.getByLabel("Post anonymously").check();
  await page.getByRole("button", { name: "Share request" }).click();
  const card = page.locator("article.prayer-v2-card").filter({ hasText: "Please pray for our youth service." });
  await expect(card).toBeVisible();
  await expect(card.getByText("You", { exact: true })).toBeVisible();
  expect(calls.find((call) => call.path === "/api/v1/prayer/requests" && call.method === "POST")?.body)
    .toEqual({ body: "Please pray for our youth service.", visibility: "community", anonymous: true });

  await card.getByRole("button", { name: /I prayed/ }).click();
  expect(calls.some((call) => call.path.endsWith("/prayed") && call.method === "PUT")).toBe(true);
  await card.getByLabel("More actions").click();
  await card.getByRole("button", { name: "Mark answered" }).click();
  expect(calls.some((call) => call.path === "/api/v1/prayer/requests/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" && call.method === "PATCH" && call.body.status === "answered")).toBe(true);
  await page.getByRole("tab", { name: "Answered" }).click();
  await expect(page.getByText("Please pray for our youth service.")).toBeVisible();
});

test("members can scope a prayer request to an active group membership", async ({ page }) => {
  const { calls } = await mocked(page, { signedIn: true, activeGroupMembership: true });
  await page.goto("/#/prayer");
  await page.getByLabel("Who can see this request?").selectOption("group");
  await page.getByRole("textbox", { name: "Prayer request" }).fill("Please pray for the choir.");
  await page.getByLabel("Group", { exact: true }).selectOption("33333333-3333-4333-8333-333333333333");
  await page.getByRole("button", { name: "Share request" }).click();
  expect(calls.find((call) => call.path === "/api/v1/prayer/requests" && call.method === "POST")?.body)
    .toEqual({ body: "Please pray for the choir.", visibility: "group", anonymous: false, groupId: "33333333-3333-4333-8333-333333333333" });
});

test("members can read and share encouragements on a visible request", async ({ page }) => {
  const { calls } = await mocked(page, { signedIn: true });
  await page.goto("/#/prayer");
  const card = page.locator("article.prayer-v2-card").filter({ hasText: "Please pray for peace in our community." });
  await card.getByRole("button", { name: "Encourage" }).click();
  const sheet = page.getByRole("dialog", { name: "Encouragements" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Be the first to share a kind word.")).toBeVisible();
  await sheet.getByLabel("Your encouragement").fill("Standing with you in prayer.");
  await sheet.getByRole("button", { name: "Share encouragement" }).click();
  await expect(sheet.getByText("Standing with you in prayer.")).toBeVisible();
  expect(calls.some((call) => call.path.endsWith("/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/encouragements") && call.method === "GET")).toBe(true);
  expect(calls.find((call) => call.path.endsWith("/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/encouragements") && call.method === "POST")?.body)
    .toEqual({ body: "Standing with you in prayer." });
});

test("members can file a scoped report without exposing private requests", async ({ page }) => {
  const { calls } = await mocked(page, { signedIn: true });
  let reports = 0;
  await page.route("**/api/v1/prayer/requests/*/reports", async (route) => {
    reports++;
    const request = route.request();
    const body = request.postDataJSON();
    expect(body).toEqual({ reason: "safety", details: "Please review this request." });
    await route.fulfill({ status: 201, json: { data: { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", status: "pending" } } });
  });
  await page.goto("/#/prayer");
  const card = page.locator("article.prayer-v2-card").filter({ hasText: "Please pray for peace in our community." });
  await card.getByLabel("More actions").click();
  await card.getByRole("button", { name: "Report request" }).click();
  const sheet = page.getByRole("dialog", { name: "Report prayer request" });
  await sheet.getByLabel("Reason for report").selectOption("safety");
  await sheet.getByLabel("More detail (optional)").fill("Please review this request.");
  await sheet.getByRole("button", { name: "Submit report" }).click();
  await expect(page.getByText("Report submitted for review.")).toBeVisible();
  expect(reports).toBe(1);
});

test("scoped moderators review reports from the administration queue", async ({ page }) => {
  await mocked(page, {
    signedIn: true,
    access: { roles: [{ role: "staff", scope: "" }], capabilities: [{ permission: "prayer.moderate", scope: "" }] },
  });
  const decisions = [];
  await page.route("**/api/v1/prayer/reports**", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      return route.fulfill({ json: { data: [{ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", requestBody: "Please pray for peace in our community.", requestVisibility: "community", anonymous: true, reason: "safety", details: "Please review.", status: "pending", createdAt: new Date().toISOString() }] } });
    }
    const body = request.postDataJSON();
    decisions.push(body);
    return route.fulfill({ json: { data: { changed: true } } });
  });
  await page.goto("/#/admin/prayer-reports");
  await expect(page.getByText("Please pray for peace in our community.")).toBeVisible();
  await page.getByLabel("Moderation reason").fill("Violates community guidelines.");
  await page.getByRole("button", { name: "Hide request" }).click();
  await expect(page.getByText("Request hidden from the prayer wall.")).toBeVisible();
  expect(decisions).toEqual([{ decision: "hide", reason: "Violates community guidelines." }]);
});

test("mobile uses the share sheet and the wall stays inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await mocked(page, { signedIn: true });
  await page.goto("/#/prayer");
  await page.getByRole("button", { name: "Share a prayer" }).click();
  const sheet = page.getByRole("dialog", { name: "Share a prayer" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("textbox", { name: "Prayer request" }).fill("Please pray for our family.");
  await sheet.getByRole("button", { name: "Share request" }).click();
  await expect(page.locator("article.prayer-v2-card").filter({ hasText: "Please pray for our family." })).toBeVisible();
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth + 1);
  expect(overflow).toBe(false);
});
