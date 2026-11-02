import { test, expect } from "@playwright/test";
import { mocked, STAFF_ACCESS } from "./fixtures/api.mjs";

test("sermon editors can find drafts, scheduled sermons, and continue the list", async ({ page }) => {
  await mocked(page, { signedIn: true, access: STAFF_ACCESS });
  const requests = [];
  await page.route("**/api/v1/admin/sermons**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.searchParams.toString());
    const first = !url.searchParams.has("cursor") && !url.searchParams.has("status");
    const scheduledOnly = url.searchParams.get("status") === "scheduled";
    return route.fulfill({ json: {
      data: scheduledOnly ? [
        { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", title: "Next Sunday", speaker: "Pastor Joy", status: "scheduled", version: 3, attachmentIds: [] },
      ] : first ? [
        { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: "Draft of hope", speaker: "Pastor Grace", status: "draft", version: 1, attachmentIds: [] },
        { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", title: "Next Sunday", speaker: "Pastor Joy", status: "scheduled", version: 3, attachmentIds: [] },
      ] : [
        { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", title: "Sunday service", speaker: "Pastor Lee", status: "published", version: 2, attachmentIds: [] },
      ],
      meta: { nextCursor: first ? "next-page" : "" },
    } });
  });

  await page.goto("/#/word");
  const list = page.getByRole("region", { name: "Sermon editorial list" });
  await expect(list).toBeVisible();
  await expect(list.getByText("Draft of hope")).toBeVisible();
  await expect(list.getByText("Next Sunday")).toBeVisible();
  await expect(list.locator(".editorial-sermon-status").filter({ hasText: "Scheduled" })).toBeVisible();
  await list.getByRole("button", { name: "Load more editorial sermons" }).click();
  await expect(list.getByText("Sunday service")).toBeVisible();
  await list.getByLabel("Status").selectOption("scheduled");
  await expect(list.getByText("Next Sunday")).toBeVisible();
  await expect(list.getByText("Draft of hope")).toHaveCount(0);
  expect(requests).toHaveLength(3);
  expect(requests[0]).toContain("limit=20");
  expect(requests[1]).toContain("cursor=next-page");
  expect(requests[2]).toContain("status=scheduled");
});
