import { test, expect } from "@playwright/test";

test("YouTube test accepts live links, isolates invalid input and stops the player", async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 401, contentType: "application/json", body: '{"error":{"message":"Not signed in"}}' }));
  // Deterministic app integration check; actual playback is a separate manual check.
  await page.route("https://www.youtube-nocookie.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>Embedded player placeholder</p>" }));
  await page.goto("/#/video-test");
  await page.getByLabel("YouTube link", { exact: true }).fill("https://youtube.com/live/M7lc1UVf-VE");
  await page.getByRole("button", { name: "Load video", exact: true }).click();
  const frame = page.locator('iframe[title="YouTube playback test"]');
  await expect(frame).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?playsinline=1");
  await expect(frame).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  await expect(frame).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel("YouTube link", { exact: true }).fill("https://youtube.com.evil.test/watch?v=M7lc1UVf-VE");
  await page.getByRole("button", { name: "Load video", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("valid HTTPS YouTube");
  await expect(frame).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?playsinline=1");
  await page.getByRole("button", { name: "Stop video", exact: true }).click();
  await expect(frame).toHaveCount(0);
});
