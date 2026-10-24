import { test, expect } from "@playwright/test";
import { mocked, ID, GROUP, OTHER_GROUP } from "./fixtures/api.mjs";

test("members discover church groups, request to join and see their memberships", async ({ page }) => {
  const { calls } = await mocked(page, { signedIn: true });
  await page.goto("/#/groups");

  await expect(page.getByRole("heading", { name: "Choir" })).toBeVisible();
  await expect(page.getByText("Church group").first()).toBeVisible();
  await page.getByRole("button", { name: "Request to join Choir" }).click();
  await expect(page.getByRole("status")).toContainText("Request sent");
  expect(calls.some((call) => call.path === `/api/v1/groups/${GROUP}/membership` && call.method === "POST")).toBe(true);

  await page.getByRole("tab", { name: "My groups" }).click();
  await expect(page.getByRole("button", { name: "Cancel request to join Choir" })).toBeVisible();
});

test("group leaders review requests and view their active roster", async ({ page }) => {
  const { calls } = await mocked(page, {
    signedIn: true,
    access: {
      roles: [{ role: "ministry_leader", scope: GROUP }],
      capabilities: [{ permission: "ministry.members.manage", scope: GROUP }],
    },
  });
  await page.goto(`/#/groups/${GROUP}`);

  await expect(page.getByRole("heading", { name: "Choir" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pending requests" })).toBeVisible();
  await page.getByRole("button", { name: "Approve Grace Member" }).click();
  await expect(page.getByRole("status")).toContainText("approved");
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  await expect(page.getByText("Grace Member")).toBeVisible();

  expect(calls.some((call) => call.path === `/api/v1/groups/${GROUP}/membership-requests/${ID}` && call.method === "PATCH" && call.body.decision === "approve")).toBe(true);
  expect(calls.some((call) => call.path === `/api/v1/groups/${GROUP}/members`)).toBe(true);
});

test("leadership group is rendered only when returned by the authorized API", async ({ page }) => {
  await mocked(page, { signedIn: true });
  await page.goto("/#/groups");
  await expect(page.getByRole("heading", { name: "Leadership Council" })).toHaveCount(0);
  await expect(page.getByText("Private group")).toHaveCount(0);
});

test("assigned ministry leaders can see the leadership audience while scope stays group-specific", async ({ page }) => {
  const { calls } = await mocked(page, {
    signedIn: true,
    access: {
      roles: [{ role: "ministry_leader", scope: GROUP }],
      capabilities: [{ permission: "ministry.members.manage", scope: GROUP }],
    },
  });
  await page.goto("/#/groups");
  await expect(page.getByRole("heading", { name: "Leadership Council" })).toBeVisible();
  await page.goto(`/#/groups/${OTHER_GROUP}`);
  await expect(page.getByRole("heading", { name: "Prayer Team" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pending requests" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Members" })).toHaveCount(0);
  expect(calls.some((call) => call.path === `/api/v1/groups/${OTHER_GROUP}/membership-requests`)).toBe(false);
  expect(calls.some((call) => call.path === `/api/v1/groups/${OTHER_GROUP}/members`)).toBe(false);
});
