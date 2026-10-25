import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

test(
  "mobile shell keeps all primary actions inside the visible viewport",
  async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await mocked(page, { signedIn: true });
  await page.goto("/#/home");

  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav).toBeVisible();
  for (const label of ["Home", "Word", "Community", "Create a post", "Prayer", "Chat"])
    await expect(nav.getByRole("button", { name: label })).toBeVisible();

  const bounds = await nav.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(testInfo.project.use.viewport.height);
  },
);

test(
  "desktop shell expands and keeps navigation along the bottom edge",
  async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop");
    await mocked(page, { signedIn: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/#/home");

    const app = page.locator(".app");
    const appBounds = await app.boundingBox();
    const nav = page.getByRole("navigation", { name: "Main" });
    const navBounds = await nav.boundingBox();
    expect(appBounds.width).toBeGreaterThan(1200);
    expect(navBounds.width).toBeGreaterThan(navBounds.height);
    expect(navBounds.y + navBounds.height).toBeGreaterThanOrEqual(868);
  },
);
