import { test, expect } from "@playwright/test";
import { mocked, SERMON, STAFF_ACCESS } from "./fixtures/api.mjs";
test("register, verify, sign in and sign out without storing credentials", async ({
  page,
}) => {
  const { calls } = await mocked(page);
  await page.goto("/auth.html");
  await page.getByRole("tab", { name: "Create account" }).click();
  const register = page.getByRole("form", { name: "Create account" });
  await register.getByLabel("First name", { exact: true }).fill("Grace");
  await register.getByLabel("Last name", { exact: true }).fill("Member");
  await register
    .getByLabel("Email", { exact: true })
    .fill("tester@example.invalid");
  await register
    .getByLabel("Password (at least 15 characters)", { exact: true })
    .fill("a sufficiently long test password");
  await register
    .getByLabel("Confirm password", { exact: true })
    .fill("a sufficiently long test password");
  await register
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  const verify = page.getByRole("form", { name: "Verify email" });
  await verify.getByLabel("Verification code").fill("12345678");
  await verify
    .getByRole("button", { name: "Verify email", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Email verified");
  const login = page.getByRole("form", { name: "Sign in", exact: true });
  await login
    .getByLabel("Password", { exact: true })
    .fill("a sufficiently long test password");
  await login.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Grace" }),
  ).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
      url: location.href,
    }),
  );
  expect(stored).not.toContain("private-browser-token");
  expect(stored).not.toContain("password");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("form", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(calls.some((c) => c.path.endsWith("/auth/logout"))).toBeTruthy();
});
test("profile edits and directory visibility use private authenticated requests", async ({
  page,
}) => {
  const { calls } = await mocked(page, { signedIn: true });
  await page.goto("/profile.html");
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
    "Grace",
  );
  await page.getByLabel("First name", { exact: true }).fill("Hope");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("saved");
  const patch = calls.find(
    (c) => c.path === "/api/v1/me" && c.method === "PATCH",
  );
  expect(patch.body).toEqual({ firstName: "Hope", directoryVisible: true });
  expect(patch.headers.authorization).toBe("Bearer private-browser-token");
  await page.getByRole("button", { name: "Check session" }).click();
  await expect(page.getByRole("status")).toContainText("session is active");
  await page.goto("/members.html");
  await expect(
    page.getByRole("heading", { name: "Hope Member" }),
  ).toBeVisible();
  expect(await page.locator("#member-results").textContent()).not.toContain(
    "tester@example.invalid",
  );
});
test("Word Hub uses public catalog/detail and safely renders supplied text", async ({
  page,
}) => {
  const { calls } = await mocked(page);
  await page.goto("/word.html");
  await expect(page.locator("#sermon-results h2")).toHaveText(
    "<img src=x onerror=alert(1)>",
  );
  await expect(page.locator("#sermon-results img")).toHaveCount(0);
  await page
    .getByRole("searchbox", { name: "Search sermons", exact: true })
    .fill("faith");
  await page
    .getByRole("button", { name: "Search sermons", exact: true })
    .click();
  await expect
    .poll(() =>
      calls
        .filter((c) => c.path === "/api/v1/sermons")
        .at(-1)
        ?.query.get("query"),
    )
    .toBe("faith");
  await page.getByRole("link", { name: "Open sermon" }).click();
  await expect(page.locator("#sermon-detail h2")).toHaveText("Living in Faith");
});
test("staff create and publish bodies omit response-only fields and role grants stay explicit", async ({
  page,
}) => {
  const { calls } = await mocked(page, {
    signedIn: true,
    access: STAFF_ACCESS,
  });
  await page.goto("/staff.html");
  const editor = page.getByRole("form", { name: "Sermon editor" });
  await editor.getByLabel("Title", { exact: true }).fill("A test sermon");
  await editor.getByLabel("Speaker", { exact: true }).fill("Test Speaker");
  await editor
    .getByLabel("Preached at (your local time)")
    .fill("2026-10-17T12:00");
  await editor
    .getByRole("button", { name: "Create draft", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Draft created");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("published");
  const patch = calls.find(
    (c) => c.path === "/api/v1/admin/sermons/" + SERMON && c.method === "PATCH",
  );
  expect(patch.body).toEqual({ version: 1, status: "published" });
  const roles = page.getByRole("form", { name: "Role appointment" });
  await roles
    .getByLabel("Member account ID")
    .fill("33333333-3333-4333-8333-333333333333");
  await roles.getByLabel("Reason").fill("Preview role test");
  await roles.getByRole("button", { name: "Grant role", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Role granted");
  expect(
    calls.some(
      (c) =>
        c.path.endsWith("/roles") &&
        c.method === "POST" &&
        c.body.role === "content_editor",
    ),
  ).toBeTruthy();
});
