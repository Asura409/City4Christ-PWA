import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

const STAFF = {
  roles: [{ role: "staff", scope: "" }],
  capabilities: [{ permission: "members.records.read", scope: "" }],
};

const SUPER_ADMIN = {
  roles: [{ role: "super_administrator", scope: "" }],
  capabilities: [
    { permission: "members.records.read", scope: "" },
    { permission: "members.records.audit.read", scope: "" },
  ],
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
  await expect(roster.getByRole("button", { name: "Review email access history" })).toHaveCount(0);
  expect(reads).toEqual(["/api/v1/admin/members", `/api/v1/admin/members/${id}`]);
});

test("Super Admin can open the redacted member email access history", async ({ page }) => {
  await mocked(page, { signedIn: true, access: SUPER_ADMIN });
  const id = "11111111-1111-4111-8111-111111111111";
  const paths = [];
  await page.route("**/api/v1/admin/members**", async (route) => {
    const url = new URL(route.request().url());
    paths.push(url.pathname);
    if (url.pathname.endsWith("/access-audit")) {
      return route.fulfill({ json: { data: [{ id: "42", actorId: "22222222-2222-4222-8222-222222222222", action: "detail_view", sensitiveFields: ["email"], occurredAt: "2026-11-02T12:00:00Z" }], meta: { nextCursor: "" } } });
    }
    if (url.pathname.endsWith(`/${id}`)) {
      return route.fulfill({ json: { data: { id, firstName: "Grace", lastName: "Member", email: "grace@example.invalid", joinedAt: "2026-10-01T00:00:00Z" } } });
    }
    return route.fulfill({ json: { data: [{ id, firstName: "Grace", lastName: "Member", email: "grace@example.invalid", joinedAt: "2026-10-01T00:00:00Z" }], meta: { nextCursor: "" } } });
  });

  await page.goto("/#/admin/members");
  const roster = page.getByRole("region", { name: "Member administration" });
  await roster.getByLabel("Search by name or email").fill("Grace");
  await roster.getByRole("button", { name: "Search members" }).click();
  await roster.getByRole("button", { name: "View member details" }).click();
  await expect(roster.getByRole("button", { name: "Review email access history" })).toBeVisible();
  await roster.getByRole("button", { name: "Review email access history" }).click();
  await expect(roster.getByText("detail_view")).toBeVisible();
  await expect(roster.getByText("grace@example.invalid", { exact: true })).toBeVisible();
  expect(paths).toContain(`/api/v1/admin/members/${id}/access-audit`);
});
