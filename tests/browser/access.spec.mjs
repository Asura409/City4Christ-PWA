import { test, expect } from "@playwright/test";
import { mocked, STAFF_ACCESS } from "./fixtures/api.mjs";
const empty = { roles: [], capabilities: [] };

test("member has no staff controls and no privileged requests", async ({
  page,
}) => {
  const { calls } = await mocked(page, { signedIn: true });
  await page.goto("/staff.html");
  await expect(
    page.getByRole("form", { name: "Sermon editor", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole("form", { name: "Role appointment", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Staff tools", exact: true }),
  ).toBeHidden();
  await expect(page.locator("#staff-access-empty")).toBeVisible();
  expect(calls.some((c) => c.path.startsWith("/api/v1/admin/"))).toBe(false);
});
for (const role of ["content_editor", "access_administrator"]) {
  test(`${role} sees only its assigned tools`, async ({ page }) => {
    const permission =
      role === "content_editor" ? "sermons.manage" : "roles.manage";
    await mocked(page, {
      signedIn: true,
      access: {
        roles: [{ role, scope: "" }],
        capabilities: [{ permission, scope: "" }],
      },
    });
    await page.goto("/staff.html");
    await expect(
      page.getByRole("link", { name: "Staff tools", exact: true }),
    ).toBeVisible();
    const editor = page.getByRole("form", {
        name: "Sermon editor",
        exact: true,
      }),
      appointments = page.getByRole("form", {
        name: "Role appointment",
        exact: true,
      });
    if (role === "content_editor") {
      await expect(editor).toBeVisible();
      await expect(appointments).toBeHidden();
    } else {
      await expect(editor).toBeHidden();
      await expect(appointments).toBeVisible();
    }
  });
}
test("refresh hides revoked tools and failed access reads fail closed", async ({
  page,
}) => {
  const fixture = await mocked(page, { signedIn: true, access: STAFF_ACCESS });
  await page.goto("/staff.html");
  const editor = page.getByRole("form", { name: "Sermon editor", exact: true });
  await expect(editor).toBeVisible();
  fixture.setAccess(empty);
  await page
    .getByRole("button", { name: "Refresh permissions", exact: true })
    .click();
  await expect(editor).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Staff tools", exact: true }),
  ).toBeHidden();
  fixture.setAccess(STAFF_ACCESS);
  await page
    .getByRole("button", { name: "Refresh permissions", exact: true })
    .click();
  await expect(editor).toBeVisible();
  await page.route("**/api/v1/me/access", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: {
          code: "unavailable",
          message: "Permissions temporarily unavailable.",
        },
      },
    }),
  );
  await page
    .getByRole("button", { name: "Refresh permissions", exact: true })
    .click();
  await expect(editor).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Staff tools", exact: true }),
  ).toBeHidden();
  await expect(page.getByRole("alert")).toContainText("unavailable");
});
test("ministry leader sees its scope without global publishing or delegation", async ({
  page,
}) => {
  const scope = "33333333-3333-4333-8333-333333333333";
  await mocked(page, {
    signedIn: true,
    access: {
      roles: [{ role: "ministry_leader", scope }],
      capabilities: [{ permission: "ministry.members.manage", scope }],
    },
  });
  await page.goto("/profile.html");
  await expect(page.locator("#access-roles")).toContainText(scope);
  await expect(
    page.getByRole("link", { name: "Staff tools", exact: true }),
  ).toBeHidden();
});

test("returning focus refreshes revoked access and coalesces repeated events", async ({
  page,
}) => {
  const fixture = await mocked(page, { signedIn: true, access: STAFF_ACCESS });
  await page.goto("/staff.html");
  await expect(
    page.getByRole("form", { name: "Sermon editor", exact: true }),
  ).toBeVisible();
  const before = fixture.calls.filter(
    (c) => c.path === "/api/v1/me/access",
  ).length;
  fixture.setAccess(empty);
  await page.evaluate(() => {
    const later = Date.now() + 60000;
    Date.now = () => later;
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("focus"));
  });
  await expect(page.locator("#staff-access-empty")).toBeVisible();
  await expect(
    page.getByRole("form", { name: "Sermon editor", exact: true }),
  ).toBeHidden();
  expect(
    fixture.calls.filter((c) => c.path === "/api/v1/me/access").length,
  ).toBe(before + 1);
});
