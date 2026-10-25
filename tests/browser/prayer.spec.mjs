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
  await page.getByRole("button", { name: "Submit request" }).click();
  const card = page.locator("article.prayer-card").filter({ hasText: "Please pray for our youth service." });
  await expect(card).toBeVisible();
  await expect(card.getByText("You", { exact: true })).toBeVisible();
  expect(calls.find((call) => call.path === "/api/v1/prayer/requests" && call.method === "POST")?.body)
    .toEqual({ body: "Please pray for our youth service.", visibility: "community", anonymous: true });

  await card.getByRole("button", { name: /I prayed for this/ }).click();
  expect(calls.some((call) => call.path.endsWith("/prayed") && call.method === "PUT")).toBe(true);
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
  await page.getByRole("button", { name: "Submit request" }).click();
  expect(calls.find((call) => call.path === "/api/v1/prayer/requests" && call.method === "POST")?.body)
    .toEqual({ body: "Please pray for the choir.", visibility: "group", anonymous: false, groupId: "33333333-3333-4333-8333-333333333333" });
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
  const card = page.locator("article.prayer-card").filter({ hasText: "Please pray for peace in our community." });
  await card.getByRole("button", { name: "Report request" }).click();
  await card.getByLabel("Reason for report").selectOption("safety");
  await card.getByLabel("More detail (optional)").fill("Please review this request.");
  await card.getByRole("button", { name: "Submit report" }).click();
  await expect(card.getByText("Report submitted for review.")).toBeVisible();
  expect(reports).toBe(1);
});

test("scoped moderators can review reports and hide a reported request", async ({ page }) => {
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
  await page.goto("/#/prayer");
  await page.getByRole("tab", { name: "Moderation reports" }).click();
  await expect(page.getByText("Please pray for peace in our community.")).toBeVisible();
  await page.getByLabel("Moderation reason").fill("Violates community guidelines.");
  await page.getByRole("button", { name: "Hide request" }).click();
  await expect(page.getByText("Request hidden from the prayer wall.")).toBeVisible();
  expect(decisions).toEqual([{ decision: "hide", reason: "Violates community guidelines." }]);
});
