import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";
const current = "synthetic current password";
const replacement = "synthetic replacement password";
async function fill(panel, confirm = replacement) {
  await panel.getByLabel("Current password", { exact: true }).fill(current);
  await panel.getByLabel("New password", { exact: true }).fill(replacement);
  await panel.getByLabel("Confirm new password", { exact: true }).fill(confirm);
}
test("signed-in password change confirms locally, revokes session and returns to login", async ({
  page,
}) => {
  await mocked(page, { signedIn: true });
  let changes = 0;
  await page.route("**/api/v1/auth/password/change", (route) => {
    changes++;
    expect(route.request().postDataJSON()).toEqual({
      currentPassword: current,
      newPassword: replacement,
    });
    expect(route.request().headers().authorization).toBe(
      "Bearer private-browser-token",
    );
    return route.fulfill({ json: { data: { status: "password_changed" } } });
  });
  await page.goto("/#/profile");
  const panel = page.getByRole("region", {
    name: "Change password",
    exact: true,
  });
  await fill(panel, "different synthetic password");
  await panel
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText("do not match");
  expect(changes).toBe(0);
  await panel
    .getByLabel("Confirm new password", { exact: true })
    .fill(replacement);
  await panel
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/login$/);
  await expect(page.getByRole("status")).toContainText(
    "Password changed. Sign in again",
  );
  expect(changes).toBe(1);
  expect(await page.locator('input[type="password"]').inputValue()).toBe("");
  const stored = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage, url: location.href }),
  );
  expect(stored).not.toContain(current);
  expect(stored).not.toContain(replacement);
  await page.evaluate(() => {
    location.hash = "/profile";
  });
  await expect(page).toHaveURL(/#\/login$/);
});
test("wrong current password and provider errors keep the session without false success", async ({
  page,
}) => {
  await mocked(page, { signedIn: true });
  let changes = 0;
  await page.route("**/api/v1/auth/password/change", (route) => {
    changes++;
    return route.fulfill({
      status: changes === 1 ? 422 : 503,
      json: {
        error: {
          code: changes === 1 ? "current_password_invalid" : "unavailable",
          message:
            changes === 1 ? "Check your current password." : "Try again later.",
          fields: {},
        },
      },
    });
  });
  await page.goto("/#/profile");
  const panel = page.getByRole("region", {
    name: "Change password",
    exact: true,
  });
  await fill(panel);
  await panel
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText(
    "Check your current password",
  );
  await expect(page).toHaveURL(/#\/profile$/);
  await expect(
    page.getByRole("heading", { name: "Grace Member" }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText("Try again later");
  expect(changes).toBe(2);
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "My profile", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Change password", exact: true })
      .getByLabel("Current password", { exact: true }),
  ).toHaveValue("");
});
test("Google-only accounts are not offered a local password change", async ({
  page,
}) => {
  await mocked(page, { signedIn: true });
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      json: {
        data: {
          id: "11111111-1111-4111-8111-111111111111",
          email: "google@example.invalid",
          firstName: "Google",
          lastName: "Member",
          hasPassword: false,
          directoryVisible: false,
          emailVerified: true,
        },
      },
    }),
  );
  await page.goto("/#/profile");
  const panel = page.getByRole("region", {
    name: "Change password",
    exact: true,
  });
  await expect(panel).toContainText("does not have a local password");
  await expect(
    panel.getByRole("button", { name: "Change password", exact: true }),
  ).toHaveCount(0);
});
