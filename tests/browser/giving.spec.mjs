import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

test("members choose a Give A Little amount and return to the thank-you page", async ({ page }) => {
  await mocked(page, { signedIn: true });
  await page.goto("/#/home");
  await page.getByRole("button", { name: "Give to City4Christ" }).click();

  await expect(page.getByRole("heading", { name: "Give to City4Christ" })).toBeVisible();
  await page.getByRole("button", { name: "£50" }).click();
  const checkout = new URL(await page.getByRole("link", { name: "Continue to Give A Little" }).getAttribute("href"));
  expect(checkout.origin).toBe("https://givealittle.co");
  expect(checkout.pathname).toBe("/ce1d67aa-f451-418f-9468-ab80effc8dae/initiate-donation");
  expect(checkout.searchParams.get("amount")).toBe("50");
  expect(checkout.searchParams.get("recurring")).toBe("false");
  expect(checkout.searchParams.get("returnUrl")).toBe(`${new URL(page.url()).origin}/#/giving/return`);

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
