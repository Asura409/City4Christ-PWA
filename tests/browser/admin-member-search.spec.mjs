import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

const STAFF = {
  roles: [{ role: "staff", scope: "" }],
  capabilities: [
    { permission: "members.records.read", scope: "" },
    { permission: "members.records.manage", scope: "" },
  ],
};

const SUPER_ADMIN = {
  roles: [{ role: "super_administrator", scope: "" }],
  capabilities: [
    { permission: "members.records.read", scope: "" },
    { permission: "members.records.audit.read", scope: "" },
    { permission: "members.records.manage", scope: "" },
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
  await expect(roster.getByRole("button", { name: "Review member record history" })).toHaveCount(0);
  expect(reads).toEqual(["/api/v1/admin/members", `/api/v1/admin/members/${id}`]);
});

test("Super Admin can open the redacted member record history", async ({ page }) => {
  await mocked(page, { signedIn: true, access: SUPER_ADMIN });
  const id = "11111111-1111-4111-8111-111111111111";
  const paths = [];
  await page.route("**/api/v1/admin/members**", async (route) => {
    const url = new URL(route.request().url());
    paths.push(url.pathname);
    if (url.pathname.endsWith("/access-audit")) {
      return route.fulfill({ json: { data: [{ id: "42", actorId: "22222222-2222-4222-8222-222222222222", action: "name_update", sensitiveFields: ["firstName"], reason: "Member requested correction", occurredAt: "2026-11-02T12:00:00Z" }], meta: { nextCursor: "" } } });
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
  await expect(roster.getByRole("button", { name: "Review member record history" })).toBeVisible();
  await roster.getByRole("button", { name: "Review member record history" }).click();
  await expect(roster.getByText("name_update")).toBeVisible();
  await expect(roster.getByText(/Member requested correction/)).toBeVisible();
  await expect(roster.getByText("grace@example.invalid", { exact: true })).toBeVisible();
  expect(paths).toContain(`/api/v1/admin/members/${id}/access-audit`);
});

test("staff can correct a member name with a reason and the current version", async ({ page }) => {
  await mocked(page, { signedIn: true, access: STAFF });
  const id = "11111111-1111-4111-8111-111111111111";
  let correction;
  await page.route("**/api/v1/admin/members**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "PATCH") {
      correction = request.postDataJSON();
      return route.fulfill({ json: { data: { id, firstName: "Grace", lastName: "Corrected", joinedAt: "2026-10-01T00:00:00Z", version: 2 } } });
    }
    if (url.pathname.endsWith(`/${id}`)) {
      return route.fulfill({ json: { data: { id, firstName: "Grace", lastName: "Member", email: "grace@example.invalid", joinedAt: "2026-10-01T00:00:00Z", version: 1 } } });
    }
    return route.fulfill({ json: { data: [{ id, firstName: "Grace", lastName: "Member", email: "grace@example.invalid", joinedAt: "2026-10-01T00:00:00Z" }], meta: { nextCursor: "" } } });
  });
  await page.goto("/#/admin/members");
  const roster = page.getByRole("region", { name: "Member administration" });
  await roster.getByLabel("Search by name or email").fill("Grace");
  await roster.getByRole("button", { name: "Search members" }).click();
  await roster.getByRole("button", { name: "View member details" }).click();
  await roster.getByLabel("Last name").fill("Corrected");
  await roster.getByLabel("Reason for correction").fill("Member asked to correct the spelling");
  await roster.getByRole("button", { name: "Save name correction" }).click();
  await expect(roster.getByRole("heading", { name: "Grace Corrected" })).toBeVisible();
  expect(correction).toEqual({ lastName: "Corrected", expectedVersion: 1, reason: "Member asked to correct the spelling" });
});
