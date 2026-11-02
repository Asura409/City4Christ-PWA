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
    if (url.pathname.endsWith("/11111111-1111-4111-8111-111111111111")) {
      return route.fulfill({ json: { data: { id: "11111111-1111-4111-8111-111111111111", firstName: "Grace", lastName: "Member", email: "grace@example.invalid", joinedAt: "2026-10-01T00:00:00Z" } } });
    }
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
  await expect(roster.getByText("grace@example.invalid", { exact: true })).toHaveCount(0);
  await expect(roster.getByText(/Joined/)).toBeVisible();
  await roster.getByRole("button", { name: "View member details" }).click();
  await expect(roster.getByText("grace@example.invalid", { exact: true })).toBeVisible();
  await expect(roster.getByText(/password|MFA|role|session/i)).toHaveCount(0);
  expect(searches).toHaveLength(1);
  expect(searches[0]).toContain("query=grace%40example.invalid");
});

test("staff open an explicitly audited member detail only when selected", async ({ page }) => {
  await mocked(page, { signedIn: true, access: STAFF });
  const id = "11111111-1111-4111-8111-111111111111";
  const reads = [];
  await page.route("**/api/v1/admin/members**", async (route) => {
    const url = new URL(route.request().url());
    reads.push(url.pathname);
    if (url.pathname.endsWith(`/${id}`)) {
      return route.fulfill({ json: { data: { id, firstName: "Grace", lastName: "Member", email: "grace@example.invalid", joinedAt: "2026-10-01T00:00:00Z" } } });
    }
    return route.fulfill({ json: { data: [{ id, firstName: "Grace", lastName: "Member", email: "grace@example.invalid", joinedAt: "2026-10-01T00:00:00Z" }], meta: { nextCursor: "" } } });
  });

  await page.goto("/#/admin/members");
  const roster = page.getByRole("region", { name: "Member administration" });
  await roster.getByLabel("Search by name or email").fill("Grace");
  await roster.getByRole("button", { name: "Search members" }).click();
  await expect(roster.getByText("Grace Member")).toBeVisible();
  await expect(roster.getByText("grace@example.invalid", { exact: true })).toHaveCount(0);
  await roster.getByRole("button", { name: "View member details" }).click();
  await expect(roster.getByText("grace@example.invalid", { exact: true })).toBeVisible();
  expect(reads).toEqual(["/api/v1/admin/members", `/api/v1/admin/members/${id}`]);
});
