import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";
test("React signup requires OTP, signs in, edits real profile and logs out", async ({
  page,
}) => {
  const { calls } = await mocked(page);
  await page.goto("/#/signup");
  await page.getByLabel("First name", { exact: true }).fill("Grace");
  await page.getByLabel("Last name", { exact: true }).fill("Member");
  await page
    .getByLabel("Email", { exact: true })
    .fill("tester@example.invalid");
  await page
    .getByLabel("Password", { exact: true })
    .fill("a sufficiently long test password");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("a sufficiently long test password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Verify email", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Verification code").fill("12345678");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await page
    .getByLabel("Email", { exact: true })
    .fill("tester@example.invalid");
  await page
    .getByLabel("Password", { exact: true })
    .fill("a sufficiently long test password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Grace" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "My profile", exact: true }).click();
  await page.getByLabel("First name", { exact: true }).fill("Hope");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "saved" }),
  ).toContainText("saved");
  expect(
    calls.find((c) => c.path === "/api/v1/me" && c.method === "PATCH").body,
  ).toEqual({ firstName: "Hope", directoryVisible: true });
  expect(
    await page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
        url: location.href,
      }),
    ),
  ).not.toContain("private-browser-token");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});
test("React public sermons use API search and detail safely, old tools remain available", async ({
  page,
}) => {
  const { calls } = await mocked(page);
  await page.goto("/#/word");
  await expect(
    page.getByRole("heading", { name: "<img src=x onerror=alert(1)>" }),
  ).toBeVisible();
  await expect(page.locator(".sermon img")).toHaveCount(0);
  await page.getByRole("searchbox").fill("faith");
  await page.getByRole("button", { name: "Search sermons" }).click();
  await expect
    .poll(() =>
      calls
        .filter((c) => c.path === "/api/v1/sermons")
        .at(-1)
        ?.query.get("query"),
    )
    .toBe("faith");
  await page.getByRole("button", { name: "Open sermon" }).click();
  await expect(
    page.getByRole("heading", { name: "Living in Faith" }),
  ).toBeVisible();
  await page.goto("/auth.html");
  await expect(
    page.getByRole("form", { name: "Sign in", exact: true }),
  ).toBeVisible();
});
test("React protects member routes and provides password recovery without false success", async ({
  page,
}) => {
  const { calls } = await mocked(page);
  await page.route("**/api/v1/auth/password/forgot", (r) =>
    r.fulfill({ status: 202, json: { data: { message: "If eligible" } } }),
  );
  await page.goto("/#/profile");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Reset your password" }),
  ).toBeVisible();
  await page
    .getByLabel("Email", { exact: true })
    .fill("tester@example.invalid");
  await page.getByRole("button", { name: "Send reset email" }).click();
  await expect(page.getByRole("status")).toContainText(
    "If the account is eligible",
  );
  expect(
    calls.some((c) => c.path === "/api/v1/me" && c.method === "PATCH"),
  ).toBe(false);
});
test("React preserves errors, clears passwords and does not pretend logout succeeded", async ({
  page,
}) => {
  await mocked(page);
  await page.route("**/api/v1/auth/login", (r) =>
    r.fulfill({
      status: 429,
      json: { error: { code: "rate_limited", message: "Try again later." } },
    }),
  );
  await page.goto("/#/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill("tester@example.invalid");
  await page
    .getByLabel("Password", { exact: true })
    .fill("a sufficiently long test password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Try again later");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await page.unroute("**/api/v1/auth/login");
  await page
    .getByLabel("Password", { exact: true })
    .fill("a sufficiently long test password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "My profile", exact: true }).click();
  await page.route("**/api/v1/auth/logout", (r) =>
    r.fulfill({
      status: 503,
      json: {
        error: { code: "unavailable", message: "Please retry sign out." },
      },
    }),
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("retry sign out");
  await expect(
    page.getByRole("heading", { name: "Grace Member" }),
  ).toBeVisible();
});
test("Unimplemented domains are inert design previews and collect no private data", async ({
  page,
}) => {
  const { calls } = await mocked(page, { signedIn: true });
  await page.goto("/#/prayer");
  await expect(
    page.getByRole("status").filter({ hasText: "Design preview" }),
  ).toBeVisible();
  await expect(page.locator("[inert]")).toHaveCount(1);
  expect(calls.some((c) => c.path.includes("/prayer"))).toBe(false);
});
test("A delayed previous session cannot overwrite a newly signed-in profile", async ({
  page,
}) => {
  await mocked(page, { signedIn: true });
  let release,
    started = false,
    count = 0;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/me", async (route) => {
    count++;
    if (count === 1) {
      started = true;
      await gate;
      await route.fulfill({
        json: {
          data: {
            firstName: "Previous",
            lastName: "Member",
            email: "old@example.invalid",
          },
        },
      });
    } else
      await route.fulfill({
        json: {
          data: {
            firstName: "New",
            lastName: "Member",
            email: "new@example.invalid",
          },
        },
      });
  });
  await page.goto("/#/login");
  await expect.poll(() => started).toBe(true);
  await page.getByLabel("Email", { exact: true }).fill("new@example.invalid");
  await page
    .getByLabel("Password", { exact: true })
    .fill("a sufficiently long test password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect.poll(() => count).toBe(2);
  release();
  await expect(
    page.getByRole("heading", { name: "Welcome, New" }),
  ).toBeVisible();
});
