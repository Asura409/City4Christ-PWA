import { test, expect } from "@playwright/test";
import { mocked, STAFF_ACCESS } from "./fixtures/api.mjs";

test("account settings support editing and reveal security controls on demand", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { calls } = await mocked(page, { signedIn: true });
  await page.goto("/#/profile");
  await expect(page.getByRole("heading", { name: "My account", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Grace Member" })).toBeVisible();
  await expect(page.getByLabel("Current password", { exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "Church administration", exact: true })).toHaveCount(0);
  await page.getByLabel("First name", { exact: true }).fill("Hope");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "saved" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hope Member" })).toBeVisible();
  expect(calls.find((call) => call.path === "/api/v1/me" && call.method === "PATCH").body).toEqual({ firstName: "Hope" });
  await page.locator(".account-option summary").filter({ hasText: /^Password/ }).click();
  await expect(page.getByLabel("Current password", { exact: true })).toBeVisible();
  await page.locator(".account-option summary").filter({ hasText: /^Password/ }).click();
  await expect(page.getByLabel("Current password", { exact: true })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole("heading", { name: "My account", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("account-profile.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("workspace shortcuts follow the signed-in account permissions", async ({ page }) => {
  await mocked(page, { signedIn: true, access: STAFF_ACCESS });
  await page.goto("/#/profile");
  await expect(page.getByText("Content Editor", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Church administration", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sermon publishing", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Account deletion requests", exact: true })).toHaveCount(0);
});

test("expanded account settings fit narrow phones through tablets", async ({ page }) => {
  await mocked(page, { signedIn: true, access: STAFF_ACCESS });
  await page.route("**/api/v1/auth/mfa", (route) => route.fulfill({ json: { data: {
    enabled: true, pending: false, freshUntil: null, recoveryCodesRemaining: 10,
  } } }));
  await page.goto("/#/profile");
  await expect(page.getByRole("heading", { name: "My account", exact: true })).toBeVisible();
  await expect(page.locator(".mfa-status")).toHaveText("Enabled");
  await page.evaluate(() => document.querySelectorAll(".account-page details").forEach((details) => { details.open = true; }));
  for (const width of [320, 360, 390, 560, 600, 768, 1024]) {
    await page.setViewportSize({ width, height: 850 });
    const overflow = await page.locator(".account-page").evaluate((root) => {
      const bounds = root.getBoundingClientRect();
      return [...root.querySelectorAll(".account-card, .account-hero, .auth-card, .auth-field, input, .btn, .mfa-settings-heading, .account-signout")]
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || node.scrollWidth > node.clientWidth + 1);
        }).map((node) => `${node.tagName}.${node.className}`);
    });
    expect(overflow, `Overflow at ${width}px`).toEqual([]);
    const panel = page.locator(".account-option-body > .mfa-settings");
    const container = await panel.locator("..").boundingBox();
    const content = await panel.boundingBox();
    expect(content.x).toBeGreaterThanOrEqual(container.x);
    expect(content.x + content.width).toBeLessThanOrEqual(container.x + container.width + 1);
  }
});
