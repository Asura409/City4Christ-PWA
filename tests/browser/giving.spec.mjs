import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

test("members are forwarded to Give A Little without a City4Christ payment payload", async ({ page }) => {
  await mocked(page, { signedIn: true });
  await page.goto("/#/home");
  await page.getByRole("button", { name: "Give to City4Christ" }).click();

  await expect(page.getByRole("heading", { name: "Give to City4Christ" })).toBeVisible();
  const checkout = new URL(await page.getByRole("link", { name: "Continue to Give A Little" }).getAttribute("href"));
  expect(checkout.origin).toBe("https://givealittle.co");
  expect(checkout.pathname).toBe("/c/6GvrA4jJbNQcVwhdnfppWA");
  expect(checkout.search).toBe("");

  await page.goto("/#/giving/return");
  await expect(page.getByRole("heading", { name: "Thank you for supporting City4Christ" })).toBeVisible();
  await expect(page.getByText(/Your transaction and receipt are available in your Give A Little account/)).toBeVisible();
  await expect(page.getByRole("link", { name: "View Give A Little" })).toHaveAttribute("href", "https://givealittle.co");
});

test("the Give A Little return page is available without an app session", async ({ page }) => {
  await mocked(page);
  await page.goto("/#/giving/return");
  await expect(page.getByRole("heading", { name: "Thank you for supporting City4Christ" })).toBeVisible();
});
