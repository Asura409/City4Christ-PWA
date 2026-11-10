import { test, expect } from "@playwright/test";
import { pastoralMock } from "./fixtures/pastoral.mjs";

test("dashboard availability actions open the dedicated screen", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await pastoralMock(page, { pastor: true });
  await page.goto("/#/pastor-dashboard");
  await expect(page.getByRole("heading", { name: /Good day/ })).toBeVisible();
  await page.locator(".pastor-rail-link").filter({ hasText: "Availability" }).click();
  await expect(page).toHaveURL(/#\/pastor-availability$/);
});

test("availability is its own screen with a two-pane desktop layout", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await pastoralMock(page, { pastor: true, listed: true });
  await page.goto("/#/pastor-availability");
  await expect(page.getByRole("heading", { name: "Manage availability" })).toBeVisible();
  const desktop = await page.evaluate(() => {
    const card = document.querySelector(".pastor-availability-screen .pastoral-availability");
    const grid = document.querySelector(".pastor-availability-screen .pastoral-availability-grid");
    return {
      width: Math.round(card.getBoundingClientRect().width),
      columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  expect(desktop.width).toBeGreaterThan(900);
  expect(desktop.columns).toBe(2);
  expect(desktop.overflow).toBe(0);
});

test("success feedback is green and clears itself after ten seconds", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await pastoralMock(page, { pastor: true, listed: true });
  await page.goto("/#/pastor-availability");
  await expect(page.getByRole("heading", { name: "Manage availability" })).toBeVisible();

  await page.clock.install();
  await page.getByLabel("Starts at (UK time)").fill("2026-11-12T10:00");
  await page.getByLabel("Ends at (UK time)").fill("2026-11-12T10:30");
  await page.getByRole("button", { name: "Publish slot" }).click();

  const success = page.getByRole("status").filter({ hasText: "Availability published." });
  await expect(success).toBeVisible();
  await expect(success).toHaveClass(/message-success/);
  await page.clock.fastForward(10001);
  await expect(success).toHaveCount(0);
});

test("failure feedback is an alert and clears itself after ten seconds", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await pastoralMock(page, { pastor: true, listed: true });
  await page.route("**/api/v1/me/pastoral/availability", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 500, json: { error: { code: "unavailable", message: "Could not publish right now." } } })
      : route.fallback(),
  );
  await page.goto("/#/pastor-availability");
  await expect(page.getByRole("heading", { name: "Manage availability" })).toBeVisible();

  await page.clock.install();
  await page.getByLabel("Starts at (UK time)").fill("2026-11-12T10:00");
  await page.getByLabel("Ends at (UK time)").fill("2026-11-12T10:30");
  await page.getByRole("button", { name: "Publish slot" }).click();

  const failure = page.getByRole("alert").filter({ hasText: "Could not publish right now." });
  await expect(failure).toBeVisible();
  await expect(failure).toHaveClass(/timed-message/);
  await page.clock.fastForward(10001);
  await expect(failure).toHaveCount(0);
});

test("availability stacks without overflow on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await pastoralMock(page, { pastor: true, listed: true });
  await page.goto("/#/pastor-availability");
  await expect(page.getByRole("heading", { name: "Manage availability" })).toBeVisible();
  const mobile = await page.evaluate(() => {
    const card = document.querySelector(".pastor-availability-screen .pastoral-availability");
    const grid = document.querySelector(".pastor-availability-screen .pastoral-availability-grid");
    return {
      width: Math.round(card.getBoundingClientRect().width),
      columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  expect(mobile.width).toBeLessThan(400);
  expect(mobile.columns).toBe(1);
  expect(mobile.overflow).toBe(0);
});
