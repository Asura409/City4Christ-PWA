import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

async function setup(page, { password = true, authenticator = false } = {}) {
  await mocked(page, { signedIn: true });
  let primary = false, factor = false, attempts = 0, actions = 0;
  const deadline = () => new Date(Date.now() + 300000).toISOString();
  await page.route("**/api/v1/auth/reauthentication", (route) => route.fulfill({ json: { data: {
    fresh: primary, freshUntil: primary ? deadline() : null, passwordAvailable: password, googleAvailable: true,
  } } }));
  await page.route("**/api/v1/auth/mfa", (route) => route.fulfill({ json: { data: {
    enabled: authenticator, freshUntil: factor ? deadline() : null,
  } } }));
  await page.route("**/api/v1/auth/reauthentication/password", (route) => {
    attempts++;
    expect(route.request().headers().authorization).toBe("Bearer private-browser-token");
    if (route.request().postDataJSON().password !== "synthetic confirmation")
      return route.fulfill({ status: 401, json: { error: { code: "invalid_credentials", message: "Password is incorrect." } } });
    primary = true;
    return route.fulfill({ json: { data: { fresh: true, freshUntil: deadline() } } });
  });
  await page.route("**/api/v1/auth/reauthentication/authenticator", (route) => {
    attempts++;
    expect(route.request().headers().authorization).toBe("Bearer private-browser-token");
    if (route.request().postDataJSON().code !== "123456")
      return route.fulfill({ status: 400, json: { error: { code: "invalid_mfa_code", message: "The authenticator code is invalid or expired." } } });
    primary = true; factor = true;
    return route.fulfill({ json: { data: { fresh: true, freshUntil: deadline() } } });
  });
  await page.route("**/api/v1/me", (route) => {
    if (route.request().method() !== "DELETE") return route.fallback();
    actions++;
    return route.fulfill({ status: 403, json: { error: primary && (!authenticator || factor)
      ? { code: "forbidden", message: "Confirmed action reached the server." }
      : { code: "reauthentication_required", message: "Confirm your identity again." },
    } });
  });
  await page.goto("/#/profile");
  await page.locator(".account-option > summary").filter({ hasText: /^Request account deletion/ }).click();
  const panel = page.getByRole("region", { name: "Request account deletion", exact: true });
  await panel.getByRole("checkbox").check();
  await panel.getByRole("button", { name: "Request account deletion", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Confirm sensitive action" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Confirm with Google" })).toHaveCount(0);
  return { dialog, attempts: () => attempts, actions: () => actions };
}

test("password confirmation handles a wrong password in place and retries only after success", async ({ page }) => {
  const { dialog, attempts, actions } = await setup(page);
  await dialog.getByLabel("Current password").fill("wrong");
  await dialog.getByRole("button", { name: "Confirm with password", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("incorrect");
  await expect(dialog.getByLabel("Current password")).toHaveValue("");
  expect(attempts()).toBe(1); expect(actions()).toBe(1);
  await dialog.getByLabel("Current password").fill("synthetic confirmation");
  await dialog.getByRole("button", { name: "Confirm with password", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("Confirmed action reached");
  expect(actions()).toBe(2);
  expect(page.url()).toContain("/#/profile");
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("synthetic confirmation");
});

for (const password of [false, true]) {
  test(`authenticator directly confirms a stale session with passwordAvailable=${password}`, async ({ page }) => {
    const { dialog, actions } = await setup(page, { password, authenticator: true });
    if (password) {
      await dialog.getByLabel("Current password").fill("discard this secret");
      await dialog.getByRole("button", { name: "Use authenticator app instead" }).click();
    }
    await dialog.getByLabel("Authenticator code").fill("000000");
    await dialog.getByRole("button", { name: "Confirm authenticator", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("invalid or expired");
    await expect(dialog.getByLabel("Authenticator code")).toHaveValue("");
    expect(actions()).toBe(1);
    await dialog.getByLabel("Authenticator code").fill("123456");
    await dialog.getByRole("button", { name: "Confirm authenticator", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("alert")).toContainText("Confirmed action reached");
    expect(actions()).toBe(2);
    expect(page.url()).toContain("/#/profile");
  });
}

test("cancelling confirmation never retries the sensitive action", async ({ page }) => {
  const { dialog, actions } = await setup(page, { authenticator: true });
  await dialog.getByRole("button", { name: "Cancel confirmation" }).click();
  await expect(dialog).toHaveCount(0);
  expect(actions()).toBe(1);
  expect(page.url()).toContain("/#/profile");
});
