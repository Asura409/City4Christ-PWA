import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

const STAFF = {
  roles: [{ role: "staff", scope: "" }],
  capabilities: [{ permission: "members.records.read", scope: "" }],
};

test("authorized staff can search the read-only member roster", async ({ page }) => {
  await mocked(page, { signedIn: true, access: STAFF });
  const searches = [];
  await page.route("**/api/v1/admin/members**", async (route) => {
    const url = new URL(route.request().url());
    searches.push(url.searchParams.toString());
    return route.fulfill({ json: {
      data: [{ id: "11111111-1111-4111-8111-111111111111", firstName: "Grace", lastName: "Member", email: "grace@example.invalid", joinedAt: "2026-10-01T00:00:00Z" }],
      meta: { nextCursor: "" },
    } });
  });

  await page.goto("/#/admin/members");
  const roster = page.getByRole("region", { name: "Member administration" });
  await expect(roster).toBeVisible();
  await roster.getByLabel("Search by name or email").fill("grace@example.invalid");
  await roster.getByRole("button", { name: "Search members" }).click();
  await expect(roster.getByText("Grace Member")).toBeVisible();
  await expect(roster.getByText("grace@example.invalid")).toBeVisible();
  await expect(roster.getByText(/Joined/)).toBeVisible();
  await expect(roster.getByText(/password|MFA|role|session/i)).toHaveCount(0);
  expect(searches).toHaveLength(1);
  expect(searches[0]).toContain("query=grace%40example.invalid");
});
