import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";
async function setup(page, { googleOnly = false } = {}) {
  await mocked(page, { signedIn: true });
  let fresh = false;
  let attempts = 0;
  await page.route("**/api/v1/auth/reauthentication**", async (route) => {
    if (route.request().url().endsWith("/password")) {
      attempts++;
      if (route.request().postDataJSON().password !== "synthetic confirmation")
        return route.fulfill({
          status: 401,
          json: {
            error: {
              code: "invalid_credentials",
              message: "Password is incorrect.",
            },
          },
        });
      fresh = true;
    }
    if (route.request().url().endsWith("/google"))
      return route.fulfill({
        json: {
          data: {
            url: "https://accounts.google.com/auth?state=synthetic-state",
          },
        },
      });
    return route.fulfill({
      json: {
        data: {
          fresh,
          freshUntil: fresh
            ? new Date(Date.now() + 300000).toISOString()
            : null,
          passwordAvailable: !googleOnly,
          googleAvailable: googleOnly,
        },
      },
    });
  });
  return { attempts: () => attempts };
}
test("password identity confirmation clears credentials and shows server freshness", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page.goto("/profile.html");
  const panel = page.getByRole("region", { name: "Confirm your identity" });
  await expect(panel).toBeVisible();
  await panel.getByLabel("Current password").fill("wrong");
  await panel.getByRole("button", { name: "Confirm with password" }).click();
  await expect(page.getByRole("alert")).toContainText("Password is incorrect");
  await expect(panel.getByLabel("Current password")).toHaveValue("");
  expect(fixture.attempts()).toBe(1);
  await panel.getByLabel("Current password").fill("synthetic confirmation");
  await panel.getByRole("button", { name: "Confirm with password" }).click();
  await expect(panel).toContainText("Identity confirmed");
  await expect(panel.getByLabel("Current password")).toHaveValue("");
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain("synthetic confirmation");
  expect(page.url()).not.toContain("password");
});
test("Google-only account offers Google confirmation without a password form", async ({
  page,
}) => {
  await setup(page, { googleOnly: true });
  await page.goto("/profile.html");
  const panel = page.getByRole("region", { name: "Confirm your identity" });
  await expect(panel).toBeVisible();
  await expect(panel.getByLabel("Current password")).toBeHidden();
  await expect(
    panel.getByRole("button", { name: "Confirm with Google" }),
  ).toBeVisible();
  await page.route("https://accounts.google.com/**", (route) =>
    route.fulfill({ body: "Synthetic provider page" }),
  );
  await panel.getByRole("button", { name: "Confirm with Google" }).click();
  await expect(page).toHaveURL(/https:\/\/accounts.google.com/);
});

test("a return marker cannot claim confirmation and an unavailable status fails closed", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/auth.html?reauthentication=complete");
  const panel = page.getByRole("region", { name: "Confirm your identity" });
  await expect(panel).toContainText("Confirm your identity to continue");
  expect(page.url()).not.toContain("reauthentication=");
  await page.route("**/api/v1/auth/reauthentication", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { code: "unavailable", message: "Service unavailable." } },
    }),
  );
  await panel
    .getByRole("button", { name: "Check identity confirmation" })
    .click();
  await expect(panel).toBeHidden();
  await expect(page.getByRole("alert")).toContainText("Service unavailable");
});
