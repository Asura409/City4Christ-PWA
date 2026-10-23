import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

const access = {
  roles: [{ role: "staff", scope: "" }],
  capabilities: [
    { permission: "groups.manage", scope: "" },
    { permission: "roles.read", scope: "" },
    { permission: "roles.operational.manage", scope: "" },
  ],
};

test("staff group administration opens as a React management screen", async ({ page }) => {
  const fixture = await mocked(page, { signedIn: true, access });
  await page.goto("/#/groups/manage");
  await expect(
    page.getByRole("heading", { name: "Manage church groups", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("form", { name: "Create church group" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Leadership Council" })).toHaveCount(0);
  await page.getByLabel("Group name").fill("Youth Ministry");
  await page.getByLabel("Description").fill("Serving young people");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page.getByRole("heading", { name: "Youth Ministry" })).toBeVisible();
  const reason = page.getByLabel("Reason", { exact: true }).first();
  await reason.fill("Ministry paused for the season");
  await page.getByRole("button", { name: "Archive group" }).first().click();
  await page.getByLabel("Include archived").check();
  await expect(page.getByText("Archived", { exact: true }).first()).toBeVisible();
  expect(fixture.calls.some((call) => call.path === "/api/v1/admin/groups" && call.method === "POST")).toBe(true);
  expect(fixture.calls.some((call) => call.method === "PATCH" && call.body?.status === "archived")).toBe(true);
});

test("ordinary members do not receive the group management interface", async ({ page }) => {
  const { calls } = await mocked(page, { signedIn: true });
  await page.goto("/#/groups/manage");
  await expect(page.getByRole("alert")).toContainText("not authorized");
  expect(calls.some((call) => call.path === "/api/v1/admin/groups")).toBe(false);
});

test("staff can appoint a scoped group leader only after identity and MFA checks", async ({ page }) => {
  const fixture = await mocked(page, { signedIn: true, access });
  await page.route("**/api/v1/auth/mfa", (route) => route.fulfill({ json: { data: { enabled: true, pending: false, freshUntil: new Date(Date.now() + 300000).toISOString(), recoveryCodesRemaining: 5 } } }));
  await page.goto("/#/groups/manage/33333333-3333-4333-8333-333333333333");
  await expect(page.getByRole("heading", { name: "Choir leaders" })).toBeVisible();
  await page.getByLabel("Search by name or email").fill("Joy");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: /Joy Leader/ }).click();
  await page.getByRole("button", { name: "Appoint leader" }).click();
  const confirm = page.getByRole("region", { name: "Confirm sensitive appointment" });
  await confirm.getByLabel("Reason").fill("Appointed by ministry leadership");
  await confirm.getByRole("button", { name: "Confirm appointment" }).click();
  await expect(page.getByRole("heading", { name: "Current leaders" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Current group leaders" }),
  ).toContainText("Joy Leader");
  const assignment = fixture.calls.find((call) => call.method === "POST" && call.path.includes("/church-roles"));
  expect(assignment.body).toEqual({ role: "ministry_leader", scope: "33333333-3333-4333-8333-333333333333", reason: "Appointed by ministry leadership" });
});
