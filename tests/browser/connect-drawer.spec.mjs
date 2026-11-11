import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

test("logo menu opens the Stay connected drawer", async ({ page }) => {
  await mocked(page, { signedIn: true });
  await page.goto("/#/home");
  await page.getByRole("button", { name: "Open Stay connected" }).click();
  const drawer = page.getByRole("dialog", { name: "Follow City4Christ" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("link", { name: /City4Christ on Instagram/ })).toHaveAttribute(
    "href",
    "https://www.instagram.com/city4christ/",
  );
  await expect(drawer.getByRole("link", { name: /City4Christ on Facebook/ })).toBeVisible();
  await expect(drawer.getByRole("link", { name: /City4Christ on YouTube/ })).toBeVisible();
  await expect(drawer.getByRole("link", { name: /Book pastoral care/ })).toBeVisible();
  await expect(drawer.getByRole("link", { name: /Give to City4Christ/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
});

test("drawer care links navigate and close the drawer", async ({ page }) => {
  await mocked(page, { signedIn: true });
  await page.goto("/#/home");
  await page.getByRole("button", { name: "Open Stay connected" }).click();
  await page.getByRole("dialog", { name: "Follow City4Christ" }).getByRole("link", { name: /Book pastoral care/ }).click();
  await expect(page).toHaveURL(/#\/pastors/);
  await expect(page.getByRole("dialog", { name: "Follow City4Christ" })).toHaveCount(0);
});
