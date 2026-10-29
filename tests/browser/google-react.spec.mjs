import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";
test("React profile links Google directly with the active bearer session", async ({
  page,
}) => {
  const { calls } = await mocked(page, { signedIn: true });
  await page.route("https://accounts.google.com/**", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<h1>Google test consent</h1>",
    }),
  );
  await page.goto("/#/profile");
  await page.getByRole("button", { name: "Link Google", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Google test consent" }),
  ).toBeVisible();
  const link = calls.find((c) => c.path === "/api/v1/auth/google/link");
  expect(link.method).toBe("POST");
  expect(link.headers.authorization).toBe("Bearer private-browser-token");
  expect(link.query.get("returnTo")).toBe(
    "http://127.0.0.1:4173/account/auth.html",
  );
});
test("Google returns to the React profile rather than the old test interface", async ({
  page,
}) => {
  await mocked(page, { signedIn: true });
  await page.goto("/account/auth.html");
  await expect(page).toHaveURL(/\/#\/profile$/);
  await expect(
    page.getByRole("heading", { name: "Grace Member", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#auth-forms")).toHaveCount(0);
});
test("Google linking errors are actionable in the React interface", async ({
  page,
}) => {
  await mocked(page);
  await page.goto("/oauth/auth.html?auth_error=account_link_required");
  await expect(page.getByRole("alert")).toContainText(
    "Sign in with your password",
  );
  await expect(
    page.getByRole("link", { name: "Back to sign in" }),
  ).toHaveAttribute("href", "#/login");
});
test("React Google linking lets an expired confirmation be renewed without leaving the app", async ({
  page,
}) => {
  await mocked(page, { signedIn: true });
  let fresh = false;
  await page.route("**/api/v1/auth/google/link?**", (route) =>
    route.fulfill(
      fresh
        ? {
            json: {
              data: { url: "https://accounts.google.com/auth?state=test" },
            },
          }
        : {
            status: 401,
            json: {
              error: { code: "invalid_session", message: "Sign in again." },
            },
          },
    ),
  );
  await page.route("**/api/v1/auth/reauthentication/password", (route) => {
    expect(route.request().postDataJSON()).toEqual({
      password: "synthetic linking confirmation",
    });
    fresh = true;
    return route.fulfill({ json: { data: { fresh: true } } });
  });
  await page.route("https://accounts.google.com/**", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<h1>Google test consent</h1>",
    }),
  );
  await page.goto("/#/profile");
  await page.getByRole("button", { name: "Link Google", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Confirm your identity");
  await page
    .getByLabel("Current password", { exact: true })
    .fill("synthetic linking confirmation");
  await page
    .getByRole("button", { name: "Confirm identity", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Google account linking" })
      .getByRole("status"),
  ).toContainText("Identity confirmed");
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain("synthetic linking confirmation");
  await page.getByRole("button", { name: "Link Google", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Google test consent" }),
  ).toBeVisible();
});
test("React Google linking retains MFA confirmation requirements", async ({
  page,
}) => {
  await mocked(page, { signedIn: true });
  await page.route("**/api/v1/auth/google/link?**", (route) =>
    route.fulfill({
      status: 403,
      json: {
        error: { code: "mfa_required", message: "Confirm your authenticator." },
      },
    }),
  );
  await page.goto("/#/profile");
  await page.getByRole("button", { name: "Link Google", exact: true }).click();
  await expect(
    page.getByLabel("Authenticator code", { exact: true }),
  ).toBeVisible();
  expect(page.url()).toContain("/#/profile");
});
